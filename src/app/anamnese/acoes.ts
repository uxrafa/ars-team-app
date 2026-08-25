"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import {
  PERGUNTAS_SAUDE,
  VERSAO_CONSENTIMENTO,
  paraNumero,
  type DadosAnamnese,
} from "@/lib/anamnese";

export type Resultado = { erro?: string; ok?: boolean };

/**
 * Monta a linha do banco a partir do que veio da tela.
 * Rascunho aceita campo vazio; o envio e que exige tudo.
 */
function montarLinha(alunoId: string, dados: DadosAnamnese) {
  return {
    aluno_id: alunoId,
    peso_kg: paraNumero(dados.peso_kg),
    altura_cm: paraNumero(dados.altura_cm),
    nascimento: dados.nascimento || null,
    objetivo: dados.objetivo || null,
    local_treino: dados.local_treino || null,
    nivel: dados.nivel || null,
    dias_disponiveis: dados.dias_disponiveis ?? [],

    coracao: dados.coracao,
    coracao_detalhe: dados.coracao ? dados.coracao_detalhe.trim() || null : null,
    dor_peito: dados.dor_peito,
    dor_peito_detalhe: dados.dor_peito ? dados.dor_peito_detalhe.trim() || null : null,
    pressao_alta: dados.pressao_alta,
    pressao_alta_detalhe: dados.pressao_alta ? dados.pressao_alta_detalhe.trim() || null : null,
    cirurgia_12m: dados.cirurgia_12m,
    cirurgia_12m_detalhe: dados.cirurgia_12m ? dados.cirurgia_12m_detalhe.trim() || null : null,
    medicacao_continua: dados.medicacao_continua,
    medicacao_continua_detalhe: dados.medicacao_continua
      ? dados.medicacao_continua_detalhe.trim() || null
      : null,
    lesoes: dados.lesoes.trim() || null,

    cintura_cm: paraNumero(dados.cintura_cm),
    quadril_cm: paraNumero(dados.quadril_cm),
    braco_cm: paraNumero(dados.braco_cm),
    coxa_cm: paraNumero(dados.coxa_cm),
    periodo_treino: dados.periodo_treino || null,
  };
}

/**
 * Repete na tela as regras que o banco ja garante por constraint.
 * Nao e a trava de seguranca, e a mensagem em portugues: sem isto o aluno
 * levaria um erro cru de constraint sem saber o que faltou.
 */
function faltaAlgumaCoisa(dados: DadosAnamnese): string | null {
  const peso = paraNumero(dados.peso_kg);
  const altura = paraNumero(dados.altura_cm);

  if (peso === null) return "Escreva seu peso atual.";
  if (peso < 25 || peso > 400) return "Confira o peso: o valor parece fora do normal.";
  if (altura === null) return "Escreva sua altura.";
  if (altura < 100 || altura > 250) return "Confira a altura: o valor parece fora do normal.";
  if (!dados.objetivo) return "Escolha seu objetivo principal.";
  if (!dados.local_treino) return "Diga onde você treina.";
  if (!dados.nivel) return "Escolha sua experiência com treino.";
  if (!dados.dias_disponiveis.length) return "Marque pelo menos um dia disponível na semana.";

  for (const p of PERGUNTAS_SAUDE) {
    if (dados[p.campo] === null) {
      return "Responda todas as perguntas de saúde antes de enviar.";
    }
  }

  if (!dados.consentiu) {
    return "Para enviar, você precisa autorizar o uso dos seus dados de saúde.";
  }

  return null;
}

async function pegarAluno() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, alunoId: null as string | null };
  return { supabase, alunoId: user.id };
}

/** Guarda o que ja foi preenchido, sem exigir nada. */
export async function salvarRascunho(dados: DadosAnamnese): Promise<Resultado> {
  const { supabase, alunoId } = await pegarAluno();
  if (!alunoId) return { erro: "Sua sessão expirou. Entre de novo." };

  // Anamnese ja enviada nao volta para rascunho.
  const { data: atual } = await supabase
    .from("anamnese")
    .select("status")
    .eq("aluno_id", alunoId)
    .maybeSingle();

  const { error } = await supabase.from("anamnese").upsert(
    {
      ...montarLinha(alunoId, dados),
      status: atual?.status === "enviada" ? "enviada" : "rascunho",
    },
    { onConflict: "aluno_id" },
  );

  if (error) {
    console.error("salvarRascunho:", error.message);
    return { erro: "Não consegui guardar agora. Tente de novo em instantes." };
  }

  return { ok: true };
}

/** Fecha a anamnese e libera o Allisson para montar a ficha. */
export async function enviarAnamnese(dados: DadosAnamnese): Promise<Resultado> {
  const { supabase, alunoId } = await pegarAluno();
  if (!alunoId) return { erro: "Sua sessão expirou. Entre de novo." };

  const problema = faltaAlgumaCoisa(dados);
  if (problema) return { erro: problema };

  const agora = new Date().toISOString();

  const { error } = await supabase.from("anamnese").upsert(
    {
      ...montarLinha(alunoId, dados),
      status: "enviada",
      enviada_em: agora,
      consentimento_saude_em: agora,
      consentimento_saude_versao: VERSAO_CONSENTIMENTO,
    },
    { onConflict: "aluno_id" },
  );

  if (error) {
    console.error("enviarAnamnese:", error.message);
    if (error.message.includes("anamnese_consentimento_obrigatorio")) {
      return { erro: "Para enviar, você precisa autorizar o uso dos seus dados de saúde." };
    }
    if (error.message.includes("anamnese_minimo_para_enviar")) {
      return { erro: "Faltou responder alguma coisa. Volte e confira as etapas anteriores." };
    }
    return { erro: "Não consegui enviar agora. Tente de novo em instantes." };
  }

  revalidatePath("/app");
  return { ok: true };
}

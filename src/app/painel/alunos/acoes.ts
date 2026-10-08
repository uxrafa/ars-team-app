"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { vencimentoValido } from "@/lib/pagamento";

export type ResultadoAluno = { erro?: string; ok?: boolean };

export type DadosCobranca = {
  id: string;
  whatsapp: string;
  tipo: "consultoria" | "planilha";
  status: "ativo" | "carencia" | "suspenso";
  mensalidade: string;
  /** "aaaa-mm-dd" do <input type="date">, ou "" para ficar sem data. */
  acesso_ate: string;
};

function paraNumero(valor: string): number | null {
  const limpo = String(valor ?? "").replace(/\./g, "").replace(",", ".").trim();
  if (!limpo) return null;
  const n = Number(limpo);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Guarda plano, status, mensalidade e vencimento de um aluno.
 *
 * `acesso_ate` VOLTOU para ca (Rafael, 06/10). A migracao 0014 tinha tirado o
 * campo da tela para o vencimento so andar com pagamento registrado, e na
 * pratica isso travou o Allisson: os alunos antigos entraram todos com o
 * mesmo 01/12 digitado no convite, e nao havia onde corrigir para a data de
 * renovacao de cada um. Sem lancamento retroativo (decisao de 05/09), a data
 * combinada com o aluno so pode entrar por digitacao.
 *
 * Desde a 0021 e uma data so com o pagamento: gravar o vencimento aqui faz o
 * ultimo pagamento do aluno valer ate a mesma data, pelo gatilho
 * `ao_corrigir_vencimento`. Sem isso o Financeiro dizia "ate 07/01" e o aluno
 * "07/12", e nenhum dos dois dava para corrigir o outro. O update sempre
 * manda `acesso_ate`, entao salvar de novo sem mudar a data tambem alinha.
 *
 * A trava de verdade e dupla no banco: a RLS so deixa admin tocar em linha
 * alheia, e o gatilho da migracao 0009 impede que um aluno mexa nestes
 * campos nem na propria linha. A checagem aqui e para dar mensagem boa.
 */
export async function salvarCobranca(dados: DadosCobranca): Promise<ResultadoAluno> {
  const supabase = await criarClienteServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sua sessão expirou. Entre de novo." };

  const { data: quemPede } = await supabase
    .from("perfis")
    .select("tipo")
    .eq("id", user.id)
    .maybeSingle<{ tipo: string }>();

  if (quemPede?.tipo !== "admin") {
    return { erro: "Só o treinador pode alterar plano e cobrança." };
  }

  const mensalidade = paraNumero(dados.mensalidade);
  if (dados.mensalidade.trim() && mensalidade === null) {
    return { erro: "O valor do plano precisa ser um número. Ex.: 280 ou 280,00" };
  }
  if (mensalidade !== null && mensalidade > 100000) {
    return { erro: "Confira o valor do plano: parece alto demais." };
  }

  const acessoAte = dados.acesso_ate.trim();
  if (acessoAte && !vencimentoValido(acessoAte)) {
    return { erro: "Confira a data do vencimento." };
  }

  const { error } = await supabase
    .from("perfis")
    .update({
      whatsapp: dados.whatsapp.trim() || null,
      tipo: dados.tipo,
      status: dados.status,
      mensalidade,
      acesso_ate: acessoAte || null,
    })
    .eq("id", dados.id);

  if (error) {
    console.error("salvarCobranca:", error.message);
    return { erro: "Não consegui salvar agora. Tente de novo em instantes." };
  }

  revalidatePath("/painel");
  revalidatePath("/painel/alunos");
  revalidatePath("/painel/financeiro");
  revalidatePath(`/painel/alunos/${dados.id}`);
  return { ok: true };
}

/**
 * Tira o aluno de circulacao. NAO apaga nada.
 *
 * Ele some das listas, das contas e da fila de atencao, e para de entrar no
 * app. A ficha, os treinos, as medidas, as fotos e os pagamentos ficam todos
 * onde estao, e `reativarAluno` desfaz.
 *
 * Nao existe exclusao de verdade neste projeto, e e escolha: sem backup
 * automatico no Supabase, apagar um perfil derrubaria em cascata um ano de
 * treino de alguem sem volta possivel. Ver `0015_arquivar_aluno.sql`.
 */
export async function arquivarAluno(id: string, motivo: string): Promise<ResultadoAluno> {
  const supabase = await criarClienteServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sua sessão expirou. Entre de novo." };
  if (user.id === id) return { erro: "Você não pode arquivar a própria conta." };

  const { data: quemPede } = await supabase
    .from("perfis")
    .select("tipo")
    .eq("id", user.id)
    .maybeSingle<{ tipo: string }>();

  if (quemPede?.tipo !== "admin") {
    return { erro: "Só o treinador pode arquivar aluno." };
  }

  const { data, error } = await supabase
    .from("perfis")
    .update({
      arquivado_em: new Date().toISOString(),
      arquivado_motivo: motivo.trim() || null,
      arquivado_por: user.id,
    })
    .eq("id", id)
    .is("arquivado_em", null)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) {
    console.error("arquivarAluno:", error.message);
    // A constraint `perfis_admin_nao_arquiva` e a unica recusa previsivel aqui.
    return error.message.includes("perfis_admin_nao_arquiva")
      ? { erro: "Conta de treinador não se arquiva." }
      : { erro: "Não consegui arquivar agora. Tente de novo em instantes." };
  }
  if (!data) return { erro: "Esse aluno já estava arquivado." };

  revalidatePath("/painel");
  revalidatePath("/painel/alunos");
  revalidatePath("/painel/financeiro");
  revalidatePath(`/painel/alunos/${id}`);
  return { ok: true };
}

/** Traz o aluno de volta. Nada precisa ser restaurado porque nada saiu. */
export async function reativarAluno(id: string): Promise<ResultadoAluno> {
  const supabase = await criarClienteServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sua sessão expirou. Entre de novo." };

  const { data: quemPede } = await supabase
    .from("perfis")
    .select("tipo")
    .eq("id", user.id)
    .maybeSingle<{ tipo: string }>();

  if (quemPede?.tipo !== "admin") {
    return { erro: "Só o treinador pode reativar aluno." };
  }

  const { error } = await supabase
    .from("perfis")
    .update({ arquivado_em: null, arquivado_motivo: null, arquivado_por: null })
    .eq("id", id);

  if (error) {
    console.error("reativarAluno:", error.message);
    return { erro: "Não consegui reativar agora. Tente de novo em instantes." };
  }

  revalidatePath("/painel");
  revalidatePath("/painel/alunos");
  revalidatePath("/painel/financeiro");
  revalidatePath(`/painel/alunos/${id}`);
  return { ok: true };
}

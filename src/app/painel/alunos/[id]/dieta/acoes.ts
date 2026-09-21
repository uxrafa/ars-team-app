"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Alimento, Refeicao } from "@/lib/dieta";
import { carregarOrientacao, type OrientacaoNaTela } from "./carregar";

export type Resultado = { erro?: string; ok?: boolean };

/**
 * Só para dar mensagem boa. Quem recusa de verdade quem não é admin é a RLS
 * das tabelas (0018): trava em server action não é trava.
 */
async function exigirAdmin() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, erro: "Sua sessão expirou. Entre de novo." };
  const { data: perfil } = await supabase
    .from("perfis")
    .select("tipo")
    .eq("id", user.id)
    .maybeSingle<{ tipo: string }>();
  if (perfil?.tipo !== "admin") return { supabase, erro: "Só o treinador monta a dieta." };
  return { supabase, erro: null };
}

export type DadosDaDieta = {
  publicada: boolean;
  agua_litros: number | null;
  orientacoes: string;
  fator_atividade: number;
  ajuste_pct: number;
  proteina_g_kg: number;
  gordura_g_kg: number;
  refeicoes: Refeicao[];
};

/** Mesmas faixas das constraints, para o erro dizer qual campo e não "violou check". */
function conferir(d: DadosDaDieta): string | null {
  if (d.agua_litros !== null && (d.agua_litros < 0.5 || d.agua_litros > 10)) {
    return "Água: entre 0,5 e 10 litros.";
  }
  if (d.ajuste_pct < -40 || d.ajuste_pct > 40) return "Ajuste: entre −40% e +40%.";
  if (d.proteina_g_kg < 0.5 || d.proteina_g_kg > 4) return "Proteína: entre 0,5 e 4 g/kg.";
  if (d.gordura_g_kg < 0.3 || d.gordura_g_kg > 3) return "Gordura: entre 0,3 e 3 g/kg.";
  for (const r of d.refeicoes) {
    if (!r.nome.trim()) return "Toda refeição precisa de nome.";
    for (const i of r.itens) {
      if (i.alimento_id && (!i.gramas || i.gramas <= 0 || i.gramas > 5000)) {
        return `Confira as gramas em ${r.nome}.`;
      }
    }
  }
  return null;
}

export async function salvarDieta(alunoId: string, d: DadosDaDieta): Promise<Resultado> {
  const { supabase, erro } = await exigirAdmin();
  if (erro) return { erro };

  const problema = conferir(d);
  if (problema) return { erro: problema };

  // Texto livre vazio some em vez de virar erro: é linha que ele abriu e
  // desistiu de escrever.
  const refeicoes = d.refeicoes.map((r, ordem) => ({
    dia: r.dia,
    nome: r.nome,
    horario: r.horario || null,
    ordem,
    itens: r.itens
      .filter((i) => i.alimento_id || i.descricao.trim())
      .map((i, o) => ({
        alimento_id: i.alimento_id,
        gramas: i.alimento_id ? i.gramas : null,
        descricao: i.descricao,
        ordem: o,
      })),
  }));

  const { error } = await supabase.rpc("salvar_orientacao", {
    p_aluno_id: alunoId,
    p_publicada: d.publicada,
    p_agua_litros: d.agua_litros,
    p_orientacoes: d.orientacoes,
    p_fator_atividade: d.fator_atividade,
    p_ajuste_pct: Math.round(d.ajuste_pct),
    p_proteina_g_kg: d.proteina_g_kg,
    p_gordura_g_kg: d.gordura_g_kg,
    p_refeicoes: refeicoes,
  });

  if (error) {
    console.error("salvarDieta:", error.message);
    return { erro: "Não consegui salvar agora. Tente de novo." };
  }

  revalidatePath(`/painel/alunos/${alunoId}/dieta`);
  revalidatePath("/app/dieta");
  revalidatePath("/app", "layout");
  return { ok: true };
}

/**
 * Whey e suplemento não existem na TACO. O cadastro é mínimo de propósito:
 * nome e três números do rótulo, por 100 g.
 */
export async function cadastrarAlimento(a: {
  nome: string;
  proteina_g: number;
  carboidrato_g: number;
  gordura_g: number;
}): Promise<Resultado & { alimento?: Alimento }> {
  const { supabase, erro } = await exigirAdmin();
  if (erro) return { erro };

  const nome = a.nome.trim();
  if (nome.length < 2) return { erro: "Dê um nome ao alimento." };
  const valores = [a.proteina_g, a.carboidrato_g, a.gordura_g];
  if (valores.some((v) => !Number.isFinite(v) || v < 0 || v > 100)) {
    return { erro: "Macros por 100 g: cada um entre 0 e 100." };
  }
  if (valores.reduce((s, v) => s + v, 0) > 100.5) {
    return { erro: "Em 100 g, os três juntos não passam de 100 g." };
  }

  const { data, error } = await supabase
    .from("alimento")
    .insert({ nome, origem: "proprio", proteina_g: a.proteina_g, carboidrato_g: a.carboidrato_g, gordura_g: a.gordura_g })
    .select("id, nome, grupo, origem, proteina_g, carboidrato_g, gordura_g")
    .single<Alimento>();

  if (error || !data) {
    console.error("cadastrarAlimento:", error?.message);
    return { erro: "Não consegui cadastrar agora." };
  }

  return {
    ok: true,
    alimento: {
      ...data,
      proteina_g: Number(data.proteina_g),
      carboidrato_g: Number(data.carboidrato_g),
      gordura_g: Number(data.gordura_g),
    },
  };
}

/**
 * Traz a dieta de outro aluno para a tela, SEM gravar: é ponto de partida,
 * e ele ajusta antes de salvar. As metas não vêm, porque são do outro aluno.
 */
export async function copiarDieta(
  deAlunoId: string,
): Promise<Resultado & { dieta?: Pick<OrientacaoNaTela, "refeicoes" | "agua_litros" | "orientacoes"> }> {
  const { supabase, erro } = await exigirAdmin();
  if (erro) return { erro };
  const o = await carregarOrientacao(supabase, deAlunoId);
  if (!o) return { erro: "Essa dieta não existe mais." };
  return {
    ok: true,
    dieta: {
      refeicoes: o.refeicoes.map((r, i) => ({ ...r, chave: `copia-${i}-${r.chave}` })),
      agua_litros: o.agua_litros,
      orientacoes: o.orientacoes,
    },
  };
}

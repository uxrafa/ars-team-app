import type { SupabaseClient } from "@supabase/supabase-js";
import type { Dia, Refeicao } from "@/lib/dieta";

export type OrientacaoNaTela = {
  publicada: boolean;
  agua_litros: number | null;
  orientacoes: string;
  fator_atividade: number | null;
  ajuste_pct: number | null;
  proteina_g_kg: number | null;
  gordura_g_kg: number | null;
  atualizado_em: string;
  refeicoes: Refeicao[];
};

type Bruto = {
  publicada: boolean;
  agua_litros: number | null;
  orientacoes: string | null;
  fator_atividade: number | null;
  ajuste_pct: number | null;
  proteina_g_kg: number | null;
  gordura_g_kg: number | null;
  atualizado_em: string;
  refeicao_alimentar: {
    id: string;
    dia: Dia;
    nome: string;
    horario: string | null;
    ordem: number;
    item_alimentar: {
      alimento_id: string | null;
      gramas: number | null;
      descricao: string | null;
      ordem: number;
    }[];
  }[];
};

/**
 * A orientação de um aluno no formato da tela.
 *
 * Serve ao painel e ao app do aluno: quem decide se a linha volta é a RLS
 * (o aluno só enxerga publicada), não este arquivo.
 */
export async function carregarOrientacao(
  supabase: SupabaseClient,
  alunoId: string,
): Promise<OrientacaoNaTela | null> {
  const { data } = await supabase
    .from("orientacao_alimentar")
    .select(
      "publicada, agua_litros, orientacoes, fator_atividade, ajuste_pct, proteina_g_kg, gordura_g_kg, atualizado_em, refeicao_alimentar (id, dia, nome, horario, ordem, item_alimentar (alimento_id, gramas, descricao, ordem))",
    )
    .eq("aluno_id", alunoId)
    .maybeSingle<Bruto>();

  if (!data) return null;

  const num = (v: number | null) => (v === null ? null : Number(v));

  return {
    publicada: data.publicada,
    agua_litros: num(data.agua_litros),
    orientacoes: data.orientacoes ?? "",
    fator_atividade: num(data.fator_atividade),
    ajuste_pct: data.ajuste_pct,
    proteina_g_kg: num(data.proteina_g_kg),
    gordura_g_kg: num(data.gordura_g_kg),
    atualizado_em: data.atualizado_em,
    refeicoes: [...(data.refeicao_alimentar ?? [])]
      .sort((a, b) => a.ordem - b.ordem)
      .map((r) => ({
        chave: r.id,
        dia: r.dia,
        nome: r.nome,
        // time vem "07:30:00"; o input de hora quer "07:30".
        horario: (r.horario ?? "").slice(0, 5),
        itens: [...(r.item_alimentar ?? [])]
          .sort((a, b) => a.ordem - b.ordem)
          .map((i) => ({
            alimento_id: i.alimento_id,
            gramas: i.gramas === null ? null : Number(i.gramas),
            descricao: i.descricao ?? "",
          })),
      })),
  };
}

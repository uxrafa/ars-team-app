import type { SupabaseClient } from "@supabase/supabase-js";
import type { Metodo } from "@/lib/ficha";
import type { BlocoDoAluno, SerieFeita, SessaoDoAluno } from "@/lib/treino";

export type ProtocoloDoAluno = {
  id: string;
  nome: string;
  inicio: string;
  fim: string | null;
  observacoes: string | null;
};

type ItemBruto = {
  id: string;
  ordem: number;
  series: number;
  reps: string;
  descanso_seg: number;
  metodo: Metodo;
  observacao: string | null;
  exercicio_id: string;
  exercicio: {
    nome: string;
    grupo: string;
    video_url: string | null;
    instrucoes: string | null;
  } | null;
};

type BlocoBruto = {
  id: string;
  nome: string;
  foco: string | null;
  ordem: number;
  item_exercicio: ItemBruto[];
};

/**
 * A ficha que está no ar para este aluno.
 *
 * Só protocolo `ativo`: rascunho é invisível para ele, e isso está na policy
 * do banco, não aqui. O filtro abaixo é só para não trazer o encerrado junto.
 */
export async function carregarFichaAtiva(supabase: SupabaseClient, alunoId: string) {
  const { data: protocolo } = await supabase
    .from("protocolo")
    .select("id, nome, inicio, fim, observacoes")
    .eq("aluno_id", alunoId)
    .eq("status", "ativo")
    .maybeSingle<ProtocoloDoAluno>();

  if (!protocolo) return { protocolo: null, blocos: [] as BlocoDoAluno[] };

  const { data } = await supabase
    .from("bloco_treino")
    .select(
      "id, nome, foco, ordem, item_exercicio (id, ordem, series, reps, descanso_seg, metodo, observacao, exercicio_id, exercicio (nome, grupo, video_url, instrucoes))",
    )
    .eq("protocolo_id", protocolo.id)
    .order("ordem");

  const blocos: BlocoDoAluno[] = ((data ?? []) as unknown as BlocoBruto[])
    .sort((a, b) => a.ordem - b.ordem)
    .map((b) => ({
      id: b.id,
      nome: b.nome,
      foco: b.foco,
      ordem: b.ordem,
      itens: [...(b.item_exercicio ?? [])]
        .sort((x, y) => x.ordem - y.ordem)
        .map((i) => ({
          id: i.id,
          ordem: i.ordem,
          series: i.series,
          reps: i.reps,
          descanso_seg: i.descanso_seg,
          metodo: i.metodo,
          observacao: i.observacao,
          exercicio_id: i.exercicio_id,
          nome: i.exercicio?.nome ?? "Exercício",
          grupo: i.exercicio?.grupo ?? "outros",
          video_url: i.exercicio?.video_url ?? null,
          instrucoes: i.exercicio?.instrucoes ?? null,
        })),
    }));

  return { protocolo, blocos };
}

/** As últimas sessões, que é o que conta sequência e diz qual treino é o de hoje. */
export async function carregarSessoes(
  supabase: SupabaseClient,
  alunoId: string,
  limite = 120,
): Promise<SessaoDoAluno[]> {
  const { data } = await supabase
    .from("sessao_treino")
    .select("id, bloco_id, data, status, concluida_em")
    .eq("aluno_id", alunoId)
    .order("data", { ascending: false })
    .limit(limite);

  return (data ?? []) as SessaoDoAluno[];
}

export async function carregarSeries(
  supabase: SupabaseClient,
  sessaoId: string,
): Promise<SerieFeita[]> {
  const { data } = await supabase
    .from("serie_registrada")
    .select("id, exercicio_id, numero, carga_kg, reps")
    .eq("sessao_id", sessaoId)
    .order("numero");

  return ((data ?? []) as SerieFeita[]).map((s) => ({
    ...s,
    carga_kg: s.carga_kg === null ? null : Number(s.carga_kg),
  }));
}

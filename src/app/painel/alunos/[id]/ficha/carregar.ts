import type { SupabaseClient } from "@supabase/supabase-js";
import type { BlocoNaTela, Metodo } from "@/lib/ficha";

type ItemBruto = {
  id: string;
  exercicio_id: string;
  ordem: number;
  series: number;
  reps: string;
  descanso_seg: number;
  metodo: Metodo;
  observacao: string | null;
  exercicio: { nome: string; grupo: string } | null;
};

type BlocoBruto = {
  id: string;
  nome: string;
  foco: string | null;
  ordem: number;
  item_exercicio: ItemBruto[];
};

/**
 * Lê a ficha do banco no formato que a tela usa.
 *
 * Existe em arquivo separado porque é usada nos dois lados: a página monta o
 * estado inicial com ela, e a server action de salvar devolve o resultado com
 * ela. Isso é o que garante que, depois de gravar, a tela passe a conhecer os
 * ids que o banco acabou de criar. Sem isso, salvar duas vezes seguidas criaria
 * os mesmos exercícios de novo e apagaria os primeiros, levando junto o
 * vínculo com o que o aluno já treinou.
 */
export async function carregarBlocos(
  supabase: SupabaseClient,
  protocoloId: string,
): Promise<BlocoNaTela[]> {
  const { data } = await supabase
    .from("bloco_treino")
    .select(
      "id, nome, foco, ordem, item_exercicio (id, exercicio_id, ordem, series, reps, descanso_seg, metodo, observacao, exercicio (nome, grupo))",
    )
    .eq("protocolo_id", protocoloId)
    .order("ordem");

  return ((data ?? []) as unknown as BlocoBruto[])
    .sort((a, b) => a.ordem - b.ordem)
    .map((b) => ({
      id: b.id,
      nome: b.nome,
      foco: b.foco ?? "",
      itens: [...(b.item_exercicio ?? [])]
        .sort((x, y) => x.ordem - y.ordem)
        .map((i) => ({
          id: i.id,
          exercicio_id: i.exercicio_id,
          nome: i.exercicio?.nome ?? "Exercício",
          grupo: i.exercicio?.grupo ?? "outros",
          series: i.series,
          reps: i.reps,
          descanso_seg: i.descanso_seg,
          metodo: i.metodo,
          observacao: i.observacao ?? "",
        })),
    }));
}

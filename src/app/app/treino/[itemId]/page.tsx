import { notFound, redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { idDoYoutube } from "@/lib/biblioteca";
import { vizinhos } from "@/lib/treino";
import { carregarFichaAtiva, carregarSeries } from "../../carregar";
import { Execucao } from "./execucao";

export const metadata = { title: "Exercício · ARS Team" };

type SerieAntiga = {
  numero: number;
  carga_kg: number | null;
  reps: number | null;
  sessao_treino: { data: string } | null;
};

export default async function PaginaDoExercicio({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;
  const supabase = await criarClienteServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: sessao } = await supabase
    .from("sessao_treino")
    .select("id, bloco_id")
    .eq("aluno_id", user?.id ?? "")
    .eq("status", "em_andamento")
    .maybeSingle<{ id: string; bloco_id: string | null }>();

  if (!sessao) redirect("/app");

  const { blocos } = await carregarFichaAtiva(supabase, user?.id ?? "");
  const bloco = blocos.find((b) => b.id === sessao.bloco_id);
  if (!bloco) redirect("/app");

  const item = bloco.itens.find((i) => i.id === itemId);
  if (!item) notFound();

  const series = await carregarSeries(supabase, sessao.id);

  /**
   * O que ele fez da última vez neste exercício.
   *
   * É o que faz a tela já vir preenchida com a carga certa, em vez de pedir
   * que ele lembre no meio do treino. Traz as séries de todas as sessões
   * anteriores e fica com as do dia mais recente.
   */
  const { data: antigas } = await supabase
    .from("serie_registrada")
    .select("numero, carga_kg, reps, sessao_treino!inner (data)")
    .eq("exercicio_id", item.exercicio_id)
    .neq("sessao_id", sessao.id)
    .order("concluida_em", { ascending: false })
    .limit(40);

  const linhas = ((antigas ?? []) as unknown as SerieAntiga[]).filter(
    (s) => s.sessao_treino?.data,
  );
  const ultimaData = linhas[0]?.sessao_treino?.data ?? null;
  const ultimaVez = ultimaData
    ? {
        data: ultimaData,
        series: linhas
          .filter((s) => s.sessao_treino?.data === ultimaData)
          .map((s) => ({
            numero: s.numero,
            carga_kg: s.carga_kg === null ? null : Number(s.carga_kg),
            reps: s.reps,
          }))
          .sort((a, b) => a.numero - b.numero),
      }
    : null;

  const { onde, anterior, proximo } = vizinhos(bloco, item.id);

  return (
    <Execucao
      item={item}
      blocoNome={bloco.nome}
      posicao={onde + 1}
      total={bloco.itens.length}
      anteriorId={anterior?.id ?? null}
      proximoId={proximo?.id ?? null}
      feitas={series.filter((s) => s.exercicio_id === item.exercicio_id)}
      ultimaVez={ultimaVez}
      videoId={idDoYoutube(item.video_url)}
    />
  );
}

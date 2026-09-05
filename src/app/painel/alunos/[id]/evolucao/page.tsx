import { notFound } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { carregarAluno } from "../carregar";
import { cargasQueSubiram, type SerieHistorica } from "@/lib/treino";
import type { Ponto } from "@/app/app/evolucao/grafico";
import { VisaoDaEvolucaoDoAluno, type FotoNaTela, type MedidaNaTela } from "./visao";

export const metadata = { title: "Evolução do aluno · ARS Team" };

type MedidaCrua = {
  data: string;
  peso_kg: number | string | null;
  cintura_cm: number | string | null;
  quadril_cm: number | string | null;
  braco_cm: number | string | null;
  coxa_cm: number | string | null;
};

type SerieCrua = {
  exercicio_id: string;
  carga_kg: number | string | null;
  reps: number | null;
  sessao_treino: { data: string; status: string } | null;
  exercicio: { nome: string } | null;
};

const paraNumero = (v: number | string | null): number | null =>
  v === null || v === undefined ? null : Number(v);

/** Esta página só busca. Quem desenha é a VisaoDaEvolucaoDoAluno. */
export default async function EvolucaoDoAluno({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await criarClienteServidor();

  // Vem do mesmo `cache` que o layout ja aqueceu nesta requisicao.
  const aluno = await carregarAluno(id);
  if (!aluno) notFound();

  const [{ data: medidas }, { data: fotos }, { data: series }] = await Promise.all([
    supabase
      .from("medida_corporal")
      .select("data, peso_kg, cintura_cm, quadril_cm, braco_cm, coxa_cm")
      .eq("aluno_id", id)
      .order("data")
      .limit(180),
    supabase
      .from("foto_evolucao")
      .select("data, angulo, caminho")
      .eq("aluno_id", id)
      .order("data", { ascending: false })
      .limit(12),
    supabase
      .from("serie_registrada")
      .select(
        "exercicio_id, carga_kg, reps, sessao_treino!inner (data, status, aluno_id), exercicio!inner (nome)",
      )
      .eq("sessao_treino.aluno_id", id)
      // Concluida no join, e nao peneirada em JS depois de vir.
      .eq("sessao_treino.status", "concluida")
      .order("concluida_em", { ascending: false })
      .limit(240),
  ]);

  const linhas = ((medidas ?? []) as MedidaCrua[]).map((m) => ({
    data: m.data,
    peso_kg: paraNumero(m.peso_kg),
    cintura_cm: paraNumero(m.cintura_cm),
    quadril_cm: paraNumero(m.quadril_cm),
    braco_cm: paraNumero(m.braco_cm),
    coxa_cm: paraNumero(m.coxa_cm),
  }));

  const pontos: Ponto[] = linhas
    .filter((m) => m.peso_kg !== null)
    .map((m) => ({ data: m.data, valor: m.peso_kg as number }));

  const ultimaMedida: MedidaNaTela | null = linhas.length
    ? (linhas[linhas.length - 1] as MedidaNaTela)
    : null;

  // O bucket é privado: cada foto vira link temporário de uma hora.
  const caminhos = (fotos ?? []) as { data: string; angulo: string; caminho: string }[];
  let comUrl: FotoNaTela[] = [];
  if (caminhos.length) {
    const { data: assinadas } = await supabase.storage
      .from("evolucao")
      .createSignedUrls(
        caminhos.map((f) => f.caminho),
        60 * 60,
      );
    comUrl = caminhos
      .map((f, i) => ({ data: f.data, angulo: f.angulo, url: assinadas?.[i]?.signedUrl ?? "" }))
      .filter((f) => f.url);
  }

  const cru = (series ?? []) as unknown as SerieCrua[];
  const historico: SerieHistorica[] = cru.map((s) => ({
    exercicio_id: s.exercicio_id,
    carga_kg: paraNumero(s.carga_kg),
    reps: s.reps,
    data: s.sessao_treino!.data,
  }));
  const nomes = new Map(cru.map((s) => [s.exercicio_id, s.exercicio?.nome ?? "Exercício"]));

  return (
    <VisaoDaEvolucaoDoAluno
      pontos={pontos}
      ultimaMedida={ultimaMedida}
      subiram={cargasQueSubiram(historico, nomes).slice(0, 8)}
      fotos={comUrl}
      primeiroNome={aluno.nome.split(" ")[0]}
    />
  );
}

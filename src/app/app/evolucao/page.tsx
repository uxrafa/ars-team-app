import { criarClienteServidor } from "@/lib/supabase/server";
import { cargasQueSubiram, type SerieHistorica } from "@/lib/treino";
import type { Ponto } from "./grafico";
import type { FotoNaTela } from "./fotos";
import { VisaoDaEvolucao, type LinhaMedida } from "./visao";

export const metadata = { title: "Evolução · ARS Team" };

type LinhaSerie = {
  exercicio_id: string;
  carga_kg: number | null;
  reps: number | null;
  sessao_treino: { data: string; status: string } | null;
  exercicio: { nome: string } | null;
};

/** Esta página só busca. Quem desenha é a VisaoDaEvolucao. */
export default async function Evolucao() {
  const supabase = await criarClienteServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const alunoId = user?.id ?? "";

  const [{ data: medidas }, { data: fotos }, { data: series }, { data: anamnese }] =
    await Promise.all([
      supabase
        .from("medida_corporal")
        .select("data, peso_kg, cintura_cm, quadril_cm, braco_cm, coxa_cm")
        .eq("aluno_id", alunoId)
        .order("data")
        .limit(180),
      // ORDEM CRESCENTE, E O LIMITE E ALTO DE PROPOSITO.
      //
      // A comparacao desta tela e sempre contra a PRIMEIRA foto (`datas[0]`
      // em fotos.tsx) -- e a foto do comeco que da sentido ao antes e depois.
      // Cortar pelas mais recentes economizaria links assinados e destruiria
      // justamente a referencia: em poucos meses o "antes" passaria a ser o
      // mes passado. 60 linhas sao 20 envios de tres angulos.
      supabase
        .from("foto_evolucao")
        .select("data, angulo, caminho")
        .eq("aluno_id", alunoId)
        .order("data")
        .limit(60),
      // O `status = concluida` vai no join, e nao num filtro em JS depois:
      // assim as 240 linhas do limite sao 240 series que valem, em vez de
      // incluir sessoes abandonadas que seriam descartadas aqui dentro.
      supabase
        .from("serie_registrada")
        .select(
          "exercicio_id, carga_kg, reps, sessao_treino!inner (data, status), exercicio!inner (nome)",
        )
        .eq("sessao_treino.status", "concluida")
        .order("concluida_em", { ascending: false })
        .limit(240),
      supabase
        .from("anamnese")
        .select("objetivo")
        .eq("aluno_id", alunoId)
        .maybeSingle<{ objetivo: string | null }>(),
    ]);

  const linhas = ((medidas ?? []) as LinhaMedida[]).map((m) => ({
    ...m,
    peso_kg: m.peso_kg === null ? null : Number(m.peso_kg),
  }));

  const pontos: Ponto[] = linhas
    .filter((m) => m.peso_kg !== null)
    .map((m) => ({ data: m.data, valor: m.peso_kg as number }));

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

  // Ja vem so o que foi concluido, filtrado no join.
  const cru = (series ?? []) as unknown as LinhaSerie[];
  const historico: SerieHistorica[] = cru.map((s) => ({
    exercicio_id: s.exercicio_id,
    carga_kg: s.carga_kg === null ? null : Number(s.carga_kg),
    reps: s.reps,
    data: s.sessao_treino!.data,
  }));
  const nomes = new Map(cru.map((s) => [s.exercicio_id, s.exercicio?.nome ?? "Exercício"]));

  return (
    <VisaoDaEvolucao
      pontos={pontos}
      ultimaLinha={linhas[linhas.length - 1] ?? null}
      subiram={cargasQueSubiram(historico, nomes).slice(0, 6)}
      alunoId={alunoId}
      fotos={comUrl}
      objetivo={anamnese?.objetivo ?? null}
    />
  );
}

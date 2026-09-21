import { notFound } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { carregarAluno } from "../carregar";
import { hojeSP } from "@/lib/painel";
import { horaSP } from "@/lib/feed";
import {
  inicioDaJanela,
  semanasDeTreino,
  type SerieDoHistorico,
  type SessaoDoHistorico,
} from "@/lib/aluno";
import { evolucaoPorExercicio, type SerieParaEvolucao } from "@/lib/evolucao";
import { VisaoDosTreinosDoAluno, type TreinoNaLista } from "./visao";

export const metadata = { title: "Treinos do aluno · ARS Team" };

type SessaoCrua = {
  id: string;
  data: string;
  esforco: number | null;
  nota: string | null;
  concluida_em: string | null;
  bloco_treino: { nome: string } | null;
};

type SerieCrua = {
  sessao_id: string;
  exercicio_id: string;
  numero: number;
  carga_kg: string | number | null;
  reps: number | null;
  exercicio: { nome: string } | null;
};

const paraNumero = (v: string | number | null): number | null =>
  v === null || v === undefined ? null : Number(v);

function curta(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano.slice(2)}`;
}

/** Esta página só busca. Quem desenha é a VisaoDosTreinosDoAluno. */
export default async function TreinosDoAluno({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await criarClienteServidor();
  const hoje = hojeSP();

  // Vem do mesmo `cache` que o layout ja aqueceu nesta requisicao.
  const aluno = await carregarAluno(id);
  if (!aluno) notFound();

  const desde = inicioDaJanela(hoje);

  const { data: sessoes } = await supabase
    .from("sessao_treino")
    .select("id, data, esforco, nota, concluida_em, bloco_treino (nome)")
    .eq("aluno_id", id)
    .eq("status", "concluida")
    .gte("data", desde)
    .order("data", { ascending: false })
    .limit(120);

  const cruas = (sessoes ?? []) as unknown as SessaoCrua[];
  const ids = cruas.map((s) => s.id);

  // As mesmas séries servem ao volume por semana e à evolução por exercício:
  // uma consulta só, com o exercício e o número da série junto.
  const { data: series } = ids.length
    ? await supabase
        .from("serie_registrada")
        .select("sessao_id, exercicio_id, numero, carga_kg, reps, exercicio (nome)")
        .in("sessao_id", ids)
    : { data: [] as unknown[] };

  const cruasSerie = (series ?? []) as unknown as SerieCrua[];

  const linhasSerie: SerieDoHistorico[] = cruasSerie.map((s) => ({
    sessao_id: s.sessao_id,
    carga_kg: paraNumero(s.carga_kg),
    reps: s.reps,
  }));

  const linhasSessao: SessaoDoHistorico[] = cruas.map((s) => ({
    id: s.id,
    data: s.data,
    esforco: s.esforco,
    nota: s.nota?.trim() || null,
    bloco: s.bloco_treino?.nome ?? null,
  }));

  // Uma passada só para somar série e volume por sessão, em vez de varrer a
  // lista inteira dentro do map de baixo.
  const porSessao = new Map<string, { series: number; volume: number }>();
  for (const s of linhasSerie) {
    const atual = porSessao.get(s.sessao_id) ?? { series: 0, volume: 0 };
    atual.series += 1;
    atual.volume += (s.carga_kg ?? 0) * (s.reps ?? 0);
    porSessao.set(s.sessao_id, atual);
  }

  const treinos: TreinoNaLista[] = cruas.map((s) => {
    const conta = porSessao.get(s.id) ?? { series: 0, volume: 0 };
    return {
      id: s.id,
      data: curta(s.data),
      hora: horaSP(s.concluida_em),
      bloco: s.bloco_treino?.nome ?? "Treino",
      esforco: s.esforco,
      nota: s.nota?.trim() || null,
      series: conta.series,
      volumeKg: Math.round(conta.volume),
    };
  });

  const dataDaSessao = new Map(cruas.map((s) => [s.id, s.data]));
  const nomes = new Map(cruasSerie.map((s) => [s.exercicio_id, s.exercicio?.nome ?? "Exercício"]));
  const exercicios = evolucaoPorExercicio(
    cruasSerie
      .filter((s) => dataDaSessao.has(s.sessao_id))
      .map<SerieParaEvolucao>((s) => ({
        exercicio_id: s.exercicio_id,
        numero: s.numero,
        carga_kg: paraNumero(s.carga_kg),
        reps: s.reps,
        data: dataDaSessao.get(s.sessao_id)!,
      })),
    nomes,
  );

  return (
    <VisaoDosTreinosDoAluno
      exercicios={exercicios}
      semanas={semanasDeTreino(linhasSessao, linhasSerie, hoje)}
      treinos={treinos.slice(0, 40)}
      primeiroNome={aluno.nome.split(" ")[0]}
    />
  );
}

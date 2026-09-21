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
import { evolucaoPorExercicio, faixaDeReps, type SerieParaEvolucao } from "@/lib/evolucao";
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

type FichaCrua = {
  bloco_treino: { ordem: number; item_exercicio: { exercicio_id: string; reps: string; ordem: number }[] }[];
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
  // uma consulta só, com o exercício e o número da série junto. E a faixa de
  // reps da ficha ativa vem em paralelo, para o gráfico desenhar a referência.
  const [{ data: series }, { data: fichaAtiva }] = await Promise.all([
    ids.length
      ? supabase
          .from("serie_registrada")
          .select("sessao_id, exercicio_id, numero, carga_kg, reps, exercicio (nome)")
          .in("sessao_id", ids)
      : Promise.resolve({ data: [] as unknown[] }),
    // Embute de cima para baixo (ficha > treinos > itens): e o formato que
    // o resto do app ja usa, e o indice parcial de uma ficha ativa por aluno
    // garante que volta uma linha so.
    supabase
      .from("protocolo")
      .select("bloco_treino (ordem, item_exercicio (exercicio_id, reps, ordem))")
      .eq("aluno_id", id)
      .eq("status", "ativo")
      .maybeSingle(),
  ]);

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

  // O mesmo exercício pode estar em dois treinos da ficha com faixas
  // diferentes; fica a primeira que aparecer. Faixa ilegível ("falha") fica
  // de fora, e o gráfico só não desenha referência.
  const faixas: Record<string, { min: number; max: number; texto: string }> = {};
  const itensDaFicha = (
    ((fichaAtiva as FichaCrua | null)?.bloco_treino ?? [])
      .sort((a, b) => a.ordem - b.ordem)
      .flatMap((b) => [...(b.item_exercicio ?? [])].sort((a, c) => a.ordem - c.ordem))
  );
  for (const item of itensDaFicha) {
    if (faixas[item.exercicio_id]) continue;
    const f = faixaDeReps(item.reps);
    if (f) faixas[item.exercicio_id] = { ...f, texto: item.reps.trim() };
  }

  return (
    <VisaoDosTreinosDoAluno
      exercicios={exercicios}
      faixas={faixas}
      semanas={semanasDeTreino(linhasSessao, linhasSerie, hoje)}
      treinos={treinos.slice(0, 40)}
      primeiroNome={aluno.nome.split(" ")[0]}
    />
  );
}

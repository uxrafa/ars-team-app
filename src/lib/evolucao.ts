/**
 * Um exercício ao longo do tempo: a regra por trás do gráfico do Allisson.
 *
 * A pergunta que ele responde é uma só -- "ele está progredindo no que eu
 * mandei, ou empacou na série 3?" -- e por isso o desenho é UMA LINHA POR
 * SÉRIE, e não a melhor carga do dia. A melhor carga esconde justamente a
 * série que cai: quem faz 40 kg na primeira e 30 na terceira aparece como
 * "40 kg" e parece estar ótimo.
 *
 * Aquecimento não entra aqui, e não precisa de filtro: desde a migração 0016
 * ele vive em `aquecimento_feito`, e `serie_registrada` é só trabalho válido.
 *
 * Função pura, sem banco nem tela, como `painel.ts` e `feed.ts`.
 */

/** Uma série registrada, já com a data da sessão em que foi feita. */
export type SerieParaEvolucao = {
  exercicio_id: string;
  numero: number;
  carga_kg: number | null;
  reps: number | null;
  /** Data da sessão (aaaa-mm-dd), e não o carimbo da série. */
  data: string;
};

export type SerieNoDia = { numero: number; carga: number | null; reps: number | null };

export type DiaDoExercicio = { data: string; series: SerieNoDia[] };

export type ExercicioComHistorico = {
  exercicio_id: string;
  nome: string;
  /** Do mais antigo para o mais novo, que é a ordem do eixo do tempo. */
  dias: DiaDoExercicio[];
  /** Os números de série que aparecem em algum dia, em ordem: [1, 2, 3]. */
  numeros: number[];
  ultimaData: string;
};

/**
 * Até cinco séries ganham linha. É o limite da rampa de cor validada (ver
 * `CORES_POR_QUANTIDADE`); a sexta em diante continua na tabela, que nunca
 * esconde nada.
 */
export const MAX_SERIES_NO_GRAFICO = 5;

/**
 * Agrupa as séries por exercício e por dia.
 *
 * Duas sessões no mesmo dia viram um dia só, e a mesma série repetida fica com
 * a maior carga: o eixo é de calendário, e dois pontos na mesma data virariam
 * um risco vertical sem significado.
 *
 * A lista sai do exercício feito mais recentemente para o mais antigo, que é a
 * ordem em que o Allisson vai procurar no seletor.
 */
export function evolucaoPorExercicio(
  linhas: SerieParaEvolucao[],
  nomes: Map<string, string>,
): ExercicioComHistorico[] {
  const porExercicio = new Map<string, Map<string, Map<number, SerieNoDia>>>();

  for (const l of linhas) {
    const dias = porExercicio.get(l.exercicio_id) ?? new Map<string, Map<number, SerieNoDia>>();
    const series = dias.get(l.data) ?? new Map<number, SerieNoDia>();
    const antes = series.get(l.numero);
    const carga = l.carga_kg === null ? null : Number(l.carga_kg);

    if (!antes || (carga ?? -1) > (antes.carga ?? -1)) {
      series.set(l.numero, { numero: l.numero, carga, reps: l.reps });
    }

    dias.set(l.data, series);
    porExercicio.set(l.exercicio_id, dias);
  }

  const saida: ExercicioComHistorico[] = [];
  for (const [exercicio_id, dias] of porExercicio) {
    const ordenados = [...dias.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([data, series]) => ({
        data,
        series: [...series.values()].sort((a, b) => a.numero - b.numero),
      }));

    const numeros = [...new Set(ordenados.flatMap((d) => d.series.map((s) => s.numero)))].sort(
      (a, b) => a - b,
    );

    saida.push({
      exercicio_id,
      nome: nomes.get(exercicio_id) ?? "Exercício",
      dias: ordenados,
      numeros,
      ultimaData: ordenados[ordenados.length - 1].data,
    });
  }

  return saida.sort(
    (a, b) => b.ultimaData.localeCompare(a.ultimaData) || a.nome.localeCompare(b.nome, "pt-BR"),
  );
}

/**
 * A faixa de repetições que o Allisson prescreveu, lida do texto da ficha.
 *
 * `item_exercicio.reps` é texto de propósito (cabe "6-10", "12", "falha",
 * "30s"), então nem sempre existe faixa. Sem faixa, o gráfico só não desenha
 * a referência -- não inventa uma.
 */
export function faixaDeReps(texto: string | null | undefined): { min: number; max: number } | null {
  if (!texto) return null;
  const limpo = texto.toLowerCase().replace(/\s+/g, " ").trim();

  const faixa = limpo.match(/^(\d{1,3})\s*(?:-|–|a|até)\s*(\d{1,3})$/);
  if (faixa) {
    const a = Number(faixa[1]);
    const b = Number(faixa[2]);
    if (a <= 0 || b <= 0) return null;
    return { min: Math.min(a, b), max: Math.max(a, b) };
  }

  const unico = limpo.match(/^(\d{1,3})$/);
  if (unico) {
    const n = Number(unico[1]);
    return n > 0 ? { min: n, max: n } : null;
  }

  return null;
}

export type VariacaoDaSerie = {
  numero: number;
  de: number;
  para: number;
  /** Positivo subiu, negativo caiu, zero ficou. */
  diferenca: number;
};

/**
 * Quanto a carga de cada série andou, do primeiro dia com carga ao último.
 *
 * É a linha de texto embaixo do gráfico ("S1 +5 kg · S3 igual"), e existe
 * porque o gráfico mostra a forma e esta linha mostra o número, sem precisar
 * passar o mouse. Série com um dia só não tem variação e fica de fora.
 */
export function variacaoPorSerie(exercicio: ExercicioComHistorico): VariacaoDaSerie[] {
  const saida: VariacaoDaSerie[] = [];

  for (const numero of exercicio.numeros.slice(0, MAX_SERIES_NO_GRAFICO)) {
    const cargas = exercicio.dias
      .map((d) => d.series.find((s) => s.numero === numero)?.carga ?? null)
      .filter((c): c is number => c !== null);

    if (cargas.length < 2) continue;
    const de = cargas[0];
    const para = cargas[cargas.length - 1];
    saida.push({ numero, de, para, diferenca: Math.round((para - de) * 100) / 100 });
  }

  return saida;
}

/**
 * As cores das linhas, por quantidade de séries.
 *
 * UM TOM SÓ, e não uma cor por série: série é ordenada (1ª, 2ª, 3ª), então a
 * rampa de claro para escuro diz a ordem sozinha. E sobra cor para o resto do
 * app -- o vermelho é da marca e de "urgente", o verde é de "feito", o âmbar é
 * de atenção. Um gráfico que usasse os três para série confundiria o Allisson
 * na primeira vez que visse verde e pensasse "tudo certo".
 *
 * Azul porque não aparece em nenhum outro lugar da interface.
 *
 * Cada conjunto passou no validador da skill de dataviz em modo ordinal,
 * contra o fundo do cartão (#101013): tom único, claridade monotônica, degrau
 * visível entre vizinhas e a ponta escura acima de 2:1. Identidade nunca fica
 * só na cor: toda linha tem rótulo "S1", "S2" na ponta e na legenda.
 */
export const CORES_POR_QUANTIDADE: Record<number, readonly string[]> = {
  1: ["#3987e5"],
  // Degraus abertos ao máximo que a rampa permite. A primeira versão usava
  // degraus mais próximos, passava no validador do mesmo jeito, e na tela a
  // série 2 e a 3 pareciam a mesma linha. Passar no validador é o piso.
  2: ["#b7d3f6", "#2a78d6"],
  3: ["#b7d3f6", "#5598e7", "#1c5cab"],
  4: ["#cde2fb", "#86b6ef", "#3987e5", "#1c5cab"],
  5: ["#cde2fb", "#9ec5f4", "#5598e7", "#2a78d6", "#184f95"],
};

export function coresDasSeries(quantas: number): readonly string[] {
  const n = Math.max(1, Math.min(MAX_SERIES_NO_GRAFICO, quantas));
  return CORES_POR_QUANTIDADE[n];
}

/** "37,5" e "40": carga sem ",0" sobrando. */
export function kg(valor: number): string {
  return Number.isInteger(valor) ? String(valor) : String(valor).replace(".", ",");
}

/** "S1 +5 kg", "S3 −2,5 kg", "S2 igual". */
export function rotuloDaVariacao(v: VariacaoDaSerie): string {
  if (v.diferenca === 0) return `S${v.numero} igual`;
  const sinal = v.diferenca > 0 ? "+" : "−";
  return `S${v.numero} ${sinal}${kg(Math.abs(v.diferenca))} kg`;
}

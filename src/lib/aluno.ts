/**
 * Regras da tela de um aluno so.
 *
 * Ate aqui o painel respondia "como esta a turma". Esta camada responde "como
 * esta o Marcos", que e a pergunta que o Allisson faz antes de mexer na ficha
 * ou de mandar mensagem.
 *
 * Funcao pura, sem import de execucao, igual ao `feed.ts`: da para conferir a
 * conta sem subir o Supabase.
 */

/** Quantas semanas o grafico mostra. Oito cobrem dois ciclos de ficha. */
export const SEMANAS_NO_GRAFICO = 8;

export type SessaoDoHistorico = {
  id: string;
  data: string;
  esforco: number | null;
  nota: string | null;
  bloco: string | null;
};

export type SerieDoHistorico = {
  sessao_id: string;
  carga_kg: number | null;
  reps: number | null;
};

export type SemanaDeTreino = {
  /** Segunda-feira da semana, em aaaa-mm-dd. */
  inicio: string;
  /** "24 ago" */
  rotulo: string;
  treinos: number;
  series: number;
  /** Soma de carga x reps. E o "volume" que o Allisson pediu. */
  volumeKg: number;
  /**
   * Carga media por serie. E a "intensidade": volume sozinho sobe so por
   * fazer mais series, e nao diz se o aluno esta puxando mais peso.
   */
  intensidadeKg: number | null;
  esforcoMedio: number | null;
};

const MESES = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

/**
 * A segunda-feira da semana daquela data.
 *
 * Lido como UTC de proposito: e dia de calendario, nao instante, e passar pelo
 * fuso do servidor jogaria a virada para o dia anterior.
 */
export function segundaDa(data: string): string {
  const d = new Date(data + "T00:00:00Z");
  const dow = d.getUTCDay(); // 0 = domingo
  const recuo = dow === 0 ? 6 : dow - 1;
  d.setUTCDate(d.getUTCDate() - recuo);
  return d.toISOString().slice(0, 10);
}

/** "24 ago" */
export function rotuloCurto(data: string): string {
  const d = new Date(data + "T00:00:00Z");
  return `${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`;
}

function somar(data: string, dias: number): string {
  const d = new Date(Date.parse(data + "T00:00:00Z") + dias * 86400000);
  return d.toISOString().slice(0, 10);
}

/**
 * As ultimas N semanas, incluindo as vazias.
 *
 * Semana sem treino PRECISA aparecer, e com barra zerada: e justamente o
 * buraco que interessa. Se so aparecessem as semanas com treino, duas semanas
 * sumidas viravam duas barras vizinhas e o grafico mentiria.
 */
export function semanasDeTreino(
  sessoes: SessaoDoHistorico[],
  series: SerieDoHistorico[],
  hoje: string,
  quantas = SEMANAS_NO_GRAFICO,
): SemanaDeTreino[] {
  const porSessao = new Map<string, SerieDoHistorico[]>();
  for (const s of series) {
    const lista = porSessao.get(s.sessao_id);
    if (lista) lista.push(s);
    else porSessao.set(s.sessao_id, [s]);
  }

  const primeira = somar(segundaDa(hoje), -7 * (quantas - 1));

  const semanas: SemanaDeTreino[] = Array.from({ length: quantas }, (_, i) => {
    const inicio = somar(primeira, i * 7);
    return {
      inicio,
      rotulo: rotuloCurto(inicio),
      treinos: 0,
      series: 0,
      volumeKg: 0,
      intensidadeKg: null,
      esforcoMedio: null,
    };
  });

  const indice = new Map(semanas.map((s, i) => [s.inicio, i]));
  const esforcos: number[][] = semanas.map(() => []);

  for (const sessao of sessoes) {
    const i = indice.get(segundaDa(sessao.data));
    if (i === undefined) continue;

    const semana = semanas[i];
    semana.treinos += 1;
    if (sessao.esforco !== null) esforcos[i].push(sessao.esforco);

    for (const serie of porSessao.get(sessao.id) ?? []) {
      semana.series += 1;
      semana.volumeKg += (serie.carga_kg ?? 0) * (serie.reps ?? 0);
    }
  }

  for (let i = 0; i < semanas.length; i += 1) {
    const s = semanas[i];
    s.volumeKg = Math.round(s.volumeKg);
    // Divide pelas series, e nao pelos treinos: e a carga media que ele levanta
    // em cada serie, que e o que muda quando o aluno evolui.
    s.intensidadeKg = s.series > 0 ? Math.round(s.volumeKg / s.series) : null;
    s.esforcoMedio = esforcos[i].length
      ? Math.round((esforcos[i].reduce((a, b) => a + b, 0) / esforcos[i].length) * 10) / 10
      : null;
  }

  return semanas;
}

/**
 * A data a partir da qual vale buscar sessao no banco.
 *
 * Sai daqui, e nao de um `Date.now()` dentro da pagina: o React trata chamada
 * impura no corpo do componente como erro, e uma funcao pura ainda por cima
 * da para conferir no teste. A folga existe para a lista de historico nao
 * terminar exatamente onde o grafico comeca.
 */
export function inicioDaJanela(
  hoje: string,
  quantas = SEMANAS_NO_GRAFICO,
  folgaDias = 30,
): string {
  return somar(segundaDa(hoje), -(7 * (quantas - 1) + folgaDias));
}

/** Variação entre a última semana com treino e a anterior com treino. */
export function variacaoDeVolume(semanas: SemanaDeTreino[]): number | null {
  const comTreino = semanas.filter((s) => s.treinos > 0);
  if (comTreino.length < 2) return null;
  const atual = comTreino[comTreino.length - 1].volumeKg;
  const antes = comTreino[comTreino.length - 2].volumeKg;
  if (antes <= 0) return null;
  return Math.round(((atual - antes) / antes) * 100);
}

/** Média de treinos por semana, contando só semanas em que houve algum. */
export function mediaSemanal(semanas: SemanaDeTreino[]): number | null {
  const comTreino = semanas.filter((s) => s.treinos > 0);
  if (!comTreino.length) return null;
  const total = comTreino.reduce((soma, s) => soma + s.treinos, 0);
  return Math.round((total / comTreino.length) * 10) / 10;
}

/** O maior volume da janela, para a barra mais alta virar 100%. */
export function tetoDoGrafico(semanas: SemanaDeTreino[]): number {
  return Math.max(1, ...semanas.map((s) => s.volumeKg));
}

/** Número grande com separador de milhar, como se lê em português. */
export function emMilhar(valor: number): string {
  return valor.toLocaleString("pt-BR");
}

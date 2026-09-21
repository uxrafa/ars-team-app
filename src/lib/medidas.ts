/**
 * O que a aba Medidas do aluno mostra: o valor atual de cada medida e quanto
 * ela mudou desde a primeira vez que foi medida.
 *
 * SEM GRÁFICO, de propósito. Quatro medidas em escalas diferentes (cintura em
 * 80, braço em 30) não cabem num gráfico só, e quatro gráficos pequenos seriam
 * informação demais para quem só quer saber "estou mudando?". O número e a
 * seta respondem isso.
 *
 * CADA MEDIDA ANDA SOZINHA. O aluno registra peso toda semana e medidas uma
 * vez por mês, e cada registro vira uma linha em `medida_corporal`. A primeira
 * versão da tela olhava só a última linha -- e, na primeira pesagem depois de
 * medir, as medidas sumiam da aba. Aqui cada uma pega o próprio último valor.
 */

export type LinhaMedida = {
  data: string;
  peso_kg: number | null;
  cintura_cm: number | null;
  quadril_cm: number | null;
  braco_cm: number | null;
  coxa_cm: number | null;
};

export const MEDIDAS = [
  ["cintura_cm", "Cintura"],
  ["quadril_cm", "Quadril"],
  ["braco_cm", "Braço"],
  ["coxa_cm", "Coxa"],
] as const;

export type ChaveDaMedida = (typeof MEDIDAS)[number][0];

export type MedidaNaTela = {
  chave: ChaveDaMedida;
  nome: string;
  atual: number | null;
  /** Atual menos a primeira. Nulo com menos de dois registros dessa medida. */
  diferenca: number | null;
};

export type ResumoDasMedidas = {
  itens: MedidaNaTela[];
  /** A primeira medição que entra em alguma comparação. */
  desde: string | null;
  /** A medição mais recente de qualquer medida. */
  ultima: string | null;
};

export function resumoDasMedidas(linhas: LinhaMedida[]): ResumoDasMedidas {
  const ordenadas = [...linhas].sort((a, b) => a.data.localeCompare(b.data));
  let desde: string | null = null;
  let ultima: string | null = null;

  const itens = MEDIDAS.map(([chave, nome]) => {
    const com = ordenadas.filter((l) => l[chave] !== null && l[chave] !== undefined);
    if (!com.length) return { chave, nome, atual: null, diferenca: null };

    const primeira = com[0];
    const recente = com[com.length - 1];
    const atual = Number(recente[chave]);
    if (!ultima || recente.data > ultima) ultima = recente.data;

    if (com.length < 2) return { chave, nome, atual, diferenca: null };
    if (!desde || primeira.data < desde) desde = primeira.data;
    // Uma casa, porque fita métrica não mede centésimo.
    const diferenca = Math.round((atual - Number(primeira[chave])) * 10) / 10;
    return { chave, nome, atual, diferenca };
  });

  return { itens, desde, ultima };
}

/** "↓ 2", "↑ 1,5", "=" -- sem sinal de mais ou menos, a seta já diz. */
export function rotuloDaDiferenca(d: number): string {
  if (d === 0) return "=";
  const n = Math.abs(d);
  return `${d < 0 ? "↓" : "↑"} ${Number.isInteger(n) ? n : String(n).replace(".", ",")}`;
}

/* ------------------------------------------------------------------ */
/* Peso por período                                                    */
/* ------------------------------------------------------------------ */

/**
 * Filtro de período do gráfico de peso (Rafael, 21/09: o aluno queria ver os
 * pesos antigos). "Tudo" vai até onde a tela carrega (180 registros).
 */
export const PERIODOS = [
  { valor: "1m", nome: "1 mês", dias: 31 },
  { valor: "3m", nome: "3 meses", dias: 92 },
  { valor: "6m", nome: "6 meses", dias: 183 },
  { valor: "tudo", nome: "Tudo", dias: null },
] as const;

export type Periodo = (typeof PERIODOS)[number]["valor"];

export type PontoDePeso = { data: string; valor: number };

/**
 * A janela conta a partir da ÚLTIMA pesagem, e não de hoje: quem ficou um mês
 * sem pesar abriria "1 mês" numa tela vazia, sem entender por quê.
 */
export function pontosDoPeriodo(pontos: PontoDePeso[], periodo: Periodo): PontoDePeso[] {
  const dias = PERIODOS.find((p) => p.valor === periodo)?.dias ?? null;
  if (dias === null || !pontos.length) return pontos;
  const ultimo = Date.parse(`${pontos[pontos.length - 1].data}T00:00:00Z`);
  const limite = new Date(ultimo - dias * 86400000).toISOString().slice(0, 10);
  return pontos.filter((p) => p.data >= limite);
}

/** Quanto mudou dentro da janela: último menos o primeiro dela. */
export function variacaoDoPeriodo(pontos: PontoDePeso[]): number | null {
  if (pontos.length < 2) return null;
  return pontos[pontos.length - 1].valor - pontos[0].valor;
}

/**
 * O ponto mais perto de onde o dedo tocou. Com pesagem semanal em seis meses
 * os pontos ficam a 12px um do outro, pequeno demais para acertar um a um; o
 * toque em qualquer lugar do gráfico escolhe o mais próximo.
 */
export function indiceMaisProximo(xs: number[], x: number): number {
  let melhor = 0;
  for (let i = 1; i < xs.length; i++) {
    if (Math.abs(xs[i] - x) < Math.abs(xs[melhor] - x)) melhor = i;
  }
  return melhor;
}

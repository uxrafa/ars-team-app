/**
 * Regras da área do aluno.
 *
 * Funções puras de propósito, iguais às do painel: recebem as linhas do banco
 * e devolvem o que a tela mostra. O que decide o treino do dia, a sequência e
 * o progresso mora aqui, não espalhado pelos componentes.
 */

import type { Metodo } from "./ficha";

/* ------------------------------------------------------------------ */
/* O que vem do banco                                                  */
/* ------------------------------------------------------------------ */

export type ItemDoTreino = {
  id: string;
  ordem: number;
  series: number;
  reps: string;
  descanso_seg: number;
  metodo: Metodo;
  observacao: string | null;
  exercicio_id: string;
  nome: string;
  grupo: string;
  video_url: string | null;
  instrucoes: string | null;
};

export type BlocoDoAluno = {
  id: string;
  nome: string;
  foco: string | null;
  ordem: number;
  itens: ItemDoTreino[];
};

export type SessaoDoAluno = {
  id: string;
  bloco_id: string | null;
  data: string;
  status: "em_andamento" | "concluida";
  concluida_em: string | null;
};

export type SerieFeita = {
  id: string;
  exercicio_id: string;
  numero: number;
  carga_kg: number | null;
  reps: number | null;
};

/* ------------------------------------------------------------------ */
/* Datas                                                               */
/* ------------------------------------------------------------------ */

/** Soma dias a uma data ISO curta, sem cair na armadilha do fuso local. */
export function somarDias(iso: string, dias: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + dias * 86400000)
    .toISOString()
    .slice(0, 10);
}

/** 0 = domingo, igual ao banco e ao `dias_disponiveis` da anamnese. */
export function diaDaSemanaDe(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getUTCDay();
}

/** "12 de agosto", que é como se lê uma data solta em português. */
export function porExtenso(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
  }).format(new Date(`${iso}T00:00:00Z`));
}

/** "Terça, 25 de agosto". É a linha de data do topo da tela Hoje. */
export function comDiaDaSemana(iso: string): string {
  const dia = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    weekday: "long",
  })
    .format(new Date(`${iso}T00:00:00Z`))
    .replace("-feira", "");
  return `${dia[0].toUpperCase()}${dia.slice(1)}, ${porExtenso(iso)}`;
}

/** "20/SET", que é como cabe uma data de vencimento numa linha de dado. */
export function curtaComMes(iso: string): string {
  const mes = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", month: "short" })
    .format(new Date(`${iso}T00:00:00Z`))
    .replace(/\./g, "")
    .toUpperCase();
  return `${iso.slice(8, 10)}/${mes}`;
}

/** "12/08". Para eixo de gráfico e legenda de foto, onde não cabe mais. */
export function curta(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

/* ------------------------------------------------------------------ */
/* Qual é o treino de hoje                                             */
/* ------------------------------------------------------------------ */

/** A sessão que ficou aberta. O banco garante no máximo uma por aluno. */
export function sessaoAberta(sessoes: SessaoDoAluno[]): SessaoDoAluno | null {
  return sessoes.find((s) => s.status === "em_andamento") ?? null;
}

export function concluidas(sessoes: SessaoDoAluno[]): SessaoDoAluno[] {
  return sessoes
    .filter((s) => s.status === "concluida")
    .sort((a, b) => (b.concluida_em ?? b.data).localeCompare(a.concluida_em ?? a.data));
}

/**
 * O treino do dia.
 *
 * Ficha A/B/C não é agenda: o banco não guarda "terça é o B", e nem o Allisson
 * prescreve assim. O que existe de verdade é a ordem. Então o treino do dia é
 * o próximo depois do último que o aluno fechou, girando no fim da lista. Ele
 * ainda pode escolher outro na tela; isto é só o palpite bom.
 */
export function proximoBloco(
  blocos: BlocoDoAluno[],
  sessoes: SessaoDoAluno[],
): BlocoDoAluno | null {
  if (!blocos.length) return null;

  const aberta = sessaoAberta(sessoes);
  if (aberta?.bloco_id) {
    const emCurso = blocos.find((b) => b.id === aberta.bloco_id);
    if (emCurso) return emCurso;
  }

  const ultima = concluidas(sessoes).find((s) => s.bloco_id);
  if (!ultima) return blocos[0];

  const onde = blocos.findIndex((b) => b.id === ultima.bloco_id);
  if (onde < 0) return blocos[0];
  return blocos[(onde + 1) % blocos.length];
}

/** Hoje é dia de treino segundo o que o aluno respondeu na anamnese. */
export function ehDiaDeTreino(dias: number[] | null, hoje: string): boolean {
  if (!dias || !dias.length) return true;
  return dias.includes(diaDaSemanaDe(hoje));
}

/**
 * Sequência: treinos seguidos sem furar.
 *
 * Descanso não quebra corrente. Contar só dia treinado daria "1" para quem
 * treina três vezes por semana religiosamente, que é o contrário do que a tela
 * quer dizer. Então o dia só quebra se era dia de treino pela anamnese e ele
 * não treinou. E o dia de hoje nunca quebra: ainda não acabou.
 */
export function sequencia(
  datasTreinadas: string[],
  diasDisponiveis: number[] | null,
  hoje: string,
): number {
  const feitos = new Set(datasTreinadas);
  const agenda = diasDisponiveis?.length ? new Set(diasDisponiveis) : null;

  let total = 0;
  for (let i = 0; i < 366; i++) {
    const dia = somarDias(hoje, -i);
    if (feitos.has(dia)) {
      total += 1;
      continue;
    }
    if (i === 0) continue;
    if (!agenda || agenda.has(diaDaSemanaDe(dia))) break;
  }
  return total;
}

export type EstadoDoDia = "feito" | "hoje" | "previsto" | "descanso";
export type DiaDaFaixa = { data: string; letra: string; estado: EstadoDoDia };

const LETRA_DO_DIA = ["D", "S", "T", "Q", "Q", "S", "S"];

/**
 * A faixa de sete dias do topo da tela Hoje.
 *
 * Começa na segunda, que é como o brasileiro lê semana. Um dia é "descanso"
 * quando não está entre os dias que o aluno marcou na anamnese: a bolinha
 * apagada ali não é falta, é folga prevista, e a tela não deve acusar quem
 * cumpriu o combinado.
 */
export function faixaDaSemana(
  datasTreinadas: string[],
  diasDisponiveis: number[] | null,
  hoje: string,
): DiaDaFaixa[] {
  const feitos = new Set(datasTreinadas);
  const agenda = diasDisponiveis?.length ? new Set(diasDisponiveis) : null;

  const dow = diaDaSemanaDe(hoje);
  const segunda = somarDias(hoje, dow === 0 ? -6 : 1 - dow);

  return Array.from({ length: 7 }, (_, i) => {
    const data = somarDias(segunda, i);
    const semana = diaDaSemanaDe(data);
    const estado: EstadoDoDia = feitos.has(data)
      ? "feito"
      : data === hoje
        ? "hoje"
        : agenda && !agenda.has(semana)
          ? "descanso"
          : "previsto";
    return { data, letra: LETRA_DO_DIA[semana], estado };
  });
}

/* ------------------------------------------------------------------ */
/* Progresso dentro do treino                                          */
/* ------------------------------------------------------------------ */

/** Quantas séries já entraram, por exercício. */
export function seriesPorExercicio(series: SerieFeita[]): Map<string, SerieFeita[]> {
  const mapa = new Map<string, SerieFeita[]>();
  for (const s of series) {
    const lista = mapa.get(s.exercicio_id) ?? [];
    lista.push(s);
    mapa.set(s.exercicio_id, lista);
  }
  for (const lista of mapa.values()) lista.sort((a, b) => a.numero - b.numero);
  return mapa;
}

export function exercicioCompleto(item: ItemDoTreino, feitas: SerieFeita[] | undefined): boolean {
  return (feitas?.length ?? 0) >= item.series;
}

export function progresso(bloco: BlocoDoAluno | null, series: SerieFeita[]) {
  const porExercicio = seriesPorExercicio(series);
  const itens = bloco?.itens ?? [];
  const feitos = itens.filter((i) => exercicioCompleto(i, porExercicio.get(i.exercicio_id))).length;
  const seriesPrescritas = itens.reduce((s, i) => s + i.series, 0);
  return {
    feitos,
    total: itens.length,
    seriesFeitas: series.length,
    seriesPrescritas,
    /** 0 a 1, para a barra. Sem exercício não existe barra, e não zero. */
    fracao: seriesPrescritas ? Math.min(1, series.length / seriesPrescritas) : 0,
  };
}

/** O primeiro que ainda falta. É para onde o botão "continuar" leva. */
export function proximoItem(
  bloco: BlocoDoAluno | null,
  series: SerieFeita[],
): ItemDoTreino | null {
  if (!bloco) return null;
  const porExercicio = seriesPorExercicio(series);
  return bloco.itens.find((i) => !exercicioCompleto(i, porExercicio.get(i.exercicio_id))) ?? null;
}

/** Vizinhos na lista, para as setas de anterior e próximo na execução. */
export function vizinhos(bloco: BlocoDoAluno, itemId: string) {
  const onde = bloco.itens.findIndex((i) => i.id === itemId);
  return {
    onde,
    anterior: onde > 0 ? bloco.itens[onde - 1] : null,
    proximo: onde >= 0 && onde < bloco.itens.length - 1 ? bloco.itens[onde + 1] : null,
  };
}

/* ------------------------------------------------------------------ */
/* Carga                                                               */
/* ------------------------------------------------------------------ */

/** Carga com vírgula e sem zero à toa: 22.50 vira "22,5". */
export function carga(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return "";
  const n = Number(valor);
  if (!Number.isFinite(n)) return "";
  return String(Math.round(n * 100) / 100).replace(".", ",");
}

/** Aceita "22,5" e "22.5", porque teclado de celular dá os dois. */
export function paraCarga(texto: string): number | null {
  const limpo = texto.trim().replace(",", ".");
  if (!limpo) return null;
  const n = Number(limpo);
  if (!Number.isFinite(n) || n < 0 || n > 999) return null;
  return Math.round(n * 100) / 100;
}

export function paraReps(texto: string): number | null {
  const limpo = texto.trim();
  if (!limpo) return null;
  const n = Number(limpo);
  if (!Number.isInteger(n) || n < 0 || n > 500) return null;
  return n;
}

export type SerieHistorica = {
  exercicio_id: string;
  carga_kg: number | null;
  reps: number | null;
  data: string;
};

/** A melhor carga de cada dia, por exercício, do mais novo para o mais velho. */
export function historicoDeCarga(linhas: SerieHistorica[]) {
  const porExercicio = new Map<string, Map<string, number>>();
  for (const l of linhas) {
    if (l.carga_kg === null) continue;
    const dias = porExercicio.get(l.exercicio_id) ?? new Map<string, number>();
    dias.set(l.data, Math.max(dias.get(l.data) ?? 0, Number(l.carga_kg)));
    porExercicio.set(l.exercicio_id, dias);
  }

  const saida = new Map<string, { data: string; carga: number }[]>();
  for (const [exercicio, dias] of porExercicio) {
    saida.set(
      exercicio,
      [...dias.entries()]
        .map(([data, c]) => ({ data, carga: c }))
        .sort((a, b) => b.data.localeCompare(a.data)),
    );
  }
  return saida;
}

export type CargaQueSubiu = { exercicio_id: string; nome: string; de: number; para: number };

/**
 * O que a Evolução mostra: exercício em que a última carga foi maior que a
 * anterior. Compara dia com dia, e não série com série, porque série leve de
 * aquecimento no meio do treino não é queda de carga.
 */
export function cargasQueSubiram(
  linhas: SerieHistorica[],
  nomes: Map<string, string>,
): CargaQueSubiu[] {
  const historico = historicoDeCarga(linhas);
  const subiram: CargaQueSubiu[] = [];

  for (const [exercicio, dias] of historico) {
    if (dias.length < 2) continue;
    const [ultimo, penultimo] = dias;
    if (ultimo.carga > penultimo.carga) {
      subiram.push({
        exercicio_id: exercicio,
        nome: nomes.get(exercicio) ?? "Exercício",
        de: penultimo.carga,
        para: ultimo.carga,
      });
    }
  }

  return subiram.sort((a, b) => b.para - b.de - (a.para - a.de));
}

/* ------------------------------------------------------------------ */
/* Esforço                                                             */
/* ------------------------------------------------------------------ */

/**
 * Escala de esforço percebido, encurtada para caber no celular. A escala
 * clássica vai de 1 a 10; aqui o aluno toca em cinco degraus e o banco recebe
 * o número do meio de cada faixa.
 */
export const ESFORCOS = [
  [2, "Leve", "Sobrou muito"],
  [4, "Tranquilo", "Deu para conversar"],
  [6, "Certo", "Puxado no ponto"],
  [8, "Pesado", "Últimas repetições difíceis"],
  [10, "No limite", "Não fazia mais nenhuma"],
] as const;

/* ------------------------------------------------------------------ */
/* Tempo de treino                                                     */
/* ------------------------------------------------------------------ */

/** Segundos de execução que se conta para cada série, fora o descanso. */
const SEGUNDOS_POR_SERIE = 45;

/**
 * Quanto tempo o treino deve levar.
 *
 * Serve para o aluno decidir se cabe antes do trabalho, então é chute
 * arredondado de propósito: série mais descanso, com cinco minutos de
 * preparação em cima.
 */
export function duracaoEstimada(bloco: BlocoDoAluno): number {
  const segundos = bloco.itens.reduce(
    (s, i) => s + i.series * (SEGUNDOS_POR_SERIE + i.descanso_seg),
    0,
  );
  return Math.max(10, Math.round((segundos / 60 + 5) / 5) * 5);
}

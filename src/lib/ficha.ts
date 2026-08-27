/**
 * Regras do editor de ficha.
 *
 * A ficha inteira vive em memória enquanto o Allisson mexe, e vai para o banco
 * de uma vez só (função `salvar_ficha`, migração 0012). Estas funções são o que
 * a tela usa para mexer nessa estrutura sem espalhar lógica pelos componentes.
 */

import { DIAS, LOCAIS, NIVEIS, OBJETIVOS, PERGUNTAS_SAUDE, PERIODOS } from "./anamnese";

export type Metodo =
  | "normal"
  | "drop_set"
  | "bi_set"
  | "tri_set"
  | "piramide"
  | "isometria"
  | "ate_a_falha";

/** Como treinador de verdade prescreve. A ordem é a de uso, não a alfabética. */
export const METODOS: { valor: Metodo; nome: string }[] = [
  { valor: "normal", nome: "Série normal" },
  { valor: "drop_set", nome: "Drop-set" },
  { valor: "bi_set", nome: "Bi-set" },
  { valor: "tri_set", nome: "Tri-set" },
  { valor: "piramide", nome: "Pirâmide" },
  { valor: "isometria", nome: "Isometria" },
  { valor: "ate_a_falha", nome: "Até a falha" },
];

export const NOME_DO_METODO: Record<Metodo, string> = Object.fromEntries(
  METODOS.map((m) => [m.valor, m.nome]),
) as Record<Metodo, string>;

export type ItemNaTela = {
  /** Nulo enquanto o item só existe na tela. O banco preenche ao gravar. */
  id: string | null;
  exercicio_id: string;
  nome: string;
  grupo: string;
  series: number;
  reps: string;
  descanso_seg: number;
  metodo: Metodo;
  observacao: string;
};

export type BlocoNaTela = {
  id: string | null;
  nome: string;
  foco: string;
  itens: ItemNaTela[];
};

export type StatusProtocolo = "rascunho" | "ativo" | "encerrado";

/* ------------------------------------------------------------------ */
/* Mexer na estrutura                                                  */
/* ------------------------------------------------------------------ */

/** Troca dois vizinhos de lugar. Devolve array novo; fora do limite, o mesmo. */
export function mover<T>(lista: T[], de: number, passo: -1 | 1): T[] {
  const para = de + passo;
  if (para < 0 || para >= lista.length) return lista;
  const copia = [...lista];
  [copia[de], copia[para]] = [copia[para], copia[de]];
  return copia;
}

/** Letra do próximo treino: A, B, C... e depois cai em número. */
export function proximoNomeDeBloco(quantos: number): string {
  const letras = "ABCDEFGH";
  return quantos < letras.length ? `Treino ${letras[quantos]}` : `Treino ${quantos + 1}`;
}

export const ITEM_PADRAO = {
  series: 3,
  reps: "10-12",
  descanso_seg: 60,
  metodo: "normal" as Metodo,
};

export function resumoDaFicha(blocos: BlocoNaTela[]) {
  const exercicios = blocos.reduce((s, b) => s + b.itens.length, 0);
  const series = blocos.reduce(
    (s, b) => s + b.itens.reduce((t, i) => t + (Number.isFinite(i.series) ? i.series : 0), 0),
    0,
  );
  return { blocos: blocos.length, exercicios, series };
}

/** O que impede de publicar a ficha para o aluno. */
export function problemasParaPublicar(blocos: BlocoNaTela[]): string | null {
  if (!blocos.length) return "A ficha ainda não tem nenhum treino.";
  const vazio = blocos.find((b) => b.itens.length === 0);
  if (vazio) return `${vazio.nome || "Um treino"} está sem exercício.`;
  return null;
}

/** m:ss, que é como se lê descanso. 90 vira 1:30. */
export function emMinutos(segundos: number): string {
  if (!Number.isFinite(segundos) || segundos <= 0) return "sem descanso";
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return m ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
}

/* ------------------------------------------------------------------ */
/* O que a anamnese conta para quem monta a ficha                      */
/* ------------------------------------------------------------------ */

export type LinhaAnamneseFicha = {
  status: "rascunho" | "enviada";
  peso_kg: number | null;
  altura_cm: number | null;
  objetivo: string | null;
  local_treino: string | null;
  nivel: string | null;
  dias_disponiveis: number[] | null;
  periodo_treino: string | null;
  lesoes: string | null;
  coracao: boolean | null;
  dor_peito: boolean | null;
  pressao_alta: boolean | null;
  cirurgia_12m: boolean | null;
  medicacao_continua: boolean | null;
  coracao_detalhe: string | null;
  dor_peito_detalhe: string | null;
  pressao_alta_detalhe: string | null;
  cirurgia_12m_detalhe: string | null;
  medicacao_continua_detalhe: string | null;
};

function rotulo(lista: readonly (readonly [string, string, ...unknown[]])[], valor: string | null) {
  if (!valor) return null;
  return lista.find(([v]) => v === valor)?.[1] ?? valor;
}

export function resumoDaAnamnese(a: LinhaAnamneseFicha | null) {
  if (!a) return null;
  return {
    objetivo: rotulo(OBJETIVOS, a.objetivo),
    local: rotulo(LOCAIS, a.local_treino),
    nivel: rotulo(NIVEIS, a.nivel),
    periodo: rotulo(PERIODOS, a.periodo_treino),
    peso: a.peso_kg,
    altura: a.altura_cm,
    dias: (a.dias_disponiveis ?? [])
      .map((d) => DIAS.find(([n]) => n === d)?.[2])
      .filter(Boolean) as string[],
  };
}

/**
 * O bloco vermelho da lateral. É o que o Allisson precisa ver ANTES de escolher
 * exercício, não depois: quem tem dor lombar não recebe terra sumo.
 */
export function alertasDeSaude(a: LinhaAnamneseFicha | null): string[] {
  if (!a) return [];
  const alertas: string[] = [];

  for (const p of PERGUNTAS_SAUDE) {
    if (a[p.campo] === true) {
      const detalhe = (a[p.detalhe] ?? "").toString().trim();
      alertas.push(detalhe ? `${p.texto} ${detalhe}` : p.texto);
    }
  }

  const lesoes = (a.lesoes ?? "").trim();
  if (lesoes) alertas.push(`Lesões ou limitações: ${lesoes}`);

  return alertas;
}

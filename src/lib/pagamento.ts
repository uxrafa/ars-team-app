/**
 * Regras do dinheiro que entrou.
 *
 * Funcoes puras: recebem as linhas de `pagamento` e devolvem o que a tela
 * mostra. Nada aqui fala com o banco.
 *
 * DUAS DATAS QUE NAO SAO A MESMA COISA, e e isso que faz este arquivo existir:
 *
 *   recebido_em     -- quando o dinheiro entrou. O faturamento do mes soma por
 *                      aqui, que e o que o Allisson enxerga na conta dele.
 *   competencia_ate -- ate quando o pagamento paga. Um pix de trimestre entra
 *                      inteiro em setembro e cobre ate dezembro.
 *
 * Somar faturamento por competencia daria um numero mais contabil e menos
 * verdadeiro para quem toca o negocio sozinho.
 */

export type FormaPagamento =
  | "pix"
  | "cartao"
  | "boleto"
  | "dinheiro"
  | "transferencia"
  | "outro";

export type LinhaPagamento = {
  id: string;
  aluno_id: string;
  valor: number;
  recebido_em: string;
  meses: number;
  competencia_de: string;
  competencia_ate: string;
  forma: FormaPagamento;
  origem: "manual" | "gateway";
  estornado_em: string | null;
  estorno_motivo: string | null;
  observacao: string | null;
};

/** O que a tela lista: o pagamento mais o nome de quem pagou. */
export type PagamentoNaTela = LinhaPagamento & { aluno: string };

export const ROTULO_FORMA: Record<FormaPagamento, string> = {
  pix: "Pix",
  cartao: "Cartão ou link",
  boleto: "Boleto",
  dinheiro: "Dinheiro",
  transferencia: "Transferência",
  outro: "Outro",
};

/**
 * O que aparece no seletor, nesta ordem.
 *
 * Pix e cartao primeiro porque sao os dois que o Allisson usa hoje. Boleto
 * existe no banco para o webhook de um gateway futuro nao precisar de
 * migracao, e por isso nao entra na tela: ninguem emite boleto na mao aqui.
 */
export const FORMAS_NA_TELA: readonly FormaPagamento[] = [
  "pix",
  "cartao",
  "dinheiro",
  "transferencia",
  "outro",
];

/** Mes, trimestre e semestre. O banco aceita ate 24 se um dia precisar. */
export const PLANOS_EM_MESES = [
  { meses: 1, nome: "1 mês" },
  { meses: 3, nome: "3 meses" },
  { meses: 6, nome: "6 meses" },
] as const;

/* ------------------------------------------------------------------ */
/* Datas                                                               */
/* ------------------------------------------------------------------ */

/**
 * Soma meses a uma data ISO, grudando no ultimo dia quando o mes seguinte e
 * mais curto: 31/01 + 1 mes = 28/02, e nao 03/03.
 *
 * Nao usa `Date.setMonth`, que estoura para o mes seguinte e daria ao aluno um
 * dia de acesso a mais em janeiro e um a menos em fevereiro. E o mesmo
 * comportamento de `date + interval 'n months'` no Postgres, o que importa
 * porque o valor de verdade e calculado la (migracao 0014) -- aqui e previsao.
 */
export function somarMeses(iso: string, meses: number): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const corrido = mes - 1 + meses;
  const anoFinal = ano + Math.floor(corrido / 12);
  const mesFinal = ((corrido % 12) + 12) % 12;
  const ultimoDia = new Date(Date.UTC(anoFinal, mesFinal + 1, 0)).getUTCDate();
  const diaFinal = Math.min(dia, ultimoDia);
  return `${anoFinal}-${String(mesFinal + 1).padStart(2, "0")}-${String(diaFinal).padStart(2, "0")}`;
}

/**
 * A janela que este pagamento compra. PREVISAO, para a tela poder dizer "vai
 * valer ate tal dia" antes de gravar.
 *
 * Quem decide de verdade e o gatilho `privado.aplicar_pagamento`, da migracao
 * 0014, porque a mesma regra tem que valer para o webhook do gateway, que nao
 * passa por tela nenhuma. As duas copias existem de proposito e dizem a mesma
 * coisa; se um dia divergirem, a do banco esta certa.
 *
 * A REGRA: quem paga adiantado nao perde dia. Aluno em dia emenda no
 * vencimento atual; aluno vencido comeca na data em que o dinheiro entrou, e o
 * buraco entre uma coisa e outra nao e cobrado nem devolvido.
 */
export function previsaoDeAcesso(
  vencimentoAtual: string | null,
  recebidoEm: string,
  meses: number,
): { de: string; ate: string } {
  // Data ISO curta compara como texto na mesma ordem em que compara no tempo.
  const base =
    vencimentoAtual && vencimentoAtual > recebidoEm ? vencimentoAtual : recebidoEm;
  return { de: base, ate: somarMeses(base, meses) };
}

/** "2026-09-05" -> "2026-09". */
export function mesDe(iso: string): string {
  return iso.slice(0, 7);
}

/** Os N meses que terminam em `ate`, do mais antigo para o mais novo. */
export function mesesAte(ate: string, quantos: number): string[] {
  const [ano, mes] = ate.split("-").map(Number);
  const lista: string[] = [];
  for (let i = quantos - 1; i >= 0; i--) {
    const corrido = mes - 1 - i;
    const a = ano + Math.floor(corrido / 12);
    const m = ((corrido % 12) + 12) % 12;
    lista.push(`${a}-${String(m + 1).padStart(2, "0")}`);
  }
  return lista;
}

const NOMES_DE_MES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function nomeDoMes(mes: string, comAno = true): string {
  const [ano, m] = mes.split("-").map(Number);
  const nome = NOMES_DE_MES[m - 1] ?? mes;
  return comAno ? `${nome} de ${ano}` : nome;
}

/** Rotulo curto de coluna de grafico: "SET", "OUT". */
export function siglaDoMes(mes: string): string {
  const m = Number(mes.split("-")[1]);
  return (NOMES_DE_MES[m - 1] ?? mes).slice(0, 3).toUpperCase();
}

/** "2026-09-05" -> "05/09/26". */
export function dataCurta(iso: string | null): string {
  if (!iso) return "sem data";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano.slice(2)}`;
}

/* ------------------------------------------------------------------ */
/* Contas                                                              */
/* ------------------------------------------------------------------ */

/**
 * Pagamento estornado nao conta em lugar nenhum -- nem no total do mes, nem
 * no ticket, nem na contagem de alunos que pagaram. Ele continua na lista
 * porque sumir com a linha esconderia que o erro aconteceu.
 */
export function valeu(p: { estornado_em: string | null }): boolean {
  return p.estornado_em === null;
}

export type ResumoDoMes = {
  mes: string;
  total: number;
  quantidade: number;
  /** Pessoas distintas, e nao pagamentos: um aluno pode pagar duas vezes. */
  alunos: number;
  estornados: number;
};

export function resumoDoMes(pagamentos: LinhaPagamento[], mes: string): ResumoDoMes {
  const doMes = pagamentos.filter((p) => mesDe(p.recebido_em) === mes);
  const validos = doMes.filter(valeu);

  return {
    mes,
    total: validos.reduce((soma, p) => soma + p.valor, 0),
    quantidade: validos.length,
    alunos: new Set(validos.map((p) => p.aluno_id)).size,
    estornados: doMes.length - validos.length,
  };
}

export type BarraDoMes = { mes: string; total: number; quantidade: number };

export function faturamentoPorMes(
  pagamentos: LinhaPagamento[],
  meses: string[],
): BarraDoMes[] {
  return meses.map((mes) => {
    const validos = pagamentos.filter((p) => mesDe(p.recebido_em) === mes && valeu(p));
    return {
      mes,
      total: validos.reduce((soma, p) => soma + p.valor, 0),
      quantidade: validos.length,
    };
  });
}

/**
 * Variacao percentual contra o mes anterior, arredondada.
 *
 * Devolve `null` quando o mes anterior foi zero: "subiu 100%" a partir do nada
 * nao e informacao, e no primeiro mes de uso seria a unica coisa na tela.
 */
export function variacao(atual: number, anterior: number): number | null {
  if (anterior <= 0) return null;
  return Math.round(((atual - anterior) / anterior) * 100);
}

/* ------------------------------------------------------------------ */
/* Entrada de valor                                                    */
/* ------------------------------------------------------------------ */

/**
 * "250", "250,00", "1.250,50" e "R$ 250" viram numero. Qualquer outra coisa
 * vira `null`, e quem chama decide o que dizer.
 *
 * Aceita ponto como separador de milhar porque e assim que se digita em
 * portugues, e o teclado do celular oferece os dois.
 */
export function valorParaNumero(texto: string): number | null {
  const limpo = String(texto ?? "")
    .replace(/[R$\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();
  if (!limpo) return null;
  const n = Number(limpo);
  if (!Number.isFinite(n) || n <= 0) return null;
  // Duas casas: centavo de terceira casa e erro de digitacao, nao dinheiro.
  return Math.round(n * 100) / 100;
}

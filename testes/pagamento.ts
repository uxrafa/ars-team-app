import assert from "node:assert/strict";
import {
  dataCurta,
  faturamentoPorMes,
  mesesAte,
  previsaoDeAcesso,
  resumoDoMes,
  siglaDoMes,
  somarMeses,
  valorParaNumero,
  variacao,
  type LinhaPagamento,
} from "../src/lib/pagamento.ts";

let ok = 0;
function conferir(nome: string, f: () => void) {
  f();
  ok += 1;
  console.log("ok  ", nome);
}

const pago = (troca: Partial<LinhaPagamento> = {}): LinhaPagamento => ({
  id: `p-${Math.random().toString(36).slice(2)}`,
  aluno_id: "a",
  valor: 250,
  recebido_em: "2026-09-05",
  meses: 1,
  competencia_de: "2026-09-05",
  competencia_ate: "2026-10-05",
  forma: "pix",
  origem: "manual",
  estornado_em: null,
  estorno_motivo: null,
  observacao: null,
  ...troca,
});

/* --- a regra da emenda -------------------------------------------------- */

conferir("aluno sem vencimento comeca na data do pagamento", () => {
  assert.deepEqual(previsaoDeAcesso(null, "2026-09-05", 1), {
    de: "2026-09-05",
    ate: "2026-10-05",
  });
});

conferir("aluno em dia emenda no vencimento, e nao perde os dias que pagou", () => {
  // Vence dia 20 e ele paga dia 5, adiantado. Contar do dia 5 comeria 15 dias
  // que ele ja tinha pago -- e o aluno organizado sairia perdendo.
  assert.deepEqual(previsaoDeAcesso("2026-09-20", "2026-09-05", 1), {
    de: "2026-09-20",
    ate: "2026-10-20",
  });
});

conferir("aluno vencido comeca hoje, e o buraco nao e cobrado", () => {
  // Venceu em agosto e so pagou em setembro. O mes que ele passou sem pagar
  // nao vira divida nem desconto: comeca do zero na data do dinheiro.
  assert.deepEqual(previsaoDeAcesso("2026-08-01", "2026-09-05", 1), {
    de: "2026-09-05",
    ate: "2026-10-05",
  });
});

conferir("trimestre e semestre somam a partir da mesma base", () => {
  assert.equal(previsaoDeAcesso(null, "2026-09-05", 3).ate, "2026-12-05");
  assert.equal(previsaoDeAcesso(null, "2026-09-05", 6).ate, "2027-03-05");
});

conferir("pagar dois trimestres seguidos empilha, nao sobrescreve", () => {
  const primeiro = previsaoDeAcesso(null, "2026-09-05", 3);
  const segundo = previsaoDeAcesso(primeiro.ate, "2026-11-01", 3);
  assert.equal(segundo.ate, "2027-03-05");
});

/* --- o mes curto -------------------------------------------------------- */

conferir("31 de janeiro mais um mes cai em 28 de fevereiro, e nao em marco", () => {
  // `Date.setMonth` daria 2026-03-03. O Postgres gruda no ultimo dia, e as
  // duas contas precisam bater: a do banco e a que vale.
  assert.equal(somarMeses("2026-01-31", 1), "2026-02-28");
});

conferir("ano bissexto e respeitado", () => {
  assert.equal(somarMeses("2028-01-31", 1), "2028-02-29");
});

conferir("somar meses atravessa o ano", () => {
  assert.equal(somarMeses("2026-11-15", 3), "2027-02-15");
  assert.equal(somarMeses("2026-12-31", 6), "2027-06-30");
});

/* --- o estorno ---------------------------------------------------------- */

conferir("pagamento estornado sai do total e da contagem, mas fica visivel", () => {
  const lista = [
    pago({ valor: 250 }),
    pago({ valor: 250, estornado_em: "2026-09-06T10:00:00Z", estorno_motivo: "duplicado" }),
  ];
  const r = resumoDoMes(lista, "2026-09");
  assert.equal(r.total, 250);
  assert.equal(r.quantidade, 1);
  assert.equal(r.estornados, 1);
  // A linha continua na lista de onde veio: quem some com o erro esconde o erro.
  assert.equal(lista.length, 2);
});

/* --- as contas do mes --------------------------------------------------- */

conferir("o mes conta pessoas, e nao pagamentos", () => {
  // Um aluno que pagou dois meses separados nao vira dois alunos.
  const r = resumoDoMes(
    [
      pago({ aluno_id: "a", valor: 250 }),
      pago({ aluno_id: "a", valor: 250, recebido_em: "2026-09-28" }),
      pago({ aluno_id: "b", valor: 300 }),
    ],
    "2026-09",
  );
  assert.equal(r.total, 800);
  assert.equal(r.quantidade, 3);
  assert.equal(r.alunos, 2);
});

conferir("o total do mes e por dia em que o dinheiro entrou, nao por competencia", () => {
  // Trimestre pago em setembro cobre ate dezembro, mas entrou inteiro em
  // setembro. Espalhar por competencia daria um numero que nao bate com a
  // conta bancaria dele.
  const trimestre = pago({
    valor: 690,
    recebido_em: "2026-09-05",
    meses: 3,
    competencia_ate: "2026-12-05",
  });
  assert.equal(resumoDoMes([trimestre], "2026-09").total, 690);
  assert.equal(resumoDoMes([trimestre], "2026-10").total, 0);
});

conferir("faturamento por mes devolve o mes vazio tambem", () => {
  // Sem a linha zerada o grafico pularia agosto e daria a impressao de que
  // agosto nao existiu, em vez de ter sido um mes sem entrada.
  const barras = faturamentoPorMes([pago({ recebido_em: "2026-09-05", valor: 250 })], [
    "2026-07",
    "2026-08",
    "2026-09",
  ]);
  assert.deepEqual(
    barras.map((b) => b.total),
    [0, 0, 250],
  );
});

conferir("os meses recentes atravessam a virada do ano", () => {
  assert.deepEqual(mesesAte("2027-01", 3), ["2026-11", "2026-12", "2027-01"]);
});

conferir("variacao contra mes zerado nao existe", () => {
  // "subiu 100%" a partir do nada nao e informacao, e no primeiro mes de uso
  // seria a unica coisa na tela.
  assert.equal(variacao(500, 0), null);
  assert.equal(variacao(500, 250), 100);
  assert.equal(variacao(200, 250), -20);
});

/* --- entrada de valor --------------------------------------------------- */

conferir("valor aceita as formas que se digita em portugues", () => {
  assert.equal(valorParaNumero("250"), 250);
  assert.equal(valorParaNumero("250,00"), 250);
  assert.equal(valorParaNumero("1.250,50"), 1250.5);
  assert.equal(valorParaNumero("R$ 250"), 250);
});

conferir("valor vazio, zero ou negativo nao e pagamento", () => {
  assert.equal(valorParaNumero(""), null);
  assert.equal(valorParaNumero("0"), null);
  assert.equal(valorParaNumero("-50"), null);
  assert.equal(valorParaNumero("abc"), null);
});

/* --- rotulos ------------------------------------------------------------ */

conferir("data e mes aparecem como se le em portugues", () => {
  assert.equal(dataCurta("2026-09-05"), "05/09/26");
  assert.equal(dataCurta(null), "sem data");
  assert.equal(siglaDoMes("2026-09"), "SET");
});

console.log(`\n${ok} verificacoes do pagamento, todas passaram.`);

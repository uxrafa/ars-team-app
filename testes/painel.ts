import assert from "node:assert/strict";
import {
  DIAS_PARA_SUMIR,
  juntarAlunos,
  montarAtencao,
  quandoFoi,
  quantosAlunosNaFila,
  resumo,
  type LinhaAnamnese,
  type LinhaPerfil,
  type LinhaProtocolo,
} from "../src/lib/painel.ts";

let ok = 0;
function conferir(nome: string, f: () => void) {
  f();
  ok += 1;
  console.log("ok  ", nome);
}

const HOJE = "2026-09-04";

const perfil = (id: string, troca: Partial<LinhaPerfil> = {}): LinhaPerfil => ({
  id,
  nome: `Aluno ${id}`,
  email: `${id}@exemplo.com`,
  whatsapp: null,
  tipo: "consultoria",
  status: "ativo",
  acesso_ate: null,
  mensalidade: 250,
  criado_em: "2026-01-10T00:00:00Z",
  ...troca,
});

const ficha = (aluno_id: string, fim: string | null = null): LinhaProtocolo => ({
  id: `f-${aluno_id}`,
  aluno_id,
  nome: "Ficha A/B/C",
  inicio: "2026-07-01",
  fim,
  status: "ativo",
});

/* --- o erro que a view corrigiu ---------------------------------------- */

conferir("aluno que parou de treinar aparece com a data real, e nao como 'nunca'", () => {
  // Ele treinou por meses e sumiu ha 21 dias. Antes da view, a janela de 60
  // sessoes nao alcancava esse check-in e a tela dizia "Nunca fez um
  // check-in" -- mentira, sobre a pessoa que o painel existe para mostrar.
  const alunos = juntarAlunos(
    [perfil("a")],
    [],
    [ficha("a")],
    [{ aluno_id: "a", data: "2026-08-14" }],
  );

  assert.equal(alunos[0].ultimoCheckin?.data, "2026-08-14");
  assert.equal(quandoFoi("2026-08-14", HOJE), "faz 21 dias");

  const sumido = montarAtencao(alunos, HOJE).find((i) => i.motivo === "sumido");
  assert.ok(sumido);
  assert.equal(sumido.detalhe, "Sem treino faz 21 dias");
});

conferir("quem nunca treinou continua dizendo que nunca treinou", () => {
  const alunos = juntarAlunos([perfil("b")], [], [ficha("b")], []);
  assert.equal(alunos[0].ultimoCheckin, null);
  const sumido = montarAtencao(alunos, HOJE).find((i) => i.motivo === "sumido");
  assert.ok(sumido);
  assert.equal(sumido.detalhe, "Nunca fez um check-in");
});

conferir("quem treinou dentro do prazo nao entra na fila como sumido", () => {
  const ontem = "2026-09-03";
  const alunos = juntarAlunos(
    [perfil("c")],
    [],
    [ficha("c")],
    [{ aluno_id: "c", data: ontem }],
  );
  assert.equal(
    montarAtencao(alunos, HOJE).some((i) => i.motivo === "sumido"),
    false,
  );
});

conferir("a fronteira de sumido e o proprio DIAS_PARA_SUMIR", () => {
  const naVespera = "2026-08-29"; // 6 dias
  const noDia = "2026-08-28"; // 7 dias
  assert.equal(DIAS_PARA_SUMIR, 7);

  const antes = juntarAlunos([perfil("d")], [], [ficha("d")], [{ aluno_id: "d", data: naVespera }]);
  const depois = juntarAlunos([perfil("d")], [], [ficha("d")], [{ aluno_id: "d", data: noDia }]);

  assert.equal(montarAtencao(antes, HOJE).some((i) => i.motivo === "sumido"), false);
  assert.equal(montarAtencao(depois, HOJE).some((i) => i.motivo === "sumido"), true);
});

conferir("sem ficha nao ha sumido: nao da para cobrar treino de quem nao tem o que seguir", () => {
  const alunos = juntarAlunos([perfil("e")], [], [], []);
  assert.equal(montarAtencao(alunos, HOJE).some((i) => i.motivo === "sumido"), false);
});

/* --- juntar ------------------------------------------------------------ */

conferir("check-in de um aluno nao vaza para o outro", () => {
  const alunos = juntarAlunos(
    [perfil("a"), perfil("b")],
    [],
    [ficha("a"), ficha("b")],
    [{ aluno_id: "a", data: "2026-09-01" }],
  );
  assert.equal(alunos.find((x) => x.id === "a")?.ultimoCheckin?.data, "2026-09-01");
  assert.equal(alunos.find((x) => x.id === "b")?.ultimoCheckin, null);
});

conferir("admin nunca aparece na lista de alunos", () => {
  const alunos = juntarAlunos(
    [perfil("a"), perfil("z", { tipo: "admin", nome: "Allisson" })],
    [],
    [],
    [],
  );
  assert.equal(alunos.length, 1);
  assert.equal(alunos[0].id, "a");
});

/* --- resumo ------------------------------------------------------------ */

conferir("resumo recebe a contagem de check-ins pronta", () => {
  const alunos = juntarAlunos([perfil("a"), perfil("b", { tipo: "planilha" })], [], [], []);
  const r = resumo(alunos, 3, HOJE, 0);
  assert.equal(r.checkinsHoje, 3);
  assert.equal(r.consultoria, 1);
  assert.equal(r.planilha, 1);
});

conferir("vencido conta em aberto, e o recebido do mes vem de fora", () => {
  const alunos = juntarAlunos(
    [
      perfil("a", { acesso_ate: "2026-08-30", mensalidade: 250 }), // vencido
      perfil("b", { acesso_ate: "2026-09-20", mensalidade: 300 }), // em dia
    ],
    [],
    [],
    [],
  );
  const r = resumo(alunos, 0, HOJE, 940);
  assert.equal(r.emAberto, 250);
  // O recebido NAO se deduz das mensalidades: quem esta em dia pode ter pago
  // um trimestre em marco e nao ter posto um real neste mes. Ele chega
  // somado da tabela `pagamento`, e o resumo so repassa.
  assert.equal(r.recebidoNoMes, 940);
});

/* --- fila -------------------------------------------------------------- */

conferir("a fila conta pessoas, e nao motivos", () => {
  // Um aluno so, devendo E sem ficha: sao dois motivos, uma pessoa.
  const anamnese: LinhaAnamnese = {
    aluno_id: "a",
    status: "enviada",
    dias_disponiveis: [],
    objetivo: null,
    enviada_em: "2026-08-20T00:00:00Z",
  };
  const alunos = juntarAlunos(
    [perfil("a", { acesso_ate: "2026-08-30" })],
    [anamnese],
    [],
    [],
  );
  const atencao = montarAtencao(alunos, HOJE);
  assert.equal(atencao.length, 2);
  assert.equal(quantosAlunosNaFila(atencao), 1);
});

conferir("pagamento vem antes de tudo na fila", () => {
  const alunos = juntarAlunos(
    [perfil("a", { acesso_ate: "2026-08-30" })],
    [],
    [ficha("a", "2026-09-05")],
    [],
  );
  assert.equal(montarAtencao(alunos, HOJE)[0].motivo, "pagamento");
});

console.log(`\n${ok} verificacoes do painel, todas passaram.`);

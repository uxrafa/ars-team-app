import assert from "node:assert/strict";
import {
  cargasQueSubiram,
  duracaoEstimada,
  ehDiaDeTreino,
  paraCarga,
  paraReps,
  progresso,
  proximoBloco,
  proximoItem,
  sequencia,
  somarDias,
  type BlocoDoAluno,
  type SerieFeita,
  type SessaoDoAluno,
} from "../src/lib/treino.ts";

let ok = 0;
function conferir(nome: string, f: () => void) {
  f();
  ok += 1;
  console.log("ok  ", nome);
}

const bloco = (id: string, quantos: number, series = 3): BlocoDoAluno => ({
  id,
  nome: id.toUpperCase(),
  foco: null,
  ordem: 0,
  itens: Array.from({ length: quantos }, (_, i) => ({
    id: `${id}-i${i}`,
    ordem: i,
    series,
    reps: "10",
    descanso_seg: 60,
    metodo: "normal" as const,
    observacao: null,
    exercicio_id: `${id}-e${i}`,
    nome: `Exercicio ${i}`,
    grupo: "peito",
    video_url: null,
    instrucoes: null,
  })),
});

const A = bloco("a", 2);
const B = bloco("b", 2);
const C = bloco("c", 2);

const sessao = (
  id: string,
  blocoId: string | null,
  data: string,
  status: "em_andamento" | "concluida" = "concluida",
): SessaoDoAluno => ({ id, bloco_id: blocoId, data, status, concluida_em: `${data}T20:00:00Z` });

/* --- rotacao A/B/C ------------------------------------------------- */

conferir("sem historico comeca no primeiro", () => {
  assert.equal(proximoBloco([A, B, C], [])?.id, "a");
});

conferir("depois do A vem o B", () => {
  assert.equal(proximoBloco([A, B, C], [sessao("s1", "a", "2026-08-27")])?.id, "b");
});

conferir("depois do C volta para o A", () => {
  assert.equal(proximoBloco([A, B, C], [sessao("s1", "c", "2026-08-27")])?.id, "a");
});

conferir("sessao aberta manda no treino do dia", () => {
  const sessoes = [sessao("s2", "c", "2026-08-28", "em_andamento"), sessao("s1", "a", "2026-08-27")];
  assert.equal(proximoBloco([A, B, C], sessoes)?.id, "c");
});

conferir("bloco que sumiu da ficha nao trava a rotacao", () => {
  assert.equal(proximoBloco([A, B], [sessao("s1", "z", "2026-08-27")])?.id, "a");
});

/* --- sequencia ------------------------------------------------------ */

const SEG_A_SEX = [1, 2, 3, 4, 5];

conferir("descanso do fim de semana nao quebra a sequencia", () => {
  // 2026-08-28 e sexta. Treinou seg, ter, qua, qui, e sexta ainda nao.
  const datas = ["2026-08-24", "2026-08-25", "2026-08-26", "2026-08-27"];
  assert.equal(sequencia(datas, SEG_A_SEX, "2026-08-28"), 4);
});

conferir("furar um dia de treino quebra a sequencia", () => {
  const datas = ["2026-08-24", "2026-08-26", "2026-08-27"];
  assert.equal(sequencia(datas, SEG_A_SEX, "2026-08-28"), 2);
});

conferir("hoje ainda nao acabou, entao nao quebra nada", () => {
  assert.equal(sequencia(["2026-08-27"], SEG_A_SEX, "2026-08-28"), 1);
});

conferir("sem dias declarados, todo dia conta", () => {
  assert.equal(sequencia(["2026-08-27", "2026-08-26"], null, "2026-08-28"), 2);
  assert.equal(sequencia(["2026-08-27", "2026-08-25"], null, "2026-08-28"), 1);
});

conferir("quem nunca treinou tem sequencia zero", () => {
  assert.equal(sequencia([], SEG_A_SEX, "2026-08-28"), 0);
});

conferir("dia de treino pela anamnese", () => {
  assert.equal(ehDiaDeTreino([1, 3, 5], "2026-08-28"), true); // sexta
  assert.equal(ehDiaDeTreino([1, 3], "2026-08-28"), false);
  assert.equal(ehDiaDeTreino(null, "2026-08-28"), true);
});

/* --- progresso ------------------------------------------------------ */

const serie = (exercicio: string, numero: number, carga: number): SerieFeita => ({
  id: `${exercicio}-${numero}`,
  exercicio_id: exercicio,
  numero,
  carga_kg: carga,
  reps: 10,
});

conferir("exercicio so conta como feito com todas as series", () => {
  const parcial = [serie("a-e0", 1, 40), serie("a-e0", 2, 40)];
  assert.deepEqual(progresso(A, parcial).feitos, 0);
  const completo = [...parcial, serie("a-e0", 3, 40)];
  assert.equal(progresso(A, completo).feitos, 1);
  assert.equal(progresso(A, completo).total, 2);
  assert.equal(progresso(A, completo).seriesPrescritas, 6);
});

conferir("o proximo exercicio e o primeiro incompleto", () => {
  const feitas = [serie("a-e0", 1, 40), serie("a-e0", 2, 40), serie("a-e0", 3, 40)];
  assert.equal(proximoItem(A, feitas)?.exercicio_id, "a-e1");
  assert.equal(proximoItem(A, [])?.exercicio_id, "a-e0");
});

/* --- cargas --------------------------------------------------------- */

conferir("carga que subiu compara dia com dia", () => {
  const linhas = [
    { exercicio_id: "e1", carga_kg: 45, reps: 10, data: "2026-08-27" },
    { exercicio_id: "e1", carga_kg: 20, reps: 15, data: "2026-08-27" }, // aquecimento
    { exercicio_id: "e1", carga_kg: 40, reps: 10, data: "2026-08-20" },
    { exercicio_id: "e2", carga_kg: 30, reps: 10, data: "2026-08-27" },
    { exercicio_id: "e2", carga_kg: 35, reps: 10, data: "2026-08-20" },
  ];
  const nomes = new Map([
    ["e1", "Supino"],
    ["e2", "Remada"],
  ]);
  const subiram = cargasQueSubiram(linhas, nomes);
  assert.equal(subiram.length, 1);
  assert.deepEqual(subiram[0], { exercicio_id: "e1", nome: "Supino", de: 40, para: 45 });
});

conferir("exercicio de um dia so nao entra em cargas que subiram", () => {
  const linhas = [{ exercicio_id: "e1", carga_kg: 45, reps: 10, data: "2026-08-27" }];
  assert.equal(cargasQueSubiram(linhas, new Map()).length, 0);
});

/* --- entrada do aluno ----------------------------------------------- */

conferir("carga aceita virgula e ponto, e recusa bobagem", () => {
  assert.equal(paraCarga("42,5"), 42.5);
  assert.equal(paraCarga("42.5"), 42.5);
  assert.equal(paraCarga(" 40 "), 40);
  assert.equal(paraCarga(""), null);
  assert.equal(paraCarga("abc"), null);
  assert.equal(paraCarga("-5"), null);
  assert.equal(paraCarga("1000"), null);
});

conferir("reps so aceita inteiro", () => {
  assert.equal(paraReps("12"), 12);
  assert.equal(paraReps("12,5"), null);
  assert.equal(paraReps("501"), null);
});

/* --- datas e tempo --------------------------------------------------- */

conferir("somar dias atravessa o mes", () => {
  assert.equal(somarDias("2026-08-31", 1), "2026-09-01");
  assert.equal(somarDias("2026-03-01", -1), "2026-02-28");
});

conferir("duracao estimada arredonda em blocos de cinco", () => {
  const d = duracaoEstimada(A);
  assert.equal(d % 5, 0);
  assert.ok(d >= 10);
});

console.log(`\n${ok} verificacoes, todas passaram.`);

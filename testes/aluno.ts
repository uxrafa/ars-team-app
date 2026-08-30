import assert from "node:assert/strict";
import {
  emMilhar,
  inicioDaJanela,
  mediaSemanal,
  rotuloCurto,
  segundaDa,
  semanasDeTreino,
  tetoDoGrafico,
  variacaoDeVolume,
  type SerieDoHistorico,
  type SessaoDoHistorico,
} from "../src/lib/aluno.ts";

let ok = 0;
function conferir(nome: string, f: () => void) {
  f();
  ok += 1;
  console.log("ok  ", nome);
}

// 2026-08-29 e um sabado. A segunda dessa semana e 24/08.
const HOJE = "2026-08-29";

const sessao = (
  id: string,
  data: string,
  esforco: number | null = null,
): SessaoDoHistorico => ({ id, data, esforco, nota: null, bloco: "Treino A" });

const serie = (
  sessao_id: string,
  carga_kg: number | null,
  reps: number | null,
): SerieDoHistorico => ({ sessao_id, carga_kg, reps });

/* --- datas ----------------------------------------------------------- */

conferir("segunda da semana, com domingo caindo na semana anterior", () => {
  assert.equal(segundaDa("2026-08-29"), "2026-08-24"); // sabado
  assert.equal(segundaDa("2026-08-24"), "2026-08-24"); // a propria segunda
  assert.equal(segundaDa("2026-08-30"), "2026-08-24"); // domingo fecha a semana
  assert.equal(segundaDa("2026-08-31"), "2026-08-31"); // segunda seguinte
});

conferir("segunda atravessa a virada de mes e de ano", () => {
  assert.equal(segundaDa("2026-09-01"), "2026-08-31");
  assert.equal(segundaDa("2027-01-01"), "2026-12-28");
});

conferir("rotulo curto da semana", () => {
  assert.equal(rotuloCurto("2026-08-24"), "24 ago");
  assert.equal(rotuloCurto("2026-01-05"), "5 jan");
});

/* --- montagem das semanas -------------------------------------------- */

conferir("devolve sempre a janela inteira, terminando na semana de hoje", () => {
  const s = semanasDeTreino([], [], HOJE);
  assert.equal(s.length, 8);
  assert.equal(s[7].inicio, "2026-08-24");
  assert.equal(s[0].inicio, "2026-07-06");
});

conferir("semana sem treino aparece zerada, e nao some", () => {
  const dias = semanasDeTreino(
    [sessao("a", "2026-08-24"), sessao("b", "2026-08-10")],
    [],
    HOJE,
  );
  // Entre 10/08 e 24/08 tem a semana de 17/08, que ficou vazia.
  const vazia = dias.find((d) => d.inicio === "2026-08-17");
  assert.ok(vazia);
  assert.equal(vazia.treinos, 0);
  assert.equal(vazia.volumeKg, 0);
  assert.equal(vazia.intensidadeKg, null);
});

conferir("volume e a soma de carga por reps, e intensidade e por serie", () => {
  const semanas = semanasDeTreino(
    [sessao("s1", "2026-08-25"), sessao("s2", "2026-08-27")],
    [
      serie("s1", 40, 10), // 400
      serie("s1", 40, 10), // 400
      serie("s2", 60, 10), // 600
      serie("s2", 60, 10), // 600
    ],
    HOJE,
  );
  const atual = semanas[7];
  assert.equal(atual.treinos, 2);
  assert.equal(atual.series, 4);
  assert.equal(atual.volumeKg, 2000);
  assert.equal(atual.intensidadeKg, 500);
});

conferir("serie sem carga entra na contagem mas nao no volume", () => {
  const semanas = semanasDeTreino(
    [sessao("s1", "2026-08-25")],
    [serie("s1", null, 15), serie("s1", 20, 10)],
    HOJE,
  );
  assert.equal(semanas[7].series, 2);
  assert.equal(semanas[7].volumeKg, 200);
});

conferir("esforco medio ignora quem nao respondeu", () => {
  const semanas = semanasDeTreino(
    [sessao("s1", "2026-08-25", 8), sessao("s2", "2026-08-26", 6), sessao("s3", "2026-08-27", null)],
    [],
    HOJE,
  );
  assert.equal(semanas[7].esforcoMedio, 7);
});

conferir("treino fora da janela nao entra", () => {
  const semanas = semanasDeTreino([sessao("velho", "2026-05-01")], [], HOJE);
  assert.equal(
    semanas.reduce((s, x) => s + x.treinos, 0),
    0,
  );
});

conferir("serie de outra sessao nao vaza para a semana errada", () => {
  const semanas = semanasDeTreino(
    [sessao("s1", "2026-08-25"), sessao("s2", "2026-08-18")],
    [serie("s1", 100, 10), serie("s2", 10, 10)],
    HOJE,
  );
  assert.equal(semanas[7].volumeKg, 1000);
  assert.equal(semanas[6].volumeKg, 100);
});

/* --- leitura --------------------------------------------------------- */

conferir("variacao compara semanas com treino, pulando as vazias", () => {
  const semanas = semanasDeTreino(
    [sessao("s1", "2026-08-25"), sessao("s2", "2026-08-11")],
    [serie("s1", 60, 10), serie("s2", 50, 10)],
    HOJE,
  );
  // 600 contra 500, com a semana de 17/08 vazia no meio.
  assert.equal(variacaoDeVolume(semanas), 20);
});

conferir("sem duas semanas com treino, nao ha variacao para mostrar", () => {
  assert.equal(variacaoDeVolume(semanasDeTreino([sessao("s1", "2026-08-25")], [], HOJE)), null);
  assert.equal(variacaoDeVolume(semanasDeTreino([], [], HOJE)), null);
});

conferir("media semanal so conta semana em que ele treinou", () => {
  const semanas = semanasDeTreino(
    [
      sessao("a", "2026-08-24"),
      sessao("b", "2026-08-26"),
      sessao("c", "2026-08-28"),
      sessao("d", "2026-08-17"),
    ],
    [],
    HOJE,
  );
  // 3 numa semana e 1 na outra, e as seis vazias nao entram na conta.
  assert.equal(mediaSemanal(semanas), 2);
  assert.equal(mediaSemanal(semanasDeTreino([], [], HOJE)), null);
});

conferir("inicio da janela cobre as oito semanas mais a folga", () => {
  // Semana de hoje comeca em 24/08. Sete semanas para tras e 30 dias de folga.
  assert.equal(inicioDaJanela(HOJE), "2026-06-06");
  assert.equal(inicioDaJanela(HOJE, 8, 0), "2026-07-06");
  // Tem que ser anterior ou igual ao comeco da primeira barra do grafico.
  const primeira = semanasDeTreino([], [], HOJE)[0].inicio;
  assert.ok(inicioDaJanela(HOJE) <= primeira);
});

conferir("teto do grafico nunca e zero", () => {
  assert.equal(tetoDoGrafico(semanasDeTreino([], [], HOJE)), 1);
  const semanas = semanasDeTreino([sessao("s1", "2026-08-25")], [serie("s1", 40, 10)], HOJE);
  assert.equal(tetoDoGrafico(semanas), 400);
});

conferir("milhar com ponto, como se le em portugues", () => {
  assert.equal(emMilhar(2977), "2.977");
  assert.equal(emMilhar(0), "0");
});

console.log(`\n${ok} verificacoes do aluno, todas passaram.`);

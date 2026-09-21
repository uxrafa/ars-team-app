import assert from "node:assert/strict";
import {
  coresDasSeries,
  evolucaoPorExercicio,
  kg,
  rotuloDaVariacao,
  variacaoPorSerie,
  MAX_SERIES_NO_GRAFICO,
  type SerieParaEvolucao,
} from "../src/lib/evolucao.ts";

let ok = 0;
function conferir(nome: string, f: () => void) {
  f();
  ok += 1;
  console.log("ok  ", nome);
}

const s = (
  exercicio_id: string,
  data: string,
  numero: number,
  carga_kg: number | null,
  reps: number | null = 10,
): SerieParaEvolucao => ({ exercicio_id, data, numero, carga_kg, reps });

const nomes = new Map([
  ["supino", "Supino reto"],
  ["agacho", "Agachamento"],
]);

/* --- agrupar ------------------------------------------------------------ */

conferir("uma linha por serie, do dia mais antigo para o mais novo", () => {
  const [e] = evolucaoPorExercicio(
    [s("supino", "2026-09-11", 1, 40), s("supino", "2026-09-05", 1, 35), s("supino", "2026-09-05", 2, 35)],
    nomes,
  );
  assert.deepEqual(e.dias.map((d) => d.data), ["2026-09-05", "2026-09-11"]);
  assert.deepEqual(e.numeros, [1, 2]);
  assert.equal(e.nome, "Supino reto");
});

conferir("a serie que cai aparece, e nao some atras da melhor carga", () => {
  // Era o defeito de mostrar "a melhor carga do dia": 40 na primeira e 30 na
  // terceira viravam "40 kg", e o aluno que empacou parecia estar otimo.
  const [e] = evolucaoPorExercicio(
    [s("supino", "2026-09-05", 1, 40), s("supino", "2026-09-05", 3, 30)],
    nomes,
  );
  assert.equal(e.dias[0].series.find((x) => x.numero === 3)?.carga, 30);
});

conferir("duas sessoes no mesmo dia viram um dia so, com a maior carga", () => {
  const [e] = evolucaoPorExercicio(
    [s("supino", "2026-09-05", 1, 35), s("supino", "2026-09-05", 1, 40)],
    nomes,
  );
  assert.equal(e.dias.length, 1);
  assert.equal(e.dias[0].series[0].carga, 40);
});

conferir("o exercicio feito por ultimo vem primeiro no seletor", () => {
  const lista = evolucaoPorExercicio(
    [s("agacho", "2026-09-02", 1, 60), s("supino", "2026-09-11", 1, 40)],
    nomes,
  );
  assert.deepEqual(lista.map((e) => e.exercicio_id), ["supino", "agacho"]);
});

conferir("serie sem carga fica como buraco, nao como zero", () => {
  // Zero puxaria a linha para o chao e pareceria que ele desistiu do exercicio.
  const [e] = evolucaoPorExercicio([s("supino", "2026-09-05", 1, null, 12)], nomes);
  assert.equal(e.dias[0].series[0].carga, null);
  assert.equal(e.dias[0].series[0].reps, 12);
});

/* --- variacao ----------------------------------------------------------- */

conferir("a variacao compara o primeiro dia com carga com o ultimo, serie a serie", () => {
  const [e] = evolucaoPorExercicio(
    [
      s("supino", "2026-08-25", 1, 30),
      s("supino", "2026-08-25", 3, 37.5),
      s("supino", "2026-09-01", 1, 32.5),
      s("supino", "2026-09-08", 1, 35),
      s("supino", "2026-09-08", 3, 37.5),
    ],
    nomes,
  );
  const v = variacaoPorSerie(e);
  assert.deepEqual(v.map(rotuloDaVariacao), ["S1 +5 kg", "S3 igual"]);
});

conferir("serie que caiu aparece com sinal de menos", () => {
  const [e] = evolucaoPorExercicio(
    [s("supino", "2026-09-01", 2, 40), s("supino", "2026-09-08", 2, 37.5)],
    nomes,
  );
  assert.equal(rotuloDaVariacao(variacaoPorSerie(e)[0]), "S2 −2,5 kg");
});

conferir("serie com um dia so nao tem variacao", () => {
  const [e] = evolucaoPorExercicio([s("supino", "2026-09-01", 1, 40)], nomes);
  assert.deepEqual(variacaoPorSerie(e), []);
});

/* --- cor ---------------------------------------------------------------- */

conferir("uma cor por serie ate o teto, e o teto nao estoura", () => {
  for (let n = 1; n <= MAX_SERIES_NO_GRAFICO; n++) assert.equal(coresDasSeries(n).length, n);
  assert.equal(coresDasSeries(9).length, MAX_SERIES_NO_GRAFICO);
  assert.equal(coresDasSeries(0).length, 1);
});

conferir("carga sem virgula-zero sobrando", () => {
  assert.equal(kg(40), "40");
  assert.equal(kg(37.5), "37,5");
});

console.log(`\n${ok} verificacoes da evolucao, todas passaram.`);

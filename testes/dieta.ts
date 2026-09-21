import assert from "node:assert/strict";
import {
  buscarAlimentos,
  calcularMetas,
  comparacao,
  diaDoAluno,
  distribuicao,
  faltasParaCalcular,
  fatorSugerido,
  idade,
  kcal,
  linhas,
  macrosDaRefeicao,
  macrosDoDia,
  porHorario,
  proximaRefeicao,
  tmbMifflin,
  type Alimento,
  type Refeicao,
} from "../src/lib/dieta.ts";

let ok = 0;
function conferir(nome: string, f: () => void) {
  f();
  ok += 1;
  console.log("ok  ", nome);
}

const perto = (a: number, b: number, tol = 0.01) =>
  assert.ok(Math.abs(a - b) <= tol, `${a} deveria ser ${b}`);

// Valores da TACO, por 100 g.
const arroz: Alimento = { id: "a", nome: "Arroz, tipo 1, cozido", grupo: null, origem: "taco", proteina_g: 2.5, carboidrato_g: 28.1, gordura_g: 0.2 };
const frango: Alimento = { id: "f", nome: "Frango, peito, sem pele, grelhado", grupo: null, origem: "taco", proteina_g: 32, carboidrato_g: 0, gordura_g: 2.5 };
const whey: Alimento = { id: "w", nome: "Whey protein", grupo: null, origem: "proprio", proteina_g: 80, carboidrato_g: 8, gordura_g: 6 };
const mapa = new Map([arroz, frango, whey].map((a) => [a.id, a]));

conferir("Mifflin-St Jeor bate com a formula publicada", () => {
  // 10*85 + 6.25*184 - 5*17 + 5
  assert.equal(tmbMifflin({ peso: 85, altura: 184, idade: 17, sexo: "masculino" }), 1920);
  // 10*60 + 6.25*165 - 5*30 - 161
  assert.equal(tmbMifflin({ peso: 60, altura: 165, idade: 30, sexo: "feminino" }), 1320.25);
});

conferir("idade conta o aniversario que ainda nao chegou", () => {
  assert.equal(idade("2009-03-10", "2026-09-21"), 17);
  assert.equal(idade("2009-09-22", "2026-09-21"), 16);
  assert.equal(idade("2009-09-21", "2026-09-21"), 17);
  assert.equal(idade(null, "2026-09-21"), null);
});

conferir("fator sugerido pelos dias de treino", () => {
  assert.equal(fatorSugerido(0), 1.2);
  assert.equal(fatorSugerido(2), 1.375);
  assert.equal(fatorSugerido(4), 1.55);
  assert.equal(fatorSugerido(6), 1.725);
});

conferir("metas: carboidrato fecha as calorias", () => {
  const m = calcularMetas(
    { peso: 85, altura: 184, idade: 17, sexo: "masculino" },
    { fator_atividade: 1.55, ajuste_pct: 10, proteina_g_kg: 2, gordura_g_kg: 1 },
  )!;
  assert.equal(m.tmb, 1920);
  assert.equal(m.gasto, 2976);
  assert.equal(m.kcal, 3274);
  assert.equal(m.macros.proteina, 170);
  assert.equal(m.macros.gordura, 85);
  // (3273.6 - 680 - 765) / 4
  assert.equal(m.macros.carboidrato, 457);
});

conferir("metas: carboidrato nunca fica negativo", () => {
  const m = calcularMetas(
    { peso: 100, altura: 170, idade: 60, sexo: "feminino" },
    { fator_atividade: 1.2, ajuste_pct: -30, proteina_g_kg: 3, gordura_g_kg: 1.5 },
  )!;
  assert.equal(m.macros.carboidrato, 0);
});

conferir("sem sexo nao calcula, e diz o que falta", () => {
  const d = { peso: 80, altura: 180, idade: null, sexo: null };
  assert.deepEqual(faltasParaCalcular(d), ["sexo", "idade"]);
  assert.equal(
    calcularMetas(d, { fator_atividade: 1.2, ajuste_pct: 0, proteina_g_kg: 2, gordura_g_kg: 1 }),
    null,
  );
});

conferir("soma da refeicao ignora texto livre e item sem gramas", () => {
  const r: Refeicao = {
    chave: "1",
    dia: "treino",
    nome: "Almoço",
    horario: "12:00",
    itens: [
      { alimento_id: "a", gramas: 200, descricao: "" },
      { alimento_id: "f", gramas: 150, descricao: "" },
      { alimento_id: null, gramas: null, descricao: "Salada verde à vontade" },
      { alimento_id: "w", gramas: null, descricao: "" },
    ],
  };
  const m = macrosDaRefeicao(r, mapa);
  perto(m.proteina, 5 + 48);
  perto(m.carboidrato, 56.2);
  perto(m.gordura, 0.4 + 3.75);
  perto(kcal(m), 53 * 4 + 56.2 * 4 + 4.15 * 9);
});

conferir("o dia soma so as refeicoes daquele dia", () => {
  const refs: Refeicao[] = [
    { chave: "1", dia: "treino", nome: "Pós", horario: "17:00", itens: [{ alimento_id: "w", gramas: 30, descricao: "" }] },
    { chave: "2", dia: "descanso", nome: "Almoço", horario: "12:00", itens: [{ alimento_id: "a", gramas: 100, descricao: "" }] },
  ];
  perto(macrosDoDia(refs, "treino", mapa).proteina, 24);
  perto(macrosDoDia(refs, "descanso", mapa).proteina, 2.5);
});

conferir("refeicoes em ordem de relogio, sem horario no fim", () => {
  const r = porHorario([{ horario: "19:00" }, { horario: "" }, { horario: "07:30" }]);
  assert.deepEqual(r.map((x) => x.horario), ["07:30", "19:00", ""]);
});

conferir("dia do aluno segue a anamnese, e sem descanso vale o de treino", () => {
  // 21/09/2026 e segunda (1).
  assert.equal(diaDoAluno([1, 3, 5], "2026-09-21", true), "treino");
  assert.equal(diaDoAluno([2, 4], "2026-09-21", true), "descanso");
  assert.equal(diaDoAluno([2, 4], "2026-09-21", false), "treino");
  assert.equal(diaDoAluno([], "2026-09-21", true), "treino");
});

conferir("comparacao com a meta tolera 5%", () => {
  assert.deepEqual(comparacao(3100, 3000), { texto: "no alvo", tom: "ok" });
  assert.deepEqual(comparacao(3400, 3000), { texto: "+400", tom: "aviso" });
  assert.equal(comparacao(2000, 3000).texto, "−1.000");
});

conferir("distribuicao soma perto de 100", () => {
  const d = distribuicao({ proteina: 193.8, carboidrato: 662.3, gordura: 46.6 });
  assert.equal(d.proteina + d.carboidrato + d.gordura, 100);
});

conferir("busca sem acento, palavra por palavra, proprio primeiro", () => {
  const r = buscarAlimentos([arroz, frango, whey], "frango grelhado");
  assert.deepEqual(r.map((a) => a.id), ["f"]);
  assert.deepEqual(buscarAlimentos([arroz, frango, whey], "").length, 0);
  const pro = { ...arroz, id: "p", nome: "Arroz da casa", origem: "proprio" as const };
  assert.equal(buscarAlimentos([arroz, pro], "arroz")[0].id, "p");
});

conferir("orientacoes: uma por linha, sem marcador nem linha vazia", () => {
  assert.deepEqual(linhas("- Reduzir sódio\n\n• Beber água\n  "), ["Reduzir sódio", "Beber água"]);
});

conferir("proxima refeicao tolera uma hora de atraso", () => {
  const h = ["07:00", "12:00", "16:00", "20:00"];
  assert.equal(proximaRefeicao(h, "06:00"), 0);
  assert.equal(proximaRefeicao(h, "12:40"), 1);
  assert.equal(proximaRefeicao(h, "13:10"), 2);
  assert.equal(proximaRefeicao(h, "21:30"), null);
});

console.log(`\n${ok} conferências passaram.`);

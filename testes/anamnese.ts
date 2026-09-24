import assert from "node:assert/strict";
import {
  ANAMNESE_VAZIA,
  dataParaISO,
  idadeEm,
  isoParaData,
  mascararData,
  primeiraFalta,
} from "../src/lib/anamnese.ts";

let ok = 0;
function conferir(nome: string, f: () => void) {
  f();
  ok += 1;
  console.log("ok  ", nome);
}

conferir("mascara poe a barra sozinha e ignora letra", () => {
  assert.equal(mascararData("0"), "0");
  assert.equal(mascararData("0107"), "01/07");
  assert.equal(mascararData("01071989"), "01/07/1989");
  assert.equal(mascararData("01/07/1989"), "01/07/1989");
  assert.equal(mascararData("01a07b1989999"), "01/07/1989");
});

conferir("data que nao existe nao vira data", () => {
  assert.equal(dataParaISO("01/07/1989"), "1989-07-01");
  assert.equal(dataParaISO("31/02/1990"), null);
  assert.equal(dataParaISO("01/07/89"), null);
  assert.equal(dataParaISO(""), null);
});

conferir("ida e volta com o banco", () => {
  assert.equal(isoParaData("1989-07-01"), "01/07/1989");
  assert.equal(isoParaData(null), "");
  assert.equal(dataParaISO(isoParaData("2003-01-15")), "2003-01-15");
});

conferir("idade conta o aniversario que ainda nao chegou", () => {
  assert.equal(idadeEm("01/07/1989", "2026-09-24"), 37);
  assert.equal(idadeEm("25/09/1989", "2026-09-24"), 36);
  assert.equal(idadeEm("31/02/1989", "2026-09-24"), null);
});

conferir("nascimento agora e obrigatorio e precisa fechar", () => {
  const base = {
    ...ANAMNESE_VAZIA,
    peso_kg: "78",
    altura_cm: "169",
    sexo: "feminino",
    objetivo: "emagrecimento",
    local_treino: "academia",
    nivel: "iniciante",
    dias_disponiveis: [1, 3],
  };
  assert.equal(primeiraFalta(base)?.campo, "nascimento");
  assert.equal(primeiraFalta({ ...base, nascimento: "01/07/19" })?.campo, "nascimento");
  assert.equal(primeiraFalta({ ...base, nascimento: "31/02/1990" })?.campo, "nascimento");
  // Passou da data, a proxima falta ja e da etapa 2.
  assert.equal(primeiraFalta({ ...base, nascimento: "01/07/1989" })?.etapa, 2);
});

console.log(`\n${ok} verificacoes da anamnese, todas passaram.`);

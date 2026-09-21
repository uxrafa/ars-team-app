import assert from "node:assert/strict";
import { resumoDasMedidas, rotuloDaDiferenca, type LinhaMedida } from "../src/lib/medidas.ts";

let ok = 0;
function conferir(nome: string, f: () => void) {
  f();
  ok += 1;
  console.log("ok  ", nome);
}

const l = (data: string, m: Partial<LinhaMedida> = {}): LinhaMedida => ({
  data,
  peso_kg: null,
  cintura_cm: null,
  quadril_cm: null,
  braco_cm: null,
  coxa_cm: null,
  ...m,
});

conferir("pesar depois de medir nao some com as medidas", () => {
  // O bug que existia na tela, reproduzido com os dados reais de 21/09: mediu
  // tudo em 05/09, pesou so o peso em 11/09, e a aba Medidas ficava vazia.
  const r = resumoDasMedidas([
    l("2026-09-05", { peso_kg: 61, cintura_cm: 70, quadril_cm: 101, braco_cm: 30, coxa_cm: 60 }),
    l("2026-09-11", { peso_kg: 62 }),
  ]);
  assert.deepEqual(r.itens.map((i) => i.atual), [70, 101, 30, 60]);
  assert.equal(r.ultima, "2026-09-05");
});

conferir("com um registro so, mostra o valor e nao inventa variacao", () => {
  const r = resumoDasMedidas([l("2026-09-05", { cintura_cm: 70 })]);
  assert.equal(r.itens[0].diferenca, null);
  assert.equal(r.desde, null);
});

conferir("a variacao e contra a primeira medicao, medida a medida", () => {
  const r = resumoDasMedidas([
    l("2026-08-05", { cintura_cm: 84, braco_cm: 31 }),
    l("2026-08-20", { peso_kg: 80 }),
    l("2026-09-05", { cintura_cm: 82, braco_cm: 32.5 }),
  ]);
  assert.equal(r.itens.find((i) => i.chave === "cintura_cm")?.diferenca, -2);
  assert.equal(r.itens.find((i) => i.chave === "braco_cm")?.diferenca, 1.5);
  assert.equal(r.desde, "2026-08-05");
  assert.equal(r.ultima, "2026-09-05");
});

conferir("medida nunca registrada fica vazia", () => {
  const r = resumoDasMedidas([l("2026-09-05", { cintura_cm: 70 })]);
  assert.equal(r.itens.find((i) => i.chave === "coxa_cm")?.atual, null);
});

conferir("a seta diz a direcao, sem sinal de mais ou menos", () => {
  assert.equal(rotuloDaDiferenca(-2), "↓ 2");
  assert.equal(rotuloDaDiferenca(1.5), "↑ 1,5");
  assert.equal(rotuloDaDiferenca(0), "=");
});

console.log(`\n${ok} verificacoes das medidas, todas passaram.`);

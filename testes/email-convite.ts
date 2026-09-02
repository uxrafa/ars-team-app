import assert from "node:assert/strict";
import {
  assuntoDoConvite,
  corpoDoConvite,
  previaDoConvite,
  textoDoConvite,
  type ConviteParaEnviar,
} from "../src/lib/email-convite.ts";

let ok = 0;
function conferir(nome: string, f: () => void) {
  f();
  ok += 1;
  console.log("ok  ", nome);
}

const LINK = "https://ars-team-app.vercel.app/convite/obCbNQ0o5VGWK43Jvo1De7EIZO7ZVi5V";

const convite = (troca: Partial<ConviteParaEnviar> = {}): ConviteParaEnviar => ({
  nome: "Marcos Vinícius Andrade",
  link: LINK,
  tipo: "consultoria",
  diasDeValidade: 30,
  ...troca,
});

conferir("assunto chama a pessoa pelo primeiro nome", () => {
  assert.equal(assuntoDoConvite("Marcos Vinícius Andrade"), "Marcos, seu acesso à ARS Team está pronto");
  assert.equal(assuntoDoConvite("  ana  "), "ana, seu acesso à ARS Team está pronto");
});

conferir("previa nao repete o assunto", () => {
  const p = previaDoConvite(convite());
  assert.ok(!p.includes("acesso à ARS Team está pronto"));
  assert.ok(p.includes("30 dias"));
});

conferir("o link inteiro aparece no corpo, no botao e por extenso", () => {
  const html = corpoDoConvite(convite());
  const vezes = html.split(LINK).length - 1;
  assert.equal(vezes, 2, "botao e endereco solto");
  assert.ok(html.includes('href="' + LINK + '"'));
});

conferir("texto puro carrega o link e serve para quem le sem HTML", () => {
  const t = textoDoConvite(convite());
  assert.ok(t.includes(LINK));
  assert.ok(!t.includes("<"));
});

conferir("planilha nao promete que o Allisson vai ler o recado", () => {
  const consultoria = corpoDoConvite(convite({ tipo: "consultoria" }));
  const planilha = corpoDoConvite(convite({ tipo: "planilha" }));
  assert.ok(consultoria.includes("me conta como foi o treino"));
  assert.ok(!planilha.includes("me conta como foi o treino"));
});

conferir("nome com HTML nao vira HTML dentro do e-mail", () => {
  const html = corpoDoConvite(convite({ nome: '<img src=x onerror="alert(1)">' }));
  assert.ok(!html.includes("<img src=x"));
  assert.ok(html.includes("&lt;img"));
});

conferir("token com caractere de URL nao quebra o atributo href", () => {
  // base64url nao gera aspas, mas o link vem de fora desta funcao.
  const html = corpoDoConvite(convite({ link: 'https://x.com/a"onmouseover="mau' }));
  assert.ok(!html.includes('"onmouseover="'));
  assert.ok(html.includes("&quot;onmouseover=&quot;"));
});

conferir("a validade que o e-mail promete e a que recebeu", () => {
  const html = corpoDoConvite(convite({ diasDeValidade: 7 }));
  assert.ok(html.includes("vale 7 dias"));
  assert.ok(!html.includes("vale 30 dias"));
});

console.log(`\n${ok} verificacoes do e-mail de convite, todas passaram.`);

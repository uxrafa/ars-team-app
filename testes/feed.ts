import assert from "node:assert/strict";
import {
  contarRecados,
  duracaoEmMinutos,
  emTempo,
  juntarSeries,
  linhaDaSerie,
  mensagemDeResposta,
  montarFeed,
  resumoEmNumeros,
  rotuloDoDia,
  somenteComRecado,
  volumeDeSeries,
  type DadosDoAluno,
  type LinhaSerieFeed,
  type LinhaSessaoFeed,
} from "../src/lib/feed.ts";
import { nomeDoEsforco, tomDoEsforco } from "../src/lib/treino.ts";

let ok = 0;
function conferir(nome: string, f: () => void) {
  f();
  ok += 1;
  console.log("ok  ", nome);
}

const HOJE = "2026-08-29";

const alunos: DadosDoAluno[] = [
  { id: "a1", nome: "Marcos Ribeiro", tipo: "consultoria", whatsapp: "11988887777" },
  { id: "a2", nome: "Larissa Souza", tipo: "planilha", whatsapp: null },
];

const sessao = (
  id: string,
  aluno_id: string,
  data: string,
  extra: Partial<LinhaSessaoFeed> = {},
): LinhaSessaoFeed => ({
  id,
  aluno_id,
  data,
  peso_kg: null,
  esforco: null,
  nota: null,
  iniciada_em: `${data}T21:00:00Z`,
  concluida_em: `${data}T22:00:00Z`,
  bloco: { nome: "Treino B", foco: "costas" },
  ...extra,
});

const serie = (
  sessao_id: string,
  exercicio_id: string,
  numero: number,
  carga_kg: number | null,
  reps: number | null,
  nome = "Remada curvada",
): LinhaSerieFeed => ({ sessao_id, exercicio_id, numero, carga_kg, reps, exercicio: nome });

/* --- esforco --------------------------------------------------------- */

conferir("esforco vira palavra, arredondando para o degrau mais perto", () => {
  assert.equal(nomeDoEsforco(8), "Pesado");
  assert.equal(nomeDoEsforco(7), "Certo");
  assert.equal(nomeDoEsforco(1), "Leve");
  assert.equal(nomeDoEsforco(10), "No limite");
  assert.equal(nomeDoEsforco(null), null);
});

conferir("so os extremos do esforco ganham cor de alerta", () => {
  assert.equal(tomDoEsforco(2), "aviso");
  assert.equal(tomDoEsforco(4), "aviso");
  assert.equal(tomDoEsforco(6), "ok");
  assert.equal(tomDoEsforco(8), "ok");
  assert.equal(tomDoEsforco(10), "aviso");
  assert.equal(tomDoEsforco(null), "neutro");
});

/* --- tempo ----------------------------------------------------------- */

conferir("duracao ignora sessao esquecida aberta", () => {
  assert.equal(duracaoEmMinutos("2026-08-29T21:00:00Z", "2026-08-29T21:48:00Z"), 48);
  assert.equal(duracaoEmMinutos("2026-08-29T21:00:00Z", "2026-08-30T04:00:00Z"), null);
  assert.equal(duracaoEmMinutos("2026-08-29T21:00:00Z", null), null);
});

conferir("tempo em hora e minuto", () => {
  assert.equal(emTempo(48), "48 min");
  assert.equal(emTempo(60), "1 h");
  assert.equal(emTempo(72), "1 h 12");
  assert.equal(emTempo(null), null);
});

conferir("rotulo do dia nao escorrega de fuso", () => {
  assert.equal(rotuloDoDia("2026-08-29", HOJE), "Hoje");
  assert.equal(rotuloDoDia("2026-08-28", HOJE), "Ontem");
  assert.equal(rotuloDoDia("2026-08-27", HOJE), "QUI, 27 AGO");
  // Virada de mes, que e onde erro de data costuma aparecer.
  assert.equal(rotuloDoDia("2026-07-31", "2026-08-01"), "Ontem");
});

/* --- montagem -------------------------------------------------------- */

conferir("series viram exercicios na ordem em que foram feitas", () => {
  const feito = juntarSeries([
    serie("s1", "e1", 2, 40, 10),
    serie("s1", "e2", 1, 20, 12, "Puxada"),
    serie("s1", "e1", 1, 40, 12),
  ]);
  assert.equal(feito.length, 2);
  assert.equal(feito[0].nome, "Remada curvada");
  assert.deepEqual(
    feito[0].series.map((s) => s.numero),
    [1, 2],
  );
  assert.equal(feito[1].nome, "Puxada");
});

conferir("volume soma carga por reps e aguenta campo vazio", () => {
  assert.equal(volumeDeSeries([serie("s1", "e1", 1, 40, 10), serie("s1", "e1", 2, 40, 8)]), 720);
  assert.equal(volumeDeSeries([serie("s1", "e1", 1, null, 10)]), 0);
  assert.equal(volumeDeSeries([]), 0);
});

conferir("feed agrupa por dia, do mais recente para o mais antigo", () => {
  const dias = montarFeed(
    [
      sessao("s1", "a1", "2026-08-27"),
      sessao("s2", "a1", "2026-08-29"),
      sessao("s3", "a2", "2026-08-29"),
    ],
    [],
    alunos,
    HOJE,
  );
  assert.deepEqual(
    dias.map((d) => d.rotulo),
    ["Hoje", "QUI, 27 AGO"],
  );
  assert.equal(dias[0].treinos.length, 2);
  assert.equal(dias[1].treinos.length, 1);
});

conferir("sessao de aluno que nao existe mais nao quebra o feed", () => {
  const dias = montarFeed([sessao("s1", "sumiu", HOJE)], [], alunos, HOJE);
  assert.equal(dias.length, 0);
});

conferir("bloco apagado da ficha vira Treino, e nao linha vazia", () => {
  const dias = montarFeed([sessao("s1", "a1", HOJE, { bloco: null })], [], alunos, HOJE);
  assert.equal(dias[0].treinos[0].bloco, "Treino");
});

conferir("cada treino leva as proprias series, e nao as do vizinho", () => {
  const dias = montarFeed(
    [sessao("s1", "a1", HOJE), sessao("s2", "a2", HOJE)],
    [serie("s1", "e1", 1, 40, 10), serie("s2", "e9", 1, 30, 10, "Agachamento")],
    alunos,
    HOJE,
  );
  const treinos = dias[0].treinos;
  assert.equal(treinos.length, 2);
  for (const t of treinos) {
    assert.equal(t.exercicios.length, 1);
    assert.equal(t.totalSeries, 1);
  }
  assert.notEqual(treinos[0].exercicios[0].nome, treinos[1].exercicios[0].nome);
});

conferir("contagem e filtro de recado", () => {
  const dias = montarFeed(
    [
      sessao("s1", "a1", HOJE, { nota: "Senti o ombro no supino." }),
      sessao("s2", "a2", HOJE, { nota: "   " }),
      sessao("s3", "a1", "2026-08-28"),
    ],
    [],
    alunos,
    HOJE,
  );
  // Nota só de espaco nao e recado.
  assert.equal(contarRecados(dias), 1);
  const filtrado = somenteComRecado(dias);
  assert.equal(filtrado.length, 1);
  assert.equal(filtrado[0].treinos.length, 1);
});

/* --- texto ----------------------------------------------------------- */

conferir("resposta cita o recado e diz de qual treino se fala", () => {
  const dias = montarFeed(
    [sessao("s1", "a1", HOJE, { nota: "Senti o ombro no supino, troquei para halter." })],
    [],
    alunos,
    HOJE,
  );
  const texto = mensagemDeResposta(dias[0].treinos[0], HOJE);
  assert.ok(texto.startsWith("Oi Marcos,"));
  assert.ok(texto.includes("Treino B de hoje"));
  assert.ok(texto.includes("troquei para halter"));
});

conferir("treino sem recado ainda abre conversa, sem citacao vazia", () => {
  const dias = montarFeed([sessao("s1", "a1", "2026-08-27")], [], alunos, HOJE);
  const texto = mensagemDeResposta(dias[0].treinos[0], HOJE);
  assert.ok(texto.includes("qui, 27 ago"));
  assert.ok(!texto.includes("anotou"));
});

conferir("recado gigante entra cortado, e nao inteiro na URL", () => {
  const dias = montarFeed(
    [sessao("s1", "a1", HOJE, { nota: "a".repeat(600) })],
    [],
    alunos,
    HOJE,
  );
  const texto = mensagemDeResposta(dias[0].treinos[0], HOJE);
  assert.ok(texto.includes("…"));
  assert.ok(texto.length < 400);
});

conferir("resumo em numeros pula o que nao existe", () => {
  const dias = montarFeed(
    [sessao("s1", "a1", HOJE)],
    [serie("s1", "e1", 1, 40, 10), serie("s1", "e1", 2, 40, 10)],
    alunos,
    HOJE,
  );
  const texto = resumoEmNumeros(dias[0].treinos[0]);
  assert.ok(texto.includes("2 séries"));
  assert.ok(texto.includes("1 exercício"));
  assert.ok(texto.includes("800 kg"));
  assert.ok(texto.includes("1 h"));

  const vazio = montarFeed(
    [sessao("s2", "a1", HOJE, { iniciada_em: `${HOJE}T22:00:00Z` })],
    [],
    alunos,
    HOJE,
  );
  assert.equal(resumoEmNumeros(vazio[0].treinos[0]), "treino concluído");
});

conferir("serie sem carga mostra so as reps", () => {
  assert.equal(linhaDaSerie({ carga_kg: 42.5, reps: 12 }), "12 × 42,5 kg");
  assert.equal(linhaDaSerie({ carga_kg: null, reps: 12 }), "12 rep");
  assert.equal(linhaDaSerie({ carga_kg: null, reps: null }), "— rep");
});

console.log(`\n${ok} verificacoes do feed, todas passaram.`);

/**
 * Regra da orientação alimentar: as contas que o Allisson fazia na planilha.
 *
 * Tudo puro e sem import, para o teste rodar com o node direto. As fórmulas
 * foram escolhidas com o Rafael em 21/09:
 *
 * - TMB: Mifflin-St Jeor, a mais validada em adultos sem obesidade.
 * - Gasto: TMB × fator de atividade.
 * - Meta: gasto ± um percentual por objetivo.
 * - Proteína e gordura em g/kg do peso de HOJE (faixas da ISSN); carboidrato
 *   fecha as calorias que sobram.
 * - Kcal sempre 4/4/9 sobre os macros, para o total e a pizza baterem.
 */

export type Sexo = "masculino" | "feminino";
export type Dia = "treino" | "descanso";

export const KCAL_POR_G = { proteina: 4, carboidrato: 4, gordura: 9 } as const;

/* ------------------------------------------------------------------ */
/* Macros                                                              */
/* ------------------------------------------------------------------ */

export type Macros = { proteina: number; carboidrato: number; gordura: number };

export const ZERO: Macros = { proteina: 0, carboidrato: 0, gordura: 0 };

export function kcal(m: Macros): number {
  return (
    m.proteina * KCAL_POR_G.proteina +
    m.carboidrato * KCAL_POR_G.carboidrato +
    m.gordura * KCAL_POR_G.gordura
  );
}

export function somar(a: Macros, b: Macros): Macros {
  return {
    proteina: a.proteina + b.proteina,
    carboidrato: a.carboidrato + b.carboidrato,
    gordura: a.gordura + b.gordura,
  };
}

/** Alimento como vem do banco: macros por 100 g. */
export type Alimento = {
  id: string;
  nome: string;
  grupo: string | null;
  origem: "taco" | "proprio";
  proteina_g: number;
  carboidrato_g: number;
  gordura_g: number;
};

export function macrosDoItem(a: Alimento, gramas: number): Macros {
  const f = gramas > 0 ? gramas / 100 : 0;
  return {
    proteina: Number(a.proteina_g) * f,
    carboidrato: Number(a.carboidrato_g) * f,
    gordura: Number(a.gordura_g) * f,
  };
}

/* ------------------------------------------------------------------ */
/* A orientação como a tela usa                                        */
/* ------------------------------------------------------------------ */

/** Com alimento é conta; sem alimento é só texto ("salada à vontade"). */
export type ItemAlimentar = {
  alimento_id: string | null;
  gramas: number | null;
  descricao: string;
};

export type Refeicao = {
  /** Só para a chave do React. O banco recria tudo a cada gravação. */
  chave: string;
  dia: Dia;
  nome: string;
  horario: string;
  itens: ItemAlimentar[];
};

export function macrosDaRefeicao(r: Refeicao, alimentos: Map<string, Alimento>): Macros {
  return r.itens.reduce((acc, i) => {
    const a = i.alimento_id ? alimentos.get(i.alimento_id) : undefined;
    if (!a || !i.gramas) return acc;
    return somar(acc, macrosDoItem(a, i.gramas));
  }, ZERO);
}

export function macrosDoDia(
  refeicoes: Refeicao[],
  dia: Dia,
  alimentos: Map<string, Alimento>,
): Macros {
  return refeicoes
    .filter((r) => r.dia === dia)
    .reduce((acc, r) => somar(acc, macrosDaRefeicao(r, alimentos)), ZERO);
}

/**
 * Ordem das refeições é a do relógio. Sem arrastar: ninguém quer o almoço
 * antes do café, e o horário já diz a ordem. Sem horário vai para o fim.
 */
export function porHorario<T extends { horario: string }>(lista: T[]): T[] {
  return [...lista].sort((a, b) => {
    if (!a.horario && !b.horario) return 0;
    if (!a.horario) return 1;
    if (!b.horario) return -1;
    return a.horario.localeCompare(b.horario);
  });
}

/**
 * Qual das duas o aluno vê hoje.
 *
 * Dia de treino pela anamnese, a mesma regra da tela Hoje. Se o Allisson não
 * montou o descanso, a de treino vale para todos os dias: ele pode ter uma
 * orientação só, e o aluno não pode abrir numa tela vazia por isso.
 */
export function diaDoAluno(
  diasDeTreino: number[] | null,
  hojeISO: string,
  temDescanso: boolean,
): Dia {
  if (!temDescanso) return "treino";
  if (!diasDeTreino || !diasDeTreino.length) return "treino";
  const [a, m, d] = hojeISO.split("-").map(Number);
  const semana = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return diasDeTreino.includes(semana) ? "treino" : "descanso";
}

/* ------------------------------------------------------------------ */
/* Gasto e metas                                                       */
/* ------------------------------------------------------------------ */

export function idade(nascimentoISO: string | null, hojeISO: string): number | null {
  if (!nascimentoISO) return null;
  const [na, nm, nd] = nascimentoISO.split("-").map(Number);
  const [ha, hm, hd] = hojeISO.split("-").map(Number);
  let anos = ha - na;
  if (hm < nm || (hm === nm && hd < nd)) anos -= 1;
  return anos >= 0 && anos < 120 ? anos : null;
}

/** Mifflin-St Jeor (1990). Peso em kg, altura em cm, idade em anos. */
export function tmbMifflin(p: { peso: number; altura: number; idade: number; sexo: Sexo }): number {
  const base = 10 * p.peso + 6.25 * p.altura - 5 * p.idade;
  return base + (p.sexo === "masculino" ? 5 : -161);
}

export const NIVEIS_DE_ATIVIDADE = [
  { fator: 1.2, nome: "Sedentário" },
  { fator: 1.375, nome: "Leve · 1–2 treinos" },
  { fator: 1.55, nome: "Moderado · 3–5 treinos" },
  { fator: 1.725, nome: "Alto · 6–7 treinos" },
  { fator: 1.9, nome: "Muito alto · 2x ao dia ou trabalho físico" },
] as const;

/**
 * Ponto de partida pelos dias de treino da anamnese. É sugestão: o Allisson
 * conhece a rotina do aluno fora da academia e troca com um toque.
 */
export function fatorSugerido(diasPorSemana: number): number {
  if (diasPorSemana <= 0) return 1.2;
  if (diasPorSemana <= 2) return 1.375;
  if (diasPorSemana <= 5) return 1.55;
  return 1.725;
}

export type Objetivo = "emagrecimento" | "hipertrofia" | "condicionamento" | "saude_geral";

/**
 * Ponto de partida por objetivo, dentro das faixas da ISSN. Déficit de 15% e
 * superávit de 10% são os mais usados para perder gordura sem perder massa e
 * para ganhar massa sem ganhar gordura demais.
 */
export function padroesDoObjetivo(o: Objetivo | null): {
  ajuste_pct: number;
  proteina_g_kg: number;
  gordura_g_kg: number;
} {
  switch (o) {
    case "emagrecimento":
      return { ajuste_pct: -15, proteina_g_kg: 2.0, gordura_g_kg: 0.8 };
    case "hipertrofia":
      return { ajuste_pct: 10, proteina_g_kg: 1.8, gordura_g_kg: 1.0 };
    default:
      return { ajuste_pct: 0, proteina_g_kg: 1.6, gordura_g_kg: 0.8 };
  }
}

export type DadosDoAluno = {
  peso: number | null;
  altura: number | null;
  idade: number | null;
  sexo: Sexo | null;
};

export type Parametros = {
  fator_atividade: number;
  ajuste_pct: number;
  proteina_g_kg: number;
  gordura_g_kg: number;
};

export type Metas = {
  tmb: number;
  gasto: number;
  kcal: number;
  macros: Macros;
};

/** O que falta para calcular, em palavras curtas, para virar tag na tela. */
export function faltasParaCalcular(d: DadosDoAluno): string[] {
  const f: string[] = [];
  if (!d.sexo) f.push("sexo");
  if (d.idade === null) f.push("idade");
  if (!d.altura) f.push("altura");
  if (!d.peso) f.push("peso");
  return f;
}

export function calcularMetas(d: DadosDoAluno, p: Parametros): Metas | null {
  if (faltasParaCalcular(d).length) return null;
  const peso = d.peso!;
  const tmb = tmbMifflin({ peso, altura: d.altura!, idade: d.idade!, sexo: d.sexo! });
  const gasto = tmb * p.fator_atividade;
  const alvo = gasto * (1 + p.ajuste_pct / 100);
  const proteina = p.proteina_g_kg * peso;
  const gordura = p.gordura_g_kg * peso;
  // Carboidrato é o que sobra. Se proteína e gordura já passam da meta, fica
  // zero em vez de negativo, e a tela mostra a meta de kcal estourada.
  const carboidrato = Math.max(0, (alvo - proteina * 4 - gordura * 9) / 4);
  return {
    tmb: Math.round(tmb),
    gasto: Math.round(gasto),
    kcal: Math.round(alvo),
    macros: {
      proteina: Math.round(proteina),
      carboidrato: Math.round(carboidrato),
      gordura: Math.round(gordura),
    },
  };
}

/**
 * Quanto o dia montado está da meta, como tag curta: "no alvo", "+320 kcal",
 * "−150 kcal". Tolerância de 5%: ninguém pesa comida no grama, e cobrar
 * precisão que não existe só faz o Allisson brigar com o número.
 */
export function comparacao(atual: number, meta: number): { texto: string; tom: "ok" | "aviso" } {
  if (meta <= 0) return { texto: "", tom: "ok" };
  const dif = Math.round(atual - meta);
  if (Math.abs(dif) <= meta * 0.05) return { texto: "no alvo", tom: "ok" };
  return { texto: `${dif > 0 ? "+" : "−"}${milhar(Math.abs(dif))}`, tom: "aviso" };
}

/** Participação de cada macro nas kcal, para a barra de distribuição. */
export function distribuicao(m: Macros): Macros {
  const total = kcal(m);
  if (total <= 0) return ZERO;
  return {
    proteina: Math.round(((m.proteina * 4) / total) * 100),
    carboidrato: Math.round(((m.carboidrato * 4) / total) * 100),
    gordura: Math.round(((m.gordura * 9) / total) * 100),
  };
}

/* ------------------------------------------------------------------ */
/* Texto                                                               */
/* ------------------------------------------------------------------ */

export function milhar(n: number): string {
  return Math.round(n).toLocaleString("pt-BR");
}

export function gramas(n: number): string {
  return `${Math.round(n)} g`;
}

/** "5,4 L" com vírgula, que é como o aluno lê. */
export function litros(n: number): string {
  return `${String(Math.round(n * 10) / 10).replace(".", ",")} L`;
}

/** Aceita vírgula, como no resto do app. */
export function paraNumero(texto: string): number | null {
  const limpo = String(texto ?? "").replace(",", ".").trim();
  if (!limpo) return null;
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

/** "Orientações" é uma por linha; linha vazia não vira item. */
export function linhas(texto: string | null): string[] {
  return (texto ?? "")
    .split("\n")
    .map((l) => l.replace(/^[\s•\-–]+/, "").trim())
    .filter(Boolean);
}

/* ------------------------------------------------------------------ */
/* Busca                                                               */
/* ------------------------------------------------------------------ */

function semAcento(t: string): string {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Palavra por palavra e sem acento, igual a busca de exercício: "frango
 * grelhado" acha "Frango, peito, sem pele, grelhado".
 *
 * Alimento próprio vem antes, porque é o que o Allisson cadastrou por usar
 * sempre; depois os nomes mais curtos, que na TACO são os mais genéricos
 * ("Banana, prata, crua" antes de "Banana, doce em barra").
 */
export function buscarAlimentos(lista: Alimento[], busca: string, limite = 30): Alimento[] {
  const termos = semAcento(busca).split(/[\s,]+/).filter(Boolean);
  if (!termos.length) return [];
  return lista
    .filter((a) => {
      const alvo = semAcento(a.nome);
      return termos.every((t) => alvo.includes(t));
    })
    .sort((a, b) => {
      if (a.origem !== b.origem) return a.origem === "proprio" ? -1 : 1;
      return a.nome.length - b.nome.length;
    })
    .slice(0, limite);
}

/**
 * Qual refeição vem agora, para o aluno achar a dele sem rolar. É a primeira
 * cujo horário ainda não passou há mais de uma hora: quem almoça 12:00 e abre
 * o app 12:20 ainda está no almoço. Depois da última, nenhuma.
 */
export function proximaRefeicao(horarios: string[], agoraHHMM: string): number | null {
  const min = (h: string) => {
    const [a, b] = h.split(":").map(Number);
    return a * 60 + b;
  };
  const agora = min(agoraHHMM);
  const i = horarios.findIndex((h) => h && min(h) + 60 > agora);
  return i < 0 ? null : i;
}

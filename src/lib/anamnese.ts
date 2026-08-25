/**
 * Formato da anamnese, compartilhado entre a tela e as server actions.
 *
 * Os campos ficam como texto porque vem de input. A conversao para numero
 * acontece na hora de gravar, e o banco ainda valida por cima com constraint:
 * a regra de verdade mora la, isto aqui e so para dar mensagem boa ao aluno.
 */

export const VERSAO_CONSENTIMENTO = "v1";

export const OBJETIVOS = [
  ["emagrecimento", "Emagrecimento"],
  ["hipertrofia", "Hipertrofia"],
  ["condicionamento", "Condicionamento"],
  ["saude_geral", "Saúde geral"],
] as const;

export const LOCAIS = [
  ["academia", "Academia"],
  ["casa", "Em casa"],
  ["ambos", "Os dois"],
] as const;

export const NIVEIS = [
  ["iniciante", "Iniciante", "Nunca treinei ou parei faz mais de um ano"],
  ["intermediario", "Intermediário", "Treino com alguma regularidade faz mais de 6 meses"],
  ["avancado", "Avançado", "Treino faz anos e já conheço bem os exercícios"],
] as const;

export const PERIODOS = [
  ["manha", "Manhã"],
  ["tarde", "Tarde"],
  ["noite", "Noite"],
] as const;

/** 0 = domingo, igual ao banco. A tela mostra começando na segunda. */
export const DIAS = [
  [1, "S", "Seg"],
  [2, "T", "Ter"],
  [3, "Q", "Qua"],
  [4, "Q", "Qui"],
  [5, "S", "Sex"],
  [6, "S", "Sáb"],
  [0, "D", "Dom"],
] as const;

export const ANGULOS = [
  ["frente", "Frente"],
  ["lado", "Lado"],
  ["costas", "Costas"],
] as const;

/**
 * As cinco perguntas de triagem. Uma lista so, que serve para desenhar a
 * tela, validar o envio e montar o insert. Mexer aqui muda os tres.
 */
export const PERGUNTAS_SAUDE = [
  {
    campo: "coracao",
    detalhe: "coracao_detalhe",
    texto: "Algum médico já disse que você tem problema no coração?",
    dica: "Qual, e desde quando?",
  },
  {
    campo: "dor_peito",
    detalhe: "dor_peito_detalhe",
    texto: "Sente dor no peito ou falta de ar ao fazer esforço?",
    dica: "Em que situação costuma acontecer?",
  },
  {
    campo: "pressao_alta",
    detalhe: "pressao_alta_detalhe",
    texto: "Já teve pressão alta diagnosticada?",
    dica: "Está controlada? Toma remédio para isso?",
  },
  {
    campo: "cirurgia_12m",
    detalhe: "cirurgia_12m_detalhe",
    texto: "Fez alguma cirurgia nos últimos 12 meses?",
    dica: "Qual, e há quanto tempo?",
  },
  {
    campo: "medicacao_continua",
    detalhe: "medicacao_continua_detalhe",
    texto: "Toma algum remédio de uso contínuo?",
    dica: "Quais?",
  },
] as const;

export type CampoSaude = (typeof PERGUNTAS_SAUDE)[number]["campo"];
export type CampoDetalhe = (typeof PERGUNTAS_SAUDE)[number]["detalhe"];

export type DadosAnamnese = {
  peso_kg: string;
  altura_cm: string;
  nascimento: string;
  objetivo: string;
  local_treino: string;
  nivel: string;
  dias_disponiveis: number[];

  coracao: boolean | null;
  coracao_detalhe: string;
  dor_peito: boolean | null;
  dor_peito_detalhe: string;
  pressao_alta: boolean | null;
  pressao_alta_detalhe: string;
  cirurgia_12m: boolean | null;
  cirurgia_12m_detalhe: string;
  medicacao_continua: boolean | null;
  medicacao_continua_detalhe: string;
  lesoes: string;

  consentiu: boolean;

  cintura_cm: string;
  quadril_cm: string;
  braco_cm: string;
  coxa_cm: string;
  periodo_treino: string;
};

export const ANAMNESE_VAZIA: DadosAnamnese = {
  peso_kg: "",
  altura_cm: "",
  nascimento: "",
  objetivo: "",
  local_treino: "",
  nivel: "",
  dias_disponiveis: [],
  coracao: null,
  coracao_detalhe: "",
  dor_peito: null,
  dor_peito_detalhe: "",
  pressao_alta: null,
  pressao_alta_detalhe: "",
  cirurgia_12m: null,
  cirurgia_12m_detalhe: "",
  medicacao_continua: null,
  medicacao_continua_detalhe: "",
  lesoes: "",
  consentiu: false,
  cintura_cm: "",
  quadril_cm: "",
  braco_cm: "",
  coxa_cm: "",
  periodo_treino: "",
};

/** Aceita virgula, que e como o brasileiro digita. */
export function paraNumero(valor: string): number | null {
  const limpo = String(valor ?? "").replace(",", ".").trim();
  if (!limpo) return null;
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

export function paraTexto(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return "";
  return String(valor).replace(".", ",");
}

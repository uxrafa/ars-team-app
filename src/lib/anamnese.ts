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

/** Só para a conta de calorias da dieta (a fórmula muda por sexo). */
export const SEXOS = [
  ["masculino", "Masculino"],
  ["feminino", "Feminino"],
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
    // Como aparece para o Allisson no alerta de saúde: o fato, não a pergunta.
    curto: "Problema no coração",
    dica: "Qual, e desde quando?",
  },
  {
    campo: "dor_peito",
    detalhe: "dor_peito_detalhe",
    texto: "Sente dor no peito ou falta de ar ao fazer esforço?",
    curto: "Dor no peito ou falta de ar no esforço",
    dica: "Em que situação costuma acontecer?",
  },
  {
    campo: "pressao_alta",
    detalhe: "pressao_alta_detalhe",
    texto: "Já teve pressão alta diagnosticada?",
    curto: "Pressão alta",
    dica: "Está controlada? Toma remédio para isso?",
  },
  {
    campo: "cirurgia_12m",
    detalhe: "cirurgia_12m_detalhe",
    texto: "Fez alguma cirurgia nos últimos 12 meses?",
    curto: "Cirurgia nos últimos 12 meses",
    dica: "Qual, e há quanto tempo?",
  },
  {
    campo: "medicacao_continua",
    detalhe: "medicacao_continua_detalhe",
    texto: "Toma algum remédio de uso contínuo?",
    curto: "Remédio de uso contínuo",
    dica: "Quais?",
  },
] as const;

export type CampoSaude = (typeof PERGUNTAS_SAUDE)[number]["campo"];
export type CampoDetalhe = (typeof PERGUNTAS_SAUDE)[number]["detalhe"];

export type DadosAnamnese = {
  peso_kg: string;
  altura_cm: string;
  nascimento: string;
  sexo: string;
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
  sexo: "",
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

/* ------------------------------------------------------------------ */
/* Data de nascimento digitada                                         */
/* ------------------------------------------------------------------ */

/*
 * A data de nascimento é digitada, e não escolhida num calendário (24/09).
 * O calendário do Android abre no mês de hoje: para chegar em 1989 o aluno
 * volta 37 anos, mês a mês ou ano a ano. Digitar "01071989" no teclado
 * numérico leva três segundos, em qualquer celular.
 */

/** "0107198" vira "01/07/198": só dígitos, barra entra sozinha. */
export function mascararData(texto: string): string {
  const d = String(texto ?? "").replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** "01/07/1989" vira "1989-07-01". Data que não existe (31/02) vira null. */
export function dataParaISO(texto: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(texto ?? "").trim());
  if (!m) return null;
  const [, dia, mes, ano] = m.map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) {
    return null;
  }
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/** O caminho de volta, para abrir a anamnese com o que já foi salvo. */
export function isoParaData(iso: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ""));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

/** Idade em anos na data de hoje. Nulo se a data não fecha. */
export function idadeEm(texto: string, hojeISO: string): number | null {
  const iso = dataParaISO(texto);
  if (!iso) return null;
  const [na, nm, nd] = iso.split("-").map(Number);
  const [ha, hm, hd] = hojeISO.split("-").map(Number);
  let anos = ha - na;
  if (hm < nm || (hm === nm && hd < nd)) anos -= 1;
  return anos;
}

/* ------------------------------------------------------------------ */
/* O que ainda falta responder                                         */
/* ------------------------------------------------------------------ */

/**
 * Uma regra so, usada em tres lugares: a tela usa para nao deixar avancar de
 * etapa com buraco, o botao de enviar usa para voltar ate o campo que falta,
 * e o server action usa para recusar o envio.
 *
 * Antes desta funcao a validacao so existia no envio, no fim da etapa 3. Quem
 * pulasse uma das cinco perguntas de saude levava "Responda todas as perguntas
 * de saude" numa tela onde nenhuma delas aparece, sem saber qual faltou nem
 * como voltar. Foi exatamente o que aconteceu no primeiro teste de verdade.
 *
 * A ordem daqui e a ordem da tela, entao a primeira falta encontrada e sempre
 * a mais acima, e mandar o aluno para ela nunca pula nada no meio.
 */
export type Falta = {
  etapa: 1 | 2 | 3;
  /** Chave do campo, que a tela usa como ancora para rolar ate ele. */
  campo: keyof DadosAnamnese;
  mensagem: string;
};

export function primeiraFalta(d: DadosAnamnese): Falta | null {
  const peso = paraNumero(d.peso_kg);
  const altura = paraNumero(d.altura_cm);

  if (peso === null) {
    return { etapa: 1, campo: "peso_kg", mensagem: "Escreva seu peso atual." };
  }
  if (peso < 25 || peso > 400) {
    return { etapa: 1, campo: "peso_kg", mensagem: "Confira o peso: o valor parece fora do normal." };
  }
  if (altura === null) {
    return { etapa: 1, campo: "altura_cm", mensagem: "Escreva sua altura." };
  }
  if (altura < 100 || altura > 250) {
    return { etapa: 1, campo: "altura_cm", mensagem: "Confira a altura: o valor parece fora do normal." };
  }
  // Obrigatória desde 24/09: a meta de calorias da dieta usa a idade.
  if (!d.nascimento.trim()) {
    return { etapa: 1, campo: "nascimento", mensagem: "Escreva sua data de nascimento." };
  }
  const idade = idadeEm(d.nascimento, new Date().toISOString().slice(0, 10));
  if (idade === null || idade < 10 || idade > 100) {
    return {
      etapa: 1,
      campo: "nascimento",
      mensagem: "Confira a data de nascimento: use dia, mês e ano, como 01/07/1989.",
    };
  }
  if (!d.sexo) {
    return { etapa: 1, campo: "sexo", mensagem: "Marque o sexo." };
  }
  if (!d.objetivo) {
    return { etapa: 1, campo: "objetivo", mensagem: "Escolha seu objetivo principal." };
  }
  if (!d.local_treino) {
    return { etapa: 1, campo: "local_treino", mensagem: "Diga onde você treina." };
  }
  if (!d.nivel) {
    return { etapa: 1, campo: "nivel", mensagem: "Escolha sua experiência com treino." };
  }
  if (!d.dias_disponiveis.length) {
    return {
      etapa: 1,
      campo: "dias_disponiveis",
      mensagem: "Marque pelo menos um dia disponível na semana.",
    };
  }

  for (const p of PERGUNTAS_SAUDE) {
    if (d[p.campo] === null) {
      // A mensagem repete a pergunta. "Responda todas as perguntas de saude"
      // nao ajuda ninguem a achar qual das cinco ficou em branco.
      return { etapa: 2, campo: p.campo, mensagem: `Falta responder: ${p.texto}` };
    }
  }

  if (!d.consentiu) {
    return {
      etapa: 2,
      campo: "consentiu",
      mensagem: "Para enviar, você precisa autorizar o uso dos seus dados de saúde.",
    };
  }

  return null;
}

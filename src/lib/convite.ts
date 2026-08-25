/**
 * Regras do convite de aluno.
 *
 * Mesmo corte do `painel.ts`: funcao pura recebe a linha do banco e devolve o
 * que a tela mostra, para dar pra conferir a logica sem subir nada.
 */

export type LinhaConvite = {
  id: string;
  token: string;
  nome: string;
  email: string;
  whatsapp: string | null;
  tipo: "consultoria" | "planilha";
  mensalidade: number | null;
  acesso_ate: string | null;
  criado_em: string;
  expira_em: string;
  usado_em: string | null;
  cancelado_em: string | null;
};

export type SituacaoConvite = "pendente" | "usado" | "cancelado" | "expirado";

/** Quantos dias o link vale. Mesmo prazo do default da migracao 0010. */
export const DIAS_DE_VALIDADE = 30;

export function situacaoDoConvite(c: LinhaConvite, agora: Date = new Date()): SituacaoConvite {
  if (c.usado_em) return "usado";
  if (c.cancelado_em) return "cancelado";
  if (Date.parse(c.expira_em) <= agora.getTime()) return "expirado";
  return "pendente";
}

/** Dias que faltam para o link vencer. Negativo = ja venceu. */
export function diasParaVencer(c: LinhaConvite, agora: Date = new Date()): number {
  return Math.ceil((Date.parse(c.expira_em) - agora.getTime()) / 86400000);
}

export function linkDoConvite(origem: string, token: string): string {
  return `${origem.replace(/\/+$/, "")}/convite/${token}`;
}

export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

/**
 * A mensagem que vai no WhatsApp. Escrita na voz do Allisson, curta o
 * bastante para caber na previa da notificacao, e dizendo o que o aluno
 * precisa fazer (escolher a senha), nao o que o sistema faz.
 */
export function mensagemDeConvite(nome: string, link: string): string {
  return (
    `Oi, ${primeiroNome(nome)}! Aqui é o Allisson. ` +
    `Seu acesso ao app da ARS Team está pronto. ` +
    `Abre este link e escolhe sua senha: ${link}`
  );
}

/** aaaa-mm-dd ou ISO completo vira dd/mm/aa. */
export function emDataCurta(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano.slice(2)}`;
}

/** Deixa so os digitos e checa se da para virar link de WhatsApp. */
export function limparWhatsapp(bruto: string): string | null {
  const so = bruto.replace(/\D/g, "");
  if (!so) return null;
  return so;
}

export function whatsappValido(bruto: string): boolean {
  const so = limparWhatsapp(bruto);
  if (so === null) return true; // vazio e permitido
  return so.length >= 10 && so.length <= 13;
}

/** (11) 99999-8888, para a lista ficar legivel. */
export function formatarWhatsapp(bruto: string | null): string {
  if (!bruto) return "sem WhatsApp";
  const so = bruto.replace(/\D/g, "").replace(/^55/, "");
  if (so.length === 11) return `(${so.slice(0, 2)}) ${so.slice(2, 7)}-${so.slice(7)}`;
  if (so.length === 10) return `(${so.slice(0, 2)}) ${so.slice(2, 6)}-${so.slice(6)}`;
  return bruto;
}

export function emailValido(bruto: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(bruto.trim());
}

export const ROTULO_TIPO: Record<LinhaConvite["tipo"], string> = {
  consultoria: "Consultoria",
  planilha: "Planilha",
};

export const ROTULO_SITUACAO: Record<SituacaoConvite, string> = {
  pendente: "Esperando o aluno",
  usado: "Entrou",
  cancelado: "Cancelado",
  expirado: "Link vencido",
};

"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import {
  DIAS_DE_VALIDADE,
  emailValido,
  limparWhatsapp,
  linkDoConvite,
  whatsappValido,
} from "@/lib/convite";
import { assuntoDoConvite, corpoDoConvite, textoDoConvite } from "@/lib/email-convite";
import { enviarEmail } from "@/lib/enviar-email";
import { enderecoDoSite } from "@/lib/site";

export type EstadoConvite = {
  erro?: string;
  /** Token recem criado, para a tela ja mostrar o link pronto para copiar. */
  criado?: { token: string; nome: string; whatsapp: string | null };
};

/**
 * 24 bytes de aleatorio de verdade, em base64url. E o unico segredo que
 * autoriza criar conta, entao nao pode ser sequencial nem adivinhavel.
 */
function novoToken(): string {
  return randomBytes(24).toString("base64url");
}

/**
 * Manda o link por e-mail, se o e-mail estiver ligado.
 *
 * Fica DEPOIS do convite gravado e nao devolve erro para a tela de proposito:
 * o convite ja existe e o link ja esta na tela para copiar. Enquanto nao
 * houver dominio proprio verificado na Resend, `enviarEmail` nem chama rede
 * (ver o comentario em `lib/enviar-email.ts`) e o caminho continua sendo o
 * WhatsApp.
 */
async function avisarPorEmail(dados: {
  nome: string;
  email: string;
  token: string;
  tipo: "consultoria" | "planilha";
}) {
  const link = linkDoConvite(await enderecoDoSite(), dados.token);
  const corpo = { nome: dados.nome, link, tipo: dados.tipo, diasDeValidade: DIAS_DE_VALIDADE };
  await enviarEmail({
    para: dados.email,
    assunto: assuntoDoConvite(dados.nome),
    html: corpoDoConvite(corpo),
    texto: textoDoConvite(corpo),
  });
}

function paraNumero(valor: string): number | null {
  const limpo = String(valor ?? "").replace(/\./g, "").replace(",", ".").trim();
  if (!limpo) return null;
  const n = Number(limpo);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Confirma que quem esta pedindo e o treinador. A RLS ja barra; isto e para a mensagem. */
async function exigirAdmin() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, erro: "Sua sessão expirou. Entre de novo." as const };

  const { data: perfil } = await supabase
    .from("perfis")
    .select("tipo")
    .eq("id", user.id)
    .maybeSingle<{ tipo: string }>();

  if (perfil?.tipo !== "admin") {
    return { supabase, erro: "Só o treinador convida aluno." as const };
  }
  return { supabase, user };
}

export async function criarConvite(
  _anterior: EstadoConvite,
  dados: FormData,
): Promise<EstadoConvite> {
  const { supabase, erro, user } = await exigirAdmin();
  if (erro) return { erro };

  const nome = String(dados.get("nome") ?? "").trim();
  const email = String(dados.get("email") ?? "").trim().toLowerCase();
  const whatsappBruto = String(dados.get("whatsapp") ?? "").trim();
  const tipo = String(dados.get("tipo") ?? "consultoria");
  const mensalidadeBruta = String(dados.get("mensalidade") ?? "");
  const acessoAte = String(dados.get("acesso_ate") ?? "").trim();

  if (!nome) return { erro: "Escreva o nome do aluno." };
  if (!emailValido(email)) return { erro: "Confira o e-mail. Ex.: nome@email.com" };
  if (!whatsappValido(whatsappBruto)) {
    return { erro: "O WhatsApp precisa de DDD mais o número. Ex.: 11 99999-8888" };
  }
  if (tipo !== "consultoria" && tipo !== "planilha") {
    return { erro: "Escolha entre consultoria e planilha." };
  }

  const mensalidade = paraNumero(mensalidadeBruta);
  if (mensalidadeBruta.trim() && mensalidade === null) {
    return { erro: "A mensalidade precisa ser um número. Ex.: 250 ou 250,00" };
  }
  if (mensalidade !== null && mensalidade > 100000) {
    return { erro: "Confira a mensalidade: o valor parece alto demais." };
  }

  // Quem ja tem conta nao precisa de convite, precisa de senha nova.
  const { data: jaTemConta } = await supabase
    .from("perfis")
    .select("nome")
    .eq("email", email)
    .maybeSingle<{ nome: string }>();

  if (jaTemConta) {
    return {
      erro: `${jaTemConta.nome} já tem conta com esse e-mail. Para trocar a senha, use a recuperação na tela de entrada.`,
    };
  }

  // Convite de pe para o mesmo e-mail sai de cena: o link novo e o que vale.
  // Tambem e o que libera o indice unico parcial da migracao 0010.
  await supabase
    .from("convite")
    .update({ cancelado_em: new Date().toISOString() })
    .eq("email", email)
    .is("usado_em", null)
    .is("cancelado_em", null);

  const whatsapp = limparWhatsapp(whatsappBruto);
  const token = novoToken();

  const { error } = await supabase.from("convite").insert({
    token,
    nome,
    email,
    whatsapp,
    tipo,
    mensalidade,
    acesso_ate: acessoAte || null,
    criado_por: user?.id ?? null,
  });

  if (error) {
    console.error("criarConvite:", error.message);
    return { erro: "Não consegui gerar o convite agora. Tente de novo em instantes." };
  }

  await avisarPorEmail({ nome, email, token, tipo });

  revalidatePath("/painel/convites");
  revalidatePath("/painel");
  return { criado: { token, nome, whatsapp } };
}

export type ResultadoConvite = { erro?: string; ok?: boolean; token?: string };

export async function cancelarConvite(id: string): Promise<ResultadoConvite> {
  const { supabase, erro } = await exigirAdmin();
  if (erro) return { erro };

  const { error } = await supabase
    .from("convite")
    .update({ cancelado_em: new Date().toISOString() })
    .eq("id", id)
    .is("usado_em", null);

  if (error) {
    console.error("cancelarConvite:", error.message);
    return { erro: "Não consegui cancelar agora. Tente de novo." };
  }

  revalidatePath("/painel/convites");
  return { ok: true };
}

/**
 * Link vencido nao volta a valer: o antigo e cancelado e nasce outro com os
 * mesmos dados. Assim o token que ja circulou no WhatsApp morre de vez.
 */
export async function gerarNovoLink(id: string): Promise<ResultadoConvite> {
  const { supabase, erro, user } = await exigirAdmin();
  if (erro) return { erro };

  const { data: antigo } = await supabase
    .from("convite")
    .select("nome, email, whatsapp, tipo, mensalidade, acesso_ate, usado_em")
    .eq("id", id)
    .maybeSingle<{
      nome: string;
      email: string;
      whatsapp: string | null;
      tipo: "consultoria" | "planilha";
      mensalidade: number | null;
      acesso_ate: string | null;
      usado_em: string | null;
    }>();

  if (!antigo) return { erro: "Esse convite não existe mais." };
  if (antigo.usado_em) return { erro: "Esse aluno já entrou. Não precisa de link novo." };

  await supabase
    .from("convite")
    .update({ cancelado_em: new Date().toISOString() })
    .eq("id", id)
    .is("usado_em", null);

  const token = novoToken();
  const { error } = await supabase.from("convite").insert({
    token,
    nome: antigo.nome,
    email: antigo.email,
    whatsapp: antigo.whatsapp,
    tipo: antigo.tipo,
    mensalidade: antigo.mensalidade,
    acesso_ate: antigo.acesso_ate,
    criado_por: user?.id ?? null,
  });

  if (error) {
    console.error("gerarNovoLink:", error.message);
    return { erro: "Não consegui gerar o link novo agora. Tente de novo." };
  }

  await avisarPorEmail({
    nome: antigo.nome,
    email: antigo.email,
    token,
    tipo: antigo.tipo,
  });

  revalidatePath("/painel/convites");
  return { ok: true, token };
}

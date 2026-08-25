"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoForm = { erro?: string; aviso?: string };

/** Deixa as mensagens do Supabase em portugues e sem jargao. */
function traduzir(mensagem: string): string {
  const m = mensagem.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha não conferem.";
  if (m.includes("email not confirmed")) return "Confirme o e-mail antes de entrar. O link foi enviado para você.";
  if (m.includes("user already registered")) return "Ja existe uma conta com esse e-mail. Tente entrar.";
  if (m.includes("password should be at least")) return "A senha precisa de pelo menos 6 caracteres.";
  if (m.includes("rate limit") || m.includes("too many")) return "Muitas tentativas seguidas. Espere um minuto e tente de novo.";
  return "Não deu para concluir agora. Tente de novo em instantes.";
}

export async function entrar(
  _anterior: EstadoForm,
  dados: FormData,
): Promise<EstadoForm> {
  const email = String(dados.get("email") ?? "").trim();
  const senha = String(dados.get("senha") ?? "");

  if (!email || !senha) return { erro: "Preencha e-mail e senha." };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (error) {
    // O usuario ve a mensagem tratada; o log do servidor guarda a original.
    console.error("[entrar]", error.message);
    return { erro: traduzir(error.message) };
  }

  revalidatePath("/", "layout");
  redirect("/app");
}

/**
 * O cadastro publico saiu daqui.
 *
 * Ate a migracao 0010 esta acao existia para o admin criar conta de aluno, e
 * a trava era so na tela: /auth/v1/signup e endpoint publico do GoTrue, entao
 * qualquer um com a chave publicavel podia criar conta chamando a API direto.
 *
 * Agora conta so nasce por convite: o Allisson cadastra o aluno em
 * /painel/convites, manda o link, e o aluno escolhe a senha em
 * /convite/[token]. Quem tenta se cadastrar sem convite valido e recusado
 * pelo gatilho do banco, e nao pela tela.
 */

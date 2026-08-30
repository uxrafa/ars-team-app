"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoSenha = { erro?: string };

function traduzir(mensagem: string): string {
  const m = mensagem.toLowerCase();
  if (m.includes("password should be at least")) return "A senha precisa de pelo menos 6 caracteres.";
  if (m.includes("weak password")) return "Escolha uma senha um pouco mais difícil.";
  if (m.includes("same as the old") || m.includes("should be different")) {
    return "Essa é a senha que você já usava. Escolha outra.";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Muitas tentativas seguidas. Espere um minuto e tente de novo.";
  }
  if (m.includes("session") || m.includes("jwt") || m.includes("expired")) {
    return "O link expirou. Peça um novo em Esqueci a senha.";
  }
  return "Não deu para trocar a senha agora. Tente de novo em instantes.";
}

export async function definirSenha(
  _anterior: EstadoSenha,
  dados: FormData,
): Promise<EstadoSenha> {
  const senha = String(dados.get("senha") ?? "");
  if (senha.length < 6) return { erro: "A senha precisa de pelo menos 6 caracteres." };

  const supabase = await criarClienteServidor();

  /**
   * Quem autoriza a troca e a sessao que o link do e-mail abriu, e nao um
   * campo do formulario. Sem esta conferencia, bastaria abrir /nova-senha
   * deslogado e mandar o formulario.
   */
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "O link expirou. Peça um novo em Esqueci a senha." };

  const { error } = await supabase.auth.updateUser({ password: senha });

  if (error) {
    console.error("[definirSenha]", error.message);
    return { erro: traduzir(error.message) };
  }

  revalidatePath("/", "layout");
  // O aluno ja entra direto. /app manda o admin para /painel sozinho.
  redirect("/app");
}

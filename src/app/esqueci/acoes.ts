"use server";

import { criarClienteServidor } from "@/lib/supabase/server";
import { enderecoDoSite } from "@/lib/site";

export type EstadoPedido = { erro?: string; enviado?: boolean };

export async function pedirLink(
  _anterior: EstadoPedido,
  dados: FormData,
): Promise<EstadoPedido> {
  const email = String(dados.get("email") ?? "").trim();
  if (!email) return { erro: "Escreva o e-mail da sua conta." };

  const supabase = await criarClienteServidor();
  const site = await enderecoDoSite();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${site}/auth/confirmar?proximo=/nova-senha`,
  });

  if (error) {
    console.error("[pedirLink]", error.message);
    const m = error.message.toLowerCase();
    if (m.includes("rate limit") || m.includes("too many") || m.includes("security purposes")) {
      return { erro: "Já mandamos um link agora há pouco. Espere um minuto e tente de novo." };
    }
    return { erro: "Não deu para enviar o link agora. Tente de novo em instantes." };
  }

  /**
   * A resposta e a mesma para e-mail que existe e para e-mail que nao existe.
   *
   * Se a tela dissesse "essa conta nao existe", qualquer pessoa poderia usar
   * este formulario para descobrir quem e aluno do Allisson, um e-mail por vez.
   * O Supabase ja responde sucesso nos dois casos; a tela acompanha.
   */
  return { enviado: true };
}

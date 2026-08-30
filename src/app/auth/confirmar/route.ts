import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { criarClienteServidor } from "@/lib/supabase/server";
import { caminhoInterno, enderecoDoSite } from "@/lib/site";

/**
 * Onde o link do e-mail cai.
 *
 * Aceita as DUAS formas que o Supabase manda, de proposito:
 *
 * - `token_hash` + `type`, que e o que o modelo de e-mail deste projeto usa.
 *   Funciona em qualquer aparelho, porque o segredo esta no proprio link.
 * - `code`, que e o formato padrao (PKCE). So funciona no mesmo navegador que
 *   pediu, porque metade do segredo ficou num cookie de la.
 *
 * Aceitar os dois e o que evita o caso mais comum de todos: pedir o link no
 * celular e abrir o e-mail no computador.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const site = await enderecoDoSite();
  const destino = caminhoInterno(url.searchParams.get("proximo"));

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const tipo = url.searchParams.get("type") as EmailOtpType | null;

  const supabase = await criarClienteServidor();

  if (tokenHash && tipo) {
    const { error } = await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(destino, site));
    console.error("[confirmar] verifyOtp:", error.message);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(destino, site));
    console.error("[confirmar] exchangeCode:", error.message);
  }

  // Link velho, ja usado, ou aberto em outro navegador no formato `code`.
  // Manda para onde da para pedir outro, e nao para a tela de entrar.
  return NextResponse.redirect(new URL("/esqueci?expirado=1", site));
}

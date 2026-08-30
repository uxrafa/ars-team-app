import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Rotas que podem ser abertas sem estar logado.
 *
 * `/convite` esta aqui porque o aluno que vai migrar ainda nao tem conta: ele
 * chega pelo link do WhatsApp. O que protege essa rota nao e o login, e o
 * token do link, conferido no banco (migracao 0010).
 *
 * `/esqueci` e `/nova-senha` estao aqui porque quem perdeu a senha esta, por
 * definicao, deslogado. Em `/nova-senha` quem autoriza a troca e a sessao que
 * o link do e-mail abriu, conferida na propria tela e de novo na acao.
 */
const ROTAS_PUBLICAS = ["/entrar", "/auth", "/convite", "/esqueci", "/nova-senha"];

/**
 * Renova a sessao a cada requisicao e protege as rotas privadas.
 * A trava de dados de verdade esta na RLS do banco: isto aqui e so navegacao.
 */
export async function atualizarSessao(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const caminho = request.nextUrl.pathname;
  const ehPublica = ROTAS_PUBLICAS.some((rota) => caminho.startsWith(rota));

  if (!user && !ehPublica) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/entrar";
    return NextResponse.redirect(destino);
  }

  if (user && caminho === "/entrar") {
    const destino = request.nextUrl.clone();
    destino.pathname = "/app";
    return NextResponse.redirect(destino);
  }

  return response;
}

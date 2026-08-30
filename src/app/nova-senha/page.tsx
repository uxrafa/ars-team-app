import { Logo } from "@/components/logo";
import { criarClienteServidor } from "@/lib/supabase/server";
import { LinkExpirado } from "./expirado";
import { FormularioDeSenha } from "./formulario";

export const metadata = { title: "Nova senha · ARS Team" };

/**
 * Onde o aluno cria a senha nova.
 *
 * Quem abre esta tela chega com a sessao que o link do e-mail criou. Sem essa
 * sessao nao ha o que trocar, e a tela explica em vez de mostrar formulario
 * que nao vai funcionar.
 */
export default async function NovaSenha() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <header className="mb-9 flex flex-col items-center text-center">
          <h1 className="sr-only">Nova senha · ARS Team</h1>
          <Logo className="h-12 w-auto text-papel" />
        </header>

        {user ? (
          <>
            <div className="mb-7 text-center">
              <h2 className="text-xl font-bold">Criar senha nova</h2>
            </div>
            <FormularioDeSenha email={user.email ?? ""} />
          </>
        ) : (
          <LinkExpirado />
        )}
      </div>
    </main>
  );
}

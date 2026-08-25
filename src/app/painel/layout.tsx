import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Botao } from "@/components/ui";

export const metadata = { title: "Painel · ARS Team" };

const ABAS = [
  { href: "/painel", nome: "Painel" },
  { href: "/painel/alunos", nome: "Alunos" },
  { href: "/painel/convites", nome: "Convites" },
] as const;

/** Ainda nao existem, mas o Allisson precisa ver para onde a coisa vai. */
const EM_BREVE = ["Biblioteca", "Financeiro"] as const;

export default async function LayoutPainel({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await criarClienteServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  // A trava de verdade e a RLS: um aluno que forcar esta URL nao le nada.
  // Este redirecionamento e so para ele nao encarar uma tela vazia.
  const { data: perfil } = await supabase
    .from("perfis")
    .select("tipo, nome")
    .eq("id", user.id)
    .maybeSingle<{ tipo: string; nome: string }>();

  if (perfil?.tipo !== "admin") redirect("/app");

  const hoje = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    day: "2-digit",
    month: "short",
  })
    .format(new Date())
    .replace(/\./g, "")
    .toUpperCase();

  return (
    <div className="min-h-dvh">
      <header className="border-b border-linha bg-tinta-2">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-8 px-6 lg:px-8">
          <Link href="/painel" className="flex-none py-4">
            <Logo className="h-5 w-auto text-papel" />
          </Link>

          <nav className="flex items-center gap-1 self-stretch text-[15px]">
            {ABAS.map((aba) => (
              <Link
                key={aba.href}
                href={aba.href}
                className="flex items-center rounded-lg px-3 py-2 font-semibold text-nevoa transition-colors hover:bg-tinta-3 hover:text-papel"
              >
                {aba.nome}
              </Link>
            ))}
            {EM_BREVE.map((nome) => (
              <span
                key={nome}
                title="Ainda nao construido"
                className="hidden cursor-not-allowed items-center px-3 py-2 text-nevoa/45 sm:flex"
              >
                {nome}
              </span>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-4">
            <span className="hidden font-mono text-[13px] tracking-wide text-nevoa sm:block">
              {hoje}
            </span>
            <span
              aria-hidden="true"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-contorno bg-tinta-3 text-sm font-bold"
            >
              AS
            </span>
            <form action="/auth/sair" method="post">
              <Botao type="submit" aparencia="fantasma" tamanho="sm">
                Sair
              </Botao>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-6 py-8 pb-16 lg:px-8">{children}</main>
    </div>
  );
}

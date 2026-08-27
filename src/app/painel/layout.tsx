import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Botao } from "@/components/ui";
import { Abas } from "./abas";

export const metadata = { title: "Painel · ARS Team" };

// A ordem é a do desenho aprovado: Painel, Alunos, Biblioteca. Convites veio
// depois e entra ao lado, antes do Financeiro que ainda não existe.
const ABAS = [
  { href: "/painel", nome: "Painel" },
  { href: "/painel/alunos", nome: "Alunos" },
  { href: "/painel/biblioteca", nome: "Biblioteca" },
  { href: "/painel/convites", nome: "Convites" },
] as const;

/** Ainda nao existem, mas o Allisson precisa ver para onde a coisa vai. */
const EM_BREVE = ["Financeiro"] as const;

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

  const agora = new Date();
  const diaDaSemana = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
  })
    .format(agora)
    .replace(/\./g, "")
    .toUpperCase();
  const diaEMes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "short",
  })
    .format(agora)
    .replace(/\./g, "")
    .toUpperCase();

  return (
    <div className="min-h-dvh">
      <header className="border-b border-linha bg-tinta-2">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-8 px-6 lg:px-8">
          <Link href="/painel" className="flex-none py-4">
            <Logo className="h-5 w-auto text-papel" />
          </Link>

          <Abas abas={ABAS} emBreve={EM_BREVE} />

          <div className="ml-auto flex items-center gap-4">
            {/* Duas linhas, igual ao desenho: a data fica compacta e não
                empurra o avatar. */}
            <span className="hidden text-right font-mono text-[13px] uppercase leading-tight tracking-wide text-nevoa sm:block">
              {diaDaSemana},
              <br />
              {diaEMes}
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

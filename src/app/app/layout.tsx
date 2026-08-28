import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { criarClienteServidor } from "@/lib/supabase/server";
import { NavDoAluno } from "./nav";

export const metadata = { title: "ARS Team" };

/**
 * A casa do aluno.
 *
 * Desenhada para o celular primeiro, que é de onde vêm quase todos os acessos:
 * uma coluna, navegação embaixo e conteúdo com folga para o polegar. No
 * desktop a mesma coluna fica centrada, sem virar outra tela.
 */
export default async function LayoutApp({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await criarClienteServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: perfil } = await supabase
    .from("perfis")
    .select("tipo")
    .eq("id", user.id)
    .maybeSingle<{ tipo: "admin" | "consultoria" | "planilha" }>();

  // O treinador tem casa própria.
  if (perfil?.tipo === "admin") redirect("/painel");

  // Aluno de planilha comprou um produto, não um acompanhamento: sem
  // evolução, porque sem check-in não existe o que evoluir na tela.
  const abas =
    perfil?.tipo === "planilha"
      ? ([
          { href: "/app", nome: "Treino", icone: "hoje" },
          { href: "/app/perfil", nome: "Perfil", icone: "perfil" },
        ] as const)
      : ([
          { href: "/app", nome: "Hoje", icone: "hoje" },
          { href: "/app/evolucao", nome: "Evolução", icone: "evolucao" },
          { href: "/app/perfil", nome: "Perfil", icone: "perfil" },
        ] as const);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-linha bg-tinta/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-md items-center px-5">
          <Logo className="h-5 w-auto text-papel" />
        </div>
      </header>

      {/* pb-28 é o espaço da navegação de baixo, senão ela cobre o último card. */}
      <main className="mx-auto max-w-md px-5 pb-28 pt-6">{children}</main>

      <NavDoAluno abas={[...abas]} />
    </div>
  );
}

import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { NavDoAluno, type Aba } from "./nav";
import { TopoDoApp } from "./topo";

export const metadata = { title: "ARS Team" };

/**
 * A casa do aluno.
 *
 * Celular primeiro, que é de onde vêm quase todos os acessos: uma coluna de
 * 390px, navegação embaixo, e conteúdo com 20px de folga nas laterais, como
 * nos artboards. No desktop a mesma coluna fica centrada, sem virar outra tela.
 */

const ABAS_CONSULTORIA: Aba[] = [
  { href: "/app", nome: "Hoje", icone: "hoje" },
  { href: null, nome: "Semana", icone: "semana" },
  { href: "/app/evolucao", nome: "Evolução", icone: "evolucao" },
  { href: null, nome: "Chat", icone: "chat" },
  { href: "/app/perfil", nome: "Perfil", icone: "perfil" },
];

// Quem comprou planilha comprou um produto, não acompanhamento: sem evolução,
// porque sem check-in não existe o que evoluir na tela.
const ABAS_PLANILHA: Aba[] = [
  { href: "/app", nome: "Treino", icone: "treino" },
  { href: null, nome: "Vídeos", icone: "videos" },
  { href: "/app/perfil", nome: "Perfil", icone: "perfil" },
];

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

  return (
    <div className="min-h-dvh">
      <TopoDoApp />

      {/* pb-[86px] é o espaço da navegação de 66px mais folga, senão ela cobre
          o último cartão. */}
      <main className="mx-auto max-w-md px-5 pb-[86px] pt-5">{children}</main>

      <NavDoAluno abas={perfil?.tipo === "planilha" ? ABAS_PLANILHA : ABAS_CONSULTORIA} />
    </div>
  );
}

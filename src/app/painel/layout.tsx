import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { iniciais } from "@/lib/painel";
import { MenuDoPainel, type ItemDoMenu } from "./menu";

export const metadata = { title: "Painel · ARS Team" };

// A ordem é a do desenho aprovado: Painel, Alunos, Biblioteca. Treinos fica
// colado em Alunos porque é a mesma pergunta vista do outro lado: lá é quem
// são, aqui é o que fizeram. Convites e Financeiro fecham a lista.
const ITENS: readonly ItemDoMenu[] = [
  { href: "/painel", nome: "Painel", icone: "painel" },
  { href: "/painel/alunos", nome: "Alunos", icone: "alunos" },
  { href: "/painel/treinos", nome: "Treinos", icone: "treinos" },
  { href: "/painel/biblioteca", nome: "Biblioteca", icone: "biblioteca" },
  { href: "/painel/convites", nome: "Convites", icone: "convites" },
  { href: "/painel/financeiro", nome: "Financeiro", icone: "financeiro" },
];

/**
 * Item desenhado e ainda não construído, que aparece apagado no menu. Vazio
 * hoje. Fica porque a lista volta a encher.
 */
const EM_BREVE: readonly string[] = [];

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

  // Lido no servidor para o menu ja nascer na largura certa. Se viesse do
  // navegador, ele abriria e fecharia na cara do usuario a cada navegacao.
  const recolhido = (await cookies()).get("painel_menu")?.value === "recolhido";

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

  const nome = perfil?.nome?.trim() || "Treinador";

  return (
    <div className="min-h-dvh lg:flex">
      <MenuDoPainel
        itens={ITENS}
        emBreve={EM_BREVE}
        recolhidoDeInicio={recolhido}
        // Primeiro nome: numa coluna de 240px o nome inteiro virava
        // "Allisson Sa...", e as iniciais ao lado ja dizem o sobrenome.
        nome={nome.split(" ")[0]}
        iniciais={iniciais(nome)}
        data={{ diaDaSemana, diaEMes }}
      />

      {/* min-w-0: sem isto uma tabela larga empurraria a coluna do conteúdo
          para fora da tela em vez de rolar dentro dela. */}
      <main className="mx-auto w-full min-w-0 max-w-[1440px] flex-1 px-6 py-8 pb-16 lg:px-8">
        {children}
      </main>
    </div>
  );
}

import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Botao, BotaoLink, Cartao } from "@/components/ui";
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
    .select("tipo, arquivado_em")
    .eq("id", user.id)
    .maybeSingle<{
      tipo: "admin" | "consultoria" | "planilha";
      arquivado_em: string | null;
    }>();

  // O treinador tem casa própria.
  if (perfil?.tipo === "admin") redirect("/painel");

  // A CHECAGEM FICA NO LAYOUT, e não na tela de Hoje como a de suspenso.
  //
  // Suspenso é estado de cobrança e cabe numa tela; arquivado é "você não é
  // mais aluno daqui", e teria que ser repetido em Hoje, Treino, Evolução e
  // Perfil. Uma cópia esquecida vira uma porta aberta.
  //
  // Isto barra as TELAS, e não o dado: com o token na mão, a API continua
  // devolvendo a ficha dele, porque a RLS diz "o dono lê a própria linha" e
  // ele continua sendo o dono. Para cortar de verdade existe `suspenso`, e
  // arquivar não é sobre segurança: é sobre tirar da lista do Allisson.
  if (perfil?.arquivado_em) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 px-5">
        <h1 className="font-display text-3xl uppercase leading-none tracking-wide">
          Conta encerrada
        </h1>
        <Cartao>
          <p className="text-[15px] leading-relaxed text-nevoa">
            Seu acompanhamento com a ARS Team foi encerrado, então o app ficou indisponível. Nada
            do que você registrou foi apagado.
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-nevoa">
            Se isso não estiver certo, ou se quiser voltar a treinar, fale com o Allisson.
          </p>
          <BotaoLink
            href="https://wa.me/5514997644001"
            target="_blank"
            rel="noreferrer"
            largura="cheia"
            className="mt-4"
          >
            Falar com o Allisson
          </BotaoLink>
        </Cartao>
        <form action="/auth/sair" method="post">
          <Botao type="submit" aparencia="fantasma" largura="cheia">
            Sair
          </Botao>
        </form>
      </div>
    );
  }

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

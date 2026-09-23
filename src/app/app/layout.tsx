import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { BotaoLink, Cartao } from "@/components/ui";
import { NavDoAluno, type Aba } from "./nav";
import { TopoDoApp } from "./topo";
import { BotaoSair } from "@/components/sair";

export const metadata = { title: "ARS Team" };

/**
 * A casa do aluno.
 *
 * Celular primeiro, que é de onde vêm quase todos os acessos: uma coluna de
 * 390px, navegação embaixo, e conteúdo com 20px de folga nas laterais, como
 * nos artboards. No desktop a mesma coluna fica centrada, sem virar outra tela.
 */

// Só o que já existe, na ordem de uso: o treino do dia, o progresso, a conta.
// Semana e Chat voltam quando forem construídas; aba apagada frustrava mais do
// que avisava (Rafael, 21/09).
const ABAS_CONSULTORIA: Aba[] = [
  // "Treino", e não "Hoje": é o que ele vem fazer, e com a aba Dieta ao lado
  // "Hoje" deixou de dizer do que se trata (Rafael, 21/09).
  { href: "/app", nome: "Treino", icone: "treino" },
  { href: "/app/evolucao", nome: "Evolução", icone: "evolucao" },
  { href: "/app/perfil", nome: "Perfil", icone: "perfil" },
];

// A dieta entra depois de Hoje, e só para quem tem uma publicada: aba que
// abre vazia frustra mais do que avisa (a mesma regra de 21/09).
const ABA_DIETA: Aba = { href: "/app/dieta", nome: "Dieta", icone: "dieta" };

// Quem comprou planilha comprou um produto, não acompanhamento: sem evolução,
// porque sem check-in não existe o que evoluir na tela.
const ABAS_PLANILHA: Aba[] = [
  { href: "/app", nome: "Treino", icone: "treino" },
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

  // A RLS só devolve orientação publicada: rascunho conta como não ter.
  const { count: temDieta } =
    perfil?.tipo === "consultoria"
      ? await supabase
          .from("orientacao_alimentar")
          .select("aluno_id", { count: "exact", head: true })
          .eq("aluno_id", user.id)
      : { count: 0 };

  const abas =
    perfil?.tipo === "planilha"
      ? ABAS_PLANILHA
      : temDieta
        ? [ABAS_CONSULTORIA[0], ABA_DIETA, ...ABAS_CONSULTORIA.slice(1)]
        : ABAS_CONSULTORIA;

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
        <BotaoSair />
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <TopoDoApp />

      {/* Folga de baixo = navegação de 66px + 20px de respiro + a área segura
          do aparelho. A área segura entrou em 23/09: instalado na tela de
          início do iPhone, a navegação cresce ~34px por causa da barra de
          gestos (o `pb-[env(safe-area-inset-bottom)]` dela), e a folga fixa
          de 86px deixava o fim de toda tela escondido atrás dela -- as
          orientações da Dieta e o "Sair da conta" do Perfil. No navegador e
          no Android sem barra de gestos a área segura vale zero, então a
          conta serve para todos sem detectar aparelho. */}
      <main className="mx-auto max-w-md px-5 pb-[calc(86px+env(safe-area-inset-bottom))] pt-5">{children}</main>

      <NavDoAluno abas={abas} />
    </div>
  );
}

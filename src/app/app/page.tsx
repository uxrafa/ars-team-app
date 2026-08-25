import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { BotaoLink } from "@/components/ui";

type Perfil = {
  id: string;
  nome: string;
  email: string;
  tipo: "admin" | "consultoria" | "planilha";
  status: "ativo" | "carencia" | "suspenso";
  criado_em: string;
};

const NOME_TIPO: Record<Perfil["tipo"], string> = {
  admin: "Administrador",
  consultoria: "Aluno de consultoria",
  planilha: "Aluno de planilha",
};

function Item({
  titulo,
  valor,
  ok,
  detalhe,
}: {
  titulo: string;
  valor: string;
  ok: boolean;
  detalhe?: string;
}) {
  return (
    <li className="flex items-start gap-3 border-t border-linha px-4 py-3.5 first:border-t-0">
      <span
        aria-hidden="true"
        className={`mt-1 h-2.5 w-2.5 flex-none rotate-45 rounded-[2px] ${
          ok ? "bg-raio" : "bg-nevoa"
        }`}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-papel">{titulo}</span>
        {detalhe && (
          <span className="mt-1 block text-sm text-nevoa">{detalhe}</span>
        )}
      </span>
      <span className="flex-none text-right text-[15px] text-nevoa tabular">
        {valor}
      </span>
    </li>
  );
}

export default async function Painel() {
  const supabase = await criarClienteServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil, error: erroPerfil } = await supabase
    .from("perfis")
    .select("id, nome, email, tipo, status, criado_em")
    .eq("id", user?.id ?? "")
    .single<Perfil>();

  // O treinador tem casa propria.
  if (perfil?.tipo === "admin") redirect("/painel");

  const { data: anamnese } = await supabase
    .from("anamnese")
    .select("status")
    .eq("aluno_id", user?.id ?? "")
    .maybeSingle<{ status: "rascunho" | "enviada" }>();

  const ehAluno = perfil?.tipo === "consultoria";
  const anamneseEnviada = anamnese?.status === "enviada";

  // Prova da RLS: pedimos a tabela inteira. Um aluno so pode receber a propria linha.
  const { data: visiveis } = await supabase.from("perfis").select("id");
  const quantos = visiveis?.length ?? 0;
  // O admin ja foi redirecionado acima, entao aqui so passa aluno:
  // tem que enxergar exatamente a propria linha.
  const rlsOk = quantos === 1;

  const primeiroNome = (perfil?.nome || user?.email || "").split(" ")[0];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.07em] text-raio-forte">
          Ambiente no ar
        </p>
        <h1 className="mt-2 font-display text-3xl uppercase leading-none tracking-wide sm:text-4xl">
          Fala, {primeiroNome || "atleta"}
        </h1>
        <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-nevoa">
          Esta tela existe para provar que o encanamento funciona ponta a ponta:
          login, sessao, leitura no banco e as travas de acesso. Ela sai do ar
          assim que a area do aluno de verdade entrar no lugar.
        </p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-linha bg-tinta-2">
        <div className="border-b border-linha bg-tinta-3 px-4 py-3">
          <h2 className="text-base font-bold">Diagnostico da infraestrutura</h2>
        </div>
        <ul>
          <Item
            titulo="Sessao autenticada"
            detalhe={user?.email ?? "sem usuario"}
            valor={user ? "ok" : "falhou"}
            ok={Boolean(user)}
          />
          <Item
            titulo="Perfil lido do banco"
            detalhe={
              erroPerfil
                ? erroPerfil.message
                : "criado automaticamente pelo gatilho no cadastro"
            }
            valor={perfil ? "ok" : "falhou"}
            ok={Boolean(perfil)}
          />
          <Item
            titulo="Row Level Security ativa"
            detalhe={`a consulta sem filtro devolveu ${quantos} perfil(is)`}
            valor={rlsOk ? "ok" : "revisar"}
            ok={rlsOk}
          />
          <Item
            titulo="Tipo de perfil"
            detalhe="define o que a pessoa enxerga na plataforma"
            valor={perfil ? NOME_TIPO[perfil.tipo] : "-"}
            ok={Boolean(perfil)}
          />
          <Item
            titulo="Status do acesso"
            detalhe="ativo, carencia ou suspenso"
            valor={perfil?.status ?? "-"}
            ok={perfil?.status === "ativo"}
          />
        </ul>
      </section>

      {ehAluno && !anamneseEnviada && (
        <section className="rounded-2xl border border-raio/50 bg-gradient-to-br from-raio/[0.14] to-raio/[0.04] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.07em] text-raio-forte">
            {anamnese ? "Voce parou no meio" : "Primeiro passo"}
          </p>
          <h2 className="mt-2.5 font-display text-[26px] uppercase leading-none tracking-wide">
            Sua ficha inicial
          </h2>
          <p className="mt-2.5 max-w-prose text-[15px] leading-relaxed text-nevoa">
            {anamnese
              ? "Suas respostas ficaram guardadas. Continue de onde parou para o Allisson montar seu treino."
              : "Antes do primeiro treino o Allisson precisa te conhecer melhor. Leva uns 4 minutos e voce so responde uma vez."}
          </p>
          <BotaoLink href="/anamnese" className="mt-5">
            {anamnese ? "Continuar de onde parei" : "Começar minha ficha"}
          </BotaoLink>
        </section>
      )}

      {ehAluno && anamneseEnviada && (
        <section className="rounded-2xl border border-linha bg-tinta-2 p-5">
          <h2 className="text-base font-bold">Anamnese enviada</h2>
          <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-nevoa">
            O Allisson ja recebeu suas respostas. Assim que ele montar sua ficha,
            o treino da semana aparece aqui.
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-linha bg-tinta-2 p-5">
        <h2 className="text-base font-bold">Proximo passo</h2>
        <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-nevoa">
          Com a infra e o banco provados, o que falta da 2A e a biblioteca de
          exercicios, o editor de ficha e as telas de treino do aluno.
        </p>
      </section>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";

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
        <span className="block text-sm font-semibold text-papel">{titulo}</span>
        {detalhe && (
          <span className="mt-0.5 block text-xs text-nevoa">{detalhe}</span>
        )}
      </span>
      <span className="flex-none text-right text-sm text-nevoa tabular-nums">
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
        <p className="text-xs font-semibold uppercase tracking-widest text-raio">
          Ambiente no ar
        </p>
        <h1 className="mt-2 font-display text-3xl uppercase leading-none tracking-wide sm:text-4xl">
          Fala, {primeiroNome || "atleta"}
        </h1>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-nevoa">
          Esta tela existe para provar que o encanamento funciona ponta a ponta:
          login, sessao, leitura no banco e as travas de acesso. Ela sai do ar
          assim que a area do aluno de verdade entrar no lugar.
        </p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-linha bg-tinta-2">
        <div className="border-b border-linha bg-tinta-3 px-4 py-3">
          <h2 className="text-sm font-bold">Diagnostico da infraestrutura</h2>
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
        <section className="rounded-2xl border border-raio/40 bg-gradient-to-br from-raio/12 to-raio/[0.03] p-5">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.11em] text-raio-forte">
            {anamnese ? "Voce parou no meio" : "Primeiro passo"}
          </p>
          <h2 className="mt-2 font-display text-2xl uppercase leading-none tracking-wide">
            Sua ficha inicial
          </h2>
          <p className="mt-2.5 max-w-prose text-sm leading-relaxed text-papel/75">
            {anamnese
              ? "Suas respostas ficaram guardadas. Continue de onde parou para o Allisson montar seu treino."
              : "Antes do primeiro treino o Allisson precisa te conhecer melhor. Leva uns 4 minutos e voce so responde uma vez."}
          </p>
          <Link
            href="/anamnese"
            className="mt-4 inline-block rounded-xl bg-raio px-5 py-3 font-display text-base uppercase tracking-wider text-papel transition hover:bg-raio-forte"
          >
            {anamnese ? "Continuar" : "Comecar"}
          </Link>
        </section>
      )}

      {ehAluno && anamneseEnviada && (
        <section className="rounded-2xl border border-linha bg-tinta-2 p-5">
          <h2 className="text-sm font-bold">Anamnese enviada</h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-nevoa">
            O Allisson ja recebeu suas respostas. Assim que ele montar sua ficha,
            o treino da semana aparece aqui.
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-linha bg-tinta-2 p-5">
        <h2 className="text-sm font-bold">Proximo passo</h2>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-nevoa">
          Com a infra e o banco provados, o que falta da 2A e a biblioteca de
          exercicios, o editor de ficha e as telas de treino do aluno.
        </p>
      </section>
    </div>
  );
}

import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { BotaoLink } from "@/components/ui";
import { ANAMNESE_VAZIA, paraTexto, type DadosAnamnese } from "@/lib/anamnese";
import { Formulario } from "./formulario";

export const metadata = { title: "Anamnese · ARS Team" };

/** A linha do banco vira o formato que a tela usa (tudo texto). */
function paraFormulario(linha: Record<string, unknown> | null): DadosAnamnese {
  if (!linha) return ANAMNESE_VAZIA;
  const texto = (v: unknown) => (v === null || v === undefined ? "" : String(v));
  const numero = (v: unknown) => paraTexto(v === null || v === undefined ? null : Number(v));
  const logico = (v: unknown) => (v === null || v === undefined ? null : Boolean(v));

  return {
    peso_kg: numero(linha.peso_kg),
    altura_cm: texto(linha.altura_cm),
    nascimento: texto(linha.nascimento),
    objetivo: texto(linha.objetivo),
    local_treino: texto(linha.local_treino),
    nivel: texto(linha.nivel),
    dias_disponiveis: Array.isArray(linha.dias_disponiveis)
      ? (linha.dias_disponiveis as number[])
      : [],
    coracao: logico(linha.coracao),
    coracao_detalhe: texto(linha.coracao_detalhe),
    dor_peito: logico(linha.dor_peito),
    dor_peito_detalhe: texto(linha.dor_peito_detalhe),
    pressao_alta: logico(linha.pressao_alta),
    pressao_alta_detalhe: texto(linha.pressao_alta_detalhe),
    cirurgia_12m: logico(linha.cirurgia_12m),
    cirurgia_12m_detalhe: texto(linha.cirurgia_12m_detalhe),
    medicacao_continua: logico(linha.medicacao_continua),
    medicacao_continua_detalhe: texto(linha.medicacao_continua_detalhe),
    lesoes: texto(linha.lesoes),
    consentiu: Boolean(linha.consentimento_saude_em),
    cintura_cm: numero(linha.cintura_cm),
    quadril_cm: numero(linha.quadril_cm),
    braco_cm: numero(linha.braco_cm),
    coxa_cm: numero(linha.coxa_cm),
    periodo_treino: texto(linha.periodo_treino),
  };
}

export default async function PaginaAnamnese() {
  const supabase = await criarClienteServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  // Anamnese e coisa de aluno. Admin que cair aqui volta para o painel.
  const { data: perfil } = await supabase
    .from("perfis")
    .select("tipo")
    .eq("id", user.id)
    .maybeSingle<{ tipo: string }>();
  if (perfil?.tipo === "admin") redirect("/app");

  const { data: linha } = await supabase
    .from("anamnese")
    .select("*")
    .eq("aluno_id", user.id)
    .maybeSingle();

  // Ja enviada: nao reabre o formulario sem querer. A edicao depois vem
  // pela tela de perfil, na proxima entrega.
  if (linha?.status === "enviada") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-6 py-16 text-center">
        <span
          aria-hidden="true"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-raio/12 ring-1 ring-raio/40"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-raio-forte">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <h1 className="font-display text-[28px] uppercase leading-none tracking-wide">
          Anamnese enviada
        </h1>
        <p className="max-w-[34ch] text-sm leading-relaxed text-nevoa">
          O Allisson já recebeu suas respostas e vai montar sua ficha a partir delas.
          Assim que ela estiver pronta, aparece aqui na sua tela de hoje.
        </p>
        {/* Tanker e fonte de titulo: em rotulo de botao ela vira cartaz. E o
            fundo aqui era `--raio`, que reprova em contraste com texto branco.
            Os dois problemas somem usando o botao do sistema. */}
        <BotaoLink href="/app" className="mt-2">
          Voltar
        </BotaoLink>
      </main>
    );
  }

  return <Formulario inicial={paraFormulario(linha)} alunoId={user.id} />;
}

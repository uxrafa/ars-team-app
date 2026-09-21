import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { hojeSP } from "@/lib/painel";
import { diaDoAluno, type Alimento } from "@/lib/dieta";
import { carregarOrientacao } from "@/app/painel/alunos/[id]/dieta/carregar";
import { VisaoDaDieta } from "./visao";

export const metadata = { title: "Dieta · ARS Team" };

/** Só busca. Qual dia e qual refeição vem agora saem de lib/dieta.ts. */
export default async function PaginaDietaDoAluno() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  // A RLS só devolve orientação publicada; rascunho chega aqui como null.
  const [orientacao, { data: anamnese }] = await Promise.all([
    carregarOrientacao(supabase, user.id),
    supabase.from("anamnese").select("dias_disponiveis").eq("aluno_id", user.id).maybeSingle(),
  ]);

  if (!orientacao) redirect("/app");

  const ids = [
    ...new Set(orientacao.refeicoes.flatMap((r) => r.itens.map((i) => i.alimento_id)).filter(Boolean)),
  ] as string[];

  const { data: alimentos } = ids.length
    ? await supabase
        .from("alimento")
        .select("id, nome, grupo, origem, proteina_g, carboidrato_g, gordura_g")
        .in("id", ids)
    : { data: [] };

  const temDescanso = orientacao.refeicoes.some((r) => r.dia === "descanso");
  const hoje = diaDoAluno(
    (anamnese?.dias_disponiveis as number[] | null) ?? null,
    hojeSP(),
    temDescanso,
  );

  const agora = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());

  return (
    <VisaoDaDieta
      orientacao={orientacao}
      alimentos={((alimentos ?? []) as Alimento[]).map((a) => ({
        ...a,
        proteina_g: Number(a.proteina_g),
        carboidrato_g: Number(a.carboidrato_g),
        gordura_g: Number(a.gordura_g),
      }))}
      hoje={hoje}
      temDescanso={temDescanso}
      agora={agora}
    />
  );
}

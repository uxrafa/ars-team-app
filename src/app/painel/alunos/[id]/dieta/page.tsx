import { notFound } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { hojeSP } from "@/lib/painel";
import { idade, type Alimento, type DadosDoAluno, type Objetivo, type Sexo } from "@/lib/dieta";
import { carregarAluno } from "../carregar";
import { carregarOrientacao } from "./carregar";
import { EditorDeDieta, type OrientacaoDeOutro } from "./visao";

export const metadata = { title: "Dieta · ARS Team" };

/** Só busca. Todo o desenho e a conta ficam em visao.tsx e em lib/dieta.ts. */
export default async function PaginaDieta({ params }: { params: Promise<{ id: string }> }) {
  const { id: alunoId } = await params;
  const supabase = await criarClienteServidor();

  const [aluno, orientacao, { data: alimentos }, { data: anamnese }, { data: pesos }, { data: outras }] =
    await Promise.all([
      carregarAluno(alunoId),
      carregarOrientacao(supabase, alunoId),
      // A base inteira vai para o navegador (~600 linhas, só nome e macros):
      // a busca fica instantânea e sem ida ao servidor a cada letra.
      supabase
        .from("alimento")
        .select("id, nome, grupo, origem, proteina_g, carboidrato_g, gordura_g")
        .eq("ativo", true)
        .order("nome")
        .limit(2000),
      supabase
        .from("anamnese")
        .select("sexo, nascimento, altura_cm, peso_kg, objetivo, dias_disponiveis")
        .eq("aluno_id", alunoId)
        .maybeSingle(),
      // Peso de hoje, e não o da anamnese: o g/kg acompanha o aluno.
      supabase
        .from("medida_corporal")
        .select("peso_kg, data")
        .eq("aluno_id", alunoId)
        .not("peso_kg", "is", null)
        .order("data", { ascending: false })
        .limit(1),
      supabase
        .from("orientacao_alimentar")
        .select("aluno_id, perfis (nome)")
        .neq("aluno_id", alunoId)
        .order("atualizado_em", { ascending: false })
        .limit(30),
    ]);

  if (!aluno) notFound();

  const a = anamnese as {
    sexo: Sexo | null;
    nascimento: string | null;
    altura_cm: number | null;
    peso_kg: number | null;
    objetivo: Objetivo | null;
    dias_disponiveis: number[] | null;
  } | null;

  const pesoAtual = pesos?.[0]?.peso_kg ?? a?.peso_kg ?? null;

  const dados: DadosDoAluno = {
    sexo: a?.sexo ?? null,
    idade: idade(a?.nascimento ?? null, hojeSP()),
    altura: a?.altura_cm ?? null,
    peso: pesoAtual === null ? null : Number(pesoAtual),
  };

  const deOutros: OrientacaoDeOutro[] = (
    (outras ?? []) as unknown as { aluno_id: string; perfis: { nome: string } | null }[]
  ).map((o) => ({ alunoId: o.aluno_id, nome: o.perfis?.nome ?? "Aluno" }));

  return (
    <EditorDeDieta
      alunoId={alunoId}
      primeiroNome={aluno.nome.split(" ")[0]}
      inicial={orientacao}
      alimentosIniciais={((alimentos ?? []) as Alimento[]).map((x) => ({
        ...x,
        proteina_g: Number(x.proteina_g),
        carboidrato_g: Number(x.carboidrato_g),
        gordura_g: Number(x.gordura_g),
      }))}
      dados={dados}
      objetivo={a?.objetivo ?? null}
      diasDeTreino={a?.dias_disponiveis?.length ?? 0}
      deOutros={deOutros}
    />
  );
}

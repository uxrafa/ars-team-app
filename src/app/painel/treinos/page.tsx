import { criarClienteServidor } from "@/lib/supabase/server";
import { hojeSP } from "@/lib/painel";
import {
  DIAS_DO_FEED,
  contarRecados,
  contarTreinos,
  montarFeed,
  somenteComRecado,
  type DadosDoAluno,
  type LinhaSerieFeed,
  type LinhaSessaoFeed,
} from "@/lib/feed";
import { VisaoDosTreinos } from "./visao";

export const metadata = { title: "Treinos · ARS Team" };

/** O que o PostgREST devolve com os embutidos. `numeric` volta como texto. */
type SessaoCrua = {
  id: string;
  aluno_id: string;
  data: string;
  peso_kg: string | number | null;
  esforco: number | null;
  nota: string | null;
  iniciada_em: string;
  concluida_em: string | null;
  bloco_treino: { nome: string; foco: string | null } | null;
};

type SerieCrua = {
  sessao_id: string;
  exercicio_id: string;
  numero: number;
  carga_kg: string | number | null;
  reps: number | null;
  exercicio: { nome: string } | null;
};

const paraNumero = (v: string | number | null): number | null =>
  v === null || v === undefined ? null : Number(v);

/** Volta N dias de uma data ISO, sem passar pelo fuso da máquina. */
function diasAtras(data: string, dias: number): string {
  const d = new Date(Date.parse(data + "T00:00:00Z") - dias * 86400000);
  return d.toISOString().slice(0, 10);
}

/**
 * Esta página só busca. Quem desenha é a VisaoDosTreinos.
 *
 * É a tela que faltava: o aluno escrevia no fim do treino e ninguém lia. A
 * RLS já garante o acesso (o admin tem SELECT em `sessao_treino` e em
 * `serie_registrada`), então não precisou de migração nenhuma para isto.
 */
export default async function Treinos({
  searchParams,
}: {
  searchParams: Promise<{ recado?: string }>;
}) {
  const { recado } = await searchParams;
  const soRecado = recado === "1";

  const supabase = await criarClienteServidor();
  const hoje = hojeSP();
  const desde = diasAtras(hoje, DIAS_DO_FEED - 1);

  const [{ data: perfis }, { data: sessoes }] = await Promise.all([
    supabase.from("perfis").select("id, nome, tipo, whatsapp").neq("tipo", "admin").order("nome"),
    supabase
      .from("sessao_treino")
      .select(
        "id, aluno_id, data, peso_kg, esforco, nota, iniciada_em, concluida_em, bloco_treino (nome, foco)",
      )
      .eq("status", "concluida")
      .gte("data", desde)
      .order("concluida_em", { ascending: false, nullsFirst: false })
      .limit(150),
  ]);

  const crus = (sessoes ?? []) as unknown as SessaoCrua[];

  // As séries vêm em uma consulta só, filtradas pelas sessões que já estão na
  // mão. Uma consulta por cartão seria dezenas de idas ao banco por tela.
  const ids = crus.map((s) => s.id);
  const { data: series } = ids.length
    ? await supabase
        .from("serie_registrada")
        .select("sessao_id, exercicio_id, numero, carga_kg, reps, exercicio!inner (nome)")
        .in("sessao_id", ids)
        .order("numero")
    : { data: [] };

  const alunos: DadosDoAluno[] = (perfis ?? []) as DadosDoAluno[];

  const linhasSessao: LinhaSessaoFeed[] = crus.map((s) => ({
    id: s.id,
    aluno_id: s.aluno_id,
    data: s.data,
    peso_kg: paraNumero(s.peso_kg),
    esforco: s.esforco,
    nota: s.nota,
    iniciada_em: s.iniciada_em,
    concluida_em: s.concluida_em,
    bloco: s.bloco_treino,
  }));

  const linhasSerie: LinhaSerieFeed[] = ((series ?? []) as unknown as SerieCrua[]).map((s) => ({
    sessao_id: s.sessao_id,
    exercicio_id: s.exercicio_id,
    numero: s.numero,
    carga_kg: paraNumero(s.carga_kg),
    reps: s.reps,
    exercicio: s.exercicio?.nome ?? "Exercício",
  }));

  const todos = montarFeed(linhasSessao, linhasSerie, alunos, hoje);

  return (
    <VisaoDosTreinos
      dias={soRecado ? somenteComRecado(todos) : todos}
      hoje={hoje}
      total={contarTreinos(todos)}
      recados={contarRecados(todos)}
      soRecado={soRecado}
      temAluno={alunos.length > 0}
    />
  );
}

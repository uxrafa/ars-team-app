import { notFound } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { carregarAluno } from "../carregar";
import { BotaoLink } from "@/components/ui";
import type { ExercicioEscolhivel } from "@/lib/biblioteca";
import type { LinhaAnamneseFicha, StatusProtocolo } from "@/lib/ficha";
import { Editor } from "./editor";
import { Comecar } from "./comecar";
import { carregarBlocos } from "./carregar";

export const metadata = { title: "Ficha · ARS Team" };

/** Aluno para quem esta ficha pode ser copiada. */
export type AlunoDestino = { id: string; nome: string; temRascunho: boolean };

export type FichaDeOutro = {
  id: string;
  nome: string;
  status: StatusProtocolo;
  aluno: string;
};

export default async function PaginaFicha({ params }: { params: Promise<{ id: string }> }) {
  const { id: alunoId } = await params;
  const supabase = await criarClienteServidor();

  // O aluno vem do `cache` do layout; o protocolo nao depende dele, entao os
  // dois saem juntos em vez de um esperar o outro.
  //
  // Rascunho ganha do ativo: se existe um rascunho, é nele que ele estava
  // trabalhando. A ficha ativa continua no ar para o aluno enquanto isso.
  const [aluno, { data: protocolos }] = await Promise.all([
    carregarAluno(alunoId),
    supabase
      .from("protocolo")
      .select("id, nome, inicio, fim, status, observacoes")
      .eq("aluno_id", alunoId)
      .in("status", ["rascunho", "ativo"])
      .order("status"),
  ]);

  if (!aluno) notFound();

  const protocolo = (protocolos ?? [])[0] as
    | {
        id: string;
        nome: string;
        inicio: string;
        fim: string | null;
        status: StatusProtocolo;
        observacoes: string | null;
      }
    | undefined;

  const [{ data: exercicios }, { data: anamnese }, { data: outras }, { data: destinos }, { data: rascunhos }] = await Promise.all([
    // Só os quatro campos que o seletor usa. Antes vinha a linha inteira,
    // com o texto de instruções de cada exercício, para o navegador nunca ler.
    supabase
      .from("exercicio")
      .select("id, nome, grupo, equipamento")
      .eq("ativo", true)
      .order("nome"),
    supabase
      .from("anamnese")
      .select(
        "status, peso_kg, altura_cm, objetivo, local_treino, nivel, dias_disponiveis, periodo_treino, lesoes, coracao, dor_peito, pressao_alta, cirurgia_12m, medicacao_continua, coracao_detalhe, dor_peito_detalhe, pressao_alta_detalhe, cirurgia_12m_detalhe, medicacao_continua_detalhe",
      )
      .eq("aluno_id", alunoId)
      .maybeSingle(),
    // Sem o join de três níveis. Ele existia só para contar exercícios no
    // rótulo do menu, e trazia os itens de 30 fichas alheias a cada abertura
    // desta tela. Quem recusa origem vazia agora é a própria ação de copiar.
    supabase
      .from("protocolo")
      .select("id, nome, status, perfis (nome)")
      .neq("aluno_id", alunoId)
      .in("status", ["ativo", "encerrado"])
      .order("criado_em", { ascending: false })
      .limit(20),
    // Para quem dá para mandar esta ficha: alunos na ativa, menos ele.
    supabase
      .from("perfis")
      .select("id, nome")
      .neq("tipo", "admin")
      .neq("id", alunoId)
      .is("arquivado_em", null)
      .order("nome"),
    // Só para avisar, na lista, quem já tem rascunho que seria substituído.
    supabase.from("protocolo").select("aluno_id").eq("status", "rascunho").neq("aluno_id", alunoId),
  ]);

  const comRascunho = new Set(((rascunhos ?? []) as { aluno_id: string }[]).map((r) => r.aluno_id));
  const alunosDestino: AlunoDestino[] = ((destinos ?? []) as { id: string; nome: string }[]).map((a) => ({
    id: a.id,
    nome: a.nome,
    temRascunho: comRascunho.has(a.id),
  }));

  const fichasDeOutros: FichaDeOutro[] = (
    (outras ?? []) as unknown as {
      id: string;
      nome: string;
      status: StatusProtocolo;
      perfis: { nome: string } | null;
    }[]
  ).map((p) => ({
    id: p.id,
    nome: p.nome,
    status: p.status,
    aluno: p.perfis?.nome ?? "Aluno",
  }));

  if (!protocolo) {
    return (
      <Comecar
        alunoId={alunoId}
        nome={aluno.nome}
        temAnamnese={!!anamnese}
        anamneseEnviada={(anamnese as LinhaAnamneseFicha | null)?.status === "enviada"}
        fichasDeOutros={fichasDeOutros}
      />
    );
  }

  const blocos = await carregarBlocos(supabase, protocolo.id);

  return (
    <div className="flex flex-col gap-6">
      {/* Sem migalha e sem nome do aluno: o layout de /painel/alunos/[id] já
          diz de quem é esta ficha, e repetir empurraria o editor para baixo. */}
      <div className="flex justify-end">
        <BotaoLink href="/painel/biblioteca" aparencia="secundario" tamanho="sm">
          Ver biblioteca
        </BotaoLink>
      </div>

      <Editor
        alunoId={alunoId}
        alunoNome={aluno.nome}
        protocolo={protocolo}
        blocosIniciais={blocos}
        exercicios={(exercicios ?? []) as ExercicioEscolhivel[]}
        anamnese={(anamnese as LinhaAnamneseFicha | null) ?? null}
        fichasDeOutros={fichasDeOutros}
        alunosDestino={alunosDestino}
      />
    </div>
  );
}

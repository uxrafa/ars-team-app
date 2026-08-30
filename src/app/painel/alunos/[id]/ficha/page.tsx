import Link from "next/link";
import { notFound } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { BotaoLink } from "@/components/ui";
import type { ExercicioEscolhivel } from "@/lib/biblioteca";
import type { LinhaAnamneseFicha, StatusProtocolo } from "@/lib/ficha";
import { Editor } from "./editor";
import { Comecar } from "./comecar";
import { carregarBlocos } from "./carregar";

export const metadata = { title: "Ficha · ARS Team" };

export type FichaDeOutro = {
  id: string;
  nome: string;
  status: StatusProtocolo;
  aluno: string;
};

export default async function PaginaFicha({ params }: { params: Promise<{ id: string }> }) {
  const { id: alunoId } = await params;
  const supabase = await criarClienteServidor();

  const { data: aluno } = await supabase
    .from("perfis")
    .select("id, nome, email, tipo")
    .eq("id", alunoId)
    .maybeSingle<{ id: string; nome: string; email: string; tipo: string }>();

  if (!aluno) notFound();

  // Rascunho ganha do ativo: se existe um rascunho, é nele que ele estava
  // trabalhando. A ficha ativa continua no ar para o aluno enquanto isso.
  const { data: protocolos } = await supabase
    .from("protocolo")
    .select("id, nome, inicio, fim, status, observacoes")
    .eq("aluno_id", alunoId)
    .in("status", ["rascunho", "ativo"])
    .order("status");

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

  const [{ data: exercicios }, { data: anamnese }, { data: outras }] = await Promise.all([
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
  ]);

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
      />
    );
  }

  const blocos = await carregarBlocos(supabase, protocolo.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/painel/alunos"
          className="text-[15px] text-nevoa underline underline-offset-4 hover:text-papel"
        >
          Alunos
        </Link>
        <span aria-hidden="true" className="text-nevoa">
          /
        </span>
        <span className="text-[15px] text-papel">{aluno.nome}</span>
        <BotaoLink href="/painel/biblioteca" aparencia="secundario" tamanho="sm" className="ml-auto">
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
      />
    </div>
  );
}

import { notFound } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { diasEntre, hojeSP } from "@/lib/painel";
import type { LinhaAnamneseFicha } from "@/lib/ficha";
import { VisaoDoResumo, type FichaNoResumo } from "./visao";
import type { PerfilDoAluno } from "./layout";

export const metadata = { title: "Aluno · ARS Team" };

type Protocolo = { nome: string; inicio: string; fim: string | null };

/** Esta página só busca. O cabeçalho e as abas vêm do layout. */
export default async function ResumoDoAluno({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await criarClienteServidor();
  const hoje = hojeSP();

  const [{ data: aluno }, { data: anamnese }, { data: protocolos }, { data: sessoes }] =
    await Promise.all([
      supabase
        .from("perfis")
        .select("id, nome, email, whatsapp, tipo, status, acesso_ate, mensalidade, criado_em")
        .eq("id", id)
        .maybeSingle<PerfilDoAluno>(),
      supabase
        .from("anamnese")
        .select(
          "status, peso_kg, altura_cm, objetivo, local_treino, nivel, dias_disponiveis, periodo_treino, lesoes, coracao, dor_peito, pressao_alta, cirurgia_12m, medicacao_continua, coracao_detalhe, dor_peito_detalhe, pressao_alta_detalhe, cirurgia_12m_detalhe, medicacao_continua_detalhe",
        )
        .eq("aluno_id", id)
        .maybeSingle(),
      supabase
        .from("protocolo")
        .select("nome, inicio, fim")
        .eq("aluno_id", id)
        .eq("status", "ativo")
        .limit(1),
      supabase
        .from("sessao_treino")
        .select("data")
        .eq("aluno_id", id)
        .eq("status", "concluida")
        .order("data", { ascending: false })
        .limit(1),
    ]);

  if (!aluno) notFound();

  const bruta = ((protocolos ?? [])[0] ?? null) as Protocolo | null;
  const ficha: FichaNoResumo | null = bruta
    ? {
        nome: bruta.nome,
        inicio: bruta.inicio,
        fim: bruta.fim,
        faltam: bruta.fim ? diasEntre(hoje, bruta.fim) : null,
      }
    : null;

  return (
    <VisaoDoResumo
      alunoId={aluno.id}
      alunoNome={aluno.nome}
      hoje={hoje}
      ficha={ficha}
      ultimoTreino={((sessoes ?? [])[0] as { data: string } | undefined)?.data ?? null}
      anamnese={(anamnese as LinhaAnamneseFicha | null) ?? null}
      cobranca={{
        id: aluno.id,
        email: aluno.email,
        whatsapp: aluno.whatsapp,
        tipo: aluno.tipo === "planilha" ? "planilha" : "consultoria",
        status: aluno.status,
        acesso_ate: aluno.acesso_ate,
        mensalidade: aluno.mensalidade === null ? null : Number(aluno.mensalidade),
      }}
    />
  );
}

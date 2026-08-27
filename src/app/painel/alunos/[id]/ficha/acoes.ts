"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { BlocoNaTela } from "@/lib/ficha";
import { carregarBlocos } from "./carregar";

export type Resultado = { erro?: string; ok?: boolean };

/** Salvar e copiar devolvem a ficha relida, com os ids que o banco criou. */
export type ResultadoComBlocos = Resultado & { blocos?: BlocoNaTela[] };

async function exigirAdmin() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, erro: "Sua sessão expirou. Entre de novo." as const };

  const { data: perfil } = await supabase
    .from("perfis")
    .select("tipo")
    .eq("id", user.id)
    .maybeSingle<{ tipo: string }>();

  if (perfil?.tipo !== "admin") {
    return { supabase, erro: "Só o treinador monta ficha." as const };
  }
  return { supabase, user };
}

function recarregar(alunoId: string) {
  revalidatePath(`/painel/alunos/${alunoId}/ficha`);
  revalidatePath("/painel/alunos");
  revalidatePath("/painel");
}

/** Abre uma ficha em rascunho. O aluno não enxerga rascunho (policy da 0003). */
export async function criarRascunho(alunoId: string): Promise<Resultado> {
  const { supabase, erro, user } = await exigirAdmin();
  if (erro) return { erro };

  const { error } = await supabase.from("protocolo").insert({
    aluno_id: alunoId,
    nome: "Ficha de treino",
    status: "rascunho",
    criado_por: user?.id ?? null,
  });

  if (error) {
    console.error("criarRascunho:", error.message);
    return { erro: "Não consegui abrir a ficha agora. Tente de novo." };
  }

  recarregar(alunoId);
  return { ok: true };
}

export type DadosFicha = {
  alunoId: string;
  protocoloId: string;
  nome: string;
  inicio: string;
  fim: string;
  observacoes: string;
  blocos: BlocoNaTela[];
};

/**
 * Grava a ficha inteira. Quem faz o trabalho é a função `salvar_ficha` no
 * banco, numa transação só: aqui é só traduzir a tela para o formato dela.
 */
export async function salvarFicha(d: DadosFicha): Promise<ResultadoComBlocos> {
  const { supabase, erro } = await exigirAdmin();
  if (erro) return { erro };

  for (const b of d.blocos) {
    for (const i of b.itens) {
      if (!Number.isFinite(i.series) || i.series < 1 || i.series > 20) {
        return { erro: `Confira as séries de ${i.nome}: o banco aceita de 1 a 20.` };
      }
      if (!i.reps.trim()) {
        return { erro: `Escreva as repetições de ${i.nome}.` };
      }
      if (!Number.isFinite(i.descanso_seg) || i.descanso_seg < 0 || i.descanso_seg > 900) {
        return { erro: `Confira o descanso de ${i.nome}: o banco aceita até 15 minutos.` };
      }
    }
  }

  const { error } = await supabase.rpc("salvar_ficha", {
    p_protocolo_id: d.protocoloId,
    p_nome: d.nome,
    p_inicio: d.inicio || null,
    p_fim: d.fim || null,
    p_observacoes: d.observacoes,
    p_blocos: d.blocos.map((b, ordemBloco) => ({
      id: b.id,
      nome: b.nome,
      foco: b.foco,
      ordem: ordemBloco,
      itens: b.itens.map((i, ordemItem) => ({
        id: i.id,
        exercicio_id: i.exercicio_id,
        ordem: ordemItem,
        series: i.series,
        reps: i.reps,
        descanso_seg: i.descanso_seg,
        metodo: i.metodo,
        observacao: i.observacao,
      })),
    })),
  });

  if (error) {
    console.error("salvarFicha:", error.message);
    return { erro: "Não consegui salvar a ficha agora. Tente de novo em instantes." };
  }

  recarregar(d.alunoId);
  // Relê: os itens que acabaram de nascer precisam voltar para a tela com id,
  // senão a próxima gravação os recria do zero.
  return { ok: true, blocos: await carregarBlocos(supabase, d.protocoloId) };
}

/**
 * Publica: o aluno passa a enxergar. Antes disso, a ficha ativa anterior é
 * encerrada, porque o índice parcial da 0003 só deixa uma ativa por aluno.
 */
export async function publicarFicha(alunoId: string, protocoloId: string): Promise<Resultado> {
  const { supabase, erro } = await exigirAdmin();
  if (erro) return { erro };

  const { error: erroEncerrar } = await supabase
    .from("protocolo")
    .update({ status: "encerrado" })
    .eq("aluno_id", alunoId)
    .eq("status", "ativo")
    .neq("id", protocoloId);

  if (erroEncerrar) {
    console.error("publicarFicha (encerrar anterior):", erroEncerrar.message);
    return { erro: "Não consegui encerrar a ficha anterior. Tente de novo." };
  }

  const { error } = await supabase
    .from("protocolo")
    .update({ status: "ativo" })
    .eq("id", protocoloId);

  if (error) {
    console.error("publicarFicha:", error.message);
    return { erro: "Não consegui publicar agora. Tente de novo em instantes." };
  }

  recarregar(alunoId);
  return { ok: true };
}

/** Tira do ar sem apagar: vira histórico e o aluno para de ver. */
export async function encerrarFicha(alunoId: string, protocoloId: string): Promise<Resultado> {
  const { supabase, erro } = await exigirAdmin();
  if (erro) return { erro };

  const { error } = await supabase
    .from("protocolo")
    .update({ status: "encerrado" })
    .eq("id", protocoloId);

  if (error) {
    console.error("encerrarFicha:", error.message);
    return { erro: "Não consegui encerrar agora. Tente de novo." };
  }

  recarregar(alunoId);
  return { ok: true };
}

/**
 * Copia a estrutura de outra ficha para esta.
 *
 * É o que torna a migração dos 25 alunos viável: quase todo mundo começa de um
 * ABC parecido, e montar 25 fichas do zero é o ponto em que se desiste e volta
 * para o PDF. Copia blocos, exercícios, séries, reps, descanso e método, e
 * NÃO copia vigência nem observação, que são daquele aluno.
 */
export async function copiarFicha(
  alunoId: string,
  protocoloDestino: string,
  protocoloOrigem: string,
): Promise<ResultadoComBlocos> {
  const { supabase, erro } = await exigirAdmin();
  if (erro) return { erro };

  const { data: blocos, error: erroLeitura } = await supabase
    .from("bloco_treino")
    .select("nome, foco, ordem, item_exercicio (exercicio_id, ordem, series, reps, descanso_seg, metodo, observacao)")
    .eq("protocolo_id", protocoloOrigem)
    .order("ordem");

  if (erroLeitura) {
    console.error("copiarFicha (leitura):", erroLeitura.message);
    return { erro: "Não consegui ler a ficha de origem." };
  }
  if (!blocos?.length) return { erro: "Essa ficha não tem treino para copiar." };

  type ItemBruto = {
    exercicio_id: string;
    ordem: number;
    series: number;
    reps: string;
    descanso_seg: number;
    metodo: string;
    observacao: string | null;
  };

  const payload = (blocos as unknown as {
    nome: string;
    foco: string | null;
    ordem: number;
    item_exercicio: ItemBruto[];
  }[]).map((b, ordemBloco) => ({
    id: null,
    nome: b.nome,
    foco: b.foco ?? "",
    ordem: ordemBloco,
    itens: [...(b.item_exercicio ?? [])]
      .sort((x, y) => x.ordem - y.ordem)
      .map((i, ordemItem) => ({
        id: null,
        exercicio_id: i.exercicio_id,
        ordem: ordemItem,
        series: i.series,
        reps: i.reps,
        descanso_seg: i.descanso_seg,
        metodo: i.metodo,
        observacao: i.observacao ?? "",
      })),
  }));

  const { data: destino } = await supabase
    .from("protocolo")
    .select("nome, inicio, fim, observacoes")
    .eq("id", protocoloDestino)
    .maybeSingle<{ nome: string; inicio: string; fim: string | null; observacoes: string | null }>();

  const { error } = await supabase.rpc("salvar_ficha", {
    p_protocolo_id: protocoloDestino,
    p_nome: destino?.nome ?? "Ficha de treino",
    p_inicio: destino?.inicio ?? null,
    p_fim: destino?.fim ?? null,
    p_observacoes: destino?.observacoes ?? null,
    p_blocos: payload,
  });

  if (error) {
    console.error("copiarFicha:", error.message);
    return { erro: "Não consegui copiar agora. Tente de novo em instantes." };
  }

  recarregar(alunoId);
  return { ok: true, blocos: await carregarBlocos(supabase, protocoloDestino) };
}

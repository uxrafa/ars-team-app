"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { hojeSP } from "@/lib/painel";

export type Resultado = { erro?: string; ok?: boolean };

async function pegarAluno() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, alunoId: user?.id ?? null };
}

/**
 * Abre o treino.
 *
 * O banco só deixa uma sessão aberta por aluno (índice parcial), então aqui a
 * decisão é o que fazer com a que já está aberta. Se ela está vazia, ela vira
 * a de agora: sessão aberta sem nenhuma série é gente que tocou em começar e
 * saiu do app, e não treino de verdade para preservar. Se tem série dentro,
 * não se apaga o que a pessoa fez, e a tela manda ela terminar ou descartar.
 */
export async function comecarTreino(blocoId: string): Promise<Resultado> {
  const { supabase, alunoId } = await pegarAluno();
  if (!alunoId) return { erro: "Sua sessão expirou. Entre de novo." };

  const { data: aberta } = await supabase
    .from("sessao_treino")
    .select("id, bloco_id")
    .eq("aluno_id", alunoId)
    .eq("status", "em_andamento")
    .maybeSingle<{ id: string; bloco_id: string | null }>();

  if (aberta) {
    if (aberta.bloco_id === blocoId) redirect("/app/treino");

    const { count } = await supabase
      .from("serie_registrada")
      .select("id", { count: "exact", head: true })
      .eq("sessao_id", aberta.id);

    if (count && count > 0) {
      return {
        erro: "Você tem um treino em andamento. Termine ou descarte antes de começar outro.",
      };
    }

    const { error } = await supabase
      .from("sessao_treino")
      .update({ bloco_id: blocoId, data: hojeSP(), iniciada_em: new Date().toISOString() })
      .eq("id", aberta.id);

    if (error) return { erro: "Não consegui abrir o treino. Tente de novo." };
  } else {
    const { error } = await supabase.from("sessao_treino").insert({
      aluno_id: alunoId,
      bloco_id: blocoId,
      data: hojeSP(),
    });

    if (error) return { erro: "Não consegui abrir o treino. Tente de novo." };
  }

  revalidatePath("/app");
  redirect("/app/treino");
}

/** Joga fora a sessão aberta. As séries vão junto, por cascata. */
export async function descartarTreino(): Promise<Resultado> {
  const { supabase, alunoId } = await pegarAluno();
  if (!alunoId) return { erro: "Sua sessão expirou. Entre de novo." };

  const { error } = await supabase
    .from("sessao_treino")
    .delete()
    .eq("aluno_id", alunoId)
    .eq("status", "em_andamento");

  if (error) return { erro: "Não consegui descartar. Tente de novo." };

  revalidatePath("/app");
  redirect("/app");
}

async function sessaoAbertaDoAluno(
  supabase: Awaited<ReturnType<typeof criarClienteServidor>>,
  alunoId: string,
) {
  const { data } = await supabase
    .from("sessao_treino")
    .select("id, bloco_id")
    .eq("aluno_id", alunoId)
    .eq("status", "em_andamento")
    .maybeSingle<{ id: string; bloco_id: string | null }>();
  return data;
}

export type SerieGravada = {
  erro?: string;
  serie?: { id: string; exercicio_id: string; numero: number; carga_kg: number | null; reps: number | null };
};

/**
 * Grava uma série.
 *
 * O `exercicio_id` vem do banco e não da tela: o cliente manda o item da ficha,
 * e quem diz qual exercício é aquilo é a linha do item. Como a RLS só devolve
 * item de ficha ativa do próprio aluno, item de outra pessoa some aqui sem
 * precisar de checagem extra.
 */
export async function registrarSerie(
  itemId: string,
  numero: number,
  cargaKg: number | null,
  reps: number | null,
): Promise<SerieGravada> {
  const { supabase, alunoId } = await pegarAluno();
  if (!alunoId) return { erro: "Sua sessão expirou. Entre de novo." };

  const sessao = await sessaoAbertaDoAluno(supabase, alunoId);
  if (!sessao) return { erro: "Este treino não está mais aberto." };

  const { data: item } = await supabase
    .from("item_exercicio")
    .select("id, exercicio_id, series")
    .eq("id", itemId)
    .maybeSingle<{ id: string; exercicio_id: string; series: number }>();

  if (!item) return { erro: "Este exercício não está mais na sua ficha." };
  if (!Number.isInteger(numero) || numero < 1 || numero > 20) {
    return { erro: "Número de série inválido." };
  }

  const { data, error } = await supabase
    .from("serie_registrada")
    .upsert(
      {
        sessao_id: sessao.id,
        item_id: item.id,
        exercicio_id: item.exercicio_id,
        numero,
        carga_kg: cargaKg,
        reps,
        concluida_em: new Date().toISOString(),
      },
      { onConflict: "sessao_id,exercicio_id,numero" },
    )
    .select("id, exercicio_id, numero, carga_kg, reps")
    .single();

  if (error || !data) return { erro: "Não consegui gravar a série. Tente de novo." };

  revalidatePath("/app/treino");
  return {
    serie: {
      id: data.id,
      exercicio_id: data.exercicio_id,
      numero: data.numero,
      carga_kg: data.carga_kg === null ? null : Number(data.carga_kg),
      reps: data.reps,
    },
  };
}

/** Desfaz uma série. Errar o campo de carga no meio do treino é comum. */
export async function apagarSerie(exercicioId: string, numero: number): Promise<Resultado> {
  const { supabase, alunoId } = await pegarAluno();
  if (!alunoId) return { erro: "Sua sessão expirou. Entre de novo." };

  const sessao = await sessaoAbertaDoAluno(supabase, alunoId);
  if (!sessao) return { erro: "Este treino não está mais aberto." };

  const { error } = await supabase
    .from("serie_registrada")
    .delete()
    .eq("sessao_id", sessao.id)
    .eq("exercicio_id", exercicioId)
    .eq("numero", numero);

  if (error) return { erro: "Não consegui desfazer. Tente de novo." };

  revalidatePath("/app/treino");
  return { ok: true };
}

/**
 * Fecha o treino. É isto que o painel do Allisson chama de check-in.
 *
 * O peso do dia, quando informado, também vira ponto no gráfico da Evolução:
 * é o mesmo dado, e pedir de novo na outra tela seria trabalho repetido. Só
 * não sobrescreve o que o aluno já tiver registrado na mão hoje.
 */
export async function concluirTreino(
  pesoKg: number | null,
  esforco: number | null,
  nota: string,
): Promise<Resultado> {
  const { supabase, alunoId } = await pegarAluno();
  if (!alunoId) return { erro: "Sua sessão expirou. Entre de novo." };

  const sessao = await sessaoAbertaDoAluno(supabase, alunoId);
  if (!sessao) return { erro: "Este treino não está mais aberto." };

  const { error } = await supabase
    .from("sessao_treino")
    .update({
      status: "concluida",
      concluida_em: new Date().toISOString(),
      peso_kg: pesoKg,
      esforco,
      nota: nota.trim() || null,
    })
    .eq("id", sessao.id);

  if (error) return { erro: "Não consegui fechar o treino. Tente de novo." };

  if (pesoKg !== null) {
    await supabase
      .from("medida_corporal")
      .upsert(
        { aluno_id: alunoId, data: hojeSP(), peso_kg: pesoKg, origem: "sessao" },
        { onConflict: "aluno_id,data", ignoreDuplicates: true },
      );
  }

  revalidatePath("/app");
  revalidatePath("/app/evolucao");
  redirect("/app?feito=1");
}

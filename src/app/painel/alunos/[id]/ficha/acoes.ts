"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { BlocoNaTela } from "@/lib/ficha";
import { carregarBlocos } from "./carregar";
import { MAX_AQUECIMENTO } from "@/lib/prescricao";

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
      if (
        !Number.isFinite(i.series_aquecimento) ||
        i.series_aquecimento < 0 ||
        i.series_aquecimento > MAX_AQUECIMENTO
      ) {
        return { erro: `Confira o aquecimento de ${i.nome}: de 0 a ${MAX_AQUECIMENTO}.` };
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
        series_aquecimento: i.series_aquecimento,
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
    .select("nome, foco, ordem, item_exercicio (exercicio_id, ordem, series, series_aquecimento, reps, descanso_seg, metodo, observacao)")
    .eq("protocolo_id", protocoloOrigem)
    .order("ordem");

  if (erroLeitura) {
    console.error("copiarFicha (leitura):", erroLeitura.message);
    return { erro: "Não consegui ler a ficha de origem." };
  }
  // A tela não conta mais os exercícios da origem (era um join de três níveis
  // em toda abertura da ficha), então quem recusa origem vazia é aqui.
  const temItem = (blocos ?? []).some(
    (b) => ((b as { item_exercicio?: unknown[] }).item_exercicio ?? []).length > 0,
  );
  if (!blocos?.length || !temItem) {
    return { erro: "Essa ficha não tem exercício para copiar." };
  }

  type ItemBruto = {
    exercicio_id: string;
    ordem: number;
    series: number;
    series_aquecimento: number;
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
        // "Copiar de outro aluno" é como o Allisson vai montar as 25 fichas.
        // Sem esta linha, toda cópia chegaria sem aquecimento.
        series_aquecimento: i.series_aquecimento ?? 0,
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

/**
 * Copia a ficha deste aluno para OUTRO aluno (Rafael, 24/09: o Allisson
 * procurava "copiar esta ficha para fulano" e só existia o caminho inverso).
 *
 * No destino a cópia vira RASCUNHO: se ele já tem uma ficha no ar, ela
 * continua no ar até o Allisson revisar e publicar a nova. Se já existe um
 * rascunho, é ele que recebe a cópia (a tela avisa antes).
 */
export async function copiarParaAluno(
  protocoloOrigem: string,
  destinoAlunoId: string,
): Promise<Resultado> {
  const { supabase, erro, user } = await exigirAdmin();
  if (erro) return { erro };

  const { data: origem } = await supabase
    .from("protocolo")
    .select("nome")
    .eq("id", protocoloOrigem)
    .maybeSingle<{ nome: string }>();
  if (!origem) return { erro: "Não achei a ficha de origem." };

  const { data: rascunho } = await supabase
    .from("protocolo")
    .select("id")
    .eq("aluno_id", destinoAlunoId)
    .eq("status", "rascunho")
    .limit(1)
    .maybeSingle<{ id: string }>();

  let destino = rascunho?.id ?? null;
  if (!destino) {
    const { data: novo, error } = await supabase
      .from("protocolo")
      .insert({
        aluno_id: destinoAlunoId,
        nome: origem.nome,
        status: "rascunho",
        criado_por: user?.id ?? null,
      })
      .select("id")
      .single<{ id: string }>();
    if (error || !novo) {
      console.error("copiarParaAluno:", error?.message);
      return { erro: "Não consegui abrir a ficha do outro aluno." };
    }
    destino = novo.id;
  }

  const r = await copiarFicha(destinoAlunoId, destino, protocoloOrigem);
  if (r.erro) return { erro: r.erro };
  return { ok: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { GRUPOS, limparVideo, videoValido, type Grupo } from "@/lib/biblioteca";

export type Resultado = { erro?: string; ok?: boolean };

export type DadosExercicio = {
  id: string;
  nome: string;
  grupo: Grupo;
  equipamento: string;
  video_url: string;
};

const VALORES = GRUPOS.map((g) => g.valor) as string[];

/** Confirma que quem pede é o treinador. A RLS já barra; isto é para a mensagem. */
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
    return { supabase, erro: "Só o treinador mexe na biblioteca." as const };
  }
  return { supabase };
}

function conferir(d: { nome: string; grupo: string; video_url: string }): string | null {
  if (!d.nome.trim()) return "Escreva o nome do exercício.";
  if (d.nome.trim().length > 120) return "O nome ficou longo demais.";
  if (!VALORES.includes(d.grupo)) return "Escolha um grupo muscular.";
  if (!videoValido(d.video_url)) {
    return "O link do vídeo precisa começar com https. Cole o endereço inteiro do YouTube.";
  }
  return null;
}

/**
 * Mensagem boa para o índice único de nome. Sem isto o Allisson veria um erro
 * cru do Postgres ao cadastrar um exercício que já existe com outra caixa.
 */
function traduzir(mensagem: string): string {
  if (mensagem.includes("exercicio_nome_unico")) {
    return "Já existe um exercício com esse nome na biblioteca.";
  }
  return "Não consegui salvar agora. Tente de novo em instantes.";
}

export async function salvarExercicio(d: DadosExercicio): Promise<Resultado> {
  const { supabase, erro } = await exigirAdmin();
  if (erro) return { erro };

  const problema = conferir(d);
  if (problema) return { erro: problema };

  const { error } = await supabase
    .from("exercicio")
    .update({
      nome: d.nome.trim(),
      grupo: d.grupo,
      equipamento: d.equipamento.trim() || null,
      video_url: limparVideo(d.video_url),
    })
    .eq("id", d.id);

  if (error) {
    console.error("salvarExercicio:", error.message);
    return { erro: traduzir(error.message) };
  }

  revalidatePath("/painel/biblioteca");
  return { ok: true };
}

export async function criarExercicio(
  _anterior: Resultado,
  dados: FormData,
): Promise<Resultado> {
  const { supabase, erro } = await exigirAdmin();
  if (erro) return { erro };

  const d = {
    nome: String(dados.get("nome") ?? ""),
    grupo: String(dados.get("grupo") ?? ""),
    equipamento: String(dados.get("equipamento") ?? ""),
    video_url: String(dados.get("video_url") ?? ""),
  };

  const problema = conferir(d);
  if (problema) return { erro: problema };

  const { error } = await supabase.from("exercicio").insert({
    nome: d.nome.trim(),
    grupo: d.grupo,
    equipamento: d.equipamento.trim() || null,
    video_url: limparVideo(d.video_url),
  });

  if (error) {
    console.error("criarExercicio:", error.message);
    return { erro: traduzir(error.message) };
  }

  revalidatePath("/painel/biblioteca");
  return { ok: true };
}

/**
 * Exercício não se apaga, se desativa (regra da migração 0003): o
 * `on delete restrict` existe para não sumir com o histórico de carga de quem
 * já treinou aquilo. Desativado some da montagem de ficha e continua de pé no
 * que já foi treinado.
 */
export async function alternarAtivo(id: string, ativo: boolean): Promise<Resultado> {
  const { supabase, erro } = await exigirAdmin();
  if (erro) return { erro };

  const { error } = await supabase.from("exercicio").update({ ativo }).eq("id", id);

  if (error) {
    console.error("alternarAtivo:", error.message);
    return { erro: "Não consegui mudar agora. Tente de novo." };
  }

  revalidatePath("/painel/biblioteca");
  return { ok: true };
}

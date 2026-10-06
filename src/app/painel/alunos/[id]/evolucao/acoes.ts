"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

/**
 * O treinador olhou a Evolucao deste aluno: o que chegou ate agora deixa de
 * ser novidade, e some da fila de atencao e do ponto na aba.
 *
 * E botao, e nao "abriu a pagina = viu", de proposito: o Next pre-carrega
 * link, e um passar de mouse na lista apagaria o aviso sem ninguem ter
 * olhado foto nenhuma.
 *
 * A RLS de `evolucao_vista` (0020) so deixa admin escrever; a checagem aqui e
 * para devolver mensagem boa.
 */
export async function marcarEvolucaoVista(alunoId: string): Promise<{ erro?: string; ok?: boolean }> {
  const supabase = await criarClienteServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sua sessão expirou. Entre de novo." };

  const { error } = await supabase
    .from("evolucao_vista")
    .upsert(
      { aluno_id: alunoId, vista_em: new Date().toISOString(), vista_por: user.id },
      { onConflict: "aluno_id" },
    );

  if (error) {
    console.error("marcarEvolucaoVista:", error.message);
    return { erro: "Não consegui marcar agora. Tente de novo em instantes." };
  }

  revalidatePath("/painel");
  revalidatePath("/painel/alunos");
  revalidatePath(`/painel/alunos/${alunoId}`, "layout");
  return { ok: true };
}

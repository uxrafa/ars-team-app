"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { conferirAlimento } from "@/lib/dieta";

export type Resultado = { erro?: string; ok?: boolean };

/** Texto do formulário, como ele digitou. A conferência é a de `lib/dieta`. */
export type DadosAlimento = {
  nome: string;
  grupo: string;
  proteina: string;
  carboidrato: string;
  gordura: string;
};

/**
 * Confirma que quem pede é o treinador. A trava de verdade é a RLS da 0022:
 * admin cadastra e corrige só alimento próprio, e ninguém apaga.
 */
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

function montar(d: DadosAlimento) {
  const conferido = conferirAlimento(d);
  if ("erro" in conferido) return conferido;
  const grupo = d.grupo.trim();
  if (grupo.length > 60) return { erro: "O nome do grupo ficou longo demais." };
  return { linha: { ...conferido, grupo: grupo || null } };
}

/** O índice único de nome (0022) vira frase; o resto, mensagem genérica. */
function traduzir(mensagem: string): string {
  if (mensagem.includes("alimento_proprio_nome_unico")) {
    return "Você já tem um alimento com esse nome.";
  }
  return "Não consegui salvar agora. Tente de novo em instantes.";
}

function revalidar() {
  revalidatePath("/painel/biblioteca/alimentos");
  // O editor de dieta carrega a base inteira; sem isto ele mostraria o valor
  // velho até alguém recarregar a página.
  revalidatePath("/painel/alunos", "layout");
}

export async function criarAlimento(d: DadosAlimento): Promise<Resultado> {
  const { supabase, erro } = await exigirAdmin();
  if (erro) return { erro };

  const m = montar(d);
  if ("erro" in m) return { erro: m.erro };

  const { error } = await supabase.from("alimento").insert({ ...m.linha, origem: "proprio" });
  if (error) {
    console.error("criarAlimento:", error.message);
    return { erro: traduzir(error.message) };
  }

  revalidar();
  return { ok: true };
}

/**
 * Corrige um alimento dele. Os macros são lidos ao vivo pelas dietas, então
 * corrigir aqui corrige a conta de todo aluno que usa -- é o que se quer
 * quando o rótulo foi digitado errado, e a tela avisa antes.
 */
export async function salvarAlimento(id: string, d: DadosAlimento): Promise<Resultado> {
  const { supabase, erro } = await exigirAdmin();
  if (erro) return { erro };

  const m = montar(d);
  if ("erro" in m) return { erro: m.erro };

  const { data, error } = await supabase
    .from("alimento")
    .update(m.linha)
    .eq("id", id)
    .select("id");

  if (error) {
    console.error("salvarAlimento:", error.message);
    return { erro: traduzir(error.message) };
  }
  // A RLS não dá erro quando recusa update: devolve zero linhas. É o caso de
  // alguém tentar editar um alimento da TACO pela API.
  if (!data?.length) return { erro: "Alimento da TACO não se edita." };

  revalidar();
  return { ok: true };
}

/**
 * Alimento não se apaga, se desativa (0018/0022): `item_alimentar` aponta
 * para ele. Fora de circulação some da busca do editor de dieta e continua
 * nas dietas que já usam.
 */
export async function alternarAlimento(id: string, ativo: boolean): Promise<Resultado> {
  const { supabase, erro } = await exigirAdmin();
  if (erro) return { erro };

  const { data, error } = await supabase
    .from("alimento")
    .update({ ativo })
    .eq("id", id)
    .select("id");

  if (error || !data?.length) {
    if (error) console.error("alternarAlimento:", error.message);
    return { erro: "Não consegui mudar agora. Tente de novo." };
  }

  revalidar();
  return { ok: true };
}

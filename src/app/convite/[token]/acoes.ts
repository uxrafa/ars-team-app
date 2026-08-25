"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoAceite = { erro?: string; aviso?: string };

/** Deixa as mensagens do Supabase em portugues e sem jargao. */
function traduzir(mensagem: string): string {
  const m = mensagem.toLowerCase();
  if (m.includes("user already registered") || m.includes("already been registered")) {
    return "Já existe conta com esse e-mail. Volte para a tela de entrada.";
  }
  if (m.includes("password should be at least")) return "A senha precisa de pelo menos 6 caracteres.";
  if (m.includes("weak password")) return "Escolha uma senha um pouco mais difícil.";
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Muitas tentativas seguidas. Espere um minuto e tente de novo.";
  }
  // O gatilho do banco recusa cadastro sem convite valido, e o GoTrue devolve
  // isso como erro generico de banco. Ver a migracao 0010.
  if (m.includes("database error")) {
    return "Este link não vale mais. Peça um novo para o Allisson.";
  }
  return "Não deu para criar sua conta agora. Tente de novo em instantes.";
}

/**
 * O aluno escolhe a senha e a conta nasce.
 *
 * Quem preenche plano, mensalidade e vencimento e o gatilho do banco, lendo
 * o convite pelo token que vai no metadata. A tela nao manda nada disso, e
 * de proposito: se mandasse, daria para forjar na chamada.
 */
export async function aceitarConvite(
  _anterior: EstadoAceite,
  dados: FormData,
): Promise<EstadoAceite> {
  const token = String(dados.get("token") ?? "").trim();
  const nome = String(dados.get("nome") ?? "").trim();
  const senha = String(dados.get("senha") ?? "");

  if (!token) return { erro: "Link incompleto. Abra de novo o link que o Allisson mandou." };
  if (!nome) return { erro: "Escreva seu nome." };
  if (senha.length < 6) return { erro: "A senha precisa de pelo menos 6 caracteres." };

  const supabase = await criarClienteServidor();

  const { data: achados, error: erroConvite } = await supabase.rpc("convite_por_token", {
    p_token: token,
  });

  if (erroConvite) {
    console.error("[aceitarConvite] rpc:", erroConvite.message);
    return { erro: "Não deu para conferir seu convite agora. Tente de novo em instantes." };
  }

  const convite = (achados ?? [])[0] as
    | { nome: string; email: string; tipo: "consultoria" | "planilha"; situacao: string }
    | undefined;

  if (!convite || convite.situacao !== "valido") {
    return { erro: "Este link não vale mais. Peça um novo para o Allisson." };
  }

  const { data, error } = await supabase.auth.signUp({
    email: convite.email,
    password: senha,
    options: { data: { nome, convite: token } },
  });

  if (error) {
    console.error("[aceitarConvite] signUp:", error.message);
    return { erro: traduzir(error.message) };
  }

  // Com a confirmacao de e-mail ligada, o cadastro nao devolve sessao na hora.
  if (!data.session) {
    return { aviso: "Conta criada. Abra o e-mail que enviamos para confirmar o acesso." };
  }

  revalidatePath("/", "layout");
  // Aluno de consultoria comeca pela anamnese, que e o que o Allisson precisa
  // ler para montar a ficha. Quem tem planilha vai direto para o treino.
  redirect(convite.tipo === "planilha" ? "/app" : "/anamnese");
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoForm = { erro?: string; aviso?: string };

/** Deixa as mensagens do Supabase em portugues e sem jargao. */
function traduzir(mensagem: string): string {
  const m = mensagem.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha nao conferem.";
  if (m.includes("email not confirmed")) return "Confirme o e-mail antes de entrar. O link foi enviado para voce.";
  if (m.includes("user already registered")) return "Ja existe uma conta com esse e-mail. Tente entrar.";
  if (m.includes("password should be at least")) return "A senha precisa de pelo menos 6 caracteres.";
  if (m.includes("rate limit") || m.includes("too many")) return "Muitas tentativas seguidas. Espere um minuto e tente de novo.";
  return "Nao deu para concluir agora. Tente de novo em instantes.";
}

export async function entrar(
  _anterior: EstadoForm,
  dados: FormData,
): Promise<EstadoForm> {
  const email = String(dados.get("email") ?? "").trim();
  const senha = String(dados.get("senha") ?? "");

  if (!email || !senha) return { erro: "Preencha e-mail e senha." };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (error) {
    // O usuario ve a mensagem tratada; o log do servidor guarda a original.
    console.error("[entrar]", error.message);
    return { erro: traduzir(error.message) };
  }

  revalidatePath("/", "layout");
  redirect("/app");
}

export async function cadastrar(
  _anterior: EstadoForm,
  dados: FormData,
): Promise<EstadoForm> {
  const nome = String(dados.get("nome") ?? "").trim();
  const email = String(dados.get("email") ?? "").trim();
  const senha = String(dados.get("senha") ?? "");

  if (!nome) return { erro: "Escreva seu nome." };
  if (!email || !senha) return { erro: "Preencha e-mail e senha." };
  if (senha.length < 6) return { erro: "A senha precisa de pelo menos 6 caracteres." };

  const supabase = await criarClienteServidor();

  // Cadastro publico fica fechado: so um admin logado pode criar conta para
  // outra pessoa. Isso protege mesmo que alguem chame esta acao direto, sem
  // passar pela tela (a tela nem mostra mais este formulario para quem nao
  // esta logado). Ate a entrega 2A ter tela de convite, a conta do aluno
  // nasce pelo painel da Supabase (Authentication > Users > Add user) ou
  // por SQL, e a pessoa so define a senha no primeiro acesso.
  const {
    data: { user: quemPede },
  } = await supabase.auth.getUser();

  if (!quemPede) {
    return { erro: "Cadastro fechado. Peca para o Allisson liberar seu acesso." };
  }

  const { data: perfilDeQuemPede } = await supabase
    .from("perfis")
    .select("tipo")
    .eq("id", quemPede.id)
    .single();

  if (perfilDeQuemPede?.tipo !== "admin") {
    return { erro: "Cadastro fechado. Peca para o Allisson liberar seu acesso." };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: { data: { nome } },
  });

  if (error) {
    console.error("[cadastrar]", error.message);
    return { erro: traduzir(error.message) };
  }

  // Com a confirmacao de e-mail ligada, o cadastro nao devolve sessao na hora.
  if (!data.session) {
    return { aviso: "Conta criada. Abra o e-mail que enviamos para confirmar o acesso." };
  }

  revalidatePath("/", "layout");
  redirect("/app");
}

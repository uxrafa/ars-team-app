"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

export type ResultadoAluno = { erro?: string; ok?: boolean };

export type DadosCobranca = {
  id: string;
  whatsapp: string;
  tipo: "consultoria" | "planilha";
  status: "ativo" | "carencia" | "suspenso";
  acesso_ate: string;
  mensalidade: string;
};

function paraNumero(valor: string): number | null {
  const limpo = String(valor ?? "").replace(/\./g, "").replace(",", ".").trim();
  if (!limpo) return null;
  const n = Number(limpo);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Guarda plano, status, vencimento e mensalidade de um aluno.
 *
 * A trava de verdade e dupla no banco: a RLS so deixa admin tocar em linha
 * alheia, e o gatilho da migracao 0009 impede que um aluno mexa nestes
 * campos nem na propria linha. A checagem aqui e para dar mensagem boa.
 */
export async function salvarCobranca(dados: DadosCobranca): Promise<ResultadoAluno> {
  const supabase = await criarClienteServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sua sessão expirou. Entre de novo." };

  const { data: quemPede } = await supabase
    .from("perfis")
    .select("tipo")
    .eq("id", user.id)
    .maybeSingle<{ tipo: string }>();

  if (quemPede?.tipo !== "admin") {
    return { erro: "Só o treinador pode alterar plano e cobrança." };
  }

  const mensalidade = paraNumero(dados.mensalidade);
  if (dados.mensalidade.trim() && mensalidade === null) {
    return { erro: "A mensalidade precisa ser um número. Ex.: 250 ou 250,00" };
  }
  if (mensalidade !== null && mensalidade > 100000) {
    return { erro: "Confira a mensalidade: o valor parece alto demais." };
  }

  const { error } = await supabase
    .from("perfis")
    .update({
      whatsapp: dados.whatsapp.trim() || null,
      tipo: dados.tipo,
      status: dados.status,
      acesso_ate: dados.acesso_ate || null,
      mensalidade,
    })
    .eq("id", dados.id);

  if (error) {
    console.error("salvarCobranca:", error.message);
    return { erro: "Não consegui salvar agora. Tente de novo em instantes." };
  }

  revalidatePath("/painel");
  revalidatePath("/painel/alunos");
  return { ok: true };
}

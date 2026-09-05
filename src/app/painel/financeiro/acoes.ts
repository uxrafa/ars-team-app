"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { hojeSP } from "@/lib/painel";
import { valorParaNumero, type FormaPagamento } from "@/lib/pagamento";

export type Resultado = { erro?: string; ok?: boolean };

export type DadosPagamento = {
  aluno_id: string;
  valor: string;
  recebido_em: string;
  meses: number;
  forma: FormaPagamento;
  observacao: string;
};

/**
 * Confere que quem chamou e o treinador.
 *
 * A trava de verdade e a RLS da migracao 0014: so admin tem policy de insert
 * e de update em `pagamento`. Isto aqui existe para a tela poder dizer o que
 * aconteceu em portugues, em vez de devolver erro cru do banco.
 */
async function admin() {
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
    return { supabase, erro: "Só o treinador registra pagamento." as const };
  }
  return { supabase, id: user.id };
}

/**
 * Grava um pagamento recebido.
 *
 * O `acesso_ate` do aluno NAO e escrito aqui. Quem move o vencimento e o
 * gatilho `ao_avancar_acesso`, no banco -- porque o webhook de um gateway
 * futuro vai inserir nesta mesma tabela sem passar por esta funcao, e a regra
 * tem que valer para os dois caminhos. Pelo mesmo motivo `competencia_de` e
 * `competencia_ate` nao sao enviados: o banco calcula.
 */
export async function registrarPagamento(dados: DadosPagamento): Promise<Resultado> {
  const { supabase, erro, id: quem } = await admin();
  if (erro) return { erro };

  if (!dados.aluno_id) return { erro: "Escolha de quem é o pagamento." };

  const valor = valorParaNumero(dados.valor);
  if (valor === null) return { erro: "O valor precisa ser um número maior que zero. Ex.: 250 ou 250,00" };
  if (valor > 100000) return { erro: "Confira o valor: parece alto demais." };

  if (!dados.recebido_em) return { erro: "Diga em que dia o dinheiro entrou." };
  if (dados.recebido_em > hojeSP()) return { erro: "A data do pagamento está no futuro." };

  if (!Number.isInteger(dados.meses) || dados.meses < 1 || dados.meses > 24) {
    return { erro: "O período precisa ser de 1 a 24 meses." };
  }

  const { error } = await supabase.from("pagamento").insert({
    aluno_id: dados.aluno_id,
    valor,
    recebido_em: dados.recebido_em,
    meses: dados.meses,
    forma: dados.forma,
    observacao: dados.observacao.trim() || null,
    registrado_por: quem,
  });

  if (error) {
    console.error("registrarPagamento:", error.message);
    return { erro: "Não consegui registrar agora. Tente de novo em instantes." };
  }

  revalidatePath("/painel");
  revalidatePath("/painel/financeiro");
  revalidatePath("/painel/alunos");
  revalidatePath(`/painel/alunos/${dados.aluno_id}`);
  return { ok: true };
}

/**
 * Estorna um pagamento. E o unico jeito de corrigir: o gatilho
 * `ao_corrigir_pagamento` recusa reescrever valor, data ou periodo.
 *
 * O vencimento volta sozinho para onde estava, e so se nenhum pagamento mais
 * novo tiver passado por cima -- quem decide isso e o banco, nao esta funcao.
 */
export async function estornarPagamento(id: string, motivo: string): Promise<Resultado> {
  const { supabase, erro } = await admin();
  if (erro) return { erro };

  if (!motivo.trim()) {
    return { erro: "Escreva o motivo do estorno. Daqui a seis meses ninguém vai lembrar." };
  }

  const { data, error } = await supabase
    .from("pagamento")
    .update({ estornado_em: new Date().toISOString(), estorno_motivo: motivo.trim() })
    .eq("id", id)
    .is("estornado_em", null)
    .select("aluno_id")
    .maybeSingle<{ aluno_id: string }>();

  if (error) {
    console.error("estornarPagamento:", error.message);
    return { erro: "Não consegui estornar agora. Tente de novo em instantes." };
  }
  if (!data) return { erro: "Esse pagamento já estava estornado." };

  revalidatePath("/painel");
  revalidatePath("/painel/financeiro");
  revalidatePath("/painel/alunos");
  revalidatePath(`/painel/alunos/${data.aluno_id}`);
  return { ok: true };
}

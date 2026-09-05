import { cache } from "react";
import { criarClienteServidor } from "@/lib/supabase/server";

export type PerfilDoAluno = {
  id: string;
  nome: string;
  email: string;
  whatsapp: string | null;
  tipo: "consultoria" | "planilha" | "admin";
  status: "ativo" | "carencia" | "suspenso";
  acesso_ate: string | null;
  mensalidade: number | null;
  criado_em: string;
};

/**
 * A linha do aluno, buscada UMA vez por requisicao.
 *
 * O layout precisa dela para o cabecalho, e cada aba precisa de algum pedaco:
 * o resumo queria as mesmas nove colunas, treinos e evolucao queriam so o
 * nome, a ficha queria quatro campos. Eram ate tres leituras identicas da
 * mesma linha para desenhar uma tela.
 *
 * `cache` do React memoriza pelo argumento dentro de uma requisicao so: layout
 * e page chamam a mesma funcao, o Supabase e consultado uma vez, e nada
 * vaza entre requisicoes de usuarios diferentes.
 */
export const carregarAluno = cache(async (id: string): Promise<PerfilDoAluno | null> => {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("perfis")
    .select("id, nome, email, whatsapp, tipo, status, acesso_ate, mensalidade, criado_em")
    .eq("id", id)
    .maybeSingle<PerfilDoAluno>();
  return data ?? null;
});

import { criarClienteServidor } from "@/lib/supabase/server";
import type { LinhaExercicio } from "@/lib/biblioteca";
import { Visao } from "./visao";

export const metadata = { title: "Biblioteca · ARS Team" };

export default async function Biblioteca() {
  const supabase = await criarClienteServidor();

  // 121 linhas cabem numa consulta só, e filtrar no navegador deixa a busca
  // instantânea enquanto ele digita. Se a biblioteca crescer muito, o corte
  // passa a ser no banco, com `ilike` e paginação.
  const { data } = await supabase
    .from("exercicio")
    // `instrucoes` fica de fora: e o campo mais gordo da tabela, nenhuma tela
    // da biblioteca le, e ia inteiro para o navegador nas 121 linhas.
    .select("id, nome, grupo, equipamento, video_url, ativo")
    .order("nome");

  return <Visao lista={(data ?? []) as LinhaExercicio[]} />;
}

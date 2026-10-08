import { criarClienteServidor } from "@/lib/supabase/server";
import type { LinhaAlimento } from "./linha";
import { Visao } from "./visao";

export const metadata = { title: "Alimentos · ARS Team" };

export default async function Alimentos() {
  const supabase = await criarClienteServidor();

  // ~600 linhas curtas (nome e três números) cabem numa consulta, e filtrar no
  // navegador deixa a busca instantânea, como na aba de exercícios. Os fora de
  // circulação vêm junto: é aqui que ele os traz de volta.
  const { data } = await supabase
    .from("alimento")
    .select("id, nome, grupo, origem, proteina_g, carboidrato_g, gordura_g, ativo")
    .order("nome")
    .limit(2000);

  // `numeric` volta do PostgREST como texto; a conta de kcal precisa de número.
  const lista = ((data ?? []) as LinhaAlimento[]).map((a) => ({
    ...a,
    proteina_g: Number(a.proteina_g),
    carboidrato_g: Number(a.carboidrato_g),
    gordura_g: Number(a.gordura_g),
  }));

  return <Visao lista={lista} />;
}

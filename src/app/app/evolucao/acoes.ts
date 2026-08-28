"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";
import { hojeSP } from "@/lib/painel";

export type Resultado = { erro?: string; ok?: boolean };

export type Medidas = {
  peso_kg: number | null;
  cintura_cm: number | null;
  quadril_cm: number | null;
  braco_cm: number | null;
  coxa_cm: number | null;
};

/**
 * Grava o registro do dia.
 *
 * Uma linha por dia, por constraint: pesar de novo à tarde corrige a manhã, e
 * não vira um segundo ponto no gráfico. Por isso é upsert e não insert.
 */
export async function registrarMedida(m: Medidas): Promise<Resultado> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sua sessão expirou. Entre de novo." };

  const algum = [m.peso_kg, m.cintura_cm, m.quadril_cm, m.braco_cm, m.coxa_cm].some(
    (v) => v !== null,
  );
  if (!algum) return { erro: "Preencha pelo menos um campo." };

  if (m.peso_kg !== null && (m.peso_kg < 25 || m.peso_kg > 400)) {
    return { erro: "Confira o peso: use algo entre 25 e 400 kg." };
  }

  // Campo em branco nao apaga o que ja estava la: o aluno pode ter registrado
  // o peso de manha e voltar a tarde so para pos a medida da cintura.
  const hoje = hojeSP();
  const { data: atual } = await supabase
    .from("medida_corporal")
    .select("peso_kg, cintura_cm, quadril_cm, braco_cm, coxa_cm")
    .eq("aluno_id", user.id)
    .eq("data", hoje)
    .maybeSingle<Medidas>();

  const juntas: Medidas = {
    peso_kg: m.peso_kg ?? atual?.peso_kg ?? null,
    cintura_cm: m.cintura_cm ?? atual?.cintura_cm ?? null,
    quadril_cm: m.quadril_cm ?? atual?.quadril_cm ?? null,
    braco_cm: m.braco_cm ?? atual?.braco_cm ?? null,
    coxa_cm: m.coxa_cm ?? atual?.coxa_cm ?? null,
  };

  const { error } = await supabase
    .from("medida_corporal")
    .upsert(
      { aluno_id: user.id, data: hoje, ...juntas, origem: "manual" },
      { onConflict: "aluno_id,data" },
    );

  if (error) return { erro: "Não consegui gravar. Tente de novo." };

  revalidatePath("/app/evolucao");
  return { ok: true };
}

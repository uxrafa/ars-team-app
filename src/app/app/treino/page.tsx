import Link from "next/link";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Cartao, Rotulo } from "@/components/ui";
import {
  carga as formatarCarga,
  exercicioCompleto,
  progresso,
  seriesPorExercicio,
} from "@/lib/treino";
import { carregarFichaAtiva, carregarSeries } from "../carregar";
import { Encerrar } from "./encerrar";

export const metadata = { title: "Treino · ARS Team" };

export default async function TreinoEmAndamento() {
  const supabase = await criarClienteServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: sessao } = await supabase
    .from("sessao_treino")
    .select("id, bloco_id, data")
    .eq("aluno_id", user?.id ?? "")
    .eq("status", "em_andamento")
    .maybeSingle<{ id: string; bloco_id: string | null; data: string }>();

  // Sem treino aberto não existe esta tela.
  if (!sessao) redirect("/app");

  const { blocos } = await carregarFichaAtiva(supabase, user?.id ?? "");
  const bloco = blocos.find((b) => b.id === sessao.bloco_id) ?? null;
  const series = await carregarSeries(supabase, sessao.id);

  // A ficha mudou embaixo do aluno enquanto ele treinava.
  if (!bloco) redirect("/app");

  const p = progresso(bloco, series);
  const feitasPor = seriesPorExercicio(series);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Rotulo>Treino em andamento</Rotulo>
        <h1 className="font-display text-[30px] uppercase leading-none tracking-wide">
          {bloco.nome}
        </h1>
        {bloco.foco && <p className="text-[15px] text-nevoa">{bloco.foco}</p>}

        <div className="mt-1 flex flex-col gap-2">
          <div className="h-1.5 overflow-hidden rounded-full bg-tinta-3" aria-hidden="true">
            <div
              className="h-full rounded-full bg-raio transition-[width] duration-300"
              style={{ width: `${Math.round(p.fracao * 100)}%` }}
            />
          </div>
          <p className="font-mono text-[13px] uppercase tabular tracking-wide text-nevoa">
            {p.feitos} de {p.total} exercícios · {p.seriesFeitas} de {p.seriesPrescritas} séries
          </p>
        </div>
      </header>

      <Cartao padding={false} className="overflow-hidden">
        <ul>
          {bloco.itens.map((item) => {
            const feitas = feitasPor.get(item.exercicio_id) ?? [];
            const completo = exercicioCompleto(item, feitas);
            const maior = feitas.reduce(
              (m, s) => (s.carga_kg !== null && s.carga_kg > m ? s.carga_kg : m),
              0,
            );

            return (
              <li key={item.id} className="border-t border-linha first:border-t-0">
                <Link
                  href={`/app/treino/${item.id}`}
                  className="flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-tinta-3"
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-8 w-8 flex-none items-center justify-center rounded-full border text-[13px] font-bold tabular ${
                      completo
                        ? "border-ok/50 bg-ok/15 text-ok"
                        : feitas.length
                          ? "border-alerta/50 bg-alerta/12 text-alerta"
                          : "border-contorno text-nevoa"
                    }`}
                  >
                    {feitas.length}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span
                      className={`block font-semibold ${completo ? "text-nevoa" : "text-papel"}`}
                    >
                      {item.nome}
                    </span>
                    <span className="mt-0.5 block font-mono text-[13px] tabular text-nevoa">
                      {item.series}x{item.reps}
                      {maior > 0 && ` · ${formatarCarga(maior)} kg`}
                    </span>
                  </span>

                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-5 w-5 flex-none text-nevoa"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </Link>
              </li>
            );
          })}
        </ul>
      </Cartao>

      <Encerrar seriesFeitas={p.seriesFeitas} />
    </div>
  );
}

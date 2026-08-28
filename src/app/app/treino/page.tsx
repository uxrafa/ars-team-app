import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import {
  carga as formatarCarga,
  exercicioCompleto,
  progresso,
  seriesPorExercicio,
} from "@/lib/treino";
import { carregarFichaAtiva, carregarSeries } from "../carregar";
import { LinhaDeExercicio, Meta } from "../pecas";
import { Titulo } from "../visao";
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

  // A ficha mudou embaixo do aluno enquanto ele treinava.
  if (!bloco) redirect("/app");

  const series = await carregarSeries(supabase, sessao.id);
  const p = progresso(bloco, series);
  const feitasPor = seriesPorExercicio(series);

  return (
    <div className="flex flex-col gap-3.5">
      <header>
        <Meta tom="raio">Treino em andamento</Meta>
        <div className="mt-1.5">
          <Titulo>{bloco.nome}</Titulo>
        </div>
        {bloco.foco && <p className="mt-1.5 text-[13.5px] text-nevoa">{bloco.foco}</p>}

        <div className="mt-3.5 flex flex-col gap-2">
          <div className="h-[3px] overflow-hidden rounded-sm bg-linha" aria-hidden="true">
            <div
              className="h-full bg-raio transition-[width] duration-300"
              style={{ width: `${Math.round(p.fracao * 100)}%` }}
            />
          </div>
          <Meta>
            {p.feitos} de {p.total} exercícios · {p.seriesFeitas} de {p.seriesPrescritas} séries
          </Meta>
        </div>
      </header>

      <section className="overflow-hidden rounded-2xl border border-linha bg-tinta-2">
        <ul>
          {bloco.itens.map((item) => {
            const feitas = feitasPor.get(item.exercicio_id) ?? [];
            const completo = exercicioCompleto(item, feitas);
            const maior = feitas.reduce(
              (m, s) => (s.carga_kg !== null && s.carga_kg > m ? s.carga_kg : m),
              0,
            );

            return (
              <LinhaDeExercicio
                key={item.id}
                href={`/app/treino/${item.id}`}
                nome={item.nome}
                grupo={item.grupo}
                temVideo={Boolean(item.video_url)}
                meta={
                  `${item.series} séries × ${item.reps} reps` +
                  (maior > 0 ? ` · ${formatarCarga(maior)} kg hoje` : "")
                }
                marca={
                  <span
                    aria-label={`${feitas.length} de ${item.series} séries`}
                    className={`flex h-8 w-8 flex-none items-center justify-center rounded-full border font-mono text-xs tabular ${
                      completo
                        ? "border-ok/50 bg-ok/15 text-ok"
                        : feitas.length
                          ? "border-alerta/50 bg-alerta/12 text-alerta"
                          : "border-linha text-nevoa"
                    }`}
                  >
                    {feitas.length}
                  </span>
                }
              />
            );
          })}
        </ul>
      </section>

      <Encerrar seriesFeitas={p.seriesFeitas} />
    </div>
  );
}

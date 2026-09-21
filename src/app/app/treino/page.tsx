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
import { prescricao } from "@/lib/prescricao";

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
            {p.feitos} de {p.total} exercícios
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
                  `${prescricao(item)}` +
                  (maior > 0 ? ` · ${formatarCarga(maior)} kg hoje` : "")
                }
                marca={
                  // Nada antes de começar: um "0" em cada linha parecia campo a
                  // preencher. Depois, só o andamento daquele exercício.
                  completo ? (
                    <span className="flex-none rounded-full bg-ok/15 px-2.5 py-1 text-xs font-semibold text-ok">
                      Feito
                    </span>
                  ) : feitas.length ? (
                    <span className="flex-none rounded-full bg-alerta/12 px-2.5 py-1 font-mono text-xs tabular text-alerta">
                      {feitas.length}/{item.series}
                    </span>
                  ) : null
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

import { Pilula } from "@/components/ui";
import { nomeDoEsforco, tomDoEsforco } from "@/lib/treino";
import {
  SEMANAS_NO_GRAFICO,
  emMilhar,
  mediaSemanal,
  tetoDoGrafico,
  variacaoDeVolume,
  type SemanaDeTreino,
} from "@/lib/aluno";

export type TreinoNaLista = {
  id: string;
  data: string;
  hora: string;
  bloco: string;
  esforco: number | null;
  nota: string | null;
  series: number;
  volumeKg: number;
};

/** Altura útil da barra mais alta, em pixels. */
const ALTURA_DA_BARRA = 120;

/**
 * Volume por semana, em barras.
 *
 * SVG não: são oito barras, e uma div faz o mesmo trabalho sem viewBox nem
 * escala. A altura vai em PIXEL e não em porcentagem: altura percentual dentro
 * de um item de flex que cresceu por `flex-1` não tem contra o que calcular, e
 * a barra sai com zero de altura. Foi o que aconteceu na primeira versão.
 *
 * A barra da semana sem treino continua desenhada, rente ao chão: é o buraco
 * que interessa ver.
 */
function Barras({ semanas }: { semanas: SemanaDeTreino[] }) {
  const teto = tetoDoGrafico(semanas);

  return (
    <div className="mt-5 flex items-end gap-2">
      {semanas.map((s) => {
        const altura =
          s.volumeKg > 0 ? Math.max(6, Math.round((s.volumeKg / teto) * ALTURA_DA_BARRA)) : 3;
        return (
          <div key={s.inicio} className="flex flex-1 flex-col items-center gap-2">
            <div
              className={`w-full rounded-t-md ${s.treinos > 0 ? "bg-raio-solido" : "bg-tinta-3"}`}
              style={{ height: altura }}
              title={
                s.treinos > 0
                  ? `${emMilhar(s.volumeKg)} kg em ${s.treinos} ${s.treinos === 1 ? "treino" : "treinos"}`
                  : "sem treino nesta semana"
              }
            />
            <span className="font-mono text-[11px] tabular text-nevoa-fraca">{s.rotulo}</span>
          </div>
        );
      })}
    </div>
  );
}

function Numero({
  rotulo,
  valor,
  detalhe,
}: {
  rotulo: string;
  valor: string;
  detalhe?: string | null;
}) {
  return (
    <div className="rounded-2xl border border-linha bg-tinta-2 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.07em] text-nevoa">{rotulo}</p>
      <p className="mt-3 font-display text-[34px] leading-none tabular">{valor}</p>
      {detalhe && <p className="mt-2 text-sm leading-snug text-nevoa">{detalhe}</p>}
    </div>
  );
}

export function VisaoDosTreinosDoAluno({
  semanas,
  treinos,
  primeiroNome,
}: {
  semanas: SemanaDeTreino[];
  treinos: TreinoNaLista[];
  primeiroNome: string;
}) {
  const variacao = variacaoDeVolume(semanas);
  const media = mediaSemanal(semanas);
  const ultimaComTreino = [...semanas].reverse().find((s) => s.treinos > 0) ?? null;

  if (treinos.length === 0) {
    return (
      <section className="rounded-2xl border border-linha bg-tinta-2 px-6 py-16 text-center">
        <p className="mx-auto max-w-[50ch] text-[15px] leading-relaxed text-nevoa">
          {primeiroNome} ainda não fechou nenhum treino. Assim que ele registrar o primeiro, o
          histórico e o gráfico de volume aparecem aqui.
        </p>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Numero
          rotulo="Volume na última semana"
          valor={ultimaComTreino ? `${emMilhar(ultimaComTreino.volumeKg)} kg` : "—"}
          detalhe={
            variacao === null
              ? null
              : variacao === 0
                ? "igual à semana anterior"
                : `${variacao > 0 ? "+" : ""}${variacao}% em relação à semana anterior`
          }
        />
        <Numero
          rotulo="Carga média por série"
          valor={ultimaComTreino?.intensidadeKg ? `${ultimaComTreino.intensidadeKg} kg` : "—"}
          detalhe="é a intensidade: sobe quando ele puxa mais peso, e não quando faz mais série"
        />
        <Numero
          rotulo="Treinos por semana"
          valor={media !== null ? String(media).replace(".", ",") : "—"}
          detalhe="média das semanas em que ele treinou"
        />
      </div>

      <section className="rounded-2xl border border-linha bg-tinta-2 p-5">
        <div className="flex flex-wrap items-baseline gap-3">
          <h2 className="text-lg font-bold">Volume por semana</h2>
          <span className="text-sm text-nevoa">
            últimas {SEMANAS_NO_GRAFICO} semanas · carga vezes repetições, somado
          </span>
        </div>

        <Barras semanas={semanas} />

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left">
            <thead>
              <tr className="bg-tinta-3">
                {["Semana", "Treinos", "Séries", "Volume", "Carga média", "Esforço"].map((t) => (
                  <th
                    key={t}
                    scope="col"
                    className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.07em] text-nevoa"
                  >
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...semanas].reverse().map((s) => (
                <tr key={s.inicio} className="border-t border-linha">
                  <td className="px-4 py-3 font-mono text-[13px] tabular text-papel">{s.rotulo}</td>
                  <td className="px-4 py-3 font-mono text-[13px] tabular text-nevoa">
                    {s.treinos || "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-[13px] tabular text-nevoa">
                    {s.series || "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-[13px] tabular text-papel">
                    {s.volumeKg ? `${emMilhar(s.volumeKg)} kg` : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-[13px] tabular text-nevoa">
                    {s.intensidadeKg ? `${s.intensidadeKg} kg` : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-[13px] tabular text-nevoa">
                    {s.esforcoMedio !== null ? String(s.esforcoMedio).replace(".", ",") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Histórico</h2>
        <ul className="overflow-hidden rounded-2xl border border-linha bg-tinta-2">
          {treinos.map((t) => (
            <li key={t.id} className="border-t border-linha px-5 py-4 first:border-t-0">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-[13px] tabular text-nevoa">{t.data}</span>
                <span className="text-[15px] font-semibold">{t.bloco}</span>
                <span className="text-sm text-nevoa">
                  {t.series > 0 ? `${t.series} séries` : "sem série registrada"}
                  {t.volumeKg > 0 ? ` · ${emMilhar(t.volumeKg)} kg` : ""}
                </span>
                <span className="ml-auto flex flex-wrap items-center gap-2">
                  {t.esforco !== null && (
                    <Pilula tom={tomDoEsforco(t.esforco)}>{nomeDoEsforco(t.esforco)}</Pilula>
                  )}
                  <span className="font-mono text-[13px] tabular text-nevoa">{t.hora}</span>
                </span>
              </div>

              {t.nota && (
                <p className="mt-3 rounded-xl border border-raio/35 bg-raio/[0.07] px-4 py-3 text-[15px] leading-relaxed text-papel">
                  {t.nota}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

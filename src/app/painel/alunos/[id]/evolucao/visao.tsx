import { carga, curtaComMes, type CargaQueSubiu } from "@/lib/treino";
import { GraficoDePeso, type Ponto } from "@/app/app/evolucao/grafico";

export type MedidaNaTela = {
  data: string;
  cintura_cm: number | null;
  quadril_cm: number | null;
  braco_cm: number | null;
  coxa_cm: number | null;
};

export type FotoNaTela = { data: string; angulo: string; url: string };

const MEDIDAS = [
  ["cintura_cm", "Cintura"],
  ["quadril_cm", "Quadril"],
  ["braco_cm", "Braço"],
  ["coxa_cm", "Coxa"],
] as const;

const ANGULOS = [
  ["frente", "Frente"],
  ["lado", "Lado"],
  ["costas", "Costas"],
] as const;

function Vazio({ texto }: { texto: string }) {
  return <p className="px-6 py-12 text-center text-[15px] leading-relaxed text-nevoa">{texto}</p>;
}

export function VisaoDaEvolucaoDoAluno({
  pontos,
  ultimaMedida,
  subiram,
  fotos,
  primeiroNome,
}: {
  pontos: Ponto[];
  ultimaMedida: MedidaNaTela | null;
  subiram: CargaQueSubiu[];
  fotos: FotoNaTela[];
  primeiroNome: string;
}) {
  const porData = new Map<string, FotoNaTela[]>();
  for (const f of fotos) {
    const lista = porData.get(f.data) ?? [];
    lista.push(f);
    porData.set(f.data, lista);
  }

  const temMedida = ultimaMedida && MEDIDAS.some(([c]) => ultimaMedida[c] !== null);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-linha bg-tinta-2 p-5">
          <h2 className="text-lg font-bold">Peso</h2>
          {pontos.length === 0 ? (
            <p className="mt-3 text-[15px] leading-relaxed text-nevoa">
              {primeiroNome} ainda não registrou peso.
            </p>
          ) : (
            <>
              <p className="mt-3 font-display text-[34px] leading-none tabular">
                {carga(pontos[pontos.length - 1].valor)}
                <span className="text-xl text-nevoa"> kg</span>
              </p>
              {pontos.length >= 2 ? (
                /* O SVG tem proporção fixa e altura travada, porque nasceu para
                   os 390px do celular. Num cartão largo ele ficaria centralizado
                   com folga dos dois lados, parecendo quebrado. A moldura prende
                   ele na largura de origem, e as datas acompanham. */
                <div className="max-w-[360px]">
                  <GraficoDePeso pontos={pontos} />
                  <div className="mt-1.5 flex justify-between">
                    <span className="font-mono text-[11px] text-nevoa">
                      {curtaComMes(pontos[0].data)}
                    </span>
                    <span className="font-mono text-[11px] text-nevoa">
                      {curtaComMes(pontos[pontos.length - 1].data)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-nevoa">Um registro só. A linha começa no segundo.</p>
              )}
            </>
          )}
        </section>

        <section className="rounded-2xl border border-linha bg-tinta-2 p-5">
          <h2 className="text-lg font-bold">Medidas (cm)</h2>
          {temMedida ? (
            <>
              <p className="mt-2 font-mono text-[13px] uppercase tabular text-nevoa">
                último registro · {curtaComMes(ultimaMedida.data)}
              </p>
              <dl className="mt-4 grid grid-cols-4 gap-3">
                {MEDIDAS.map(([chave, nome]) => (
                  <div key={chave}>
                    <dt className="text-sm text-nevoa">{nome}</dt>
                    <dd className="mt-1 font-mono text-[17px] tabular text-papel">
                      {ultimaMedida[chave] !== null ? carga(ultimaMedida[chave] as number) : "—"}
                    </dd>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <p className="mt-3 text-[15px] leading-relaxed text-nevoa">
              Nenhuma medida registrada ainda.
            </p>
          )}
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-linha bg-tinta-2">
        <h2 className="border-b border-linha px-5 py-4 text-lg font-bold">Cargas que subiram</h2>
        {subiram.length === 0 ? (
          <Vazio texto="Nenhuma carga subiu ainda, ou não há treino repetido suficiente para comparar." />
        ) : (
          <ul>
            {subiram.map((c) => (
              <li
                key={c.exercicio_id}
                className="flex items-center gap-3 border-t border-linha px-5 py-3.5 first:border-t-0"
              >
                <span className="min-w-0 flex-1 text-[15px] font-semibold">{c.nome}</span>
                <span className="flex-none font-mono text-[13px] tabular text-nevoa">
                  {carga(c.de)} kg
                </span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5 flex-none text-nevoa"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
                <span className="flex-none font-mono text-[13px] font-medium tabular text-ok">
                  {carga(c.para)} kg
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-linha bg-tinta-2">
        <h2 className="border-b border-linha px-5 py-4 text-lg font-bold">Fotos</h2>
        {porData.size === 0 ? (
          <Vazio
            texto={`${primeiroNome} ainda não enviou foto. Elas são opcionais na anamnese e podem ser enviadas depois, pela aba Evolução do app.`}
          />
        ) : (
          <div className="flex flex-col gap-6 p-5">
            {[...porData.entries()].map(([data, doDia]) => (
              <div key={data}>
                <p className="font-mono text-[13px] uppercase tabular text-nevoa">
                  {curtaComMes(data)}
                </p>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  {ANGULOS.map(([angulo, nome]) => {
                    const foto = doDia.find((f) => f.angulo === angulo);
                    return (
                      <figure key={angulo} className="flex flex-col gap-2">
                        {foto ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={foto.url}
                            alt={`${nome}, ${curtaComMes(data)}`}
                            className="aspect-[3/4] w-full rounded-xl border border-linha object-cover"
                          />
                        ) : (
                          <div className="flex aspect-[3/4] w-full items-center justify-center rounded-xl border border-dashed border-linha text-sm text-nevoa-fraca">
                            sem foto
                          </div>
                        )}
                        <figcaption className="text-sm text-nevoa">{nome}</figcaption>
                      </figure>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

import { Cartao, Pilula, Rotulo } from "@/components/ui";
import { carga as formatarCarga, curta, porExtenso, type CargaQueSubiu } from "@/lib/treino";
import { Titulo } from "../visao";
import { GraficoDePeso, type Ponto } from "./grafico";
import { RegistroDoDia } from "./registro";
import { Fotos, type FotoNaTela } from "./fotos";

export type LinhaMedida = {
  data: string;
  peso_kg: number | null;
  cintura_cm: number | null;
  quadril_cm: number | null;
  braco_cm: number | null;
  coxa_cm: number | null;
};

const MEDIDAS = [
  ["cintura_cm", "Cintura"],
  ["quadril_cm", "Quadril"],
  ["braco_cm", "Braço"],
  ["coxa_cm", "Coxa"],
] as const;

export function VisaoDaEvolucao({
  hoje,
  pontos,
  ultimaLinha,
  subiram,
  alunoId,
  fotos,
}: {
  hoje: string;
  pontos: Ponto[];
  ultimaLinha: LinhaMedida | null;
  subiram: CargaQueSubiu[];
  alunoId: string;
  fotos: FotoNaTela[];
}) {
  const primeiro = pontos[0] ?? null;
  const ultimo = pontos[pontos.length - 1] ?? null;
  const variacao = primeiro && ultimo ? ultimo.valor - primeiro.valor : null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Rotulo>{porExtenso(hoje)}</Rotulo>
        <Titulo>Evolução</Titulo>
      </header>

      <Cartao>
        <Rotulo>Peso atual</Rotulo>
        {/* Numero e pilula na mesma linha, com quebra: em tela de 390 a
            pilula comprida espremia o peso e ele quebrava no meio. */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="whitespace-nowrap font-mono text-[34px] leading-none tabular text-papel">
            {ultimo ? `${formatarCarga(ultimo.valor)} kg` : "-"}
          </p>
          {variacao !== null && Math.abs(variacao) >= 0.1 && (
            <Pilula tom={variacao < 0 ? "ok" : "neutro"}>
              {variacao > 0 ? "mais " : "menos "}
              {formatarCarga(Math.abs(variacao))} kg
            </Pilula>
          )}
        </div>
        {primeiro && ultimo && primeiro.data !== ultimo.data && (
          <p className="mt-2 font-mono text-[13px] tabular text-nevoa">
            desde {curta(primeiro.data)}
          </p>
        )}

        {pontos.length >= 2 ? (
          <div className="mt-4">
            <GraficoDePeso pontos={pontos} />
          </div>
        ) : (
          <p className="mt-3 text-[15px] leading-relaxed text-nevoa">
            O gráfico começa no segundo registro. Pese uma vez por semana, sempre no mesmo dia e
            horário, que a linha fica útil rápido.
          </p>
        )}

        {ultimaLinha && MEDIDAS.some(([c]) => ultimaLinha[c] !== null) && (
          <dl className="mt-5 grid grid-cols-4 gap-2 border-t border-linha pt-4">
            {MEDIDAS.map(([chave, nome]) => (
              <div key={chave}>
                <dt className="text-[13px] text-nevoa">{nome}</dt>
                <dd className="mt-0.5 font-mono text-[15px] tabular text-papel">
                  {ultimaLinha[chave] !== null
                    ? formatarCarga(Number(ultimaLinha[chave]))
                    : "-"}
                </dd>
              </div>
            ))}
            <div className="col-span-4">
              <dt className="sr-only">Unidade</dt>
              <dd className="mt-1 text-[13px] text-nevoa">medidas em centímetros</dd>
            </div>
          </dl>
        )}
      </Cartao>

      <RegistroDoDia jaRegistrou={ultimaLinha?.data === hoje} />

      {subiram.length > 0 && (
        <section className="flex flex-col gap-3">
          <Rotulo>Cargas que subiram</Rotulo>
          <ul className="overflow-hidden rounded-2xl border border-linha bg-tinta-2">
            {subiram.map((c) => (
              <li
                key={c.exercicio_id}
                className="flex items-center gap-3 border-t border-linha px-4 py-3 first:border-t-0"
              >
                <span className="min-w-0 flex-1 text-[15px] font-semibold">{c.nome}</span>
                <span className="flex-none font-mono text-[13px] tabular text-nevoa">
                  {formatarCarga(c.de)}
                </span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4 flex-none text-ok"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 19V5M6 11l6-6 6 6" />
                </svg>
                <span className="flex-none font-mono text-[15px] tabular text-ok">
                  {formatarCarga(c.para)} kg
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Fotos alunoId={alunoId} fotos={fotos} />
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { CLASSE_CAMPO } from "@/components/ui";
import {
  MAX_SERIES_NO_GRAFICO,
  coresDasSeries,
  kg,
  rotuloDaVariacao,
  variacaoPorSerie,
  type DiaDoExercicio,
  type ExercicioComHistorico,
} from "@/lib/evolucao";

/* Cores do cromo do grafico, tiradas dos tokens do globals.css. Ficam aqui em
   hex porque o SVG precisa delas como atributo, e nao como classe. */
const SUPERFICIE = "#101013"; // --tinta-2, o fundo do cartao
const GRADE = "#2a2a2e"; //      --linha: so divisoria, recessiva de proposito
const EIXO = "#807b78"; //       --nevoa-fraca: 4.54:1 sobre o cartao

const ALTURA = 200;
const M = { topo: 12, dir: 34, base: 28, esq: 40 };

function dataCurta(iso: string): string {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

/** Quatro marcas "redondas" no eixo: 0, 10, 20, 30, e nao 0, 8.3, 16.6. */
function marcas(min: number, max: number): number[] {
  if (min === max) {
    min = min - 1;
    max = max + 1;
  }
  const bruto = (max - min) / 4;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((p) => p >= bruto) ?? bruto;
  const inicio = Math.floor(min / passo) * passo;
  const fim = Math.ceil(max / passo) * passo;
  const lista: number[] = [];
  for (let v = inicio; v <= fim + passo / 1000; v += passo) lista.push(Math.round(v * 100) / 100);
  return lista;
}

/**
 * Um grafico de linhas, uma linha por serie.
 *
 * A largura e MEDIDA (ResizeObserver), e o SVG desenha em pixel de verdade.
 * Com viewBox fixo e `w-full`, o texto do eixo encolheria junto com a coluna
 * no notebook e cresceria no monitor grande; aqui ele fica sempre em 13px.
 */
function Linhas({
  titulo,
  unidade,
  dias,
  numeros,
  cores,
  valor,
  indice,
  aoApontar,
}: {
  titulo: string;
  unidade: string;
  dias: DiaDoExercicio[];
  numeros: number[];
  cores: readonly string[];
  valor: (d: DiaDoExercicio, numero: number) => number | null;
  indice: number | null;
  aoApontar: (i: number | null) => void;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(480);

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const obs = new ResizeObserver(([e]) => setLargura(Math.max(260, Math.round(e.contentRect.width))));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const valores = dias.flatMap((d) => numeros.map((n) => valor(d, n))).filter((v): v is number => v !== null);
  const semDado = valores.length === 0;

  const eixo = semDado ? [0, 1] : marcas(Math.min(...valores), Math.max(...valores));
  const piso = eixo[0];
  const teto = eixo[eixo.length - 1];

  const larguraUtil = largura - M.esq - M.dir;
  const alturaUtil = ALTURA - M.topo - M.base;

  // Eixo do tempo em data de verdade, como o grafico de peso: tres treinos numa
  // semana e um buraco de quinze dias TEM que parecer buraco.
  const tempos = dias.map((d) => Date.parse(`${d.data}T00:00:00Z`));
  const t0 = tempos[0];
  const t1 = tempos[tempos.length - 1];
  const x = (i: number) => (t1 === t0 ? M.esq + larguraUtil / 2 : M.esq + ((tempos[i] - t0) / (t1 - t0)) * larguraUtil);
  const y = (v: number) => M.topo + (1 - (v - piso) / (teto - piso || 1)) * alturaUtil;

  // Linha quebra onde falta valor: serie sem carga anotada nao vira zero.
  const caminhos = numeros.map((n) => {
    let d = "";
    let aberto = false;
    dias.forEach((dia, i) => {
      const v = valor(dia, n);
      if (v === null) {
        aberto = false;
        return;
      }
      d += `${aberto ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
      aberto = true;
    });
    return d.trim();
  });

  // Rotulo na ponta so quando cabe. Se duas pontas ficam a menos de 14px, a
  // skill manda nao empilhar: fica a legenda de cima, que sempre existe.
  const pontas = numeros
    .map((n, k) => {
      for (let i = dias.length - 1; i >= 0; i--) {
        const v = valor(dias[i], n);
        if (v !== null) return { n, k, py: y(v), px: x(i) };
      }
      return null;
    })
    .filter((p): p is { n: number; k: number; py: number; px: number } => p !== null);
  const ordenadas = [...pontas].sort((a, b) => a.py - b.py);
  const cabem = numeros.length > 1 && ordenadas.every((p, i) => i === 0 || p.py - ordenadas[i - 1].py >= 14);

  // Datas no eixo: a primeira e a ultima sempre, e as do meio que couberem
  // com 56px de folga. Passada gulosa da esquerda para a direita.
  const todasX = dias.map((d, i) => ({ i, texto: dataCurta(d.data), px: x(i) }));
  const ultimoX = todasX[todasX.length - 1];
  const rotulosX: typeof todasX = [];
  todasX.forEach((r, idx) => {
    const anterior = rotulosX[rotulosX.length - 1];
    if (idx === 0) {
      rotulosX.push(r);
    } else if (r === ultimoX) {
      // A ultima data sempre aparece; se colar na do meio anterior, sai a do meio.
      if (rotulosX.length > 1 && r.px - anterior.px < 56) rotulosX.pop();
      // Com duas datas ou mais, a primeira e a ultima estao nas duas pontas
      // do eixo e nunca colam uma na outra.
      rotulosX.push(r);
    } else if (r.px - anterior.px >= 56 && ultimoX.px - r.px >= 56) {
      rotulosX.push(r);
    }
  });

  function perto(clienteX: number, alvo: SVGSVGElement) {
    const caixaSvg = alvo.getBoundingClientRect();
    const px = clienteX - caixaSvg.left;
    let melhor = 0;
    let distancia = Infinity;
    dias.forEach((_, i) => {
      const dd = Math.abs(x(i) - px);
      if (dd < distancia) {
        distancia = dd;
        melhor = i;
      }
    });
    return melhor;
  }

  function teclado(e: KeyboardEvent<SVGSVGElement>) {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const atual = indice ?? (e.key === "ArrowRight" ? -1 : dias.length);
      const proximo = Math.max(0, Math.min(dias.length - 1, atual + (e.key === "ArrowRight" ? 1 : -1)));
      aoApontar(proximo);
    }
    if (e.key === "Escape") aoApontar(null);
  }

  const diaApontado = indice !== null ? dias[indice] : null;
  const tooltipX = indice !== null ? x(indice) : 0;
  const tooltipDaDireita = tooltipX > largura / 2;

  return (
    <div className="min-w-0">
      <p className="text-sm font-semibold text-nevoa">
        {titulo}
        {unidade && <span className="font-normal"> · {unidade}</span>}
      </p>

      <div ref={caixa} className="relative mt-2">
        <svg
          width={largura}
          height={ALTURA}
          role="img"
          aria-label={`${titulo} por série em ${dias.length} ${dias.length === 1 ? "treino" : "treinos"}. Use as setas para ver cada dia; os valores também estão na tabela.`}
          tabIndex={0}
          onKeyDown={teclado}
          onBlur={() => aoApontar(null)}
          onPointerMove={(e) => aoApontar(perto(e.clientX, e.currentTarget))}
          onPointerLeave={() => aoApontar(null)}
          className="block touch-pan-y rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-raio-forte focus-visible:ring-offset-2 focus-visible:ring-offset-tinta-2"
        >
          {/* grade e eixo: hairline, recessivos. So o dado pode ser alto. */}
          {eixo.map((v) => (
            <g key={v}>
              <line x1={M.esq} x2={largura - M.dir} y1={y(v)} y2={y(v)} stroke={GRADE} strokeWidth={1} />
              <text x={M.esq - 8} y={y(v)} dy="0.35em" textAnchor="end" fontSize={13} fill={EIXO} className="font-mono tabular">
                {kg(v)}
              </text>
            </g>
          ))}

          {rotulosX.map((r) => (
            <text key={r.i} x={r.px} y={ALTURA - 8} textAnchor="middle" fontSize={13} fill={EIXO} className="font-mono tabular">
              {r.texto}
            </text>
          ))}

          {indice !== null && (
            <line x1={x(indice)} x2={x(indice)} y1={M.topo} y2={ALTURA - M.base} stroke={EIXO} strokeWidth={1} />
          )}

          {caminhos.map((d, k) =>
            d.includes("L") ? (
              <path key={numeros[k]} d={d} fill="none" stroke={cores[k]} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            ) : null,
          )}

          {/* Marcador de 8px com anel de 2px da cor do cartao: fica legivel
              onde uma linha cruza a outra. */}
          {numeros.map((n, k) =>
            dias.map((dia, i) => {
              const v = valor(dia, n);
              if (v === null) return null;
              return (
                <circle
                  key={`${n}-${i}`}
                  cx={x(i)}
                  cy={y(v)}
                  r={indice === i ? 5 : 4}
                  fill={cores[k]}
                  stroke={SUPERFICIE}
                  strokeWidth={2}
                />
              );
            }),
          )}

          {cabem &&
            pontas.map((p) => (
              <text key={p.n} x={p.px + 10} y={p.py} dy="0.35em" fontSize={13} fill="#a9a5a2" className="font-mono">
                S{p.n}
              </text>
            ))}
        </svg>

        {diaApontado && (
          <div
            role="status"
            className="pointer-events-none absolute top-2 z-10 min-w-[132px] rounded-xl border border-contorno bg-tinta-3 px-3 py-2.5 shadow-lg"
            style={tooltipDaDireita ? { right: largura - tooltipX + 12 } : { left: tooltipX + 12 }}
          >
            <p className="font-mono text-[13px] text-nevoa">{dataCurta(diaApontado.data)}</p>
            <ul className="mt-1.5 flex flex-col gap-1">
              {numeros.map((n, k) => {
                const v = valor(diaApontado, n);
                const r = diaApontado.series.find((x) => x.numero === n)?.reps ?? null;
                return (
                  <li key={n} className="flex items-center gap-2 text-sm">
                    <span aria-hidden="true" className="h-0.5 w-3 flex-none rounded-full" style={{ background: cores[k] }} />
                    {/* As repetições vivem aqui desde 21/09: o gráfico de
                        reps saiu, em nome do "o mais simples". */}
                    <span className="font-mono font-semibold tabular text-papel">
                      {v === null ? "—" : `${kg(v)} kg`}
                      {r !== null && <span className="font-normal text-nevoa"> × {r}</span>}
                    </span>
                    <span className="text-nevoa">S{n}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * "Um exercício ao longo do tempo", o primeiro dos quatro gráficos combinados
 * depois da call de 20/09.
 *
 * UM SELETOR, UMA FRASE E UM GRÁFICO. A primeira versão tinha carga e
 * repetições lado a lado, com a faixa da ficha sombreada -- cinco elementos
 * para uma pergunta só. Em 21/09 o Rafael firmou o princípio do "mais simples,
 * nunca informação demais", e ficou só a carga. As repetições continuam a um
 * gesto: no passar do mouse ("40 kg × 10") e na tabela recolhida.
 */
export function EvolucaoPorExercicio({ exercicios }: { exercicios: ExercicioComHistorico[] }) {
  const [escolhido, setEscolhido] = useState(exercicios[0]?.exercicio_id ?? "");
  const [indice, setIndice] = useState<number | null>(null);

  const e = exercicios.find((x) => x.exercicio_id === escolhido) ?? exercicios[0];
  if (!e) return null;

  const numeros = e.numeros.slice(0, MAX_SERIES_NO_GRAFICO);
  const cores = coresDasSeries(numeros.length);
  const variacoes = variacaoPorSerie(e);
  const sobrando = e.numeros.length - numeros.length;

  const carga = (d: DiaDoExercicio, n: number) => d.series.find((s) => s.numero === n)?.carga ?? null;

  return (
    <section className="rounded-2xl border border-linha bg-tinta-2 p-5">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <div className="mr-auto">
          <h2 className="text-lg font-bold">Evolução por exercício</h2>
          {variacoes.length > 0 && (
            <p className="mt-1 text-sm text-nevoa">
              Desde {dataCurta(e.dias[0].data)}:{" "}
              <span className="font-mono tabular text-papel">{variacoes.map(rotuloDaVariacao).join(" · ")}</span>
            </p>
          )}
        </div>

        {/* Filtro numa linha so, acima dos graficos, e fora deles. */}
        <label className="flex w-full flex-col gap-1.5 sm:w-80">
          <span className="sr-only">Exercício</span>
          <select
            value={e.exercicio_id}
            onChange={(ev) => {
              setEscolhido(ev.target.value);
              setIndice(null);
            }}
            className={CLASSE_CAMPO}
          >
            {exercicios.map((x) => (
              <option key={x.exercicio_id} value={x.exercicio_id}>
                {x.nome}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Legenda sempre que houver duas séries ou mais. Chave de linha, e não
          quadrado, porque a marca é linha. */}
      {numeros.length > 1 && (
        <ul className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-nevoa">
          {numeros.map((n, k) => (
            <li key={n} className="flex items-center gap-2">
              <span aria-hidden="true" className="h-0.5 w-4 rounded-full" style={{ background: cores[k] }} />
              Série {n}
            </li>
          ))}
        </ul>
      )}

      {e.dias.length === 1 && (
        <p className="mt-4 text-sm text-nevoa">Um treino só até aqui. A linha aparece a partir do segundo.</p>
      )}

      <div className="mt-4">
        <Linhas titulo="Carga" unidade="kg" dias={e.dias} numeros={numeros} cores={cores} valor={carga} indice={indice} aoApontar={setIndice} />
      </div>

      {/* A tabela nunca esconde nada: é onde vivem a sexta série em diante e
          qualquer valor que o gráfico só mostra no passar do mouse. */}
      <details className="mt-5 rounded-xl border border-linha">
        <summary className="flex min-h-11 cursor-pointer items-center px-4 text-[15px] font-semibold">
          Ver em tabela
          {sobrando > 0 && <span className="ml-2 font-normal text-nevoa">({sobrando} série a mais que o gráfico)</span>}
        </summary>
        <div className="overflow-x-auto border-t border-linha">
          <table className="w-full min-w-[420px] border-collapse text-left">
            <thead>
              <tr className="bg-tinta-3">
                <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.07em] text-nevoa">Dia</th>
                {e.numeros.map((n) => (
                  <th key={n} scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.07em] text-nevoa">
                    Série {n}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...e.dias].reverse().map((d) => (
                <tr key={d.data} className="border-t border-linha">
                  <td className="px-4 py-3 font-mono text-[13px] tabular text-papel">{dataCurta(d.data)}</td>
                  {e.numeros.map((n) => {
                    const s = d.series.find((x) => x.numero === n);
                    return (
                      <td key={n} className="px-4 py-3 font-mono text-[13px] tabular text-nevoa">
                        {!s ? "—" : `${s.carga !== null ? `${kg(s.carga)} kg` : "—"} × ${s.reps ?? "—"}`}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

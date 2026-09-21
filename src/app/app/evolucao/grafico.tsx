"use client";

import { useState } from "react";
import { carga, curta, curtaComMes } from "@/lib/treino";
import { indiceMaisProximo, type PontoDePeso } from "@/lib/medidas";

export type Ponto = PontoDePeso;

/**
 * Peso ao longo do tempo, com cada pesagem marcada.
 *
 * SVG escrito na mão, sem biblioteca de gráfico: são poucos pontos e o desenho
 * é uma linha. Uma dependência de 60 kB para isso sairia caro no 4G da
 * academia. O eixo do tempo respeita a data de verdade e não a posição na
 * lista, então quem pesou três vezes numa semana e sumiu num mês vê o buraco.
 *
 * Até 21/09 só o último ponto aparecia, e o aluno não tinha como ver quanto
 * pesava antes. Agora cada pesagem é um ponto, e tocar em qualquer lugar do
 * gráfico mostra a mais próxima na linha de cima.
 */
export function GraficoDePeso({ pontos }: { pontos: Ponto[] }) {
  const [escolhido, setEscolhido] = useState(pontos.length - 1);

  if (pontos.length < 2) return null;

  const L = 330;
  const A = 110;

  const valores = pontos.map((p) => p.valor);
  const menor = Math.min(...valores);
  const maior = Math.max(...valores);
  // Faixa mínima de 2 kg: sem isso, variação de 200 g vira montanha.
  const meio = (menor + maior) / 2;
  const metade = Math.max((maior - menor) / 2, 1);
  const piso = meio - metade * 1.35;
  const teto = meio + metade * 1.35;

  const tempos = pontos.map((p) => Date.parse(`${p.data}T00:00:00Z`));
  const t0 = tempos[0];
  const t1 = tempos[tempos.length - 1];

  const x = (t: number) => (t1 === t0 ? L : ((t - t0) / (t1 - t0)) * L);
  const y = (v: number) => 8 + (1 - (v - piso) / (teto - piso)) * (A - 16);

  const xs = tempos.map(x);
  const pares = pontos.map((p, i) => `${xs[i].toFixed(1)},${y(p.valor).toFixed(1)}`);
  const linha = `M${pares.join(" L")}`;
  const area = `${linha} L${L},${A} L0,${A} Z`;

  const i = Math.min(escolhido, pontos.length - 1);
  const atual = pontos[i];
  // Com muitas pesagens, bolinha em todas vira uma lagarta; a partir de 40
  // fica só a linha e a bolinha da escolhida.
  const marcarTodos = pontos.length <= 40;

  function escolherPeloToque(e: React.PointerEvent<SVGSVGElement>) {
    const svg = e.currentTarget;
    const matriz = svg.getScreenCTM();
    if (!matriz) return;
    const p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    setEscolhido(indiceMaisProximo(xs, p.matrixTransform(matriz.inverse()).x));
  }

  return (
    <div className="mt-4">
      {/* aria-live: quem usa leitor de tela ouve a pesagem ao mudar com as setas. */}
      <p aria-live="polite" className="flex items-baseline justify-between text-[13px]">
        <span className="font-mono text-nevoa">{curtaComMes(atual.data)}</span>
        <span className="font-semibold text-papel">{carga(atual.valor)} kg</span>
      </p>

      <svg
        viewBox={`0 0 ${L} ${A}`}
        className="mt-2 h-[110px] w-full touch-none overflow-visible outline-none focus-visible:ring-2 focus-visible:ring-raio/60"
        role="img"
        tabIndex={0}
        aria-label={`Peso de ${carga(pontos[0].valor)} kg em ${curta(pontos[0].data)} a ${carga(pontos[pontos.length - 1].valor)} kg em ${curta(pontos[pontos.length - 1].data)}. Use as setas para ver cada pesagem.`}
        onPointerDown={escolherPeloToque}
        onPointerMove={(e) => {
          // No celular só o dedo arrastando; no computador, passar o mouse.
          if (e.pointerType === "mouse" || e.buttons) escolherPeloToque(e);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setEscolhido(Math.max(0, i - 1));
          if (e.key === "ArrowRight") setEscolhido(Math.min(pontos.length - 1, i + 1));
        }}
      >
        <defs>
          <linearGradient id="sombra-peso" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f23026" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#f23026" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={area} fill="url(#sombra-peso)" />
        <line
          x1={xs[i]}
          x2={xs[i]}
          y1={0}
          y2={A}
          stroke="#605e60"
          strokeWidth="1"
          strokeDasharray="3 3"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={linha}
          fill="none"
          stroke="#f23026"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {marcarTodos &&
          pontos.map((p, k) =>
            k === i ? null : (
              <circle
                key={p.data}
                cx={xs[k]}
                cy={y(p.valor)}
                r="3"
                fill="#101013"
                stroke="#f23026"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            ),
          )}
        <circle
          cx={xs[i]}
          cy={y(atual.valor)}
          r="5.5"
          fill="#f23026"
          stroke="#101013"
          strokeWidth="2.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

import { carga, curta } from "@/lib/treino";

export type Ponto = { data: string; valor: number };

/**
 * Peso ao longo do tempo.
 *
 * SVG escrito na mão, sem biblioteca de gráfico: são poucos pontos e o desenho
 * é uma linha. Uma dependência de 60 kB para isso sairia caro no 4G da
 * academia. O eixo do tempo respeita a data de verdade e não a posição na
 * lista, então quem pesou três vezes numa semana e sumiu num mês vê o buraco.
 *
 * As datas das pontas ficam fora do SVG, no cartão, como no artboard.
 */
export function GraficoDePeso({ pontos }: { pontos: Ponto[] }) {
  if (pontos.length < 2) return null;

  const L = 330;
  const A = 84;

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
  const y = (v: number) => 6 + (1 - (v - piso) / (teto - piso)) * (A - 12);

  const pares = pontos.map((p, i) => `${x(tempos[i]).toFixed(1)},${y(p.valor).toFixed(1)}`);
  const linha = `M${pares.join(" L")}`;
  const area = `${linha} L${L},${A} L0,${A} Z`;
  const ultimo = pontos[pontos.length - 1];

  return (
    <svg
      viewBox={`0 0 ${L} ${A}`}
      className="mt-3.5 h-[84px] w-full overflow-visible"
      role="img"
      aria-label={`Peso de ${carga(pontos[0].valor)} kg em ${curta(pontos[0].data)} a ${carga(ultimo.valor)} kg em ${curta(ultimo.data)}`}
    >
      <defs>
        <linearGradient id="sombra-peso" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f23026" stopOpacity="0.26" />
          <stop offset="100%" stopColor="#f23026" stopOpacity="0" />
        </linearGradient>
      </defs>

      <path d={area} fill="url(#sombra-peso)" />
      <path
        d={linha}
        fill="none"
        stroke="#f23026"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={x(t1)}
        cy={y(ultimo.valor)}
        r="4.5"
        fill="#f23026"
        stroke="#0b0b0c"
        strokeWidth="2.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

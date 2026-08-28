import { carga, curta } from "@/lib/treino";

export type Ponto = { data: string; valor: number };

/**
 * Peso ao longo do tempo.
 *
 * SVG escrito na mão, sem biblioteca de gráfico: são poucos pontos, o desenho
 * é uma linha, e uma dependência de 60 kB para isso sairia caro no 4G da
 * academia. O eixo do tempo respeita a data de verdade, e não a posição na
 * lista: quem pesou três vezes numa semana e sumiu num mês precisa ver o
 * buraco.
 */
export function GraficoDePeso({ pontos }: { pontos: Ponto[] }) {
  if (pontos.length < 2) return null;

  const L = 320;
  const A = 130;
  const margem = { cima: 14, baixo: 22, lado: 6 };

  const valores = pontos.map((p) => p.valor);
  const menor = Math.min(...valores);
  const maior = Math.max(...valores);
  // Faixa mínima de 2 kg: sem isso, variação de 200 g vira montanha.
  const meio = (menor + maior) / 2;
  const metade = Math.max((maior - menor) / 2, 1);
  const piso = meio - metade * 1.25;
  const teto = meio + metade * 1.25;

  const tempos = pontos.map((p) => Date.parse(`${p.data}T00:00:00Z`));
  const t0 = tempos[0];
  const t1 = tempos[tempos.length - 1];
  const larguraUtil = L - margem.lado * 2;
  const alturaUtil = A - margem.cima - margem.baixo;

  const x = (t: number) => margem.lado + (t1 === t0 ? larguraUtil : ((t - t0) / (t1 - t0)) * larguraUtil);
  const y = (v: number) => margem.cima + (1 - (v - piso) / (teto - piso)) * alturaUtil;

  const coordenadas = pontos.map((p, i) => `${x(tempos[i]).toFixed(1)},${y(p.valor).toFixed(1)}`);
  const linha = `M${coordenadas.join(" L")}`;
  const area = `${linha} L${x(t1).toFixed(1)},${(A - margem.baixo).toFixed(1)} L${x(t0).toFixed(1)},${(A - margem.baixo).toFixed(1)} Z`;

  const ultimo = pontos[pontos.length - 1];

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${L} ${A}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Peso de ${carga(pontos[0].valor)} kg em ${curta(pontos[0].data)} a ${carga(ultimo.valor)} kg em ${curta(ultimo.data)}`}
      >
        <defs>
          <linearGradient id="sombra-peso" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-raio)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--color-raio)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <line
          x1={margem.lado}
          x2={L - margem.lado}
          y1={A - margem.baixo}
          y2={A - margem.baixo}
          stroke="var(--color-linha)"
          strokeWidth="1"
        />

        <path d={area} fill="url(#sombra-peso)" />
        <path
          d={linha}
          fill="none"
          stroke="var(--color-raio)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {pontos.map((p, i) => (
          <circle
            key={p.data}
            cx={x(tempos[i])}
            cy={y(p.valor)}
            r={i === pontos.length - 1 ? 4 : 2.5}
            fill={i === pontos.length - 1 ? "var(--color-raio)" : "var(--color-tinta)"}
            stroke="var(--color-raio)"
            strokeWidth="1.5"
          />
        ))}

        <text
          x={margem.lado}
          y={A - 6}
          fill="var(--color-nevoa)"
          fontSize="11"
          fontFamily="var(--font-mono)"
        >
          {curta(pontos[0].data)}
        </text>
        <text
          x={L - margem.lado}
          y={A - 6}
          textAnchor="end"
          fill="var(--color-nevoa)"
          fontSize="11"
          fontFamily="var(--font-mono)"
        >
          {curta(ultimo.data)}
        </text>
      </svg>
    </figure>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Aviso } from "@/components/ui";
import { NOME_DO_METODO, emMinutos } from "@/lib/ficha";
import {
  carga as formatarCarga,
  paraCarga,
  paraReps,
  type ItemDoTreino,
  type SerieFeita,
} from "@/lib/treino";
import { CartaoDeNumero, Meta } from "../../pecas";
import { apagarSerie, registrarSerie } from "../../acoes";

type Feita = { numero: number; carga_kg: number | null; reps: number | null };
type Campo = { carga: string; reps: string };

const GRUPO: Record<string, string> = {
  peito: "Peito",
  costas: "Costas",
  pernas: "Pernas",
  ombro: "Ombro",
  biceps: "Bíceps",
  triceps: "Tríceps",
  abdomen: "Abdômen",
  cardio: "Cardio",
  mobilidade: "Mobilidade",
  outros: "Geral",
};

/** Grade das séries: número, carga, reps, botão. É a do artboard. */
const GRADE = "grid grid-cols-[34px_1fr_1fr_44px] items-center gap-2";

function relogio(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * A tela onde o treino acontece.
 *
 * Tudo aqui é para ser usado de pé, com uma mão, entre uma série e outra:
 * campo grande, um toque para gravar, e o descanso começando sozinho assim que
 * a série entra. A carga já vem preenchida com a da última vez, porque ninguém
 * lembra de cabeça quanto pôs no aparelho semana passada.
 */
export function Execucao({
  item,
  blocoNome,
  posicao,
  total,
  anteriorId,
  proximoId,
  proximoNome,
  feitas,
  ultimaVez,
  quandoUltimaVez,
  videoId,
}: {
  item: ItemDoTreino;
  blocoNome: string;
  posicao: number;
  total: number;
  anteriorId: string | null;
  proximoId: string | null;
  proximoNome: string | null;
  feitas: SerieFeita[];
  ultimaVez: { data: string; series: Feita[] } | null;
  quandoUltimaVez: string | null;
  videoId: string | null;
}) {
  const numeros = Array.from({ length: item.series }, (_, i) => i + 1);

  const [gravadas, setGravadas] = useState<Record<number, Feita>>(() =>
    Object.fromEntries(feitas.map((s) => [s.numero, s])),
  );

  const [campos, setCampos] = useState<Record<number, Campo>>(() => {
    const jaFeitas = new Map(feitas.map((s) => [s.numero, s]));
    const anteriores = new Map((ultimaVez?.series ?? []).map((s) => [s.numero, s]));
    // A última série da vez passada serve de palpite para as que ela não tem.
    const ultima = ultimaVez?.series.at(-1) ?? null;

    return Object.fromEntries(
      numeros.map((n) => {
        const fonte = jaFeitas.get(n) ?? anteriores.get(n) ?? ultima;
        return [
          n,
          {
            carga: formatarCarga(fonte?.carga_kg ?? null),
            reps: fonte?.reps !== null && fonte?.reps !== undefined ? String(fonte.reps) : "",
          },
        ];
      }),
    );
  });

  const [erro, setErro] = useState<string | null>(null);
  const [ocupada, setOcupada] = useState<number | null>(null);
  const [, agir] = useTransition();
  const [tocando, setTocando] = useState(false);

  /* --- descanso ------------------------------------------------------ */
  const [fim, setFim] = useState<number | null>(null);
  const [agora, setAgora] = useState(() => Date.now());
  const avisou = useRef(false);

  useEffect(() => {
    if (fim === null) return;
    const id = setInterval(() => setAgora(Date.now()), 250);
    return () => clearInterval(id);
  }, [fim]);

  const restam = fim === null ? null : Math.max(0, Math.ceil((fim - agora) / 1000));
  const fracaoDoDescanso =
    restam === null || item.descanso_seg <= 0 ? 0 : restam / item.descanso_seg;

  useEffect(() => {
    if (restam === 0 && !avisou.current) {
      avisou.current = true;
      // Vibrar é o único aviso que funciona com fone de ouvido na academia.
      try {
        navigator.vibrate?.([120, 80, 120]);
      } catch {
        // Navegador sem vibração. O relógio na tela já diz que acabou.
      }
    }
  }, [restam]);

  function mudar(numero: number, chave: keyof Campo, valor: string) {
    setCampos((c) => ({ ...c, [numero]: { ...c[numero], [chave]: valor } }));
    setErro(null);
  }

  function gravar(numero: number) {
    const campo = campos[numero] ?? { carga: "", reps: "" };
    const temCarga = campo.carga.trim() !== "";
    const temReps = campo.reps.trim() !== "";
    const cargaKg = temCarga ? paraCarga(campo.carga) : null;
    const reps = temReps ? paraReps(campo.reps) : null;

    if (temCarga && cargaKg === null) {
      setErro("Confira a carga: só número, até 999.");
      return;
    }
    if (temReps && reps === null) {
      setErro("Confira as repetições: número inteiro, até 500.");
      return;
    }

    setErro(null);
    setOcupada(numero);
    agir(async () => {
      const r = await registrarSerie(item.id, numero, cargaKg, reps);
      setOcupada(null);
      if (r.erro || !r.serie) {
        setErro(r.erro ?? "Não consegui gravar a série.");
        return;
      }
      setGravadas((g) => ({ ...g, [numero]: r.serie! }));
      if (item.descanso_seg > 0 && numero < item.series) {
        avisou.current = false;
        setAgora(Date.now());
        setFim(Date.now() + item.descanso_seg * 1000);
      }
    });
  }

  function desfazer(numero: number) {
    setOcupada(numero);
    agir(async () => {
      const r = await apagarSerie(item.exercicio_id, numero);
      setOcupada(null);
      if (r.erro) {
        setErro(r.erro);
        return;
      }
      setGravadas((g) => {
        const copia = { ...g };
        delete copia[numero];
        return copia;
      });
    });
  }

  const proximaAberta = numeros.find((n) => !gravadas[n]) ?? null;
  const caixa =
    "h-11 w-full rounded-[11px] border border-linha bg-tinta-2 px-3 text-center text-base tabular";

  return (
    <div
      className={`relative -mx-5 -mt-5 flex flex-col ${
        restam === null ? "pb-[110px]" : "pb-[190px]"
      }`}
    >
      {/* ---------------------------------------------------------- */}
      {/* Capa: vídeo, volta e posição                                */}
      {/* ---------------------------------------------------------- */}
      {tocando && videoId ? (
        <div className="relative aspect-video w-full bg-tinta-2">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1`}
            title={`Execução de ${item.nome}`}
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full border-0"
          />
        </div>
      ) : (
        <div
          className="relative flex h-[172px] w-full items-center justify-center overflow-hidden"
          style={{
            background:
              "radial-gradient(120% 100% at 20% 0%, rgba(242,48,38,.35), transparent 60%), linear-gradient(160deg,#1a1113,#0b0b0c 70%)",
          }}
        >
          {videoId && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-35"
            />
          )}

          {videoId ? (
            <button
              type="button"
              onClick={() => setTocando(true)}
              aria-label={`Ver execução de ${item.nome}`}
              className="relative flex h-[62px] w-[62px] items-center justify-center rounded-full border border-papel/20 bg-papel/10 backdrop-blur transition-colors hover:bg-papel/20"
            >
              <svg viewBox="0 0 24 24" className="ml-1 h-6 w-6 text-papel" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          ) : (
            <span
              aria-hidden="true"
              className="relative flex h-[62px] w-[62px] items-center justify-center rounded-full border border-papel/15"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6 text-nevoa"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M6.5 7v10M17.5 7v10M3 10v4M21 10v4M6.5 12h11" />
              </svg>
            </span>
          )}

          <span className="absolute bottom-3.5 left-[18px]">
            <Meta>{videoId ? "Vídeo · Allisson Santos" : "Sem vídeo ainda"}</Meta>
          </span>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center px-[18px] pt-4">
        <Link
          href="/app/treino"
          aria-label={`Voltar para ${blocoNome}`}
          className="pointer-events-auto -ml-2 flex h-11 w-11 items-center justify-center rounded-full text-papel"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-[22px] w-[22px]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 6-6 6 6 6" />
          </svg>
        </Link>
        <span className="pointer-events-none ml-auto font-mono text-[13.5px] uppercase tracking-[0.08em] tabular text-nevoa">
          {posicao} de {total}
        </span>
      </div>

      {/* ---------------------------------------------------------- */}
      {/* Corpo                                                       */}
      {/* ---------------------------------------------------------- */}
      <div className="flex flex-col gap-[15px] px-5 pt-[18px]">
        <div>
          <Meta tom="raio">{GRUPO[item.grupo] ?? "Geral"}</Meta>
          <h1 className="mt-1 font-display text-[27px] uppercase leading-none tracking-wide">
            {item.nome}
          </h1>
        </div>

        <div className="flex gap-2">
          <CartaoDeNumero valor={String(item.series)} rotulo="Séries" />
          <CartaoDeNumero valor={item.reps} rotulo="Reps" />
          <CartaoDeNumero valor={emMinutos(item.descanso_seg)} rotulo="Descanso" />
        </div>

        {item.metodo !== "normal" && (
          <Meta>Método: {NOME_DO_METODO[item.metodo]}</Meta>
        )}

        {item.observacao && (
          <div className="flex gap-3 rounded-[14px] border border-raio/30 bg-raio/[0.07] px-4 py-3.5">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="mt-0.5 h-4 w-4 flex-none text-raio-forte"
              fill="currentColor"
            >
              <path d="M13.5 2 4 13.5h5.2L8 22l10-12h-5.4l1.9-8z" />
            </svg>
            <div className="min-w-0">
              <Meta tom="raio" className="!text-[13.5px]">
                Observação do Allisson
              </Meta>
              <p className="mt-1 text-[13.5px] leading-[1.5] text-[#f1eeec]">{item.observacao}</p>
            </div>
          </div>
        )}

        {/* --- séries ------------------------------------------------ */}
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.07em] text-nevoa">
              Suas séries
            </span>
            {ultimaVez && (
              <Meta>
                Última vez: {formatarCarga(ultimaVez.series[0]?.carga_kg ?? null) || "-"} kg ×{" "}
                {ultimaVez.series[0]?.reps ?? "-"}
                {quandoUltimaVez ? ` · ${quandoUltimaVez}` : ""}
              </Meta>
            )}
          </div>

          <div className={`${GRADE} px-1`} aria-hidden="true">
            <Meta className="!tracking-[0.08em]">Set</Meta>
            <Meta className="!tracking-[0.08em]">Carga</Meta>
            <Meta className="!tracking-[0.08em]">Reps</Meta>
            <span />
          </div>

          {numeros.map((n) => {
            const feita = gravadas[n];
            const trabalhando = ocupada === n;
            const ativa = proximaAberta === n;

            if (feita) {
              return (
                <div key={n} className={`${GRADE} opacity-60`}>
                  <div className="text-center font-display text-base leading-none">{n}</div>
                  <div className={`${caixa} flex items-center justify-center`}>
                    {formatarCarga(feita.carga_kg) ? `${formatarCarga(feita.carga_kg)} kg` : "-"}
                  </div>
                  <div className={`${caixa} flex items-center justify-center`}>
                    {feita.reps ?? "-"}
                  </div>
                  <button
                    type="button"
                    aria-label={`Desfazer série ${n}`}
                    disabled={trabalhando}
                    onClick={() => desfazer(n)}
                    className="flex h-11 w-11 items-center justify-center rounded-[11px] border border-ok/40 bg-ok/15 disabled:opacity-50"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-4 w-4 text-ok"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </button>
                </div>
              );
            }

            return (
              <div key={n} className={GRADE}>
                <div
                  className={`text-center font-display text-base leading-none ${
                    ativa ? "text-raio-forte" : "text-nevoa"
                  }`}
                >
                  {n}
                </div>

                <label className="relative block">
                  <span className="sr-only">Carga da série {n} em quilos</span>
                  <input
                    value={campos[n]?.carga ?? ""}
                    onChange={(e) => mudar(n, "carga", e.target.value)}
                    inputMode="decimal"
                    placeholder="kg"
                    className={`${caixa} pr-7 outline-none ${
                      ativa
                        ? "border-raio ring-[3px] ring-raio/[0.16]"
                        : "text-nevoa focus:border-raio focus:ring-[3px] focus:ring-raio/30"
                    }`}
                  />
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-nevoa">
                    kg
                  </span>
                </label>

                <label className="block">
                  <span className="sr-only">Repetições da série {n}</span>
                  <input
                    value={campos[n]?.reps ?? ""}
                    onChange={(e) => mudar(n, "reps", e.target.value)}
                    inputMode="numeric"
                    placeholder="reps"
                    className={`${caixa} outline-none ${
                      ativa
                        ? "border-raio ring-[3px] ring-raio/[0.16]"
                        : "text-nevoa focus:border-raio focus:ring-[3px] focus:ring-raio/30"
                    }`}
                  />
                </label>

                <button
                  type="button"
                  aria-label={`Gravar série ${n}`}
                  disabled={trabalhando}
                  onClick={() => gravar(n)}
                  className={`flex h-11 w-11 items-center justify-center rounded-[11px] transition-colors disabled:opacity-50 ${
                    ativa
                      ? "bg-raio-solido text-papel hover:bg-raio-fundo"
                      : "border border-linha text-nevoa hover:border-nevoa hover:text-papel"
                  }`}
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </button>
              </div>
            );
          })}

          {erro && <Aviso>{erro}</Aviso>}
        </div>

        {item.instrucoes && (
          <details className="rounded-[14px] border border-linha bg-tinta-2 px-4">
            <summary className="flex min-h-12 cursor-pointer items-center text-[13.5px] font-semibold">
              Como executar
            </summary>
            <p className="pb-4 text-[13.5px] leading-[1.5] text-nevoa">{item.instrucoes}</p>
          </details>
        )}
      </div>

      {/* ---------------------------------------------------------- */}
      {/* Barra de baixo: descanso e o próximo exercício              */}
      {/* ---------------------------------------------------------- */}
      <div className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-tinta from-[72%] to-transparent pb-[env(safe-area-inset-bottom)] pt-3.5">
        <div className="mx-auto flex max-w-md flex-col gap-2.5 px-5 pb-5">
          {restam !== null && (
            <div className="rounded-[13px] border border-linha bg-tinta-3 px-[15px] py-3">
              <div className="flex items-center gap-2.5">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-[15px] w-[15px] flex-none text-raio-forte"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="13" r="8" />
                  <path d="M12 9.5V13l2.5 1.5M9 2h6" />
                </svg>
                <span className="text-[13.5px] font-semibold">
                  {restam === 0 ? "Descanso acabou" : "Descanso"}
                </span>
                <span
                  className={`ml-auto font-display text-[19px] leading-none ${
                    restam === 0 ? "text-ok" : "text-raio-forte"
                  }`}
                >
                  {relogio(restam)}
                </span>
                <button
                  type="button"
                  onClick={() => setFim(null)}
                  className="-my-2 min-h-11 border-l border-linha pl-3 text-xs font-semibold text-nevoa hover:text-papel"
                >
                  {restam === 0 ? "Ok" : "Pular"}
                </button>
              </div>
              <div className="mt-2.5 h-[3px] overflow-hidden rounded-sm bg-linha" aria-hidden="true">
                <div
                  className="h-full bg-raio transition-[width] duration-200"
                  style={{ width: `${Math.round(fracaoDoDescanso * 100)}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            {anteriorId && (
              <Link
                href={`/app/treino/${anteriorId}`}
                aria-label="Exercício anterior"
                className="inline-flex h-12 w-12 flex-none items-center justify-center rounded-xl border border-contorno text-nevoa hover:border-nevoa hover:text-papel"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m15 6-6 6 6 6" />
                </svg>
              </Link>
            )}

            <Link
              href={proximoId ? `/app/treino/${proximoId}` : "/app/treino"}
              className="inline-flex min-h-12 flex-1 items-center justify-center truncate rounded-xl bg-raio-solido px-5 font-semibold text-papel transition-colors hover:bg-raio-fundo"
            >
              {proximoId && proximoNome ? `Próximo: ${proximoNome}` : "Terminar treino"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

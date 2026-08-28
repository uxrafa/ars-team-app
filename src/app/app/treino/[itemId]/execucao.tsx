"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Aviso, Rotulo } from "@/components/ui";
import { NOME_DO_METODO, emMinutos } from "@/lib/ficha";
import {
  carga as formatarCarga,
  curta,
  paraCarga,
  paraReps,
  type ItemDoTreino,
  type SerieFeita,
} from "@/lib/treino";
import { apagarSerie, registrarSerie } from "../../acoes";

type Feita = { numero: number; carga_kg: number | null; reps: number | null };
type Campo = { carga: string; reps: string };

function relogio(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * A tela onde o treino acontece.
 *
 * Tudo aqui é feito para ser usado de pé, com uma mão, entre uma série e
 * outra: campo grande, um toque para gravar, e o descanso começando sozinho
 * assim que a série entra. A carga já vem preenchida com a da última vez,
 * porque ninguém lembra de cabeça quanto pôs no aparelho semana passada.
 */
export function Execucao({
  item,
  blocoNome,
  posicao,
  total,
  anteriorId,
  proximoId,
  feitas,
  ultimaVez,
  videoId,
}: {
  item: ItemDoTreino;
  blocoNome: string;
  posicao: number;
  total: number;
  anteriorId: string | null;
  proximoId: string | null;
  feitas: SerieFeita[];
  ultimaVez: { data: string; series: Feita[] } | null;
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

  const quantasFeitas = Object.keys(gravadas).length;
  const completo = quantasFeitas >= item.series;

  return (
    <div className="flex flex-col gap-5 pb-24">
      <div className="flex items-center gap-3">
        <Link
          href="/app/treino"
          className="inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-nevoa hover:text-papel"
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
          {blocoNome}
        </Link>
        <span className="ml-auto font-mono text-[13px] tabular text-nevoa">
          {posicao} de {total}
        </span>
      </div>

      <header className="flex flex-col gap-2">
        <h1 className="font-display text-[30px] uppercase leading-[0.95] tracking-wide">
          {item.nome}
        </h1>
        <p className="font-mono text-[13px] uppercase tabular tracking-wide text-nevoa">
          {item.series} séries · {item.reps} reps · descanso {emMinutos(item.descanso_seg)}
          {item.metodo !== "normal" && ` · ${NOME_DO_METODO[item.metodo]}`}
        </p>
      </header>

      {videoId && (
        <div className="overflow-hidden rounded-2xl border border-linha bg-tinta-2">
          {tocando ? (
            <div className="aspect-video">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1`}
                title={`Execução de ${item.nome}`}
                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full border-0"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setTocando(true)}
              className="relative flex aspect-video w-full items-center justify-center"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-60"
              />
              <span className="relative flex items-center gap-2 rounded-full bg-raio-solido px-5 py-3 font-semibold text-papel">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Ver execução
              </span>
            </button>
          )}
        </div>
      )}

      {item.observacao && (
        <div className="rounded-xl border border-raio/40 bg-raio/[0.09] px-4 py-3.5">
          <Rotulo className="text-raio-forte">Observação do Allisson</Rotulo>
          <p className="mt-1.5 text-[15px] leading-relaxed text-papel">{item.observacao}</p>
        </div>
      )}

      {ultimaVez && (
        <p className="font-mono text-[13px] tabular text-nevoa">
          Última vez ({curta(ultimaVez.data)}):{" "}
          {ultimaVez.series
            .map((s) => `${formatarCarga(s.carga_kg) || "-"} kg x ${s.reps ?? "-"}`)
            .join(" · ")}
        </p>
      )}

      <section className="flex flex-col gap-2">
        <Rotulo>Registre cada série</Rotulo>

        {numeros.map((n) => {
          const feita = gravadas[n];
          const trabalhando = ocupada === n;

          if (feita) {
            return (
              <div
                key={n}
                className="flex min-h-14 items-center gap-3 rounded-xl border border-ok/40 bg-ok/[0.08] px-4 py-2"
              >
                <span className="w-6 flex-none font-mono text-[13px] tabular text-ok">{n}</span>
                <span className="min-w-0 flex-1 font-semibold text-papel">
                  {formatarCarga(feita.carga_kg) ? `${formatarCarga(feita.carga_kg)} kg` : "sem carga"}
                  <span className="text-nevoa"> · </span>
                  {feita.reps ?? "-"} reps
                </span>
                <button
                  type="button"
                  disabled={trabalhando}
                  onClick={() => desfazer(n)}
                  className="min-h-11 flex-none px-2 text-[15px] font-semibold text-nevoa underline underline-offset-4 hover:text-papel disabled:opacity-50"
                >
                  {trabalhando ? "…" : "Desfazer"}
                </button>
              </div>
            );
          }

          return (
            <div
              key={n}
              className="flex min-h-14 items-center gap-2 rounded-xl border border-linha bg-tinta-2 px-3 py-2"
            >
              <span className="w-6 flex-none text-center font-mono text-[13px] tabular text-nevoa">
                {n}
              </span>

              <label className="relative min-w-0 flex-1">
                <span className="sr-only">Carga da série {n} em quilos</span>
                <input
                  value={campos[n]?.carga ?? ""}
                  onChange={(e) => mudar(n, "carga", e.target.value)}
                  inputMode="decimal"
                  placeholder="kg"
                  className="h-12 w-full rounded-lg border border-contorno bg-tinta-3 px-3 pr-8 text-center text-base tabular text-papel outline-none focus:border-raio focus:ring-[3px] focus:ring-raio/30"
                />
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-nevoa">
                  kg
                </span>
              </label>

              <label className="min-w-0 flex-1">
                <span className="sr-only">Repetições da série {n}</span>
                <input
                  value={campos[n]?.reps ?? ""}
                  onChange={(e) => mudar(n, "reps", e.target.value)}
                  inputMode="numeric"
                  placeholder="reps"
                  className="h-12 w-full rounded-lg border border-contorno bg-tinta-3 px-3 text-center text-base tabular text-papel outline-none focus:border-raio focus:ring-[3px] focus:ring-raio/30"
                />
              </label>

              <button
                type="button"
                aria-label={`Gravar série ${n}`}
                disabled={trabalhando}
                onClick={() => gravar(n)}
                className="flex h-12 w-12 flex-none items-center justify-center rounded-lg border border-raio-solido bg-raio-solido text-papel transition-colors hover:bg-raio-fundo disabled:opacity-50"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m5 13 4 4L19 7" />
                </svg>
              </button>
            </div>
          );
        })}

        {erro && <Aviso>{erro}</Aviso>}
      </section>

      {item.instrucoes && (
        <details className="rounded-xl border border-linha bg-tinta-2 px-4">
          <summary className="flex min-h-12 cursor-pointer items-center font-semibold">
            Como executar
          </summary>
          <p className="pb-4 text-[15px] leading-relaxed text-nevoa">{item.instrucoes}</p>
        </details>
      )}

      {/* Barra de baixo: descanso e navegação entre exercícios. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-linha bg-tinta/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto max-w-md px-5">
          {restam !== null && (
            <div className="flex items-center gap-3 border-b border-linha py-2.5">
              <span
                className={`font-mono text-[22px] tabular ${restam === 0 ? "text-ok" : "text-papel"}`}
              >
                {relogio(restam)}
              </span>
              <span className="min-w-0 flex-1 text-[13px] uppercase tracking-wide text-nevoa">
                {restam === 0 ? "Descanso acabou" : "Descanso"}
              </span>
              <button
                type="button"
                onClick={() => setFim(null)}
                className="min-h-11 px-2 text-[15px] font-semibold text-nevoa underline underline-offset-4 hover:text-papel"
              >
                {restam === 0 ? "Ok" : "Pular"}
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 py-3">
            {anteriorId ? (
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
            ) : (
              <span className="h-12 w-12 flex-none" aria-hidden="true" />
            )}

            {proximoId ? (
              <Link
                href={`/app/treino/${proximoId}`}
                className={`inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border px-5 font-semibold ${
                  completo
                    ? "border-raio-solido bg-raio-solido text-papel hover:bg-raio-fundo"
                    : "border-contorno bg-tinta-3 text-papel hover:border-nevoa"
                }`}
              >
                Próximo exercício
              </Link>
            ) : (
              <Link
                href="/app/treino"
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-raio-solido bg-raio-solido px-5 font-semibold text-papel hover:bg-raio-fundo"
              >
                Terminar treino
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

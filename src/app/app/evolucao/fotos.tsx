"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Aviso, Botao } from "@/components/ui";
import { ANGULOS } from "@/lib/anamnese";
import { caminhoDaFoto, comprimir } from "@/lib/foto";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { curtaComMes } from "@/lib/treino";
import { Meta } from "../pecas";

export type FotoNaTela = { data: string; angulo: string; url: string };

type Escolhida = { blob: Blob; previa: string };

const NOME_DO_ANGULO: Record<string, string> = Object.fromEntries(ANGULOS.map(([v, n]) => [v, n]));

/**
 * As fotos de evolução.
 *
 * A faixa em cima são os registros por data, como no artboard. Escolher uma
 * data mostra ela ao lado da primeira, ângulo por ângulo: a comparação é o
 * produto desta tela, e uma grade com tudo não responde a pergunta que o aluno
 * faz aqui, que é se mudou alguma coisa.
 */
export function Fotos({ alunoId, fotos }: { alunoId: string; fotos: FotoNaTela[] }) {
  const router = useRouter();
  const [escolhidas, setEscolhidas] = useState<Record<string, Escolhida>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [subindo, setSubindo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const entradas = useRef<Record<string, HTMLInputElement | null>>({});

  const porData = new Map<string, FotoNaTela[]>();
  for (const f of fotos) {
    const lista = porData.get(f.data) ?? [];
    lista.push(f);
    porData.set(f.data, lista);
  }
  const datas = [...porData.keys()].sort();
  const [selecionada, setSelecionada] = useState<string | null>(datas.at(-1) ?? null);

  const capa = (data: string) => {
    const lista = porData.get(data) ?? [];
    return lista.find((f) => f.angulo === "frente") ?? lista[0];
  };

  const alvo = selecionada ?? datas.at(-1) ?? null;
  const primeira = datas[0] ?? null;
  const comparando = Boolean(primeira && alvo && primeira !== alvo);

  async function escolher(angulo: string, arquivo: File | undefined) {
    if (!arquivo) return;
    setErro(null);
    const blob = await comprimir(arquivo);
    setEscolhidas((e) => {
      if (e[angulo]) URL.revokeObjectURL(e[angulo].previa);
      return { ...e, [angulo]: { blob, previa: URL.createObjectURL(blob) } };
    });
  }

  async function enviar() {
    const angulos = Object.keys(escolhidas);
    if (!angulos.length) return;

    setErro(null);
    setSubindo(true);
    const supabase = criarClienteNavegador();
    const hoje = new Date().toISOString().slice(0, 10);

    try {
      for (const angulo of angulos) {
        const caminho = caminhoDaFoto(alunoId, hoje, angulo);
        const { error: erroUpload } = await supabase.storage
          .from("evolucao")
          .upload(caminho, escolhidas[angulo].blob, { upsert: true, contentType: "image/jpeg" });
        if (erroUpload) throw new Error(erroUpload.message);

        const { error: erroLinha } = await supabase
          .from("foto_evolucao")
          .upsert(
            { aluno_id: alunoId, data: hoje, angulo, caminho },
            { onConflict: "aluno_id,data,angulo" },
          );
        if (erroLinha) throw new Error(erroLinha.message);
      }

      for (const angulo of angulos) URL.revokeObjectURL(escolhidas[angulo].previa);
      setEscolhidas({});
      setEnviando(false);
      setSelecionada(hoje);
      router.refresh();
    } catch {
      setErro("Não consegui enviar as fotos. Tente de novo com a conexão melhor.");
    } finally {
      setSubindo(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-[0.07em] text-nevoa">
          Fotos de evolução
        </span>
        {datas.length > 0 && (
          <Meta tom="raio">
            {datas.length} {datas.length === 1 ? "registro" : "registros"}
          </Meta>
        )}
      </div>

      {/* Faixa de registros, um por data, mais o espaço da nova. */}
      <div className="flex gap-2.5 overflow-x-auto pb-1">
        {datas.map((data) => {
          const foto = capa(data);
          const atual = data === alvo;
          return (
            <button
              key={data}
              type="button"
              onClick={() => setSelecionada(data)}
              aria-pressed={atual}
              className="w-[78px] flex-none text-center"
            >
              <span
                className={`block h-[104px] w-full overflow-hidden rounded-xl border ${
                  atual ? "border-raio" : "border-linha"
                }`}
              >
                {foto?.url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={foto.url}
                    alt={`Foto de ${curtaComMes(data)}`}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </span>
              <span
                className={`mt-1.5 block font-mono text-[11px] ${
                  atual ? "text-raio-forte" : "text-nevoa"
                }`}
              >
                {curtaComMes(data)}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setEnviando((v) => !v)}
          aria-expanded={enviando}
          className="w-[78px] flex-none text-center"
        >
          <span className="flex h-[104px] w-full items-center justify-center rounded-xl border border-dashed border-linha hover:border-nevoa">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5 text-nevoa"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
          <span className="mt-1.5 block font-mono text-[11px] text-nevoa">NOVA</span>
        </button>
      </div>

      {/* Comparação: a primeira ao lado da escolhida, ângulo por ângulo. */}
      {alvo && (
        <div className="flex flex-col gap-3.5">
          {ANGULOS.map(([valor, nome]) => {
            const nova = (porData.get(alvo) ?? []).find((f) => f.angulo === valor);
            const velha = primeira
              ? (porData.get(primeira) ?? []).find((f) => f.angulo === valor)
              : undefined;
            if (!nova && !velha) return null;

            const pares = comparando && velha && nova ? [velha, nova] : [nova ?? velha!];

            return (
              <div key={valor}>
                <p className="mb-2 text-[13px] font-semibold text-nevoa">{nome}</p>
                <div className={`grid gap-2 ${pares.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
                  {pares.map((f, i) => (
                    <figure key={f.data} className="m-0">
                      <div className="overflow-hidden rounded-xl border border-linha bg-tinta-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={f.url}
                          alt={`Foto de ${nome.toLowerCase()} em ${curtaComMes(f.data)}`}
                          className="aspect-[3/4] w-full object-cover"
                        />
                      </div>
                      <figcaption className="mt-1.5 font-mono text-[11px] text-nevoa">
                        {pares.length === 2 ? (i === 0 ? "Primeira · " : "Depois · ") : ""}
                        {curtaComMes(f.data)}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Envio */}
      {(enviando || !datas.length) && (
        <div className="rounded-2xl border border-linha bg-tinta-2 p-[18px]">
          <p className="text-[13.5px] leading-[1.5] text-nevoa">
            {datas.length
              ? "Tire as fotos de hoje no mesmo lugar e na mesma luz da primeira vez. É o que faz a comparação valer."
              : "Mande as três primeiras fotos. São elas que a comparação usa daqui para a frente. Só o Allisson vê."}
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {ANGULOS.map(([valor, nome]) => {
              const foto = escolhidas[valor];
              return (
                <div key={valor}>
                  <input
                    ref={(el) => {
                      entradas.current[valor] = el;
                    }}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => escolher(valor, e.target.files?.[0])}
                  />
                  <button
                    type="button"
                    onClick={() => entradas.current[valor]?.click()}
                    className={`flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-xl border text-[13px] font-semibold transition-colors ${
                      foto ? "border-raio" : "border-dashed border-contorno hover:border-nevoa"
                    }`}
                  >
                    {foto ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={foto.previa}
                        alt={`Foto de ${NOME_DO_ANGULO[valor].toLowerCase()} escolhida`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-nevoa">{nome}</span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {erro && (
            <div className="mt-4">
              <Aviso>{erro}</Aviso>
            </div>
          )}

          {Object.keys(escolhidas).length > 0 && (
            <Botao largura="cheia" className="mt-4" disabled={subindo} onClick={enviar}>
              {subindo ? "Enviando…" : "Enviar fotos de hoje"}
            </Botao>
          )}
        </div>
      )}
    </section>
  );
}

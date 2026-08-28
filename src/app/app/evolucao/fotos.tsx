"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Aviso, Botao, Rotulo } from "@/components/ui";
import { ANGULOS } from "@/lib/anamnese";
import { caminhoDaFoto, comprimir } from "@/lib/foto";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { curta } from "@/lib/treino";

export type FotoNaTela = { data: string; angulo: string; url: string };

type Escolhida = { blob: Blob; previa: string };

/**
 * As fotos de evolução.
 *
 * A comparação é o produto: primeira foto ao lado da última, por ângulo. Uma
 * grade com todas as datas ficaria bonita e não responderia a pergunta que o
 * aluno faz aqui, que é se mudou alguma coisa.
 */
export function Fotos({ alunoId, fotos }: { alunoId: string; fotos: FotoNaTela[] }) {
  const router = useRouter();
  const [escolhidas, setEscolhidas] = useState<Record<string, Escolhida>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [subindo, setSubindo] = useState(false);
  const entradas = useRef<Record<string, HTMLInputElement | null>>({});

  const porAngulo = new Map<string, FotoNaTela[]>();
  for (const f of fotos) {
    const lista = porAngulo.get(f.angulo) ?? [];
    lista.push(f);
    porAngulo.set(f.angulo, lista);
  }
  for (const lista of porAngulo.values()) lista.sort((a, b) => a.data.localeCompare(b.data));

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
          .upload(caminho, escolhidas[angulo].blob, {
            upsert: true,
            contentType: "image/jpeg",
          });
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
      router.refresh();
    } catch {
      setErro("Não consegui enviar as fotos. Tente de novo com a conexão melhor.");
    } finally {
      setSubindo(false);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <Rotulo>Fotos de evolução</Rotulo>

      {porAngulo.size > 0 && (
        <div className="flex flex-col gap-4">
          {ANGULOS.map(([valor, nome]) => {
            const lista = porAngulo.get(valor);
            if (!lista?.length) return null;
            const primeira = lista[0];
            const ultima = lista[lista.length - 1];
            const mudou = primeira.data !== ultima.data;

            return (
              <div key={valor}>
                <p className="mb-2 text-sm font-semibold text-nevoa">{nome}</p>
                <div className={`grid gap-2 ${mudou ? "grid-cols-2" : "grid-cols-1"}`}>
                  {(mudou ? [primeira, ultima] : [ultima]).map((f, i) => (
                    <figure key={f.data} className="m-0">
                      <div className="overflow-hidden rounded-xl border border-linha bg-tinta-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={f.url}
                          alt={`Foto de ${nome.toLowerCase()} em ${curta(f.data)}`}
                          className="aspect-[3/4] w-full object-cover"
                        />
                      </div>
                      <figcaption className="mt-1.5 font-mono text-[13px] tabular text-nevoa">
                        {mudou && i === 0 ? "Primeira · " : mudou ? "Agora · " : ""}
                        {curta(f.data)}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-2xl border border-linha bg-tinta-2 p-5">
        <p className="text-[15px] leading-relaxed text-nevoa">
          {porAngulo.size
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
                  className={`flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-xl border text-sm font-semibold transition-colors ${
                    foto ? "border-raio" : "border-dashed border-contorno hover:border-nevoa"
                  }`}
                >
                  {foto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={foto.previa}
                      alt={`Foto de ${nome.toLowerCase()} escolhida`}
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
    </section>
  );
}

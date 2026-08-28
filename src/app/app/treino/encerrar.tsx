"use client";

import { useState, useTransition } from "react";
import { Aviso, Botao, CLASSE_CAMPO, Rotulo } from "@/components/ui";
import { ESFORCOS, paraCarga } from "@/lib/treino";
import { concluirTreino, descartarTreino } from "../acoes";

/**
 * O fim do treino.
 *
 * O check-in é isto: o aluno diz que terminou, e de quebra deixa peso e
 * esforço. Os dois são opcionais de propósito. Campo obrigatório no fim do
 * treino é campo que faz a pessoa fechar o app sem registrar, e aí o Allisson
 * perde a informação que importa de verdade, que é ter treinado.
 */
export function Encerrar({ seriesFeitas }: { seriesFeitas: number }) {
  const [aberto, setAberto] = useState(false);
  const [peso, setPeso] = useState("");
  const [esforco, setEsforco] = useState<number | null>(null);
  const [nota, setNota] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [pendente, agir] = useTransition();

  function fechar() {
    setErro(null);
    const pesoKg = peso.trim() ? paraCarga(peso) : null;
    if (peso.trim() && (pesoKg === null || pesoKg < 25 || pesoKg > 400)) {
      setErro("Confira o peso: use algo entre 25 e 400 kg.");
      return;
    }

    agir(async () => {
      const r = await concluirTreino(pesoKg, esforco, nota);
      if (r?.erro) setErro(r.erro);
    });
  }

  if (!aberto) {
    return (
      <div className="flex flex-col gap-3">
        <Botao largura="cheia" onClick={() => setAberto(true)}>
          Concluir treino
        </Botao>

        {confirmando ? (
          <div className="rounded-xl border border-raio/45 bg-raio/10 p-4">
            <p className="text-[15px] leading-relaxed text-papel">
              Descartar apaga este treino e tudo que você registrou nele. Não dá para voltar atrás.
            </p>
            <div className="mt-3 flex gap-2">
              <Botao
                aparencia="secundario"
                tamanho="sm"
                disabled={pendente}
                onClick={() =>
                  agir(async () => {
                    const r = await descartarTreino();
                    if (r?.erro) setErro(r.erro);
                  })
                }
              >
                Descartar mesmo assim
              </Botao>
              <Botao
                aparencia="fantasma"
                tamanho="sm"
                disabled={pendente}
                onClick={() => setConfirmando(false)}
              >
                Voltar
              </Botao>
            </div>
          </div>
        ) : (
          <Botao aparencia="fantasma" largura="cheia" onClick={() => setConfirmando(true)}>
            Descartar treino
          </Botao>
        )}

        {erro && <Aviso>{erro}</Aviso>}
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-linha bg-tinta-2 p-5">
      <div>
        <Rotulo>Check-in</Rotulo>
        <h2 className="mt-1.5 font-display text-[26px] uppercase leading-none tracking-wide">
          Fechar o treino
        </h2>
      </div>

      {seriesFeitas === 0 && (
        <Aviso tom="aviso">
          Você não registrou nenhuma série. Dá para fechar assim mesmo, mas aí o Allisson não vê
          as cargas de hoje.
        </Aviso>
      )}

      <label className="flex flex-col gap-2">
        <Rotulo>Seu peso hoje, se quiser registrar</Rotulo>
        <span className="relative block">
          <input
            value={peso}
            onChange={(e) => setPeso(e.target.value)}
            inputMode="decimal"
            placeholder="82,4"
            className={`${CLASSE_CAMPO} pr-12`}
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-nevoa">
            kg
          </span>
        </span>
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2">
          <Rotulo>Como foi o treino</Rotulo>
        </legend>
        {ESFORCOS.map(([valor, nome, detalhe]) => {
          const marcado = esforco === valor;
          return (
            <button
              key={valor}
              type="button"
              aria-pressed={marcado}
              onClick={() => setEsforco(marcado ? null : valor)}
              className={`flex min-h-12 items-center gap-3 rounded-xl border px-4 py-2.5 text-left transition-colors ${
                marcado
                  ? "border-raio bg-raio/12"
                  : "border-contorno bg-tinta-3 hover:border-nevoa"
              }`}
            >
              <span className="font-semibold">{nome}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-nevoa">{detalhe}</span>
            </button>
          );
        })}
      </fieldset>

      <label className="flex flex-col gap-2">
        <Rotulo>Quer falar alguma coisa para o Allisson?</Rotulo>
        <textarea
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          rows={3}
          placeholder="Senti o ombro no supino, troquei para halter."
          className={`${CLASSE_CAMPO} resize-y`}
        />
      </label>

      {erro && <Aviso>{erro}</Aviso>}

      <div className="flex flex-col gap-2">
        <Botao largura="cheia" disabled={pendente} onClick={fechar}>
          {pendente ? "Gravando…" : "Registrar treino"}
        </Botao>
        <Botao
          aparencia="fantasma"
          largura="cheia"
          disabled={pendente}
          onClick={() => setAberto(false)}
        >
          Ainda não terminei
        </Botao>
      </div>
    </section>
  );
}

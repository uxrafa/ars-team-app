"use client";

import { useActionState, useState } from "react";
import { Aviso, Botao, CLASSE_CAMPO, Rotulo } from "@/components/ui";
import { GRUPOS } from "@/lib/biblioteca";
import { criarExercicio, type Resultado } from "./acoes";

const INICIAL: Resultado = {};

export function Novo() {
  const [aberto, setAberto] = useState(false);
  const [estado, acao, enviando] = useActionState(criarExercicio, INICIAL);

  if (!aberto) {
    return (
      <Botao type="button" onClick={() => setAberto(true)}>
        Novo exercício
      </Botao>
    );
  }

  return (
    <section className="w-full rounded-2xl border border-linha bg-tinta-2 p-5">
      <h2 className="text-lg font-semibold">Novo exercício</h2>
      <p className="mt-1.5 text-[15px] leading-relaxed text-nevoa">
        Para o que aparecer depois da lista que o Allisson mandou.
      </p>

      {/* O `key` limpa o formulário depois de cadastrar, para o próximo entrar
          em branco sem precisar de efeito. */}
      <form key={estado.ok ? "salvo" : "novo"} action={acao} className="mt-5 flex flex-col gap-4">
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr_1fr]">
          <label className="flex flex-col gap-2">
            <Rotulo>Nome</Rotulo>
            <input name="nome" required autoFocus placeholder="Supino reto com barra" className={CLASSE_CAMPO} />
          </label>

          <label className="flex flex-col gap-2">
            <Rotulo>Grupo</Rotulo>
            <select name="grupo" defaultValue="peito" className={CLASSE_CAMPO}>
              {GRUPOS.map((g) => (
                <option key={g.valor} value={g.valor}>
                  {g.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <Rotulo>Equipamento</Rotulo>
            <input name="equipamento" placeholder="Máquina, Polia, Halter..." className={CLASSE_CAMPO} />
          </label>
        </div>

        <label className="flex flex-col gap-2">
          <Rotulo>Link do vídeo</Rotulo>
          <input
            name="video_url"
            inputMode="url"
            placeholder="https://www.youtube.com/watch?v=..."
            className={CLASSE_CAMPO}
          />
        </label>

        {estado.erro && <Aviso>{estado.erro}</Aviso>}
        {estado.ok && <Aviso tom="ok">Exercício cadastrado. Pode continuar.</Aviso>}

        <div className="flex flex-wrap gap-2.5">
          <Botao type="submit" disabled={enviando} tamanho="sm">
            {enviando ? "Salvando" : "Cadastrar"}
          </Botao>
          <Botao
            type="button"
            onClick={() => setAberto(false)}
            aparencia="secundario"
            tamanho="sm"
          >
            Fechar
          </Botao>
        </div>
      </form>
    </section>
  );
}

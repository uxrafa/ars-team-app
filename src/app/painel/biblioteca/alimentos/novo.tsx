"use client";

import { useCallback, useState, useTransition } from "react";
import { Modal } from "@/components/modal";
import { Aviso, Botao } from "@/components/ui";
import { GRUPO_SUPLEMENTOS } from "@/lib/dieta";
import { criarAlimento, type DadosAlimento } from "./acoes";
import { CamposDoAlimento } from "./campos";

const VAZIO: DadosAlimento = {
  nome: "",
  grupo: GRUPO_SUPLEMENTOS,
  proteina: "",
  carboidrato: "",
  gordura: "",
};

/** "Novo alimento": abre em modal, como todo formulário que nasce de uma ação. */
export function Novo({ grupos }: { grupos: string[] }) {
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState(VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, comecar] = useTransition();

  // Estável: o Modal puxa o foco de novo quando `aoFechar` muda.
  const fechar = useCallback(() => setAberto(false), []);

  function cadastrar() {
    setErro(null);
    comecar(async () => {
      const r = await criarAlimento(form);
      if (r.erro) return setErro(r.erro);
      setForm(VAZIO);
      setAberto(false);
    });
  }

  return (
    <>
      <Botao
        type="button"
        onClick={() => {
          setErro(null);
          setAberto(true);
        }}
      >
        Novo alimento
      </Botao>

      {aberto && (
        <Modal
          titulo="Novo alimento"
          descricao="Para o que não está na TACO, como whey e suplementos."
          aoFechar={fechar}
        >
          <div className="flex flex-col gap-4">
            <CamposDoAlimento form={form} aoMudar={setForm} grupos={grupos} focarNome />
            {erro && <Aviso>{erro}</Aviso>}
            <div className="flex flex-wrap gap-2.5">
              <Botao type="button" onClick={cadastrar} disabled={pendente} tamanho="sm">
                {pendente ? "Cadastrando" : "Cadastrar"}
              </Botao>
              <Botao type="button" onClick={fechar} aparencia="fantasma" tamanho="sm">
                Cancelar
              </Botao>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

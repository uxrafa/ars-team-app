"use client";

import { useState, useTransition } from "react";
import { Aviso, Botao, Pilula } from "@/components/ui";
import {
  ROTULO_TIPO,
  emDataCurta,
  formatarWhatsapp,
  type SituacaoConvite,
} from "@/lib/convite";
import { emReais } from "@/lib/painel";
import { cancelarConvite, gerarNovoLink } from "./acoes";
import { BotaoCopiar, BotaoWhatsapp } from "./link";

export type ConviteNaTela = {
  id: string;
  nome: string;
  email: string;
  whatsapp: string | null;
  tipo: "consultoria" | "planilha";
  mensalidade: number | null;
  acesso_ate: string | null;
  criado_em: string;
  usado_em: string | null;
  situacao: SituacaoConvite;
  diasParaVencer: number;
  link: string;
};

function Cadastro({ c }: { c: ConviteNaTela }) {
  const partes = [
    formatarWhatsapp(c.whatsapp),
    c.mensalidade !== null ? `${emReais(c.mensalidade)} por mês` : "sem mensalidade",
    c.acesso_ate ? `pago até ${emDataCurta(c.acesso_ate)}` : "sem vencimento",
  ];
  return <p className="mt-1 text-sm leading-relaxed text-nevoa">{partes.join(" · ")}</p>;
}

/** Nome, e-mail e a pilula do plano. A pilula diz o PLANO, nunca o estado. */
function Cabecalho({ c }: { c: ConviteNaTela }) {
  return (
    <div className="flex flex-wrap items-start gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-[17px] font-semibold leading-tight text-papel">{c.nome}</p>
        <p className="mt-1 break-all text-sm text-nevoa">{c.email}</p>
      </div>
      <Pilula>{ROTULO_TIPO[c.tipo]}</Pilula>
    </div>
  );
}

function Pendente({ c }: { c: ConviteNaTela }) {
  const [erro, setErro] = useState<string | null>(null);
  const [cancelando, iniciar] = useTransition();

  function cancelar() {
    iniciar(async () => {
      const r = await cancelarConvite(c.id);
      setErro(r.erro ?? null);
    });
  }

  return (
    <li className="border-t border-linha p-5 first:border-t-0">
      <Cabecalho c={c} />
      <Cadastro c={c} />

      <p className="mt-2 text-sm text-nevoa">
        Link enviado em {emDataCurta(c.criado_em)} ·{" "}
        {c.diasParaVencer <= 1 ? (
          <span className="text-alerta">vence hoje</span>
        ) : (
          `vence em ${c.diasParaVencer} dias`
        )}
      </p>

      <div className="mt-4 flex flex-wrap gap-2.5">
        <BotaoWhatsapp whatsapp={c.whatsapp} nome={c.nome} link={c.link} />
        <BotaoCopiar texto={c.link} />
        <Botao
          type="button"
          onClick={cancelar}
          disabled={cancelando}
          aparencia="fantasma"
          tamanho="sm"
          className="sm:ml-auto"
        >
          {cancelando ? "Cancelando" : "Cancelar"}
        </Botao>
      </div>

      {erro && (
        <div className="mt-3">
          <Aviso>{erro}</Aviso>
        </div>
      )}
    </li>
  );
}

function Vencido({ c }: { c: ConviteNaTela }) {
  const [erro, setErro] = useState<string | null>(null);
  const [gerando, iniciar] = useTransition();

  function novoLink() {
    iniciar(async () => {
      const r = await gerarNovoLink(c.id);
      setErro(r.erro ?? null);
    });
  }

  return (
    <li className="border-t border-linha p-5 first:border-t-0">
      <Cabecalho c={c} />
      <Cadastro c={c} />

      <p className="mt-2 text-sm text-alerta">
        O link venceu e não cria mais conta. Gere outro para mandar de novo.
      </p>

      <div className="mt-4 flex flex-wrap gap-2.5">
        <Botao type="button" onClick={novoLink} disabled={gerando} aparencia="secundario" tamanho="sm">
          {gerando ? "Gerando" : "Gerar link novo"}
        </Botao>
      </div>

      {erro && (
        <div className="mt-3">
          <Aviso>{erro}</Aviso>
        </div>
      )}
    </li>
  );
}

function Entrou({ c }: { c: ConviteNaTela }) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-linha px-5 py-4 first:border-t-0">
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-papel">{c.nome}</span>
        <span className="mt-0.5 block break-all text-sm text-nevoa">{c.email}</span>
      </span>
      <span className="font-mono text-[13px] text-ok">
        entrou em {c.usado_em ? emDataCurta(c.usado_em) : "-"}
      </span>
    </li>
  );
}

function Bloco({
  titulo,
  vazio,
  children,
}: {
  titulo: string;
  vazio?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-linha bg-tinta-2">
      <h2 className="bg-tinta-3 px-5 py-3 text-xs font-semibold uppercase tracking-[0.07em] text-nevoa">
        {titulo}
      </h2>
      {vazio ? (
        <p className="px-6 py-10 text-center text-[15px] leading-relaxed text-nevoa">{vazio}</p>
      ) : (
        <ul>{children}</ul>
      )}
    </section>
  );
}

export function Lista({
  esperando,
  vencidos,
  entraram,
}: {
  esperando: ConviteNaTela[];
  vencidos: ConviteNaTela[];
  entraram: ConviteNaTela[];
}) {
  return (
    <div className="flex flex-col gap-5">
      <Bloco
        titulo={`Esperando o aluno${esperando.length ? ` (${esperando.length})` : ""}`}
        vazio={
          esperando.length === 0
            ? "Nenhum convite de pé. Preencha o cadastro ao lado para gerar o primeiro link."
            : undefined
        }
      >
        {esperando.map((c) => (
          <Pendente key={c.id} c={c} />
        ))}
      </Bloco>

      {vencidos.length > 0 && (
        <Bloco titulo={`Link vencido (${vencidos.length})`}>
          {vencidos.map((c) => (
            <Vencido key={c.id} c={c} />
          ))}
        </Bloco>
      )}

      {entraram.length > 0 && (
        <Bloco titulo={`Já entraram (${entraram.length})`}>
          {entraram.map((c) => (
            <Entrou key={c.id} c={c} />
          ))}
        </Bloco>
      )}
    </div>
  );
}

"use client";

import { useActionState, useState } from "react";
import { Aviso, Botao, CLASSE_CAMPO, Rotulo } from "@/components/ui";
import { DIAS_DE_VALIDADE, linkDoConvite, primeiroNome } from "@/lib/convite";
import { criarConvite, type EstadoConvite } from "./acoes";
import { BotaoCopiar, BotaoWhatsapp, LinkVisivel } from "./link";

const INICIAL: EstadoConvite = {};

/** Daqui a 30 dias, em aaaa-mm-dd, que e o que o input date espera. */
function daquiA(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
}

function Escolha({
  valor,
  atual,
  onEscolher,
  titulo,
  detalhe,
}: {
  valor: string;
  atual: string;
  onEscolher: (v: string) => void;
  titulo: string;
  detalhe: string;
}) {
  const marcado = valor === atual;
  return (
    <button
      type="button"
      onClick={() => onEscolher(valor)}
      aria-pressed={marcado}
      className={`flex min-h-12 flex-1 flex-col justify-center rounded-xl border px-4 py-2.5 text-left transition-colors ${
        marcado
          ? "border-raio bg-raio/12 text-papel"
          : "border-contorno bg-tinta-3 text-nevoa hover:border-nevoa hover:text-papel"
      }`}
    >
      <span className="text-[15px] font-semibold leading-tight">{titulo}</span>
      <span className="mt-0.5 text-sm leading-tight text-nevoa">{detalhe}</span>
    </button>
  );
}

/** O seletor de plano guarda o proprio estado, para o `key` do form limpar junto. */
function EscolhaDePlano() {
  const [tipo, setTipo] = useState("consultoria");

  return (
    <div className="flex flex-col gap-2">
      <Rotulo>Plano</Rotulo>
      <input type="hidden" name="tipo" value={tipo} />
      <div className="flex gap-2.5">
        <Escolha
          valor="consultoria"
          atual={tipo}
          onEscolher={setTipo}
          titulo="Consultoria"
          detalhe="Ficha, check-in e chat"
        />
        <Escolha
          valor="planilha"
          atual={tipo}
          onEscolher={setTipo}
          titulo="Planilha"
          detalhe="Só treino e vídeos"
        />
      </div>
    </div>
  );
}

export function Formulario({ origem }: { origem: string }) {
  const [estado, acao, enviando] = useActionState(criarConvite, INICIAL);

  const link = estado.criado ? linkDoConvite(origem, estado.criado.token) : null;

  return (
    <div className="flex flex-col gap-5">
      {estado.criado && link && (
        <section className="rounded-2xl border border-ok/40 bg-ok/[0.07] p-5">
          <h2 className="text-lg font-semibold text-ok">
            Convite de {primeiroNome(estado.criado.nome)} pronto
          </h2>
          <p className="mt-1.5 text-[15px] leading-relaxed text-nevoa">
            Mande o link para ele. Vale por {DIAS_DE_VALIDADE} dias e só funciona uma vez.
          </p>

          <div className="mt-4">
            <LinkVisivel link={link} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2.5">
            <BotaoWhatsapp
              whatsapp={estado.criado.whatsapp}
              nome={estado.criado.nome}
              link={link}
            />
            <BotaoCopiar texto={link} />
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-linha bg-tinta-2 p-5">
        <h2 className="text-lg font-semibold">Convidar aluno</h2>
        <p className="mt-1.5 text-[15px] leading-relaxed text-nevoa">
          O que você preencher aqui já entra no cadastro dele. Só a senha é ele quem escolhe.
        </p>

        {/* A cada convite gerado o form remonta e volta em branco, porque a
            migracao e uma fila de 25 pessoas e nao um cadastro avulso. */}
        <form
          key={estado.criado?.token ?? "novo"}
          action={acao}
          className="mt-5 flex flex-col gap-5"
        >
          <label className="flex flex-col gap-2">
            <Rotulo>Nome</Rotulo>
            <input
              name="nome"
              type="text"
              autoComplete="off"
              required
              placeholder="Nome e sobrenome"
              className={CLASSE_CAMPO}
            />
          </label>

          <label className="flex flex-col gap-2">
            <Rotulo>E-mail</Rotulo>
            <input
              name="email"
              type="email"
              inputMode="email"
              autoComplete="off"
              required
              placeholder="aluno@email.com"
              className={CLASSE_CAMPO}
            />
            <span className="text-sm text-nevoa">
              É com este e-mail que ele vai entrar. O link só funciona nele.
            </span>
          </label>

          <label className="flex flex-col gap-2">
            <Rotulo>WhatsApp</Rotulo>
            <input
              name="whatsapp"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              placeholder="11 99999-8888"
              className={CLASSE_CAMPO}
            />
            <span className="text-sm text-nevoa">
              Com o número, o botão de mandar o convite já abre a conversa.
            </span>
          </label>

          <EscolhaDePlano />

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <Rotulo>Mensalidade</Rotulo>
              <span className="relative block">
                <input
                  name="mensalidade"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="250"
                  className={`${CLASSE_CAMPO} pl-11`}
                />
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[15px] text-nevoa">
                  R$
                </span>
              </span>
            </label>

            <label className="flex flex-col gap-2">
              <Rotulo>Pago até</Rotulo>
              <input
                name="acesso_ate"
                type="date"
                defaultValue={daquiA(30)}
                className={CLASSE_CAMPO}
              />
            </label>
          </div>

          <p className="text-sm leading-relaxed text-nevoa">
            Mensalidade e vencimento são o que faz a fila de cobrança do painel funcionar. Dá para
            deixar em branco e preencher depois na lista de alunos.
          </p>

          {estado.erro && <Aviso>{estado.erro}</Aviso>}

          <Botao type="submit" disabled={enviando} largura="cheia">
            {enviando ? "Gerando" : "Gerar convite"}
          </Botao>
        </form>
      </section>
    </div>
  );
}

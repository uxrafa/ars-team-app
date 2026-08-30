import Link from "next/link";
import { BotaoLink, Pilula } from "@/components/ui";
import { iniciais, linkWhatsapp } from "@/lib/painel";
import { nomeDoEsforco, tomDoEsforco } from "@/lib/treino";
import {
  DIAS_DO_FEED,
  linhaDaSerie,
  mensagemDeResposta,
  resumoEmNumeros,
  type DiaDoFeed,
  type TreinoNoFeed,
} from "@/lib/feed";

function Avatar({ nome }: { nome: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-contorno bg-tinta-3 text-sm font-bold"
    >
      {iniciais(nome)}
    </span>
  );
}

/**
 * O recado do aluno.
 *
 * É o motivo desta tela existir, então ele é o único bloco com fundo e barra
 * vermelha: em uma tela cheia de número, o texto escrito por uma pessoa tem
 * que ganhar do resto sem precisar ser procurado.
 */
function Recado({ texto }: { texto: string }) {
  return (
    <div className="rounded-xl border border-raio/35 bg-raio/[0.07] px-4 py-3.5">
      <p className="text-xs font-semibold uppercase tracking-[0.07em] text-raio-forte">
        Recado do aluno
      </p>
      <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-papel">{texto}</p>
    </div>
  );
}

/** O treino em si: exercício por exercício, série por série. */
function OQueFoiFeito({ treino }: { treino: TreinoNoFeed }) {
  if (treino.exercicios.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-nevoa">
        Fechou o treino sem registrar nenhuma série. Acontece quando ele treina com o app no
        bolso e só marca o check-in no fim.
      </p>
    );
  }

  return (
    <details className="group">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-[15px] font-semibold text-raio-forte">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="transition-transform duration-150 group-open:rotate-90"
        >
          <path d="m9 6 6 6-6 6" />
        </svg>
        Ver o treino
      </summary>

      <ul className="mt-3 flex flex-col gap-2.5 border-t border-linha pt-3.5">
        {treino.exercicios.map((e) => (
          <li key={e.exercicio_id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
            <span className="min-w-[15ch] flex-1 text-[15px] font-semibold">{e.nome}</span>
            <span className="flex flex-wrap gap-1.5">
              {e.series.map((s) => (
                <span
                  key={s.numero}
                  className="rounded-lg border border-linha bg-tinta-3 px-2.5 py-1 font-mono text-[13px] tabular text-nevoa"
                >
                  {linhaDaSerie(s)}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function CartaoDeTreino({ treino, hoje }: { treino: TreinoNoFeed; hoje: string }) {
  const zap = linkWhatsapp(treino.whatsapp, mensagemDeResposta(treino, hoje));
  const esforco = nomeDoEsforco(treino.esforco);

  return (
    <li className="rounded-2xl border border-linha bg-tinta-2 p-5">
      <div className="flex flex-wrap items-start gap-4">
        <Avatar nome={treino.aluno} />

        <div className="min-w-[20ch] flex-1">
          {/* O nome nao e link. Vira alvo de 17px de altura, abaixo do piso
              de 44px, e o cartao ja tem o botao "Abrir a ficha" logo abaixo. */}
          <p className="text-base font-semibold">{treino.aluno}</p>
          <p className="mt-1 text-sm text-nevoa">{resumoEmNumeros(treino)}</p>
        </div>

        <div className="text-right">
          <p className="font-display text-lg uppercase leading-none tracking-wide">
            {treino.bloco}
          </p>
          <p className="mt-1.5 font-mono text-[13px] tabular text-nevoa">
            {treino.hora}
            {treino.foco ? ` · ${treino.foco}` : ""}
          </p>
        </div>
      </div>

      {(esforco || treino.peso_kg !== null) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {esforco && <Pilula tom={tomDoEsforco(treino.esforco)}>{esforco}</Pilula>}
          {treino.peso_kg !== null && (
            <Pilula>{`${String(treino.peso_kg).replace(".", ",")} kg no dia`}</Pilula>
          )}
        </div>
      )}

      {treino.nota && (
        <div className="mt-4">
          <Recado texto={treino.nota} />
        </div>
      )}

      <div className="mt-4 border-t border-linha pt-4">
        <OQueFoiFeito treino={treino} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2.5">
        {zap ? (
          <BotaoLink
            href={zap}
            target="_blank"
            rel="noreferrer"
            aparencia={treino.nota ? "primario" : "secundario"}
            tamanho="sm"
          >
            {treino.nota ? "Responder" : "Mandar mensagem"}
          </BotaoLink>
        ) : (
          <span className="inline-flex min-h-11 items-center text-sm text-nevoa">
            Sem WhatsApp cadastrado
          </span>
        )}
        <BotaoLink
          href={`/painel/alunos/${treino.alunoId}/ficha`}
          aparencia="secundario"
          tamanho="sm"
        >
          Abrir a ficha
        </BotaoLink>
      </div>
    </li>
  );
}

/** Os dois filtros. São link, e não botão, para o estado caber na URL. */
function Filtros({ soRecado, recados }: { soRecado: boolean; recados: number }) {
  const base =
    "inline-flex min-h-11 items-center rounded-xl border px-4 text-[15px] font-semibold transition-colors";
  const aceso = "border-raio bg-raio/12 text-raio-forte";
  const apagado = "border-contorno text-nevoa hover:border-nevoa hover:text-papel";

  return (
    <div className="flex flex-wrap gap-2.5">
      <Link
        href="/painel/treinos"
        aria-current={soRecado ? undefined : "page"}
        className={`${base} ${soRecado ? apagado : aceso}`}
      >
        Todos os treinos
      </Link>
      <Link
        href="/painel/treinos?recado=1"
        aria-current={soRecado ? "page" : undefined}
        className={`${base} ${soRecado ? aceso : apagado}`}
      >
        Só com recado{recados > 0 ? ` (${recados})` : ""}
      </Link>
    </div>
  );
}

export type DadosDosTreinos = {
  dias: DiaDoFeed[];
  hoje: string;
  total: number;
  recados: number;
  soRecado: boolean;
  temAluno: boolean;
};

export function VisaoDosTreinos({
  dias,
  hoje,
  total,
  recados,
  soRecado,
  temAluno,
}: DadosDosTreinos) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <h1 className="font-display text-3xl uppercase leading-none tracking-wide">Treinos</h1>
          <p className="mt-2.5 text-[15px] text-nevoa">
            {/* Sem "· N com recado": o número já está no filtro logo abaixo,
                e lá ele é clicável. */}
            {total === 0
              ? `Nenhum treino registrado nos últimos ${DIAS_DO_FEED} dias.`
              : `${total} ${total === 1 ? "treino" : "treinos"} nos últimos ${DIAS_DO_FEED} dias`}
          </p>
        </div>
        <div className="ml-auto">
          <BotaoLink href="/painel" aparencia="secundario">
            Voltar ao painel
          </BotaoLink>
        </div>
      </div>

      {total > 0 && <Filtros soRecado={soRecado} recados={recados} />}

      {dias.length === 0 ? (
        <section className="rounded-2xl border border-linha bg-tinta-2 px-6 py-16 text-center">
          <p className="mx-auto max-w-[52ch] text-[15px] leading-relaxed text-nevoa">
            {soRecado
              ? "Ninguém deixou recado nesse período. O campo aparece para o aluno no fim do treino, e é opcional de propósito: obrigar a escrever faria ele fechar o app sem registrar nada."
              : temAluno
                ? `Nenhum aluno concluiu treino nos últimos ${DIAS_DO_FEED} dias. Quem está sumido há uma semana ou mais já aparece na fila de atenção do painel.`
                : "Nenhum aluno cadastrado ainda. Assim que o primeiro entrar e fechar um treino, ele aparece aqui com o que fez e o que escreveu."}
          </p>
          {soRecado && (
            <div className="mt-5 flex justify-center">
              <BotaoLink href="/painel/treinos" aparencia="secundario">
                Ver todos os treinos
              </BotaoLink>
            </div>
          )}
        </section>
      ) : (
        dias.map((dia) => (
          <section key={dia.data} className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.07em] text-nevoa">
                {dia.rotulo}
              </h2>
              <span className="h-px flex-1 bg-linha" />
              <span className="font-mono text-[13px] tabular text-nevoa">
                {dia.treinos.length} {dia.treinos.length === 1 ? "treino" : "treinos"}
              </span>
            </div>

            <ul className="flex flex-col gap-3">
              {dia.treinos.map((t) => (
                <CartaoDeTreino key={t.id} treino={t} hoje={hoje} />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

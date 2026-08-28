
import { Raio } from "@/components/raio";
import { Aviso, Botao, BotaoLink, Cartao, Pilula, Rotulo } from "@/components/ui";
import { NOME_DO_METODO, emMinutos } from "@/lib/ficha";
import {
  duracaoEstimada,
  porExtenso,
  progresso,
  type BlocoDoAluno,
  type ItemDoTreino,
  type SerieFeita,
} from "@/lib/treino";
import { ComecarTreino } from "./comecar";
import type { ProtocoloDoAluno } from "./carregar";

/* ------------------------------------------------------------------ */
/* Peças                                                               */
/* ------------------------------------------------------------------ */

export function Titulo({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="font-display text-[30px] uppercase leading-[0.95] tracking-wide">{children}</h1>
  );
}

function Barra({ fracao }: { fracao: number }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-tinta-3" aria-hidden="true">
      <div
        className="h-full rounded-full bg-raio transition-[width] duration-300"
        style={{ width: `${Math.round(fracao * 100)}%` }}
      />
    </div>
  );
}

function LinhaDoExercicio({ item, feito }: { item: ItemDoTreino; feito?: boolean }) {
  return (
    <li className="flex items-baseline gap-3 border-t border-linha py-2.5 first:border-t-0">
      <span
        aria-hidden="true"
        className={`h-2 w-2 flex-none translate-y-[-2px] rotate-45 rounded-[1px] ${
          feito ? "bg-ok" : "bg-nevoa/50"
        }`}
      />
      <span className={`min-w-0 flex-1 text-[15px] ${feito ? "text-nevoa" : "text-papel"}`}>
        {item.nome}
      </span>
      <span className="flex-none font-mono text-[13px] tabular text-nevoa">
        {item.series}x{item.reps}
      </span>
    </li>
  );
}

function Sequencia({ dias }: { dias: number }) {
  if (dias < 2) return null;
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-raio/40 bg-raio/12 px-3 py-1.5 text-[13px] font-semibold text-raio-forte">
      <Raio className="h-3.5 w-auto" />
      {dias} treinos seguidos
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Aluno de consultoria                                                */
/* ------------------------------------------------------------------ */

export function VisaoDeHoje({
  saudacao,
  primeiroNome,
  hoje,
  sequenciaDeDias,
  diaDeTreino,
  treinouHoje,
  protocolo,
  bloco,
  outros,
  sessaoAberta,
  seriesFeitas,
  acabouDeConcluir,
}: {
  saudacao: string;
  primeiroNome: string;
  hoje: string;
  sequenciaDeDias: number;
  diaDeTreino: boolean;
  treinouHoje: boolean;
  protocolo: ProtocoloDoAluno;
  bloco: BlocoDoAluno | null;
  outros: BlocoDoAluno[];
  sessaoAberta: boolean;
  seriesFeitas: SerieFeita[];
  acabouDeConcluir: boolean;
}) {
  const p = bloco ? progresso(bloco, sessaoAberta ? seriesFeitas : []) : null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Rotulo>{porExtenso(hoje)}</Rotulo>
        <Titulo>
          {saudacao},<br />
          {primeiroNome}
        </Titulo>
        <div className="flex flex-wrap items-center gap-2">
          <Sequencia dias={sequenciaDeDias} />
        </div>
      </header>

      {acabouDeConcluir && (
        <Aviso tom="ok">Treino registrado. O Allisson já vê isso no painel dele.</Aviso>
      )}

      {!bloco && (
        <Cartao>
          <h2 className="text-base font-bold">Sua ficha ainda está sendo montada</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-nevoa">
            O Allisson está preparando seus treinos. Assim que ele publicar, eles aparecem aqui.
          </p>
        </Cartao>
      )}

      {bloco && (
        <Cartao className="overflow-hidden" padding={false}>
          <div className="flex items-start gap-3 border-b border-linha bg-tinta-3 px-5 py-4">
            <div className="min-w-0 flex-1">
              <Rotulo>
                {sessaoAberta
                  ? "Treino em andamento"
                  : treinouHoje
                    ? "Próximo treino"
                    : diaDeTreino
                      ? "Treino de hoje"
                      : "Quando você quiser"}
              </Rotulo>
              <h2 className="mt-1.5 font-display text-[26px] uppercase leading-none tracking-wide">
                {bloco.nome}
              </h2>
              {bloco.foco && <p className="mt-1.5 text-[15px] text-nevoa">{bloco.foco}</p>}
            </div>
            {treinouHoje && !sessaoAberta && <Pilula tom="ok">Feito hoje</Pilula>}
          </div>

          <div className="px-5 py-4">
            <p className="font-mono text-[13px] uppercase tabular tracking-wide text-nevoa">
              {bloco.itens.length} exercícios · {duracaoEstimada(bloco)} min
            </p>

            {sessaoAberta && p && (
              <div className="mt-4 flex flex-col gap-2">
                <Barra fracao={p.fracao} />
                <p className="font-mono text-[13px] tabular text-nevoa">
                  {p.seriesFeitas} de {p.seriesPrescritas} séries
                </p>
              </div>
            )}

            <ul className="mt-4">
              {bloco.itens.slice(0, 4).map((i) => (
                <LinhaDoExercicio key={i.id} item={i} />
              ))}
            </ul>
            {bloco.itens.length > 4 && (
              <p className="mt-1 text-sm text-nevoa">
                e mais {bloco.itens.length - 4} exercícios
              </p>
            )}

            <div className="mt-5">
              {sessaoAberta ? (
                <BotaoLink href="/app/treino" largura="cheia">
                  Continuar treino
                </BotaoLink>
              ) : (
                <ComecarTreino blocoId={bloco.id}>
                  {treinouHoje ? "Treinar de novo" : "Começar treino"}
                </ComecarTreino>
              )}
            </div>
          </div>
        </Cartao>
      )}

      {!diaDeTreino && !sessaoAberta && !treinouHoje && bloco && (
        <p className="text-[15px] leading-relaxed text-nevoa">
          Hoje não é um dos dias que você marcou na anamnese. Descanso faz parte do treino, mas se
          quiser treinar hoje é só começar.
        </p>
      )}

      {protocolo.observacoes && (
        <Cartao className="border-raio/40 bg-raio/[0.07]">
          <Rotulo className="text-raio-forte">Recado do Allisson</Rotulo>
          <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-papel">
            {protocolo.observacoes}
          </p>
        </Cartao>
      )}

      {outros.length > 0 && (
        <section className="flex flex-col gap-3">
          <Rotulo>Outros treinos da sua ficha</Rotulo>
          <ul className="flex flex-col gap-2">
            {outros.map((b) => (
              <li key={b.id}>
                <div className="flex items-center gap-3 rounded-xl border border-linha bg-tinta-2 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{b.nome}</p>
                    <p className="font-mono text-[13px] tabular text-nevoa">
                      {b.itens.length} exercícios
                    </p>
                  </div>
                  {!sessaoAberta && (
                    <ComecarTreino blocoId={b.id} aparencia="secundario" largura="auto">
                      Treinar
                    </ComecarTreino>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Aluno de planilha                                                   */
/* ------------------------------------------------------------------ */

/**
 * Quem comprou planilha comprou um produto, não acompanhamento: vê a ficha e
 * os vídeos, e não tem check-in nem evolução. A tela é a mesma ficha, aberta.
 */
export function VisaoDaPlanilha({
  primeiroNome,
  protocolo,
  blocos,
}: {
  primeiroNome: string;
  protocolo: ProtocoloDoAluno;
  blocos: BlocoDoAluno[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Rotulo>Sua planilha</Rotulo>
        <Titulo>{protocolo.nome}</Titulo>
        <p className="text-[15px] leading-relaxed text-nevoa">
          Bom treino, {primeiroNome}. Toque no exercício para ver o vídeo de execução.
        </p>
      </header>

      {protocolo.observacoes && (
        <Cartao className="border-raio/40 bg-raio/[0.07]">
          <Rotulo className="text-raio-forte">Orientação</Rotulo>
          <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-papel">
            {protocolo.observacoes}
          </p>
        </Cartao>
      )}

      {blocos.map((b) => (
        <Cartao key={b.id} padding={false} className="overflow-hidden">
          <div className="border-b border-linha bg-tinta-3 px-5 py-3.5">
            <h2 className="font-display text-[26px] uppercase leading-none tracking-wide">
              {b.nome}
            </h2>
            {b.foco && <p className="mt-1.5 text-[15px] text-nevoa">{b.foco}</p>}
          </div>
          <ul className="px-5">
            {b.itens.map((i) => (
              <li key={i.id} className="border-t border-linha py-3.5 first:border-t-0">
                <div className="flex items-baseline gap-3">
                  <p className="min-w-0 flex-1 font-semibold">{i.nome}</p>
                  <span className="flex-none font-mono text-[13px] tabular text-nevoa">
                    {i.series}x{i.reps}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[13px] uppercase tabular tracking-wide text-nevoa">
                  Descanso {emMinutos(i.descanso_seg)}
                  {i.metodo !== "normal" && ` · ${NOME_DO_METODO[i.metodo]}`}
                </p>
                {i.observacao && (
                  <p className="mt-1.5 text-[15px] leading-relaxed text-nevoa">{i.observacao}</p>
                )}
                {i.video_url && (
                  <a
                    href={i.video_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex min-h-11 items-center text-[15px] font-semibold text-raio-forte underline underline-offset-4"
                  >
                    Ver vídeo de execução
                  </a>
                )}
              </li>
            ))}
          </ul>
        </Cartao>
      ))}

      {!blocos.length && (
        <Cartao>
          <h2 className="text-base font-bold">Sua planilha ainda está sendo montada</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-nevoa">
            Assim que o Allisson publicar, ela aparece aqui.
          </p>
        </Cartao>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Estados antes de existir ficha                                      */
/* ------------------------------------------------------------------ */

export function SemAnamnese({
  primeiroNome,
  comecou,
}: {
  primeiroNome: string;
  comecou: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Rotulo>{comecou ? "Você parou no meio" : "Primeiro passo"}</Rotulo>
        <Titulo>Fala, {primeiroNome}</Titulo>
      </header>

      <Cartao className="border-raio/50 bg-gradient-to-br from-raio/[0.14] to-raio/[0.04]">
        <h2 className="font-display text-[26px] uppercase leading-none tracking-wide">
          Sua ficha inicial
        </h2>
        <p className="mt-2.5 text-[15px] leading-relaxed text-nevoa">
          {comecou
            ? "Suas respostas ficaram guardadas. Continue de onde parou para o Allisson montar seu treino."
            : "Antes do primeiro treino o Allisson precisa te conhecer melhor. Leva uns 4 minutos e você só responde uma vez."}
        </p>
        <BotaoLink href="/anamnese" largura="cheia" className="mt-5">
          {comecou ? "Continuar de onde parei" : "Começar minha ficha"}
        </BotaoLink>
      </Cartao>
    </div>
  );
}

export function EsperandoFicha({ primeiroNome }: { primeiroNome: string }) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Rotulo>Anamnese enviada</Rotulo>
        <Titulo>Fala, {primeiroNome}</Titulo>
      </header>

      <Cartao>
        <h2 className="text-base font-bold">O Allisson recebeu suas respostas</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-nevoa">
          Agora ele monta sua ficha. Assim que publicar, o treino do dia aparece nesta tela.
        </p>
      </Cartao>
    </div>
  );
}

export function AcessoSuspenso({ nome }: { nome: string }) {
  return (
    <div className="flex flex-col gap-6">
      <Titulo>Acesso pausado</Titulo>
      <Cartao>
        <p className="text-[15px] leading-relaxed text-nevoa">
          {nome}, sua mensalidade está em aberto e o acesso ao treino ficou pausado. Nada do que
          você registrou foi apagado: assim que o pagamento for confirmado, tudo volta como estava.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-nevoa">
          Fale com o Allisson para regularizar.
        </p>
      </Cartao>
      <form action="/auth/sair" method="post">
        <Botao type="submit" aparencia="secundario" largura="cheia">
          Sair
        </Botao>
      </form>
    </div>
  );
}

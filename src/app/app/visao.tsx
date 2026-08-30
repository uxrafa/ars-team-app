import { Aviso, Botao, BotaoLink, Cartao } from "@/components/ui";
import { comDiaDaSemana, curtaComMes, type BlocoDoAluno, type DiaDaFaixa } from "@/lib/treino";
import { CartaoDoTreino } from "./cartao-treino";
import { CartaoDaPlanilha } from "./cartao-planilha";
import { Meta, Selo } from "./pecas";
import type { ProtocoloDoAluno } from "./carregar";

/* ------------------------------------------------------------------ */
/* Peças                                                               */
/* ------------------------------------------------------------------ */

/** Título de tela: Tanker, 30px, entrelinha fechada. É o do artboard. */
export function Titulo({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="font-display text-[30px] uppercase leading-none tracking-wide">{children}</h1>
  );
}

const NOME_DO_ESTADO: Record<DiaDaFaixa["estado"], string> = {
  feito: "treinou",
  hoje: "hoje",
  previsto: "dia de treino",
  descanso: "descanso",
};

/**
 * A semana em sete bolinhas.
 *
 * Diz em um relance o que a sequência dizia em texto, e diz melhor: mostra
 * onde estão os buracos. Bolinha apagada em dia que não é de treino é folga
 * combinada, não falta.
 */
function FaixaDaSemana({ dias }: { dias: DiaDaFaixa[] }) {
  return (
    <div className="flex justify-between px-0.5" aria-label="Sua semana">
      {dias.map((d) => (
        <div key={d.data} className="flex flex-col items-center gap-1.5">
          <span
            className={`flex h-[26px] w-[26px] items-center justify-center rounded-full ${
              d.estado === "feito"
                ? "bg-raio"
                : d.estado === "hoje"
                  ? "border-2 border-raio ring-[3px] ring-raio/15"
                  : d.estado === "descanso"
                    ? "bg-tinta-3"
                    : "border border-linha"
            }`}
          >
            {d.estado === "feito" && (
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-[13px] w-[13px] text-papel"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            )}
            <span className="sr-only">
              {curtaComMes(d.data)}: {NOME_DO_ESTADO[d.estado]}
            </span>
          </span>
          <span
            aria-hidden="true"
            className={`font-mono text-[11px] ${
              d.estado === "hoje" ? "font-bold text-papel" : "text-nevoa"
            }`}
          >
            {d.letra}
          </span>
        </div>
      ))}
    </div>
  );
}

function CartaoDoRecado({ texto, quando }: { texto: string; quando: string }) {
  return (
    <section className="flex gap-3 rounded-2xl border border-linha bg-tinta-2 px-[17px] py-[15px]">
      <span
        aria-hidden="true"
        className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full border border-linha bg-tinta-3 text-xs font-bold"
      >
        AS
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-[7px]">
          <span className="text-[13.5px] font-bold">Allisson</span>
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-raio" />
          {quando && <Meta className="ml-auto normal-case">{quando}</Meta>}
        </div>
        <p className="mt-1 whitespace-pre-line text-[13.5px] leading-[1.45] text-nevoa">{texto}</p>
      </div>
    </section>
  );
}

function CartaoDeCheckin({ feito }: { feito: boolean }) {
  return (
    <section className="flex items-center gap-3.5 rounded-2xl border border-linha bg-tinta-2 px-[18px] py-4">
      <span
        aria-hidden="true"
        className={`flex h-10 w-10 flex-none items-center justify-center rounded-full border ${
          feito ? "border-ok/40 bg-ok/10" : "border-linha"
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          className={`h-[18px] w-[18px] ${feito ? "text-ok" : "text-nevoa"}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      </span>
      {/* Sem a linha "Peso, esforço e como você se sentiu": ela descrevia o
          formulário que abre no toque seguinte, e a pílula ao lado já diz o
          que importa aqui, que é se falta fazer. */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Check-in de hoje</p>
      </div>
      <span
        className={`flex-none rounded-full px-3.5 py-2 text-xs font-semibold ${
          feito ? "border border-ok/40 bg-ok/12 text-ok" : "border border-contorno text-nevoa"
        }`}
      >
        {feito ? "Feito" : "Pendente"}
      </span>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Aluno de consultoria                                                */
/* ------------------------------------------------------------------ */

export function VisaoDeHoje({
  primeiroNome,
  hoje,
  dias,
  diaDeTreino,
  treinouHoje,
  protocolo,
  blocos,
  sugerido,
  sessaoAberta,
  seriesFeitas,
  seriesPrescritas,
  ultimaCarga,
  recadoQuando,
  acabouDeConcluir,
}: {
  primeiroNome: string;
  hoje: string;
  dias: DiaDaFaixa[];
  diaDeTreino: boolean;
  treinouHoje: boolean;
  protocolo: ProtocoloDoAluno;
  blocos: BlocoDoAluno[];
  sugerido: string;
  sessaoAberta: boolean;
  seriesFeitas: number;
  seriesPrescritas: number;
  ultimaCarga: Record<string, number>;
  recadoQuando: string | null;
  acabouDeConcluir: boolean;
}) {
  return (
    <div className="flex flex-col gap-3.5">
      <header>
        <Meta className="normal-case tracking-[0.07em]">{comDiaDaSemana(hoje)}</Meta>
        <div className="mt-1.5">
          <Titulo>Fala, {primeiroNome}</Titulo>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <Selo tom="raio">Consultoria</Selo>
          {protocolo.fim && <Meta>Ficha até {curtaComMes(protocolo.fim)}</Meta>}
        </div>
      </header>

      {acabouDeConcluir && (
        <Aviso tom="ok">Treino registrado. O Allisson já vê isso no painel dele.</Aviso>
      )}

      <FaixaDaSemana dias={dias} />

      {blocos.length > 0 ? (
        <CartaoDoTreino
          blocos={blocos}
          sugerido={sugerido}
          sessaoAberta={sessaoAberta}
          seriesFeitas={seriesFeitas}
          seriesPrescritas={seriesPrescritas}
          ultimaCarga={ultimaCarga}
          treinouHoje={treinouHoje}
          diaDeTreino={diaDeTreino}
        />
      ) : (
        <Cartao>
          <h2 className="text-base font-bold">Sua ficha ainda está sendo montada</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-nevoa">
            O Allisson está preparando seus treinos. Assim que ele publicar, eles aparecem aqui.
          </p>
        </Cartao>
      )}

      {protocolo.observacoes && (
        <CartaoDoRecado texto={protocolo.observacoes} quando={recadoQuando ?? ""} />
      )}

      <CartaoDeCheckin feito={treinouHoje} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Aluno de planilha                                                   */
/* ------------------------------------------------------------------ */

/** Sem gateway definido, "conhecer a consultoria" é conversa no WhatsApp. */
const WHATSAPP_DO_ALLISSON = "https://wa.me/5514997644001";

export function VisaoDaPlanilha({
  primeiroNome,
  acessoAte,
  protocolo,
  blocos,
}: {
  primeiroNome: string;
  acessoAte: string | null;
  protocolo: ProtocoloDoAluno;
  blocos: BlocoDoAluno[];
}) {
  const exercicios = blocos.reduce((s, b) => s + b.itens.length, 0);
  const comVideo = blocos.reduce((s, b) => s + b.itens.filter((i) => i.video_url).length, 0);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <Titulo>Fala, {primeiroNome}</Titulo>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <Selo tom="neutro">Planilha</Selo>
          {acessoAte && <Meta>Acesso até {curtaComMes(acessoAte)}</Meta>}
        </div>
      </header>

      {blocos.length ? (
        <CartaoDaPlanilha
          nome={protocolo.nome}
          resumo={
            comVideo
              ? `${exercicios} exercícios, ${comVideo} com vídeo de execução`
              : `${exercicios} exercícios`
          }
          blocos={blocos}
        />
      ) : (
        <Cartao>
          <h2 className="text-base font-bold">Sua planilha ainda está sendo montada</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-nevoa">
            Assim que o Allisson publicar, ela aparece aqui.
          </p>
        </Cartao>
      )}

      {protocolo.observacoes && (
        <Cartao>
          <Meta tom="raio">Orientação</Meta>
          <p className="mt-2 whitespace-pre-line text-[13.5px] leading-relaxed text-nevoa">
            {protocolo.observacoes}
          </p>
        </Cartao>
      )}

      <section className="rounded-2xl border border-raio/[0.32] bg-gradient-to-br from-raio/[0.13] to-raio/[0.03] p-[18px]">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-raio-forte" fill="currentColor">
            <path d="M13.5 2 4 13.5h5.2L8 22l10-12h-5.4l1.9-8z" />
          </svg>
          <Meta tom="raio">Consultoria</Meta>
        </div>
        <h2 className="mt-2.5 text-base font-bold leading-snug">
          Quer o Allisson montando pro seu caso?
        </h2>
        <p className="mt-2 text-[13.5px] leading-[1.5] text-nevoa">
          Ficha feita a partir da sua anamnese, ajuste todo mês e o chat aberto com ele para tirar
          dúvida na hora do treino.
        </p>
        <BotaoLink
          href={WHATSAPP_DO_ALLISSON}
          target="_blank"
          rel="noreferrer"
          largura="cheia"
          className="mt-3.5"
        >
          Conhecer a consultoria
        </BotaoLink>
      </section>
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
    <div className="flex flex-col gap-5">
      <header>
        <Meta tom="raio">{comecou ? "Você parou no meio" : "Primeiro passo"}</Meta>
        <div className="mt-1.5">
          <Titulo>Fala, {primeiroNome}</Titulo>
        </div>
      </header>

      <section className="rounded-2xl border border-raio/50 bg-gradient-to-br from-raio/[0.14] to-raio/[0.04] p-[18px]">
        <h2 className="text-[17px] font-bold">Sua ficha inicial</h2>
        <p className="mt-2 text-[13.5px] leading-[1.5] text-nevoa">
          {comecou
            ? "Suas respostas ficaram guardadas. Continue de onde parou para o Allisson montar seu treino."
            : "Antes do primeiro treino o Allisson precisa te conhecer melhor. Leva uns 4 minutos e você só responde uma vez."}
        </p>
        <BotaoLink href="/anamnese" largura="cheia" className="mt-3.5">
          {comecou ? "Continuar de onde parei" : "Começar minha ficha"}
        </BotaoLink>
      </section>
    </div>
  );
}

export function EsperandoFicha({ primeiroNome }: { primeiroNome: string }) {
  return (
    <div className="flex flex-col gap-5">
      <header>
        <Meta>Anamnese enviada</Meta>
        <div className="mt-1.5">
          <Titulo>Fala, {primeiroNome}</Titulo>
        </div>
      </header>

      <Cartao>
        <h2 className="text-[17px] font-bold">O Allisson recebeu suas respostas</h2>
        <p className="mt-2 text-[13.5px] leading-[1.5] text-nevoa">
          Agora ele monta sua ficha. Assim que publicar, o treino do dia aparece nesta tela.
        </p>
      </Cartao>
    </div>
  );
}

export function AcessoSuspenso({ nome }: { nome: string }) {
  return (
    <div className="flex flex-col gap-5">
      <Titulo>Acesso pausado</Titulo>
      <Cartao>
        <p className="text-[13.5px] leading-[1.5] text-nevoa">
          {nome}, sua mensalidade está em aberto e o acesso ao treino ficou pausado. Nada do que
          você registrou foi apagado: assim que o pagamento for confirmado, tudo volta como estava.
        </p>
        <p className="mt-3 text-[13.5px] leading-[1.5] text-nevoa">
          Fale com o Allisson para regularizar.
        </p>
        <BotaoLink
          href={WHATSAPP_DO_ALLISSON}
          target="_blank"
          rel="noreferrer"
          largura="cheia"
          className="mt-4"
        >
          Falar com o Allisson
        </BotaoLink>
      </Cartao>
      <form action="/auth/sair" method="post">
        <Botao type="submit" aparencia="fantasma" largura="cheia">
          Sair
        </Botao>
      </form>
    </div>
  );
}

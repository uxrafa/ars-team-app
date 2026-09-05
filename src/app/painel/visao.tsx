import Link from "next/link";
import { BotaoLink, Pilula, type Tom } from "@/components/ui";
import {
  ACAO_MOTIVO,
  ROTULO_MOTIVO,
  URGENTE,
  emReais,
  iniciais,
  linkWhatsapp,
  quantosAlunosNaFila,
  type Aluno,
  type EventoDoDia,
  type ItemAtencao,
  type Resumo,
} from "@/lib/painel";

const TOM_DO_MOTIVO: Record<string, Tom> = {
  pagamento: "urgente",
  sem_ficha: "urgente",
  ficha_vencendo: "aviso",
  sumido: "neutro",
};

/**
 * Cartao de numero do painel.
 *
 * `detalhe` e opcional de proposito: a linha de apoio so existe quando diz o
 * que o numero nao diz. "ninguem devendo" embaixo de um zero e o mesmo fato
 * duas vezes, e some.
 *
 * `quieto` e para cartao de PENDENCIA zerado: nada a fazer, entao ele recua
 * em vez de gritar junto com os outros. Cartao de contagem (alunos, check-ins)
 * nunca recua, porque ali zero e noticia ruim e nao silencio.
 */
function Cartao({
  rotulo,
  valor,
  detalhe,
  tom = "normal",
  quieto = false,
}: {
  rotulo: string;
  valor: React.ReactNode;
  detalhe?: string | null;
  tom?: "normal" | "urgente" | "aviso";
  quieto?: boolean;
}) {
  const moldura =
    tom === "urgente"
      ? "border-raio/40 bg-gradient-to-br from-raio/[0.12] to-raio/[0.03]"
      : tom === "aviso"
        ? "border-alerta/40 bg-alerta/[0.07]"
        : "border-linha bg-tinta-2";
  const cor = quieto
    ? "text-nevoa-fraca"
    : tom === "urgente"
      ? "text-raio-forte"
      : tom === "aviso"
        ? "text-alerta"
        : "text-papel";

  return (
    <div className={`rounded-2xl border p-5 ${moldura}`}>
      <p className={`text-xs font-semibold uppercase tracking-[0.07em] ${tom === "normal" ? "text-nevoa" : cor}`}>
        {rotulo}
      </p>
      <p className={`mt-3 font-display text-[42px] leading-none tabular ${cor}`}>{valor}</p>
      {detalhe && <p className="mt-2 text-sm leading-snug text-nevoa">{detalhe}</p>}
    </div>
  );
}

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

function LinhaAtencao({ item }: { item: ItemAtencao }) {
  const { aluno, motivo, detalhe } = item;
  const primeiroNome = aluno.nome.split(" ")[0] || "tudo bem";

  const mensagem =
    motivo === "pagamento"
      ? `Oi ${primeiroNome}, tudo bem? Passando para lembrar da mensalidade da consultoria. Qualquer coisa me chama.`
      : `Oi ${primeiroNome}, tudo bem? Faz uns dias que nao vejo treino seu. Ta precisando de algum ajuste na ficha?`;

  const zap = linkWhatsapp(aluno.whatsapp, mensagem);
  const acionavelPorZap = motivo === "pagamento" || motivo === "sumido";

  return (
    <li className="flex items-center gap-4 border-t border-linha px-5 py-4 first:border-t-0 hover:bg-tinta-3/40">
      <Avatar nome={aluno.nome} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold">{aluno.nome}</p>
        <p className="mt-1 truncate text-sm text-nevoa">{detalhe}</p>
      </div>
      <span className="flex-none">
        <Pilula tom={TOM_DO_MOTIVO[motivo]}>{ROTULO_MOTIVO[motivo]}</Pilula>
      </span>
      {acionavelPorZap && zap ? (
        <BotaoLink
          href={zap}
          target="_blank"
          rel="noreferrer"
          aparencia={URGENTE[motivo] ? "primario" : "secundario"}
          tamanho="sm"
          className="w-[112px] flex-none"
        >
          {ACAO_MOTIVO[motivo]}
        </BotaoLink>
      ) : acionavelPorZap ? (
        <span className="w-[112px] flex-none text-center text-sm text-nevoa">Sem WhatsApp</span>
      ) : (
        // "Sem ficha" e "Renovar" levam direto para o editor daquele aluno.
        <BotaoLink
          href={`/painel/alunos/${aluno.id}/ficha`}
          aparencia={URGENTE[motivo] ? "primario" : "secundario"}
          tamanho="sm"
          className="w-[112px] flex-none"
        >
          {ACAO_MOTIVO[motivo]}
        </BotaoLink>
      )}
    </li>
  );
}

export type DadosDaVisao = {
  saudacao: string;
  atencao: ItemAtencao[];
  r: Resumo;
  alunos: Aluno[];
  eventos: EventoDoDia[];
};

export function VisaoDoPainel({ saudacao, atencao, r, alunos, eventos }: DadosDaVisao) {
  // Quanto da carteira esta em dia. Nao e "quanto foi recebido": ver a nota
  // em `resumo()`, em lib/painel.ts.
  const percentualEmDia =
    r.mensalidadesEmDia + r.emAberto > 0
      ? Math.round((r.mensalidadesEmDia / (r.mensalidadesEmDia + r.emAberto)) * 100)
      : 100;

  // A frase conta PESSOAS. Um aluno pode estar na fila por dois motivos, e
  // "5 coisas precisam de voce" nao e o que ele quer saber.
  const naFila = quantosAlunosNaFila(atencao);
  const emDia = Math.max(0, r.total - naFila);

  // Recado e a unica coisa desta coluna que alguem escreveu a mao. Merece
  // contagem propria, senao se perde no meio dos check-ins.
  const recadosHoje = eventos.filter((e) => e.recado).length;

  const faltamTreinar = Math.max(0, r.previstosHoje - r.checkinsHoje);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <h1 className="font-display text-3xl uppercase leading-none tracking-wide">
            {saudacao}, Allisson
          </h1>
          <p className="mt-2.5 text-[15px] text-nevoa">
            {naFila === 0
              ? "Nada pendente por aqui. Bom sinal."
              : `${naFila} ${naFila === 1 ? "aluno precisa" : "alunos precisam"} de você hoje.`}
          </p>
        </div>
        <div className="ml-auto">
          <BotaoLink href="/painel/convites" aparencia="secundario">
            Convidar aluno
          </BotaoLink>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Cartao
          rotulo="Alunos ativos"
          valor={r.total}
          // A repartição só informa quando existem os dois planos. Com todo
          // mundo na consultoria, "0 planilha" é uma linha para não dizer nada.
          detalhe={
            r.consultoria > 0 && r.planilha > 0
              ? `${r.consultoria} consultoria · ${r.planilha} planilha`
              : null
          }
        />
        <Cartao
          rotulo="Pagamentos pendentes"
          valor={r.vencidos}
          tom={r.vencidos > 0 ? "urgente" : "normal"}
          quieto={r.vencidos === 0}
          detalhe={
            r.vencidos === 0
              ? null
              : r.emAberto > 0
                ? `${emReais(r.emAberto)} em aberto${r.semValor ? " (falta valor de alguém)" : ""}`
                : "sem valor de mensalidade cadastrado"
          }
        />
        {/* "nos próximos 7 dias" era a definição da métrica, não um dado.
            Definição pertence ao rótulo. */}
        <Cartao
          rotulo="Fichas vencendo em 7 dias"
          valor={r.fichasVencendo}
          tom={r.fichasVencendo > 0 ? "aviso" : "normal"}
          quieto={r.fichasVencendo === 0}
        />
        <Cartao
          rotulo="Check-ins hoje"
          valor={
            <>
              {r.checkinsHoje}
              <span className="text-xl text-nevoa">/{r.previstosHoje}</span>
            </>
          }
          // O "4/9" já diz quantos faltam. A linha só aparece quando falta
          // alguém, que é quando ela vira tarefa.
          detalhe={
            faltamTreinar > 0
              ? `${faltamTreinar} ainda não ${faltamTreinar === 1 ? "treinou" : "treinaram"}`
              : null
          }
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.75fr_1fr]">
        <section className="flex flex-col overflow-hidden rounded-2xl border border-linha bg-tinta-2">
          <div className="flex items-center gap-3 border-b border-linha px-5 py-4">
            <h2 className="text-lg font-bold">Precisa da sua atenção</h2>
            {atencao.length > 0 && (
              <span className="rounded-full bg-raio-solido px-3 py-1 text-[13px] font-bold text-papel">
                {atencao.length}
              </span>
            )}
          </div>

          {atencao.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2.5 px-6 py-14 text-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-nevoa" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M8.5 12.5 11 15l4.5-5" />
              </svg>
              <p className="max-w-[40ch] text-[15px] leading-relaxed text-nevoa">
                {r.total === 0
                  ? "Nenhum aluno cadastrado ainda. Assim que o primeiro entrar, ele aparece aqui."
                  : "Todo mundo com pagamento em dia, ficha válida e check-in recente."}
              </p>
            </div>
          ) : (
            <>
              <ul className="flex-1">
                {atencao.map((item, i) => (
                  <LinhaAtencao key={`${item.aluno.id}-${item.motivo}-${i}`} item={item} />
                ))}
              </ul>

              {/* O contraponto da fila: quem NAO precisa de nada. Sem isto a
                  tela so mostra problema e some com a parte que esta indo bem. */}
              {emDia > 0 && (
                <div className="flex flex-col items-center gap-2 border-t border-linha px-6 py-6 text-center">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-nevoa" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M8.5 12.5 11 15l4.5-5" />
                  </svg>
                  <p className="max-w-[46ch] text-[15px] leading-relaxed text-nevoa">
                    {emDia === 1 ? "O outro aluno está em dia." : `Os outros ${emDia} estão em dia.`}
                  </p>
                </div>
              )}
            </>
          )}

          {r.total > 0 && (
            <Link
              href="/painel/alunos"
              className="border-t border-linha px-5 py-4 text-[15px] font-semibold text-raio-forte transition-colors hover:bg-tinta-3/40"
            >
              Ver todos os {r.total} alunos
            </Link>
          )}
        </section>

        <div className="flex flex-col gap-5">
          <section className="rounded-2xl border border-linha bg-tinta-2 p-5">
            <div className="flex items-baseline">
              <p className="text-xs font-semibold uppercase tracking-[0.07em] text-nevoa">
                Mensalidades em dia
              </p>
              <p className="ml-auto font-mono text-[13px] text-nevoa">
                {percentualEmDia}%
              </p>
            </div>
            <p className="mt-3 font-display text-[34px] leading-none tabular">
              {emReais(r.mensalidadesEmDia)}
            </p>
            <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-tinta-3">
              <div className="bg-ok" style={{ width: `${percentualEmDia}%` }} />
              <div className="bg-raio" style={{ width: `${100 - percentualEmDia}%` }} />
            </div>
            {/* Valor, porcentagem, barra e legenda eram quatro formas de
                dizer o mesmo. Ficaram duas, e o que falta receber só aparece
                quando falta alguma coisa. */}
            {r.emAberto > 0 && (
              <p className="mt-3 text-sm text-nevoa">{emReais(r.emAberto)} em aberto</p>
            )}
            {r.semValor && (
              <p className="mt-3 text-sm leading-relaxed text-nevoa">
                Algum aluno está sem mensalidade cadastrada, então o total ainda não fecha.
              </p>
            )}
          </section>

          <section className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-linha bg-tinta-2">
            <div className="flex items-center gap-3 border-b border-linha px-5 py-4">
              <h2 className="text-lg font-bold">Check-ins de hoje</h2>
              {recadosHoje > 0 && (
                <span className="rounded-full bg-raio-solido px-3 py-1 text-[13px] font-bold text-papel">
                  {recadosHoje} {recadosHoje === 1 ? "recado" : "recados"}
                </span>
              )}
            </div>
            {eventos.length === 0 ? (
              <p className="flex-1 px-5 py-10 text-center text-[15px] leading-relaxed text-nevoa">
                Ninguém treinou nem chegou hoje ainda.
              </p>
            ) : (
              <ul className="flex-1">
                {eventos.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center gap-3 border-t border-linha px-5 py-3 first:border-t-0"
                  >
                    <span
                      aria-hidden="true"
                      className={`flex h-10 w-10 flex-none items-center justify-center rounded-full border bg-tinta-3 text-[13px] font-bold ${
                        e.chegada ? "border-ok/50 text-ok" : "border-contorno"
                      }`}
                    >
                      {iniciais(e.aluno)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold">{e.aluno}</p>
                      <p className="mt-1 truncate font-mono text-[13px] uppercase text-nevoa">
                        {e.detalhe}
                      </p>
                    </div>
                    {/* A linha nao cabe o texto do recado. Ela avisa que tem
                        um, e quem le e a tela de Treinos. */}
                    <span className="flex flex-none flex-col items-end gap-1">
                      <span className="font-mono text-[13px] uppercase text-nevoa">{e.quando}</span>
                      {e.recado && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-raio-forte">
                          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-raio" />
                          recado
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <Link
              href="/painel/treinos"
              className="border-t border-linha px-5 py-4 text-[15px] font-semibold text-raio-forte transition-colors hover:bg-tinta-3/40"
            >
              {recadosHoje > 0
                ? `Ler o que ${recadosHoje === 1 ? "ele escreveu" : "eles escreveram"}`
                : "Ver os treinos das últimas semanas"}
            </Link>
          </section>
        </div>
      </div>

      {r.total > 0 && alunos.every((a) => a.mensalidade === null && a.acesso_ate === null) && (
        <p className="rounded-2xl border border-linha bg-tinta-2 px-5 py-4 text-[15px] leading-relaxed text-nevoa">
          Nenhum aluno tem data de vencimento nem mensalidade preenchida ainda, então a fila de
          cobrança e o total do mês ficam vazios. Isso se preenche na tela de alunos, e na entrega 2B
          o pagamento passa a atualizar sozinho.{" "}
          <span className="text-nevoa">Ver dias sem check-in e fichas vencendo já funciona.</span>
        </p>
      )}
    </div>
  );
}

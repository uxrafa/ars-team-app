import { BotaoLink, Pilula, type Tom } from "@/components/ui";
import {
  ACAO_MOTIVO,
  ROTULO_MOTIVO,
  emReais,
  iniciais,
  linkWhatsapp,
  quandoFoi,
  type Aluno,
  type ItemAtencao,
  type LinhaSessao,
  type Resumo,
} from "@/lib/painel";

const TOM_DO_MOTIVO: Record<string, Tom> = {
  pagamento: "urgente",
  sem_ficha: "urgente",
  ficha_vencendo: "aviso",
  sumido: "neutro",
};

function Cartao({
  rotulo,
  valor,
  detalhe,
  tom = "normal",
}: {
  rotulo: string;
  valor: React.ReactNode;
  detalhe: string;
  tom?: "normal" | "urgente" | "aviso";
}) {
  const moldura =
    tom === "urgente"
      ? "border-raio/40 bg-gradient-to-br from-raio/[0.12] to-raio/[0.03]"
      : tom === "aviso"
        ? "border-alerta/40 bg-alerta/[0.07]"
        : "border-linha bg-tinta-2";
  const cor =
    tom === "urgente" ? "text-raio-forte" : tom === "aviso" ? "text-alerta" : "text-papel";

  return (
    <div className={`rounded-2xl border p-5 ${moldura}`}>
      <p className={`text-xs font-semibold uppercase tracking-[0.07em] ${tom === "normal" ? "text-nevoa" : cor}`}>
        {rotulo}
      </p>
      <p className={`mt-3 font-display text-[42px] leading-none tabular ${cor}`}>{valor}</p>
      <p className="mt-2 text-sm leading-snug text-nevoa">{detalhe}</p>
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
        <p className="mt-1 truncate text-sm text-nevoa">
          {aluno.tipo === "consultoria" ? "Consultoria" : "Planilha"} · {detalhe}
        </p>
      </div>
      <span className="hidden flex-none sm:block">
        <Pilula tom={TOM_DO_MOTIVO[motivo]}>{ROTULO_MOTIVO[motivo]}</Pilula>
      </span>
      {acionavelPorZap && zap ? (
        <BotaoLink href={zap} target="_blank" rel="noreferrer" tamanho="sm" className="flex-none">
          {ACAO_MOTIVO[motivo]}
        </BotaoLink>
      ) : acionavelPorZap ? (
        <span className="flex-none text-sm text-nevoa">Sem WhatsApp</span>
      ) : (
        <span className="flex-none rounded-xl border border-dashed border-contorno px-3.5 py-2.5 text-sm text-nevoa">
          Editor em breve
        </span>
      )}
    </li>
  );
}

export type DadosDaVisao = {
  saudacao: string;
  hoje: string;
  atencao: ItemAtencao[];
  r: Resumo;
  alunos: Aluno[];
  checkinsRecentes: { sessao: LinhaSessao; aluno: Aluno | undefined }[];
};

export function VisaoDoPainel({ saudacao, hoje, atencao, r, alunos, checkinsRecentes }: DadosDaVisao) {
  const percentualRecebido =
    r.recebidoNoMes + r.emAberto > 0
      ? Math.round((r.recebidoNoMes / (r.recebidoNoMes + r.emAberto)) * 100)
      : 100;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <h1 className="font-display text-3xl uppercase leading-none tracking-wide">
            {saudacao}, Allisson
          </h1>
          <p className="mt-2.5 text-[15px] text-nevoa">
            {atencao.length === 0
              ? "Nada pendente por aqui. Bom sinal."
              : `${atencao.length} ${atencao.length === 1 ? "coisa precisa" : "coisas precisam"} de você hoje.`}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2.5">
          <BotaoLink href="/painel/alunos" aparencia="secundario">
            Ver alunos
          </BotaoLink>
          <BotaoLink href="/painel/convites" aparencia="secundario">
            Convidar aluno
          </BotaoLink>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Cartao
          rotulo="Alunos ativos"
          valor={r.total}
          detalhe={`${r.consultoria} consultoria · ${r.planilha} planilha`}
        />
        <Cartao
          rotulo="Pagamentos pendentes"
          valor={r.vencidos}
          tom={r.vencidos > 0 ? "urgente" : "normal"}
          detalhe={
            r.vencidos === 0
              ? "ninguém devendo"
              : r.emAberto > 0
                ? `${emReais(r.emAberto)} em aberto${r.semValor ? " (falta valor de alguém)" : ""}`
                : "sem valor de mensalidade cadastrado"
          }
        />
        <Cartao
          rotulo="Fichas vencendo"
          valor={r.fichasVencendo}
          tom={r.fichasVencendo > 0 ? "aviso" : "normal"}
          detalhe="nos próximos 7 dias"
        />
        <Cartao
          rotulo="Check-ins hoje"
          valor={
            <>
              {r.checkinsHoje}
              <span className="text-xl text-nevoa">/{r.previstosHoje}</span>
            </>
          }
          detalhe={
            r.previstosHoje === 0
              ? "ninguém tinha treino marcado"
              : `${Math.max(0, r.previstosHoje - r.checkinsHoje)} ainda não treinaram`
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
            <span className="ml-auto hidden text-sm text-nevoa sm:block">
              ordenado por urgência
            </span>
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
            <ul className="flex-1">
              {atencao.map((item, i) => (
                <LinhaAtencao key={`${item.aluno.id}-${item.motivo}-${i}`} item={item} />
              ))}
            </ul>
          )}
        </section>

        <div className="flex flex-col gap-5">
          <section className="rounded-2xl border border-linha bg-tinta-2 p-5">
            <div className="flex items-baseline">
              <p className="text-xs font-semibold uppercase tracking-[0.07em] text-nevoa">
                Mensalidades
              </p>
              <p className="ml-auto font-mono text-[13px] text-nevoa">
                {percentualRecebido}% recebido
              </p>
            </div>
            <p className="mt-3 font-display text-[34px] leading-none tabular">
              {emReais(r.recebidoNoMes)}
            </p>
            <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-tinta-3">
              <div className="bg-ok" style={{ width: `${percentualRecebido}%` }} />
              <div className="bg-raio" style={{ width: `${100 - percentualRecebido}%` }} />
            </div>
            <div className="mt-3 flex flex-wrap gap-4">
              <span className="flex items-center gap-2 text-sm text-nevoa">
                <span className="h-2.5 w-2.5 rounded-[3px] bg-ok" /> Em dia
              </span>
              <span className="flex items-center gap-2 text-sm text-nevoa">
                <span className="h-2.5 w-2.5 rounded-[3px] bg-raio" />
                {r.emAberto > 0 ? `${emReais(r.emAberto)} em aberto` : "nada em aberto"}
              </span>
            </div>
            {r.semValor && (
              <p className="mt-3 text-sm leading-relaxed text-nevoa">
                Algum aluno está sem mensalidade cadastrada, então o total ainda não fecha.
              </p>
            )}
          </section>

          <section className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-linha bg-tinta-2">
            <div className="border-b border-linha px-5 py-4">
              <h2 className="text-lg font-bold">Últimos check-ins</h2>
            </div>
            {checkinsRecentes.length === 0 ? (
              <p className="flex-1 px-5 py-10 text-center text-[15px] text-nevoa">
                Nenhum treino registrado ainda.
              </p>
            ) : (
              <ul>
                {checkinsRecentes.map(({ sessao, aluno }) => (
                  <li key={sessao.id} className="flex items-center gap-3 border-t border-linha px-5 py-3 first:border-t-0">
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-contorno bg-tinta-3 text-[13px] font-bold"
                    >
                      {iniciais(aluno!.nome)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold">{aluno!.nome}</p>
                      <p className="mt-1 font-mono text-[13px] uppercase text-nevoa">
                        {[
                          sessao.peso_kg ? `${sessao.peso_kg} kg` : null,
                          sessao.esforco ? `esforço ${sessao.esforco}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "sem detalhes"}
                      </p>
                    </div>
                    <span className="flex-none font-mono text-[13px] uppercase text-nevoa">
                      {quandoFoi(sessao.data, hoje)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
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

import Link from "next/link";
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

/** Cor de estado, separada do vermelho da marca. */
const TOM = {
  urgente: "border-raio/40 bg-raio/[0.12] text-raio-forte",
  aviso: "border-[#f2b330]/35 bg-[#f2b330]/10 text-[#f2b330]",
  neutro: "border-linha text-nevoa",
} as const;

const TOM_DO_MOTIVO = {
  pagamento: TOM.urgente,
  sem_ficha: TOM.urgente,
  ficha_vencendo: TOM.aviso,
  sumido: TOM.neutro,
} as const;

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
        ? "border-[#f2b330]/35 bg-[#f2b330]/[0.06]"
        : "border-linha bg-tinta-2";
  const cor =
    tom === "urgente" ? "text-raio-forte" : tom === "aviso" ? "text-[#f2b330]" : "text-papel";

  return (
    <div className={`rounded-2xl border p-5 ${moldura}`}>
      <p className={`font-mono text-[10.5px] uppercase tracking-[0.1em] ${tom === "normal" ? "text-nevoa" : cor}`}>
        {rotulo}
      </p>
      <p className={`mt-2 font-display text-4xl leading-none tabular-nums ${cor}`}>{valor}</p>
      <p className="mt-1.5 text-[12.5px] text-nevoa">{detalhe}</p>
    </div>
  );
}

function Avatar({ nome }: { nome: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-linha bg-tinta-3 text-[12.5px] font-bold"
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
    <li className="flex items-center gap-4 border-t border-linha px-5 py-4 first:border-t-0">
      <Avatar nome={aluno.nome} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] font-semibold">{aluno.nome}</p>
        <p className="mt-0.5 truncate text-[12.5px] text-nevoa">
          {aluno.tipo === "consultoria" ? "Consultoria" : "Planilha"} · {detalhe}
        </p>
      </div>
      <span
        className={`hidden flex-none rounded-full border px-3 py-1 text-[11.5px] font-bold sm:block ${TOM_DO_MOTIVO[motivo]}`}
      >
        {ROTULO_MOTIVO[motivo]}
      </span>
      {acionavelPorZap && zap ? (
        <a
          href={zap}
          target="_blank"
          rel="noreferrer"
          className="flex-none rounded-lg bg-raio px-4 py-2 text-[13px] font-semibold text-papel transition hover:bg-raio-forte"
        >
          {ACAO_MOTIVO[motivo]}
        </a>
      ) : acionavelPorZap ? (
        <span className="flex-none text-[12px] text-nevoa">Sem WhatsApp</span>
      ) : (
        <span className="flex-none rounded-lg border border-linha px-3 py-2 text-[12px] text-nevoa">
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
          <p className="mt-2 text-[13.5px] text-nevoa">
            {atencao.length === 0
              ? "Nada pendente por aqui. Bom sinal."
              : `${atencao.length} ${atencao.length === 1 ? "coisa precisa" : "coisas precisam"} de você hoje.`}
          </p>
        </div>
        <Link
          href="/painel/alunos"
          className="ml-auto rounded-lg border border-linha bg-tinta-2 px-5 py-2.5 text-[13.5px] font-semibold transition hover:border-raio"
        >
          Ver alunos
        </Link>
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
            <h2 className="text-[15px] font-bold">Precisa da sua atenção</h2>
            {atencao.length > 0 && (
              <span className="rounded-full bg-raio px-2.5 py-0.5 text-[11.5px] font-bold text-papel">
                {atencao.length}
              </span>
            )}
            <span className="ml-auto hidden font-mono text-[11px] text-nevoa sm:block">
              ordenado por urgência
            </span>
          </div>

          {atencao.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2.5 px-6 py-14 text-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-nevoa" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M8.5 12.5 11 15l4.5-5" />
              </svg>
              <p className="max-w-[38ch] text-[13px] text-nevoa">
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
              <p className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-nevoa">
                Mensalidades
              </p>
              <p className="ml-auto font-mono text-[10.5px] text-nevoa">
                {percentualRecebido}% recebido
              </p>
            </div>
            <p className="mt-2 font-display text-3xl leading-none tabular-nums">
              {emReais(r.recebidoNoMes)}
            </p>
            <div className="mt-3.5 flex h-[7px] overflow-hidden rounded-full bg-tinta-3">
              <div className="bg-[#3ecf8e]" style={{ width: `${percentualRecebido}%` }} />
              <div className="bg-raio" style={{ width: `${100 - percentualRecebido}%` }} />
            </div>
            <div className="mt-3 flex flex-wrap gap-4">
              <span className="flex items-center gap-1.5 text-[12px] text-nevoa">
                <span className="h-2 w-2 rounded-[2px] bg-[#3ecf8e]" /> Em dia
              </span>
              <span className="flex items-center gap-1.5 text-[12px] text-nevoa">
                <span className="h-2 w-2 rounded-[2px] bg-raio" />
                {r.emAberto > 0 ? `${emReais(r.emAberto)} em aberto` : "nada em aberto"}
              </span>
            </div>
            {r.semValor && (
              <p className="mt-3 text-[11.5px] leading-relaxed text-nevoa">
                Algum aluno está sem mensalidade cadastrada, então o total ainda não fecha.
              </p>
            )}
          </section>

          <section className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-linha bg-tinta-2">
            <div className="border-b border-linha px-5 py-4">
              <h2 className="text-[14.5px] font-bold">Últimos check-ins</h2>
            </div>
            {checkinsRecentes.length === 0 ? (
              <p className="flex-1 px-5 py-10 text-center text-[13px] text-nevoa">
                Nenhum treino registrado ainda.
              </p>
            ) : (
              <ul>
                {checkinsRecentes.map(({ sessao, aluno }) => (
                  <li key={sessao.id} className="flex items-center gap-3 border-t border-linha px-5 py-3 first:border-t-0">
                    <span
                      aria-hidden="true"
                      className="flex h-8 w-8 flex-none items-center justify-center rounded-full border border-linha bg-tinta-3 text-[11px] font-bold"
                    >
                      {iniciais(aluno!.nome)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold">{aluno!.nome}</p>
                      <p className="mt-0.5 font-mono text-[11px] uppercase text-nevoa">
                        {[
                          sessao.peso_kg ? `${sessao.peso_kg} kg` : null,
                          sessao.esforco ? `esforço ${sessao.esforco}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "sem detalhes"}
                      </p>
                    </div>
                    <span className="flex-none font-mono text-[10.5px] uppercase text-nevoa">
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
        <p className="rounded-2xl border border-linha bg-tinta-2 px-5 py-4 text-[13px] leading-relaxed text-nevoa">
          Nenhum aluno tem data de vencimento nem mensalidade preenchida ainda, então a fila de
          cobrança e o total do mês ficam vazios. Isso se preenche na tela de alunos, e na entrega 2B
          o pagamento passa a atualizar sozinho.{" "}
          <span className="text-nevoa">Ver dias sem check-in e fichas vencendo já funciona.</span>
        </p>
      )}
    </div>
  );
}

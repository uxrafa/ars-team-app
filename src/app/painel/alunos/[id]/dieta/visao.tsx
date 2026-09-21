"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Aviso, Botao, BotaoIcone, CLASSE_CAMPO, Cartao, Pilula, Rotulo } from "@/components/ui";
import {
  NIVEIS_DE_ATIVIDADE,
  buscarAlimentos,
  calcularMetas,
  comparacao,
  faltasParaCalcular,
  fatorSugerido,
  gramas,
  kcal,
  litros,
  macrosDaRefeicao,
  macrosDoDia,
  macrosDoItem,
  milhar,
  padroesDoObjetivo,
  paraNumero,
  porHorario,
  type Alimento,
  type DadosDoAluno,
  type Dia,
  type Macros,
  type Metas,
  type Objetivo,
  type Refeicao,
} from "@/lib/dieta";
import { cadastrarAlimento, copiarDieta, salvarDieta } from "./acoes";
import type { OrientacaoNaTela } from "./carregar";

export type OrientacaoDeOutro = { alunoId: string; nome: string };

let contador = 0;
const novaChave = () => `nova-${Date.now()}-${contador++}`;

// O esqueleto da planilha do Allisson: ele sempre parte do mesmo desenho.
const REFEICOES_PADRAO: [string, string][] = [
  ["Café da manhã", "07:00"],
  ["Almoço", "12:00"],
  ["Lanche da tarde", "16:00"],
  ["Jantar", "20:00"],
  ["Ceia", "22:00"],
];

const NOME_DO_DIA: Record<Dia, string> = { treino: "Dia de treino", descanso: "Dia de descanso" };

export function EditorDeDieta({
  alunoId,
  primeiroNome,
  inicial,
  alimentosIniciais,
  dados,
  objetivo,
  diasDeTreino,
  deOutros,
}: {
  alunoId: string;
  primeiroNome: string;
  inicial: OrientacaoNaTela | null;
  alimentosIniciais: Alimento[];
  dados: DadosDoAluno;
  objetivo: Objetivo | null;
  diasDeTreino: number;
  deOutros: OrientacaoDeOutro[];
}) {
  const padrao = padroesDoObjetivo(objetivo);

  const [alimentos, setAlimentos] = useState(alimentosIniciais);
  const [refeicoes, setRefeicoes] = useState<Refeicao[]>(inicial?.refeicoes ?? []);
  const [publicada, setPublicada] = useState(inicial?.publicada ?? false);
  const [agua, setAgua] = useState(inicial?.agua_litros ? String(inicial.agua_litros).replace(".", ",") : "");
  const [orientacoes, setOrientacoes] = useState(inicial?.orientacoes ?? "");
  const [fator, setFator] = useState(inicial?.fator_atividade ?? fatorSugerido(diasDeTreino));
  const [ajuste, setAjuste] = useState(String(inicial?.ajuste_pct ?? padrao.ajuste_pct));
  const [prot, setProt] = useState(String(inicial?.proteina_g_kg ?? padrao.proteina_g_kg).replace(".", ","));
  const [gord, setGord] = useState(String(inicial?.gordura_g_kg ?? padrao.gordura_g_kg).replace(".", ","));
  const [dia, setDia] = useState<Dia>("treino");
  const [comecou, setComecou] = useState(Boolean(inicial));
  const [sujo, setSujo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [recado, setRecado] = useState<string | null>(null);
  const [pendente, comecar] = useTransition();

  const mapa = useMemo(() => new Map(alimentos.map((a) => [a.id, a])), [alimentos]);

  const parametros = {
    fator_atividade: fator,
    ajuste_pct: paraNumero(ajuste) ?? 0,
    proteina_g_kg: paraNumero(prot) ?? padrao.proteina_g_kg,
    gordura_g_kg: paraNumero(gord) ?? padrao.gordura_g_kg,
  };
  const metas = calcularMetas(dados, parametros);

  // Sair com alteração não salva perde a dieta montada; o navegador pergunta.
  useEffect(() => {
    if (!sujo) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [sujo]);

  function mexeu() {
    setSujo(true);
    setRecado(null);
  }

  function mudarRefeicoes(f: (lista: Refeicao[]) => Refeicao[]) {
    setRefeicoes(f);
    mexeu();
  }

  function comecarDoZero() {
    setRefeicoes(
      REFEICOES_PADRAO.map(([nome, horario]) => ({ chave: novaChave(), dia: "treino", nome, horario, itens: [] })),
    );
    setComecou(true);
    mexeu();
  }

  function copiarDe(deAlunoId: string) {
    setErro(null);
    comecar(async () => {
      const r = await copiarDieta(deAlunoId);
      if (r.erro || !r.dieta) return setErro(r.erro ?? "Não consegui copiar.");
      setRefeicoes(r.dieta.refeicoes);
      setAgua(r.dieta.agua_litros ? String(r.dieta.agua_litros).replace(".", ",") : "");
      setOrientacoes(r.dieta.orientacoes);
      setComecou(true);
      mexeu();
      setRecado("Copiada. Ajuste e salve: nada foi gravado ainda.");
    });
  }

  function salvar(publicar: boolean) {
    setErro(null);
    setRecado(null);
    const litrosDeAgua = agua.trim() ? paraNumero(agua) : null;
    comecar(async () => {
      const r = await salvarDieta(alunoId, {
        publicada: publicar,
        agua_litros: litrosDeAgua,
        orientacoes,
        ...parametros,
        refeicoes: porHorarioPorDia(refeicoes),
      });
      if (r.erro) return setErro(r.erro);
      setPublicada(publicar);
      setSujo(false);
      setRecado(
        publicar
          ? publicada
            ? "Salvo. O aluno já vê a versão nova."
            : `Publicada. ${primeiroNome} já vê no app.`
          : publicada
            ? `Tirada do ar. ${primeiroNome} não vê mais.`
            : "Rascunho salvo.",
      );
    });
  }

  if (!comecou) {
    return (
      <Comecar
        primeiroNome={primeiroNome}
        deOutros={deOutros}
        pendente={pendente}
        erro={erro}
        aoComecar={comecarDoZero}
        aoCopiar={copiarDe}
      />
    );
  }

  const doDia = porHorario(refeicoes.filter((r) => r.dia === dia));
  const outroDia: Dia = dia === "treino" ? "descanso" : "treino";
  const totalTreino = macrosDoDia(refeicoes, "treino", mapa);
  const totalDescanso = macrosDoDia(refeicoes, "descanso", mapa);

  return (
    <div className="flex flex-col gap-5">
      {/* Estado e ações no topo: é a primeira coisa que ele procura ao voltar. */}
      <div className="flex flex-wrap items-center gap-3">
        <Pilula tom={publicada ? "ok" : "neutro"}>{publicada ? "No ar" : "Rascunho"}</Pilula>
        {sujo && <Pilula tom="aviso">Não salvo</Pilula>}
        <div className="ml-auto flex flex-wrap gap-2">
          {publicada ? (
            <>
              <Botao type="button" aparencia="fantasma" tamanho="sm" disabled={pendente} onClick={() => salvar(false)}>
                Tirar do ar
              </Botao>
              <Botao type="button" tamanho="sm" disabled={pendente || !sujo} onClick={() => salvar(true)}>
                {pendente ? "Salvando" : "Salvar"}
              </Botao>
            </>
          ) : (
            <>
              <Botao type="button" aparencia="secundario" tamanho="sm" disabled={pendente} onClick={() => salvar(false)}>
                Salvar rascunho
              </Botao>
              <Botao type="button" tamanho="sm" disabled={pendente || !refeicoes.length} onClick={() => salvar(true)}>
                {pendente ? "Publicando" : "Publicar"}
              </Botao>
            </>
          )}
        </div>
      </div>

      {erro && <Aviso>{erro}</Aviso>}
      {recado && <Aviso tom="ok">{recado}</Aviso>}

      <CartaoMetas
        dados={dados}
        metas={metas}
        fator={fator}
        sugerido={fatorSugerido(diasDeTreino)}
        ajuste={ajuste}
        prot={prot}
        gord={gord}
        aoMudar={(campo, valor) => {
          if (campo === "fator") setFator(Number(valor));
          if (campo === "ajuste") setAjuste(valor);
          if (campo === "prot") setProt(valor);
          if (campo === "gord") setGord(valor);
          mexeu();
        }}
      />

      <section className="flex flex-col gap-4">
        <div role="tablist" aria-label="Dia" className="grid grid-cols-2 gap-2">
          {(["treino", "descanso"] as Dia[]).map((d) => {
            const total = d === "treino" ? totalTreino : totalDescanso;
            const vazio = !refeicoes.some((r) => r.dia === d);
            return (
              <button
                key={d}
                type="button"
                role="tab"
                aria-selected={dia === d}
                onClick={() => setDia(d)}
                className={`flex min-h-14 flex-col items-start justify-center rounded-xl border px-4 py-2 text-left transition-colors ${
                  dia === d ? "border-raio bg-tinta-3 text-papel" : "border-contorno text-nevoa hover:border-nevoa hover:text-papel"
                }`}
              >
                <span className="text-[15px] font-semibold">{NOME_DO_DIA[d]}</span>
                <span className="font-mono text-[13px] text-nevoa">
                  {vazio ? (d === "descanso" ? "igual ao de treino" : "vazio") : `${milhar(kcal(total))} kcal`}
                </span>
              </button>
            );
          })}
        </div>

        <ResumoDoDia total={dia === "treino" ? totalTreino : totalDescanso} metas={metas} peso={dados.peso} />

        {doDia.length === 0 && (
          <Cartao className="text-center">
            <p className="text-[15px] text-nevoa">
              {dia === "descanso"
                ? "Sem refeições de descanso, o aluno vê a de treino todos os dias."
                : "Nenhuma refeição ainda."}
            </p>
            {refeicoes.some((r) => r.dia === outroDia) && (
              <Botao
                type="button"
                aparencia="secundario"
                tamanho="sm"
                className="mt-4"
                onClick={() =>
                  mudarRefeicoes((lista) => [
                    ...lista,
                    ...lista
                      .filter((r) => r.dia === outroDia)
                      .map((r) => ({ ...r, chave: novaChave(), dia, itens: r.itens.map((i) => ({ ...i })) })),
                  ])
                }
              >
                Copiar do {NOME_DO_DIA[outroDia].toLowerCase()}
              </Botao>
            )}
          </Cartao>
        )}

        {doDia.map((r) => (
          <CartaoRefeicao
            key={r.chave}
            refeicao={r}
            alimentos={alimentos}
            mapa={mapa}
            aoMudar={(nova) => mudarRefeicoes((lista) => lista.map((x) => (x.chave === r.chave ? nova : x)))}
            aoRemover={() => mudarRefeicoes((lista) => lista.filter((x) => x.chave !== r.chave))}
            aoCadastrar={(a) => setAlimentos((lista) => [...lista, a])}
          />
        ))}

        <Botao
          type="button"
          aparencia="secundario"
          onClick={() =>
            mudarRefeicoes((lista) => [...lista, { chave: novaChave(), dia, nome: "Refeição", horario: "", itens: [] }])
          }
        >
          Adicionar refeição
        </Botao>
      </section>

      <Cartao className="flex flex-col gap-5">
        <label className="flex max-w-xs flex-col gap-2">
          <Rotulo>Água por dia</Rotulo>
          <span className="relative block">
            <input
              inputMode="decimal"
              value={agua}
              onChange={(e) => {
                setAgua(e.target.value);
                mexeu();
              }}
              // 35 ml/kg é a referência mais usada; fica como sugestão, não valor.
              placeholder={dados.peso ? `sugestão: ${litros((dados.peso * 35) / 1000)}` : "3,5"}
              className={`${CLASSE_CAMPO} pr-12`}
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-nevoa">L</span>
          </span>
        </label>

        <label className="flex flex-col gap-2">
          <Rotulo>Orientações · uma por linha</Rotulo>
          <textarea
            value={orientacoes}
            onChange={(e) => {
              setOrientacoes(e.target.value);
              mexeu();
            }}
            rows={5}
            placeholder={"1x na semana, trocar o jantar pela refeição livre\nLegumes e verduras no almoço e no jantar"}
            className={`${CLASSE_CAMPO} leading-relaxed`}
          />
        </label>
      </Cartao>

    </div>
  );
}

/** Refeições gravadas na ordem do relógio, dentro de cada dia. */
function porHorarioPorDia(lista: Refeicao[]): Refeicao[] {
  return [
    ...porHorario(lista.filter((r) => r.dia === "treino")),
    ...porHorario(lista.filter((r) => r.dia === "descanso")),
  ];
}

/* ------------------------------------------------------------------ */

function Comecar({
  primeiroNome,
  deOutros,
  pendente,
  erro,
  aoComecar,
  aoCopiar,
}: {
  primeiroNome: string;
  deOutros: OrientacaoDeOutro[];
  pendente: boolean;
  erro: string | null;
  aoComecar: () => void;
  aoCopiar: (alunoId: string) => void;
}) {
  const [origem, setOrigem] = useState("");
  return (
    <section className="mx-auto w-full max-w-xl rounded-2xl border border-linha bg-tinta-2 p-8 text-center">
      <h2 className="font-display text-3xl uppercase leading-none tracking-wide">Sem dieta ainda</h2>
      <p className="mx-auto mt-3.5 max-w-[42ch] text-[15px] leading-relaxed text-nevoa">
        {primeiroNome} só vê quando você publicar.
      </p>
      {erro && (
        <div className="mt-5 text-left">
          <Aviso>{erro}</Aviso>
        </div>
      )}
      <div className="mt-6 flex flex-col gap-3">
        <Botao type="button" onClick={aoComecar} disabled={pendente}>
          Começar do zero
        </Botao>
        {deOutros.length > 0 && (
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <select
              value={origem}
              onChange={(e) => setOrigem(e.target.value)}
              aria-label="Copiar de outro aluno"
              className={CLASSE_CAMPO}
            >
              <option value="">Copiar de outro aluno…</option>
              {deOutros.map((o) => (
                <option key={o.alunoId} value={o.alunoId}>
                  {o.nome}
                </option>
              ))}
            </select>
            <Botao type="button" aparencia="secundario" disabled={!origem || pendente} onClick={() => aoCopiar(origem)}>
              Copiar
            </Botao>
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function CartaoMetas({
  dados,
  metas,
  fator,
  sugerido,
  ajuste,
  prot,
  gord,
  aoMudar,
}: {
  dados: DadosDoAluno;
  metas: Metas | null;
  fator: number;
  sugerido: number;
  ajuste: string;
  prot: string;
  gord: string;
  aoMudar: (campo: "fator" | "ajuste" | "prot" | "gord", valor: string) => void;
}) {
  const faltas = faltasParaCalcular(dados);
  const campoPequeno = `${CLASSE_CAMPO} pr-14`;

  return (
    <Cartao className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Rotulo className="mr-1">Meta</Rotulo>
        {dados.sexo && <Pilula>{dados.sexo === "masculino" ? "Masculino" : "Feminino"}</Pilula>}
        {dados.idade !== null && <Pilula>{dados.idade} anos</Pilula>}
        {dados.altura && <Pilula>{dados.altura} cm</Pilula>}
        {dados.peso && <Pilula>{String(dados.peso).replace(".", ",")} kg</Pilula>}
        {faltas.length > 0 && <Pilula tom="aviso">Falta na anamnese: {faltas.join(", ")}</Pilula>}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <label className="col-span-2 flex flex-col gap-2 md:col-span-1">
          <Rotulo>Atividade</Rotulo>
          <select value={fator} onChange={(e) => aoMudar("fator", e.target.value)} className={CLASSE_CAMPO}>
            {NIVEIS_DE_ATIVIDADE.map((n) => (
              <option key={n.fator} value={n.fator}>
                {n.nome}
                {n.fator === sugerido ? " (anamnese)" : ""}
              </option>
            ))}
          </select>
        </label>
        <CampoCurto rotulo="Ajuste" sufixo="%" valor={ajuste} aoMudar={(v) => aoMudar("ajuste", v)} classe={campoPequeno} />
        <CampoCurto rotulo="Proteína" sufixo="g/kg" valor={prot} aoMudar={(v) => aoMudar("prot", v)} classe={campoPequeno} />
        <CampoCurto rotulo="Gordura" sufixo="g/kg" valor={gord} aoMudar={(v) => aoMudar("gord", v)} classe={campoPequeno} />
      </div>

      {metas ? (
        <p className="font-mono text-[14px] leading-relaxed text-nevoa">
          TMB {milhar(metas.tmb)} · gasto {milhar(metas.gasto)} ·{" "}
          <span className="font-semibold text-papel">meta {milhar(metas.kcal)} kcal</span> · P {metas.macros.proteina} g · C{" "}
          {metas.macros.carboidrato} g · G {metas.macros.gordura} g
        </p>
      ) : (
        <p className="text-[15px] text-nevoa">Sem esses dados não dá para calcular a meta. A dieta monta igual.</p>
      )}
    </Cartao>
  );
}

function CampoCurto({
  rotulo,
  sufixo,
  valor,
  aoMudar,
  classe,
}: {
  rotulo: string;
  sufixo: string;
  valor: string;
  aoMudar: (v: string) => void;
  classe: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <Rotulo>{rotulo}</Rotulo>
      <span className="relative block">
        <input inputMode="decimal" value={valor} onChange={(e) => aoMudar(e.target.value)} className={classe} />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-nevoa">{sufixo}</span>
      </span>
    </label>
  );
}

/* ------------------------------------------------------------------ */

function ResumoDoDia({ total, metas, peso }: { total: Macros; metas: Metas | null; peso: number | null }) {
  const calorias = kcal(total);
  const linhas: { nome: string; valor: string; meta: number | null; atual: number; porKg: boolean }[] = [
    { nome: "Calorias", valor: milhar(calorias), meta: metas?.kcal ?? null, atual: calorias, porKg: false },
    { nome: "Proteína", valor: gramas(total.proteina), meta: metas?.macros.proteina ?? null, atual: total.proteina, porKg: true },
    { nome: "Carboidrato", valor: gramas(total.carboidrato), meta: metas?.macros.carboidrato ?? null, atual: total.carboidrato, porKg: true },
    { nome: "Gordura", valor: gramas(total.gordura), meta: metas?.macros.gordura ?? null, atual: total.gordura, porKg: true },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
      {linhas.map((l) => {
        const c = l.meta !== null && calorias > 0 ? comparacao(l.atual, l.meta) : null;
        return (
          <div key={l.nome} className="rounded-xl border border-linha bg-tinta-2 px-4 py-3">
            <Rotulo>{l.nome}</Rotulo>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-semibold tabular text-papel">{l.valor}</span>
              {l.porKg && peso && calorias > 0 && (
                <span className="font-mono text-[13px] text-nevoa">
                  {String(Math.round((l.atual / peso) * 10) / 10).replace(".", ",")} g/kg
                </span>
              )}
            </div>
            {c && c.texto && (
              <span className={`mt-1 block text-[13px] font-semibold ${c.tom === "ok" ? "text-ok" : "text-alerta"}`}>
                {c.texto}
                {c.texto !== "no alvo" && l.meta !== null ? ` da meta` : ""}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function resumoMacros(m: Macros): string {
  return `${milhar(kcal(m))} kcal · P ${Math.round(m.proteina)} · C ${Math.round(m.carboidrato)} · G ${Math.round(m.gordura)}`;
}

function CartaoRefeicao({
  refeicao,
  alimentos,
  mapa,
  aoMudar,
  aoRemover,
  aoCadastrar,
}: {
  refeicao: Refeicao;
  alimentos: Alimento[];
  mapa: Map<string, Alimento>;
  aoMudar: (r: Refeicao) => void;
  aoRemover: () => void;
  aoCadastrar: (a: Alimento) => void;
}) {
  const [buscando, setBuscando] = useState(false);
  const total = macrosDaRefeicao(refeicao, mapa);

  function mudarItem(indice: number, mudanca: Partial<Refeicao["itens"][number]>) {
    aoMudar({ ...refeicao, itens: refeicao.itens.map((i, k) => (k === indice ? { ...i, ...mudanca } : i)) });
  }

  return (
    <Cartao padding={false}>
      <div className="grid grid-cols-[1fr_44px] items-center md:grid-cols-[1fr_140px_44px] gap-2 border-b border-linha p-4">
        <input
          value={refeicao.nome}
          onChange={(e) => aoMudar({ ...refeicao, nome: e.target.value })}
          aria-label="Nome da refeição"
          className={`${CLASSE_CAMPO} col-span-2 font-semibold md:col-span-1`}
        />
        <input
          type="time"
          value={refeicao.horario}
          onChange={(e) => aoMudar({ ...refeicao, horario: e.target.value })}
          aria-label="Horário"
          className={CLASSE_CAMPO}
        />
        <BotaoIcone rotulo={`Remover ${refeicao.nome}`} type="button" onClick={aoRemover}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
          </svg>
        </BotaoIcone>
      </div>

      {refeicao.itens.length > 0 && (
        <ul>
          {refeicao.itens.map((i, k) => {
            const a = i.alimento_id ? mapa.get(i.alimento_id) : undefined;
            return (
              <li
                key={k}
                className={`grid items-center gap-2 border-b border-linha px-4 py-3 ${
                  i.alimento_id ? "grid-cols-[1fr_104px_44px] md:grid-cols-[1fr_150px_104px_44px]" : "grid-cols-[1fr_44px]"
                }`}
              >
                {i.alimento_id ? (
                  <>
                    <span className="col-span-3 min-w-0 md:col-span-1">
                      <span className="block text-[15px] text-papel">{a?.nome ?? "Alimento removido"}</span>
                      {a && i.gramas ? (
                        <span className="font-mono text-[13px] text-nevoa">{resumoMacros(macrosDoItem(a, i.gramas))}</span>
                      ) : null}
                    </span>
                    <input
                      value={i.descricao}
                      onChange={(e) => mudarItem(k, { descricao: e.target.value })}
                      placeholder="medida (2 fatias)"
                      aria-label="Medida caseira"
                      className={CLASSE_CAMPO}
                    />
                    <span className="relative block">
                      <input
                        inputMode="decimal"
                        value={i.gramas ?? ""}
                        onChange={(e) => mudarItem(k, { gramas: paraNumero(e.target.value) })}
                        aria-label="Gramas"
                        className={`${CLASSE_CAMPO} pr-8 text-right`}
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-nevoa">g</span>
                    </span>
                  </>
                ) : (
                  <input
                    value={i.descricao}
                    onChange={(e) => mudarItem(k, { descricao: e.target.value })}
                    placeholder="Salada de folhas à vontade"
                    aria-label="Texto livre"
                    className={CLASSE_CAMPO}
                  />
                )}
                <BotaoIcone
                  rotulo="Remover item"
                  type="button"
                  onClick={() => aoMudar({ ...refeicao, itens: refeicao.itens.filter((_, x) => x !== k) })}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </BotaoIcone>
              </li>
            );
          })}
        </ul>
      )}

      {buscando ? (
        <BuscaDeAlimento
          alimentos={alimentos}
          aoEscolher={(a) => {
            aoMudar({ ...refeicao, itens: [...refeicao.itens, { alimento_id: a.id, gramas: 100, descricao: "" }] });
            setBuscando(false);
          }}
          aoCadastrar={(a) => {
            aoCadastrar(a);
            aoMudar({ ...refeicao, itens: [...refeicao.itens, { alimento_id: a.id, gramas: 100, descricao: "" }] });
            setBuscando(false);
          }}
          aoFechar={() => setBuscando(false)}
        />
      ) : (
        <div className="flex flex-wrap items-center gap-2 p-4">
          <Botao type="button" aparencia="secundario" tamanho="sm" onClick={() => setBuscando(true)}>
            Adicionar alimento
          </Botao>
          <Botao
            type="button"
            aparencia="fantasma"
            tamanho="sm"
            onClick={() => aoMudar({ ...refeicao, itens: [...refeicao.itens, { alimento_id: null, gramas: null, descricao: "" }] })}
          >
            Adicionar texto
          </Botao>
          {kcal(total) > 0 && <span className="ml-auto font-mono text-[13px] text-nevoa">{resumoMacros(total)}</span>}
        </div>
      )}
    </Cartao>
  );
}

/* ------------------------------------------------------------------ */

function BuscaDeAlimento({
  alimentos,
  aoEscolher,
  aoCadastrar,
  aoFechar,
}: {
  alimentos: Alimento[];
  aoEscolher: (a: Alimento) => void;
  aoCadastrar: (a: Alimento) => void;
  aoFechar: () => void;
}) {
  const [busca, setBusca] = useState("");
  const [cadastrando, setCadastrando] = useState(false);
  const achados = useMemo(() => buscarAlimentos(alimentos, busca), [alimentos, busca]);

  if (cadastrando) {
    return <CadastroDeAlimento nomeInicial={busca} aoCadastrar={aoCadastrar} aoCancelar={() => setCadastrando(false)} />;
  }

  return (
    <div className="bg-tinta-3/40 p-4">
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input
          autoFocus
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar na TACO: arroz cozido, frango grelhado…"
          className={CLASSE_CAMPO}
        />
        <Botao type="button" aparencia="fantasma" tamanho="sm" onClick={aoFechar}>
          Fechar
        </Botao>
      </div>

      {busca.trim() && (
        <ul className="mt-3 max-h-80 overflow-y-auto rounded-xl border border-linha bg-tinta-2">
          {achados.map((a) => (
            <li key={a.id} className="border-t border-linha first:border-t-0">
              <button
                type="button"
                onClick={() => aoEscolher(a)}
                className="flex min-h-12 w-full flex-wrap items-center gap-x-3 px-4 py-2.5 text-left transition-colors hover:bg-tinta-3"
              >
                <span className="min-w-0 flex-1 text-[15px] text-papel">{a.nome}</span>
                {a.origem === "proprio" && <Pilula>seu</Pilula>}
                <span className="font-mono text-[13px] text-nevoa">
                  100 g · P {a.proteina_g} · C {a.carboidrato_g} · G {a.gordura_g}
                </span>
              </button>
            </li>
          ))}
          <li className="border-t border-linha first:border-t-0">
            <button
              type="button"
              onClick={() => setCadastrando(true)}
              className="flex min-h-12 w-full items-center px-4 py-2.5 text-left text-[15px] font-semibold text-papel transition-colors hover:bg-tinta-3"
            >
              {achados.length ? "Não achou? " : ""}Cadastrar “{busca.trim()}”
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}

function CadastroDeAlimento({
  nomeInicial,
  aoCadastrar,
  aoCancelar,
}: {
  nomeInicial: string;
  aoCadastrar: (a: Alimento) => void;
  aoCancelar: () => void;
}) {
  const [nome, setNome] = useState(nomeInicial.trim());
  const [p, setP] = useState("");
  const [c, setC] = useState("");
  const [g, setG] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, comecar] = useTransition();

  function gravar() {
    setErro(null);
    comecar(async () => {
      const r = await cadastrarAlimento({
        nome,
        proteina_g: paraNumero(p) ?? 0,
        carboidrato_g: paraNumero(c) ?? 0,
        gordura_g: paraNumero(g) ?? 0,
      });
      if (r.erro || !r.alimento) return setErro(r.erro ?? "Não consegui cadastrar.");
      aoCadastrar(r.alimento);
    });
  }

  const campo = `${CLASSE_CAMPO} pr-8`;
  return (
    <div className="flex flex-col gap-3 bg-tinta-3/40 p-4">
      <Rotulo>Novo alimento · valores do rótulo, por 100 g</Rotulo>
      <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Whey protein" aria-label="Nome" className={CLASSE_CAMPO} />
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ["Proteína", p, setP],
            ["Carboidrato", c, setC],
            ["Gordura", g, setG],
          ] as const
        ).map(([rotulo, valor, set]) => (
          <label key={rotulo} className="flex flex-col gap-1.5">
            <span className="text-sm text-nevoa">{rotulo}</span>
            <span className="relative block">
              <input inputMode="decimal" value={valor} onChange={(e) => set(e.target.value)} className={campo} />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-nevoa">g</span>
            </span>
          </label>
        ))}
      </div>
      {erro && <Aviso>{erro}</Aviso>}
      <div className="flex gap-2">
        <Botao type="button" tamanho="sm" onClick={gravar} disabled={pendente}>
          {pendente ? "Cadastrando" : "Cadastrar e adicionar"}
        </Botao>
        <Botao type="button" aparencia="fantasma" tamanho="sm" onClick={aoCancelar}>
          Voltar
        </Botao>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useTransition } from "react";
import { Aviso, Botao, CLASSE_CAMPO, Pilula, Rotulo } from "@/components/ui";
import type { ExercicioEscolhivel } from "@/lib/biblioteca";
import {
  ITEM_PADRAO,
  mover,
  problemasParaPublicar,
  proximoNomeDeBloco,
  resumoDaFicha,
  type BlocoNaTela,
  type ItemNaTela,
  type LinhaAnamneseFicha,
  type StatusProtocolo,
} from "@/lib/ficha";
import { AbasDeTreino } from "./abas";
import { Bloco, BlocoLeitura } from "./bloco";
import { Lateral } from "../lateral";
import { Seletor } from "./seletor";
import { copiarFicha, encerrarFicha, publicarFicha, salvarFicha } from "./acoes";
import type { FichaDeOutro } from "./page";

type Protocolo = {
  id: string;
  nome: string;
  inicio: string;
  fim: string | null;
  status: StatusProtocolo;
  observacoes: string | null;
};

/** Tudo que o botão Cancelar precisa devolver ao estado de antes. */
type Rascunho = {
  nome: string;
  inicio: string;
  fim: string;
  observacoes: string;
  blocos: BlocoNaTela[];
};

function curta(iso: string | null): string | null {
  if (!iso) return null;
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano.slice(2)}`;
}

export function Editor({
  alunoId,
  alunoNome,
  protocolo,
  blocosIniciais,
  exercicios,
  anamnese,
  fichasDeOutros,
}: {
  alunoId: string;
  alunoNome: string;
  protocolo: Protocolo;
  blocosIniciais: BlocoNaTela[];
  exercicios: ExercicioEscolhivel[];
  anamnese: LinhaAnamneseFicha | null;
  fichasDeOutros: FichaDeOutro[];
}) {
  const [nome, setNome] = useState(protocolo.nome);
  const [inicio, setInicio] = useState(protocolo.inicio);
  const [fim, setFim] = useState(protocolo.fim ?? "");
  const [observacoes, setObservacoes] = useState(protocolo.observacoes ?? "");
  const [blocos, setBlocos] = useState<BlocoNaTela[]>(blocosIniciais);

  /**
   * A tela abre em leitura. Antes tudo era campo o tempo todo, e por isso a
   * ficha nunca parecia pronta: parecia um formulário no meio do preenchimento,
   * mesmo depois de salva.
   */
  const [editando, setEditando] = useState(false);
  const [antes, setAntes] = useState<Rascunho | null>(null);

  const [sujo, setSujo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [recado, setRecado] = useState<string | null>(null);
  const [pendente, comecar] = useTransition();

  const [aba, setAba] = useState(0);
  const [seletorAberto, setSeletorAberto] = useState(false);
  const [copiando, setCopiando] = useState(false);
  const [origem, setOrigem] = useState("");

  const r = resumoDaFicha(blocos);
  const ativa = protocolo.status === "ativo";
  const primeiroNome = alunoNome.split(" ")[0];

  // Apagar o último treino deixaria a guia aberta fora do array.
  const atual = Math.min(aba, Math.max(0, blocos.length - 1));

  /** Fechar a página no meio da edição não pode levar o trabalho junto. */
  useEffect(() => {
    if (!editando || !sujo) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [editando, sujo]);

  function mexer(novos: BlocoNaTela[]) {
    setBlocos(novos);
    setSujo(true);
    setErro(null);
    setRecado(null);
  }

  function campo<T>(set: (v: T) => void) {
    return (v: T) => {
      set(v);
      setSujo(true);
      setRecado(null);
    };
  }

  function editar() {
    setAntes({ nome, inicio, fim, observacoes, blocos });
    setEditando(true);
    setSujo(false);
    setErro(null);
    setRecado(null);
  }

  function cancelar() {
    if (antes) {
      setNome(antes.nome);
      setInicio(antes.inicio);
      setFim(antes.fim);
      setObservacoes(antes.observacoes);
      setBlocos(antes.blocos);
    }
    setEditando(false);
    setSeletorAberto(false);
    setSujo(false);
    setErro(null);
    setRecado(null);
  }

  function adicionarTreino() {
    const novos = [
      ...blocos,
      { id: null, nome: proximoNomeDeBloco(blocos.length), foco: "", itens: [] },
    ];
    // O "+" da barra de guias funciona em leitura também: quem toca nele está
    // dizendo que quer mexer, então a tela entra em edição junto.
    if (!editando) editar();
    mexer(novos);
    setAba(novos.length - 1);
    setSeletorAberto(false);
  }

  function adicionarExercicio(e: ExercicioEscolhivel) {
    const item: ItemNaTela = {
      id: null,
      exercicio_id: e.id,
      nome: e.nome,
      grupo: e.grupo,
      observacao: "",
      ...ITEM_PADRAO,
    };
    mexer(blocos.map((b, i) => (i === atual ? { ...b, itens: [...b.itens, item] } : b)));
  }

  async function gravar(): Promise<boolean> {
    const r = await salvarFicha({
      alunoId,
      protocoloId: protocolo.id,
      nome,
      inicio,
      fim,
      observacoes,
      blocos,
    });
    if (r.erro) {
      setErro(r.erro);
      return false;
    }
    // A ação devolve a ficha relida. Sem trocar o estado por ela, os itens
    // recém-criados continuariam sem id na tela, e a próxima gravação criaria
    // tudo de novo em vez de atualizar.
    if (r.blocos) setBlocos(r.blocos);
    setSujo(false);
    return true;
  }

  function salvar() {
    setErro(null);
    setRecado(null);
    comecar(async () => {
      if (!(await gravar())) return;
      setEditando(false);
      setSeletorAberto(false);
      setRecado(
        ativa
          ? `Salvo. ${primeiroNome} já vê a ficha nova no app.`
          : "Rascunho salvo. Publique quando quiser mandar para o aluno.",
      );
    });
  }

  function publicar() {
    setErro(null);
    setRecado(null);
    const problema = problemasParaPublicar(blocos);
    if (problema) {
      setErro(problema);
      return;
    }
    // Em leitura a ficha já está gravada, então publicar não precisa gravar
    // de novo: é uma ida ao banco a menos.
    comecar(async () => {
      const r = await publicarFicha(alunoId, protocolo.id);
      if (r.erro) {
        setErro(r.erro);
        return;
      }
      setRecado(`Publicada. ${primeiroNome} já vê o treino no app.`);
    });
  }

  function encerrar() {
    setErro(null);
    setRecado(null);
    comecar(async () => {
      const r = await encerrarFicha(alunoId, protocolo.id);
      if (r.erro) setErro(r.erro);
    });
  }

  function copiar() {
    if (!origem) return;
    setErro(null);
    setRecado(null);
    comecar(async () => {
      const r = await copiarFicha(alunoId, protocolo.id, origem);
      if (r.erro) {
        setErro(r.erro);
        return;
      }
      if (r.blocos) setBlocos(r.blocos);
      setSujo(false);
      setCopiando(false);
      setAba(0);
      setRecado("Copiada. Toque em Editar ficha para ajustar o que for diferente.");
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
      <div className="flex flex-col gap-5">
        {/* Cabeçalho da ficha */}
        <section className="rounded-2xl border border-linha bg-tinta-2 p-5">
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              {/* "Ficha de Marcos" saiu: o cabeçalho do layout já diz o nome.
                  Aqui basta o que a ficha tem dentro. */}
              <h2 className="font-display text-2xl uppercase leading-none tracking-wide">Ficha</h2>
              <p className="mt-2.5 text-[15px] text-nevoa">
                {r.blocos === 0
                  ? "Nenhum treino ainda."
                  : `${r.blocos} ${r.blocos === 1 ? "treino" : "treinos"} · ${r.exercicios} exercícios · ${r.series} séries no total`}
              </p>
            </div>
            <Pilula tom={ativa ? "ok" : "neutro"}>{ativa ? "No ar para o aluno" : "Rascunho"}</Pilula>
          </div>

          {editando ? (
            <>
              <div className="mt-5 grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
                <label className="flex flex-col gap-2">
                  <Rotulo>Nome da ficha</Rotulo>
                  <input
                    value={nome}
                    onChange={(e) => campo(setNome)(e.target.value)}
                    className={CLASSE_CAMPO}
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <Rotulo>Começa em</Rotulo>
                  <input
                    type="date"
                    value={inicio}
                    onChange={(e) => campo(setInicio)(e.target.value)}
                    className={CLASSE_CAMPO}
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <Rotulo>Vence em</Rotulo>
                  <input
                    type="date"
                    value={fim}
                    onChange={(e) => campo(setFim)(e.target.value)}
                    className={CLASSE_CAMPO}
                  />
                </label>
              </div>

              <label className="mt-4 flex flex-col gap-2">
                <Rotulo>Recado para o aluno</Rotulo>
                <textarea
                  rows={2}
                  value={observacoes}
                  onChange={(e) => campo(setObservacoes)(e.target.value)}
                  placeholder="Ex.: nas duas primeiras semanas segure a carga e foque na execução"
                  className={`${CLASSE_CAMPO} resize-none leading-relaxed`}
                />
              </label>
            </>
          ) : (
            <div className="mt-4 flex flex-col gap-2">
              <p className="text-base font-semibold">{nome}</p>
              <p className="font-mono text-[13px] uppercase tabular text-nevoa">
                {curta(inicio)}
                {fim ? ` até ${curta(fim)}` : " · sem data de vencimento"}
              </p>
              {observacoes.trim() && (
                <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed text-nevoa">
                  <span className="text-nevoa-fraca">Recado: </span>
                  {observacoes}
                </p>
              )}
            </div>
          )}
        </section>

        {/* Copiar de outra ficha. Só em leitura: é uma ação que grava sozinha,
            e no meio de uma edição ela atropelaria o que está na tela. */}
        {!editando && fichasDeOutros.length > 0 && (
          <section className="rounded-2xl border border-linha bg-tinta-2 p-5">
            {!copiando ? (
              <div className="flex flex-wrap items-center gap-3">
                <p className="min-w-0 flex-1 text-[15px] leading-relaxed text-nevoa">
                  {blocos.length === 0
                    ? "Dá para começar a partir da ficha de outro aluno e ajustar o que for diferente."
                    : "Precisa recomeçar a partir de outra ficha?"}
                </p>
                <Botao
                  type="button"
                  onClick={() => setCopiando(true)}
                  aparencia={blocos.length === 0 ? "primario" : "secundario"}
                  tamanho="sm"
                >
                  Copiar de outro aluno
                </Botao>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Copiar de outro aluno</h2>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-nevoa">
                    Traz os treinos, exercícios, séries, repetições, descanso e método.{" "}
                    {blocos.length > 0 && (
                      <span className="text-alerta">
                        Substitui o que já está montado nesta ficha.
                      </span>
                    )}
                  </p>
                </div>

                <label className="flex flex-col gap-2">
                  <Rotulo>Ficha de origem</Rotulo>
                  <select
                    value={origem}
                    onChange={(e) => setOrigem(e.target.value)}
                    className={CLASSE_CAMPO}
                  >
                    <option value="">Escolha um aluno</option>
                    {fichasDeOutros.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.aluno} · {f.nome}
                        {f.status === "encerrado" ? " (encerrada)" : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex flex-wrap gap-2.5">
                  <Botao type="button" onClick={copiar} disabled={pendente || !origem} tamanho="sm">
                    {pendente ? "Copiando" : "Copiar para cá"}
                  </Botao>
                  <Botao
                    type="button"
                    onClick={() => setCopiando(false)}
                    aparencia="secundario"
                    tamanho="sm"
                  >
                    Cancelar
                  </Botao>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Os treinos, um ao lado do outro */}
        <div>
          <AbasDeTreino
            blocos={blocos}
            ativa={atual}
            aoTrocar={(i) => {
              setAba(i);
              setSeletorAberto(false);
            }}
            aoAdicionar={adicionarTreino}
          />

          {blocos.length === 0 ? (
            <section className="rounded-b-2xl rounded-tr-2xl border border-linha bg-tinta-2 px-6 py-14 text-center">
              <p className="mx-auto max-w-[46ch] text-[15px] leading-relaxed text-nevoa">
                Esta ficha ainda não tem nenhum treino. Toque no + acima para criar o Treino A.
              </p>
            </section>
          ) : editando ? (
            <Bloco
              key={blocos[atual].id ?? `novo-${atual}`}
              bloco={blocos[atual]}
              indice={atual}
              total={blocos.length}
              aoMudar={(novo) => mexer(blocos.map((x, j) => (j === atual ? novo : x)))}
              aoMover={(passo) => {
                const destino = atual + passo;
                if (destino < 0 || destino >= blocos.length) return;
                mexer(mover(blocos, atual, passo));
                setAba(destino);
              }}
              aoRemover={() => {
                mexer(blocos.filter((_, j) => j !== atual));
                setAba(Math.max(0, atual - 1));
                setSeletorAberto(false);
              }}
              aoAbrirSeletor={() => setSeletorAberto((v) => !v)}
              seletorAberto={seletorAberto}
            >
              {seletorAberto && (
                <Seletor
                  exercicios={exercicios}
                  jaNaFicha={new Set(blocos.flatMap((x) => x.itens.map((it) => it.exercicio_id)))}
                  aoEscolher={adicionarExercicio}
                  aoFechar={() => setSeletorAberto(false)}
                />
              )}
            </Bloco>
          ) : (
            <BlocoLeitura bloco={blocos[atual]} indice={atual} />
          )}
        </div>

        {/* Barra de ação */}
        <section className="sticky bottom-0 -mx-6 border-t border-linha bg-tinta/95 px-6 py-4 backdrop-blur lg:-mx-8 lg:px-8">
          {erro && (
            <div className="mb-3">
              <Aviso>{erro}</Aviso>
            </div>
          )}
          {recado && !erro && (
            <div className="mb-3">
              <Aviso tom="ok">{recado}</Aviso>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2.5">
            {editando ? (
              <>
                <Botao type="button" onClick={salvar} disabled={pendente}>
                  {pendente ? "Salvando" : "Salvar"}
                </Botao>
                <Botao
                  type="button"
                  onClick={cancelar}
                  disabled={pendente}
                  aparencia="fantasma"
                >
                  Cancelar
                </Botao>
                {ativa && (
                  <span className="text-sm text-nevoa sm:ml-auto">
                    {primeiroNome} vê a mudança assim que você salvar.
                  </span>
                )}
              </>
            ) : (
              <>
                <Botao type="button" onClick={editar} disabled={pendente}>
                  Editar ficha
                </Botao>

                {ativa ? (
                  <Botao
                    type="button"
                    onClick={encerrar}
                    disabled={pendente}
                    aparencia="fantasma"
                    className="sm:ml-auto"
                  >
                    Tirar do ar
                  </Botao>
                ) : (
                  <Botao
                    type="button"
                    onClick={publicar}
                    disabled={pendente}
                    aparencia="secundario"
                  >
                    Publicar para o aluno
                  </Botao>
                )}
              </>
            )}
          </div>
        </section>
      </div>

      <Lateral anamnese={anamnese} alunoNome={alunoNome} />
    </div>
  );
}

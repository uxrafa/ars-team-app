"use client";

import { useState, useTransition } from "react";
import { Aviso, Botao, CLASSE_CAMPO, Pilula, Rotulo } from "@/components/ui";
import type { LinhaExercicio } from "@/lib/biblioteca";
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
import { Bloco } from "./bloco";
import { Lateral } from "./lateral";
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
  exercicios: LinhaExercicio[];
  anamnese: LinhaAnamneseFicha | null;
  fichasDeOutros: FichaDeOutro[];
}) {
  const [nome, setNome] = useState(protocolo.nome);
  const [inicio, setInicio] = useState(protocolo.inicio);
  const [fim, setFim] = useState(protocolo.fim ?? "");
  const [observacoes, setObservacoes] = useState(protocolo.observacoes ?? "");
  const [blocos, setBlocos] = useState<BlocoNaTela[]>(blocosIniciais);

  const [sujo, setSujo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [recado, setRecado] = useState<string | null>(null);
  const [pendente, comecar] = useTransition();

  /** Em qual bloco o seletor de exercício está aberto. */
  const [seletorEm, setSeletorEm] = useState<number | null>(null);
  const [copiando, setCopiando] = useState(false);
  const [origem, setOrigem] = useState("");

  const r = resumoDaFicha(blocos);
  const ativa = protocolo.status === "ativo";

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

  function adicionarBloco() {
    mexer([...blocos, { id: null, nome: proximoNomeDeBloco(blocos.length), foco: "", itens: [] }]);
  }

  function adicionarExercicio(indiceBloco: number, e: LinhaExercicio) {
    const item: ItemNaTela = {
      id: null,
      exercicio_id: e.id,
      nome: e.nome,
      grupo: e.grupo,
      observacao: "",
      ...ITEM_PADRAO,
    };
    mexer(
      blocos.map((b, i) => (i === indiceBloco ? { ...b, itens: [...b.itens, item] } : b)),
    );
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
      if (await gravar()) setRecado("Ficha salva.");
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
    comecar(async () => {
      if (!(await gravar())) return;
      const r = await publicarFicha(alunoId, protocolo.id);
      if (r.erro) {
        setErro(r.erro);
        return;
      }
      setRecado(`Publicada. ${alunoNome.split(" ")[0]} já vê o treino no app.`);
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
      setRecado("Copiada. Ajuste o que for diferente para este aluno e salve.");
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
      <div className="flex flex-col gap-5">
        {/* Cabeçalho da ficha */}
        <section className="rounded-2xl border border-linha bg-tinta-2 p-5">
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-3xl uppercase leading-none tracking-wide">
                Ficha de {alunoNome.split(" ")[0]}
              </h1>
              <p className="mt-2.5 text-[15px] text-nevoa">
                {r.blocos === 0
                  ? "Nenhum treino ainda."
                  : `${r.blocos} ${r.blocos === 1 ? "treino" : "treinos"} · ${r.exercicios} exercícios · ${r.series} séries no total`}
              </p>
            </div>
            <Pilula tom={ativa ? "ok" : "neutro"}>{ativa ? "No ar para o aluno" : "Rascunho"}</Pilula>
          </div>

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
        </section>

        {/* Copiar de outra ficha */}
        {fichasDeOutros.length > 0 && (
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
                        {f.aluno} · {f.nome} · {f.exercicios} exercícios
                        {f.status === "encerrado" ? " (encerrada)" : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex flex-wrap gap-2.5">
                  <Botao
                    type="button"
                    onClick={copiar}
                    disabled={pendente || !origem}
                    tamanho="sm"
                  >
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

        {/* Blocos */}
        {blocos.map((b, i) => (
          <Bloco
            key={b.id ?? `novo-${i}`}
            bloco={b}
            indice={i}
            total={blocos.length}
            aoMudar={(novo) => mexer(blocos.map((x, j) => (j === i ? novo : x)))}
            aoMover={(passo) => mexer(mover(blocos, i, passo))}
            aoRemover={() => mexer(blocos.filter((_, j) => j !== i))}
            aoAbrirSeletor={() => setSeletorEm(seletorEm === i ? null : i)}
            seletorAberto={seletorEm === i}
          >
            {seletorEm === i && (
              <Seletor
                exercicios={exercicios}
                jaNaFicha={new Set(blocos.flatMap((x) => x.itens.map((it) => it.exercicio_id)))}
                aoEscolher={(e) => adicionarExercicio(i, e)}
                aoFechar={() => setSeletorEm(null)}
              />
            )}
          </Bloco>
        ))}

        <div>
          <Botao type="button" onClick={adicionarBloco} aparencia="secundario">
            Adicionar treino
          </Botao>
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
            <Botao type="button" onClick={salvar} disabled={pendente} aparencia="secundario">
              {pendente ? "Salvando" : "Salvar rascunho"}
            </Botao>

            {ativa ? (
              <>
                <Botao type="button" onClick={publicar} disabled={pendente}>
                  Salvar e atualizar para o aluno
                </Botao>
                <Botao
                  type="button"
                  onClick={encerrar}
                  disabled={pendente}
                  aparencia="fantasma"
                  className="sm:ml-auto"
                >
                  Tirar do ar
                </Botao>
              </>
            ) : (
              <Botao type="button" onClick={publicar} disabled={pendente}>
                Publicar para o aluno
              </Botao>
            )}

            <span className="text-sm text-nevoa sm:ml-auto">
              {sujo ? "Alterações não salvas" : "Tudo salvo"}
            </span>
          </div>
        </section>
      </div>

      <Lateral anamnese={anamnese} alunoNome={alunoNome} />
    </div>
  );
}

"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { criarClienteNavegador } from "@/lib/supabase/client";
import {
  ANGULOS,
  DIAS,
  LOCAIS,
  NIVEIS,
  OBJETIVOS,
  PERGUNTAS_SAUDE,
  PERIODOS,
  type DadosAnamnese,
} from "@/lib/anamnese";
import { enviarAnamnese, salvarRascunho } from "./acoes";

type Foto = { blob: Blob; previa: string };

const rotulo =
  "block font-mono text-[10.5px] uppercase tracking-[0.11em] text-nevoa";
const campo =
  "w-full rounded-xl border border-linha bg-tinta-2 px-3.5 py-3 text-base text-papel " +
  "outline-none transition placeholder:text-nevoa focus:border-raio focus:ring-[3px] focus:ring-raio/25";

/** Reduz a foto antes de subir. Sem isto, 25 alunos estouram o storage. */
async function comprimir(arquivo: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(arquivo);
    const escala = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
    const largura = Math.round(bitmap.width * escala);
    const altura = Math.round(bitmap.height * escala);
    const tela = document.createElement("canvas");
    tela.width = largura;
    tela.height = altura;
    const ctx = tela.getContext("2d");
    if (!ctx) return arquivo;
    ctx.drawImage(bitmap, 0, 0, largura, altura);
    const blob = await new Promise<Blob | null>((ok) =>
      tela.toBlob(ok, "image/jpeg", 0.82),
    );
    return blob ?? arquivo;
  } catch {
    // Formato que o navegador nao abre (HEIC antigo, por exemplo).
    // Sobe o original: o bucket ja limita em 6 MB.
    return arquivo;
  }
}

export function Formulario({
  inicial,
  alunoId,
}: {
  inicial: DadosAnamnese;
  alunoId: string;
}) {
  const router = useRouter();
  const [dados, setDados] = useState<DadosAnamnese>(inicial);
  const [etapa, setEtapa] = useState<1 | 2 | 3>(1);
  const [erro, setErro] = useState<string | null>(null);
  const [fotos, setFotos] = useState<Record<string, Foto>>({});
  const [pendente, comecar] = useTransition();
  const [subindo, setSubindo] = useState(false);
  const entradas = useRef<Record<string, HTMLInputElement | null>>({});

  const ocupado = pendente || subindo;

  function mudar<K extends keyof DadosAnamnese>(chave: K, valor: DadosAnamnese[K]) {
    setDados((d) => ({ ...d, [chave]: valor }));
    setErro(null);
  }

  function alternarDia(dia: number) {
    setDados((d) => ({
      ...d,
      dias_disponiveis: d.dias_disponiveis.includes(dia)
        ? d.dias_disponiveis.filter((x) => x !== dia)
        : [...d.dias_disponiveis, dia].sort((a, b) => a - b),
    }));
    setErro(null);
  }

  function voltar() {
    setErro(null);
    if (etapa === 1) router.push("/app");
    else setEtapa((e) => (e === 3 ? 2 : 1));
  }

  function avancar() {
    setErro(null);
    comecar(async () => {
      const r = await salvarRascunho(dados);
      if (r.erro) {
        setErro(r.erro);
        return;
      }
      setEtapa((e) => (e === 1 ? 2 : 3));
      window.scrollTo({ top: 0 });
    });
  }

  async function escolherFoto(angulo: string, arquivo: File) {
    const blob = await comprimir(arquivo);
    setFotos((f) => {
      if (f[angulo]) URL.revokeObjectURL(f[angulo].previa);
      return { ...f, [angulo]: { blob, previa: URL.createObjectURL(blob) } };
    });
  }

  async function subirFotos() {
    const chaves = Object.keys(fotos);
    if (!chaves.length) return;

    const supabase = criarClienteNavegador();
    const hoje = new Date().toISOString().slice(0, 10);

    for (const angulo of chaves) {
      const caminho = `${alunoId}/${hoje}/${angulo}.jpg`;
      const { error: erroUpload } = await supabase.storage
        .from("evolucao")
        .upload(caminho, fotos[angulo].blob, {
          upsert: true,
          contentType: "image/jpeg",
        });
      if (erroUpload) throw new Error(erroUpload.message);

      const { error: erroLinha } = await supabase
        .from("foto_evolucao")
        .upsert(
          { aluno_id: alunoId, data: hoje, angulo, caminho },
          { onConflict: "aluno_id,data,angulo" },
        );
      if (erroLinha) throw new Error(erroLinha.message);
    }
  }

  function enviar() {
    setErro(null);
    setSubindo(true);
    (async () => {
      try {
        await subirFotos();
      } catch {
        setSubindo(false);
        setErro("Não consegui enviar as fotos. Você pode pular e mandar depois pela aba Evolução.");
        return;
      }
      const r = await enviarAnamnese(dados);
      setSubindo(false);
      if (r.erro) {
        setErro(r.erro);
        return;
      }
      router.push("/app");
      router.refresh();
    })();
  }

  return (
    <div className="min-h-dvh">
      {/* topo com progresso */}
      <div className="border-b border-linha px-5 pb-3.5 pt-4">
        <div className="mb-3 flex items-center gap-3">
          <button
            type="button"
            onClick={voltar}
            aria-label="Voltar"
            className="-m-2 p-2 text-papel transition hover:text-raio-forte"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 6-6 6 6 6" />
            </svg>
          </button>
          <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-nevoa">
            Etapa {etapa} de 3
          </span>
          <span className="ml-auto font-mono text-[11px] text-nevoa">
            {etapa === 1 ? "Perfil e rotina" : etapa === 2 ? "Saúde" : "Ponto de partida"}
          </span>
        </div>
        <div className="flex gap-1.5" role="progressbar" aria-valuenow={etapa} aria-valuemin={1} aria-valuemax={3}>
          {[1, 2, 3].map((n) => (
            <div key={n} className={`h-1 flex-1 rounded-full ${n <= etapa ? "bg-raio" : "bg-linha"}`} />
          ))}
        </div>
      </div>

      <div className="mx-auto flex max-w-md flex-col gap-7 px-5 pb-40 pt-6">
        {etapa === 1 && (
          <>
            <header className="flex flex-col gap-1.5">
              <h1 className="font-display text-[27px] uppercase leading-none tracking-wide">
                Vamos te conhecer
              </h1>
              <p className="max-w-[33ch] text-[13.5px] leading-relaxed text-nevoa">
                O Allisson monta seu treino a partir daqui. Leva uns 4 minutos e você só responde uma vez.
              </p>
            </header>

            <section className="flex flex-col gap-3">
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-nevoa">
                Sobre você
              </span>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className={rotulo}>Peso atual</span>
                  <div className="relative">
                    <input
                      inputMode="decimal"
                      value={dados.peso_kg}
                      onChange={(e) => mudar("peso_kg", e.target.value)}
                      placeholder="78"
                      className={`${campo} pr-10`}
                    />
                    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] text-nevoa">kg</span>
                  </div>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={rotulo}>Altura</span>
                  <div className="relative">
                    <input
                      inputMode="numeric"
                      value={dados.altura_cm}
                      onChange={(e) => mudar("altura_cm", e.target.value)}
                      placeholder="176"
                      className={`${campo} pr-10`}
                    />
                    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] text-nevoa">cm</span>
                  </div>
                </label>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className={rotulo}>Data de nascimento</span>
                <input
                  type="date"
                  value={dados.nascimento}
                  onChange={(e) => mudar("nascimento", e.target.value)}
                  className={campo}
                />
              </label>
            </section>

            <section className="flex flex-col gap-3">
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-nevoa">
                Objetivo principal
              </span>
              <div className="flex flex-wrap gap-2">
                {OBJETIVOS.map(([valor, nome]) => (
                  <button
                    key={valor}
                    type="button"
                    onClick={() => mudar("objetivo", valor)}
                    aria-pressed={dados.objetivo === valor}
                    className={`rounded-full px-4 py-2.5 text-[13.5px] transition ${
                      dados.objetivo === valor
                        ? "bg-raio font-semibold text-papel"
                        : "border border-linha text-nevoa hover:border-nevoa"
                    }`}
                  >
                    {nome}
                  </button>
                ))}
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-nevoa">
                Onde você treina
              </span>
              <div className="grid grid-cols-3 gap-2">
                {LOCAIS.map(([valor, nome]) => (
                  <button
                    key={valor}
                    type="button"
                    onClick={() => mudar("local_treino", valor)}
                    aria-pressed={dados.local_treino === valor}
                    className={`rounded-xl px-2 py-3.5 text-[12.5px] transition ${
                      dados.local_treino === valor
                        ? "border border-raio bg-raio/10 font-semibold text-papel"
                        : "border border-linha bg-tinta-2 text-nevoa hover:border-nevoa"
                    }`}
                  >
                    {nome}
                  </button>
                ))}
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-nevoa">
                Sua experiência
              </span>
              <div className="flex flex-col gap-2">
                {NIVEIS.map(([valor, nome, detalhe]) => {
                  const ativo = dados.nivel === valor;
                  return (
                    <button
                      key={valor}
                      type="button"
                      onClick={() => mudar("nivel", valor)}
                      aria-pressed={ativo}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3.5 text-left transition ${
                        ativo ? "border border-raio bg-raio/10" : "border border-linha bg-tinta-2 hover:border-nevoa"
                      }`}
                    >
                      <span className="flex-1">
                        <span className={`block text-sm ${ativo ? "font-bold text-papel" : "font-semibold text-nevoa"}`}>
                          {nome}
                        </span>
                        <span className={`mt-0.5 block text-xs ${ativo ? "text-papel/75" : "text-nevoa"}`}>
                          {detalhe}
                        </span>
                      </span>
                      <span
                        aria-hidden="true"
                        className={`flex h-[19px] w-[19px] flex-none items-center justify-center rounded-full border-[1.5px] ${
                          ativo ? "border-raio" : "border-linha"
                        }`}
                      >
                        {ativo && <span className="h-2.5 w-2.5 rounded-full bg-raio" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-nevoa">
                  Dias disponíveis
                </span>
                <span className="font-mono text-[11px] text-raio-forte">
                  {dados.dias_disponiveis.length} por semana
                </span>
              </div>
              <div className="flex justify-between gap-2">
                {DIAS.map(([dia, letra, nome]) => {
                  const ativo = dados.dias_disponiveis.includes(dia);
                  return (
                    <span key={dia} className="flex flex-col items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => alternarDia(dia)}
                        aria-pressed={ativo}
                        aria-label={nome}
                        className={`flex h-[38px] w-[38px] items-center justify-center rounded-full text-[13px] font-bold transition ${
                          ativo ? "bg-raio text-papel" : "border border-linha text-nevoa hover:border-nevoa"
                        }`}
                      >
                        {letra}
                      </button>
                      <span className="text-[9px] text-nevoa">{nome}</span>
                    </span>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {etapa === 2 && (
          <>
            <header className="flex flex-col gap-1.5">
              <h1 className="font-display text-[27px] uppercase leading-none tracking-wide">
                Sua saúde
              </h1>
              <p className="max-w-[33ch] text-[13.5px] leading-relaxed text-nevoa">
                Responder com sinceridade aqui é o que deixa o treino seguro. Só o Allisson vê estas respostas.
              </p>
            </header>

            <section className="flex flex-col gap-3.5">
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-nevoa">
                Histórico
              </span>
              {PERGUNTAS_SAUDE.map((p, i) => {
                const valor = dados[p.campo];
                return (
                  <div key={p.campo} className={`flex flex-col gap-2.5 ${i > 0 ? "border-t border-linha pt-3.5" : ""}`}>
                    <div className="flex items-center gap-3">
                      <p className="flex-1 text-[13.5px] leading-snug">{p.texto}</p>
                      <div className={`flex flex-none overflow-hidden rounded-[9px] border ${valor === true ? "border-raio" : "border-linha"}`}>
                        <button
                          type="button"
                          onClick={() => mudar(p.campo, true)}
                          aria-pressed={valor === true}
                          className={`px-3.5 py-2 text-[12.5px] transition ${
                            valor === true ? "bg-raio font-bold text-papel" : "text-nevoa hover:text-papel"
                          }`}
                        >
                          Sim
                        </button>
                        <button
                          type="button"
                          onClick={() => mudar(p.campo, false)}
                          aria-pressed={valor === false}
                          className={`border-l border-linha px-3.5 py-2 text-[12.5px] transition ${
                            valor === false ? "bg-tinta-3 font-bold text-papel" : "text-nevoa hover:text-papel"
                          }`}
                        >
                          Não
                        </button>
                      </div>
                    </div>
                    {valor === true && (
                      <div className="border-l-2 border-raio pl-3.5">
                        <input
                          value={dados[p.detalhe]}
                          onChange={(e) => mudar(p.detalhe, e.target.value)}
                          placeholder={p.dica}
                          className={`${campo} py-2.5 text-[13.5px]`}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </section>

            <section className="flex flex-col gap-3">
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-nevoa">
                Lesões ou limitações
              </span>
              <textarea
                rows={3}
                value={dados.lesoes}
                onChange={(e) => mudar("lesoes", e.target.value)}
                placeholder="Ex.: dor lombar ao agachar com carga alta"
                className={`${campo} resize-none leading-relaxed`}
              />
            </section>

            <button
              type="button"
              onClick={() => mudar("consentiu", !dados.consentiu)}
              aria-pressed={dados.consentiu}
              className={`flex gap-3 rounded-2xl border p-4 text-left transition ${
                dados.consentiu ? "border-raio/60 bg-raio/[0.09]" : "border-linha bg-tinta-2 hover:border-nevoa"
              }`}
            >
              <span
                aria-hidden="true"
                className={`mt-0.5 flex h-[22px] w-[22px] flex-none items-center justify-center rounded-md ${
                  dados.consentiu ? "bg-raio" : "border border-linha"
                }`}
              >
                {dados.consentiu && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </span>
              <span className="flex-1">
                <span className="block text-[12.5px] leading-relaxed text-papel/90">
                  Autorizo o uso dos meus dados de saúde (peso, lesões e fotos de evolução) para o meu
                  acompanhamento com o Allisson Santos, conforme a Política de Privacidade da ARS Team.
                </span>
                <span className="mt-2 block text-[11.5px] leading-relaxed text-nevoa">
                  Você pode pedir a exclusão desses dados quando quiser, direto no seu perfil.
                </span>
              </span>
            </button>
          </>
        )}

        {etapa === 3 && (
          <>
            <header className="flex flex-col gap-1.5">
              <h1 className="font-display text-[27px] uppercase leading-none tracking-wide">
                Seu ponto de partida
              </h1>
              <p className="max-w-[33ch] text-[13.5px] leading-relaxed text-nevoa">
                É com isso que a gente compara daqui a 30 dias. Só o Allisson vê estas fotos.
              </p>
            </header>

            <section className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-nevoa">
                  Fotos de hoje
                </span>
                <span className="font-mono text-[10.5px] text-raio-forte">
                  {Object.keys(fotos).length} de 3
                </span>
              </div>
              <div className="flex gap-2.5">
                {ANGULOS.map(([valor, nome]) => {
                  const foto = fotos[valor];
                  return (
                    <div key={valor} className="flex-1">
                      <input
                        ref={(el) => {
                          entradas.current[valor] = el;
                        }}
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => {
                          const arquivo = e.target.files?.[0];
                          if (arquivo) void escolherFoto(valor, arquivo);
                          e.target.value = "";
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => entradas.current[valor]?.click()}
                        className={`relative flex h-[148px] w-full items-center justify-center overflow-hidden rounded-xl transition ${
                          foto ? "border border-raio" : "border border-dashed border-linha hover:border-nevoa"
                        }`}
                      >
                        {foto ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={foto.previa} alt={`Foto de ${nome.toLowerCase()}`} className="h-full w-full object-cover" />
                            <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-md bg-raio">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6 9 17l-5-5" />
                              </svg>
                            </span>
                          </>
                        ) : (
                          <span className="flex flex-col items-center gap-1.5 text-nevoa">
                            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 8.5h3l1.5-2.5h7L17 8.5h3a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5a1 1 0 0 1 1-1z" />
                              <circle cx="12" cy="13.5" r="3.2" />
                            </svg>
                            <span className="text-[11px]">Tirar</span>
                          </span>
                        )}
                      </button>
                      <p className="mt-1.5 text-center font-mono text-[9.5px] uppercase text-nevoa">{nome}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-nevoa">
                  Medidas
                </span>
                <span className="text-[11px] text-nevoa">opcional</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {([
                  ["cintura_cm", "Cintura", "86"],
                  ["quadril_cm", "Quadril", "98"],
                  ["braco_cm", "Braço", "36"],
                  ["coxa_cm", "Coxa", "58"],
                ] as const).map(([chave, nome, exemplo]) => (
                  <label key={chave} className="flex flex-col gap-1.5">
                    <span className={rotulo}>{nome}</span>
                    <div className="relative">
                      <input
                        inputMode="decimal"
                        value={dados[chave]}
                        onChange={(e) => mudar(chave, e.target.value)}
                        placeholder={`Ex.: ${exemplo}`}
                        className={`${campo} pr-10`}
                      />
                      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] text-nevoa">cm</span>
                    </div>
                  </label>
                ))}
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-nevoa">
                Horário que costuma treinar
              </span>
              <div className="grid grid-cols-3 gap-2">
                {PERIODOS.map(([valor, nome]) => (
                  <button
                    key={valor}
                    type="button"
                    onClick={() => mudar("periodo_treino", valor)}
                    aria-pressed={dados.periodo_treino === valor}
                    className={`rounded-xl py-3 text-[13px] transition ${
                      dados.periodo_treino === valor
                        ? "bg-raio font-bold text-papel"
                        : "border border-linha bg-tinta-2 text-nevoa hover:border-nevoa"
                    }`}
                  >
                    {nome}
                  </button>
                ))}
              </div>
            </section>

            <div className="flex gap-3 rounded-2xl border border-linha bg-tinta-2 p-4">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-none text-nevoa" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
              <p className="text-[12.5px] leading-relaxed text-nevoa">
                Pode pular as fotos agora e enviar depois pela aba Evolução. A ficha não fica travada por causa disso.
              </p>
            </div>
          </>
        )}
      </div>

      {/* barra fixa */}
      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-tinta from-[68%] to-transparent px-5 pb-6 pt-4">
        <div className="mx-auto max-w-md">
          {erro && (
            <p role="alert" className="mb-3 rounded-xl border border-raio/40 bg-raio/10 px-4 py-3 text-sm text-raio-forte">
              {erro}
            </p>
          )}
          <button
            type="button"
            onClick={etapa === 3 ? enviar : avancar}
            disabled={ocupado}
            className="w-full rounded-xl bg-raio px-4 py-4 font-display text-[17px] uppercase tracking-wider text-papel transition hover:bg-raio-forte disabled:opacity-60"
          >
            {ocupado
              ? subindo
                ? "Enviando"
                : "Salvando"
              : etapa === 3
                ? "Enviar para o Allisson"
                : "Continuar"}
          </button>
        </div>
      </div>
    </div>
  );
}

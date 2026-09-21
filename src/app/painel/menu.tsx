"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Logo } from "@/components/logo";
import { Raio } from "@/components/raio";

/**
 * O menu lateral do painel.
 *
 * Substituiu a fileira de abas do topo em 21/09, a pedido do Allisson, que
 * navega assim na treino.io. E nao foi so gosto: o topo dividia 64px com logo,
 * seis abas, data, avatar e Sair, e a lista so cresce. Aba no topo aguenta
 * seis; coluna lateral aguenta dez sem apertar.
 *
 * LISTA PLANA, SEM SUBMENU. O menu da treino.io complica justamente nos grupos
 * que abrem (Treino > Fichas, Pre-definidos, Exercicios, Substituicao...).
 * O pedido dele veio junto com "sem ficar complexo", e submenu e onde a
 * navegacao vira labirinto.
 *
 * Recolhivel porque notebook de 13" com a coluna aberta perde 240px de
 * tabela. O estado mora num cookie, e nao em localStorage: o servidor precisa
 * saber a largura ANTES de desenhar, senao o menu nasce aberto e fecha na cara
 * do usuario a cada navegacao.
 */

export type ItemDoMenu = { href: string; nome: string; icone: NomeDoIcone };

type NomeDoIcone =
  | "painel"
  | "alunos"
  | "treinos"
  | "biblioteca"
  | "convites"
  | "financeiro";

// Tracos no estilo do resto do app: 24px de grade, contorno de 1.8, pontas
// redondas. Inline de proposito -- seis icones nao justificam uma biblioteca.
const ICONES: Record<NomeDoIcone | "recolher" | "menu" | "fechar" | "sair", ReactNode> = {
  painel: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  alunos: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  treinos: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  biblioteca: (
    <>
      <path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z" />
      <path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z" />
    </>
  ),
  convites: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6" />
      <path d="M22 11h-6" />
    </>
  ),
  financeiro: (
    <>
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    </>
  ),
  recolher: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18" />
    </>
  ),
  menu: (
    <>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </>
  ),
  fechar: (
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>
  ),
  sair: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </>
  ),
};

function Icone({ nome }: { nome: keyof typeof ICONES }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="flex-none"
    >
      {ICONES[nome]}
    </svg>
  );
}

/** "/painel" so acende exato, senao ficaria aceso em todas as telas. */
function estaAtivo(href: string, caminho: string): boolean {
  return href === "/painel" ? caminho === "/painel" : caminho.startsWith(href);
}

const COOKIE = "painel_menu";

function Itens({
  itens,
  emBreve,
  recolhido,
  aoNavegar,
}: {
  itens: readonly ItemDoMenu[];
  emBreve: readonly string[];
  recolhido: boolean;
  aoNavegar?: () => void;
}) {
  const caminho = usePathname();

  return (
    <ul className="flex flex-col gap-1">
      {itens.map((item) => {
        const ativo = estaAtivo(item.href, caminho);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={aoNavegar}
              aria-current={ativo ? "page" : undefined}
              // Recolhido, o rotulo some: o nome continua para o leitor de
              // tela e aparece ao parar o mouse.
              aria-label={recolhido ? item.nome : undefined}
              title={recolhido ? item.nome : undefined}
              className={`relative flex min-h-11 items-center gap-3 rounded-xl text-[15px] font-semibold transition-colors ${
                recolhido ? "justify-center px-0" : "px-3"
              } ${
                ativo
                  ? "bg-tinta-3 text-papel"
                  : "text-nevoa hover:bg-tinta-3/60 hover:text-papel"
              }`}
            >
              {/* O traco vermelho que marcava a aba ativa no topo passa para a
                  borda esquerda. Cor nao e o unico sinal: o fundo tambem muda. */}
              {ativo && (
                <span
                  aria-hidden="true"
                  className="absolute inset-y-2.5 left-0 w-[3px] rounded-full bg-raio"
                />
              )}
              <Icone nome={item.icone} />
              {!recolhido && <span className="truncate">{item.nome}</span>}
            </Link>
          </li>
        );
      })}

      {!recolhido &&
        emBreve.map((nome) => (
          <li
            key={nome}
            title="Ainda não construído"
            className="flex min-h-11 cursor-not-allowed items-center px-3 text-[15px] text-nevoa/45"
          >
            {nome}
          </li>
        ))}
    </ul>
  );
}

function Rodape({
  recolhido,
  nome,
  iniciais,
  data,
}: {
  recolhido: boolean;
  nome: string;
  iniciais: string;
  data: { diaDaSemana: string; diaEMes: string };
}) {
  return (
    <div className={`flex flex-col gap-3 border-t border-linha pt-4 ${recolhido ? "items-center" : ""}`}>
      {!recolhido && (
        <p className="px-3 font-mono text-[13px] uppercase tracking-wide text-nevoa">
          {data.diaDaSemana}, {data.diaEMes}
        </p>
      )}

      <div className={`flex items-center gap-3 ${recolhido ? "flex-col" : "px-1"}`}>
        <span
          title={recolhido ? nome : undefined}
          aria-hidden="true"
          className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-contorno bg-tinta-3 text-sm font-bold"
        >
          {iniciais}
        </span>
        {!recolhido && <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{nome}</span>}
        <form action="/auth/sair" method="post">
          <button
            type="submit"
            aria-label="Sair"
            title="Sair"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-contorno text-nevoa transition-colors hover:border-nevoa hover:text-papel"
          >
            <Icone nome="sair" />
          </button>
        </form>
      </div>
    </div>
  );
}

export function MenuDoPainel({
  itens,
  emBreve,
  recolhidoDeInicio,
  nome,
  iniciais,
  data,
}: {
  itens: readonly ItemDoMenu[];
  emBreve: readonly string[];
  recolhidoDeInicio: boolean;
  nome: string;
  iniciais: string;
  data: { diaDaSemana: string; diaEMes: string };
}) {
  const [recolhido, setRecolhido] = useState(recolhidoDeInicio);
  const caminho = usePathname();

  // A gaveta do celular guarda EM QUE PAGINA foi aberta, e nao um sim/nao.
  // Mudou de pagina -- inclusive pelo voltar do navegador -- ela deixa de
  // bater com o caminho e fecha sozinha, sem efeito nenhum. Sem isto ficaria
  // aberta por cima da tela que a pessoa acabou de pedir.
  const [abertaEm, setAbertaEm] = useState<string | null>(null);
  const gavetaAberta = abertaEm === caminho;
  const setGavetaAberta = (abrir: boolean) => setAbertaEm(abrir ? caminho : null);

  useEffect(() => {
    if (!gavetaAberta) return;
    const fechar = (e: KeyboardEvent) => e.key === "Escape" && setAbertaEm(null);
    window.addEventListener("keydown", fechar);
    return () => window.removeEventListener("keydown", fechar);
  }, [gavetaAberta]);

  function alternar() {
    const novo = !recolhido;
    setRecolhido(novo);
    // `path=/painel`: o cookie so viaja nas requisicoes do painel, que e o
    // unico lugar que precisa dele.
    document.cookie = `${COOKIE}=${novo ? "recolhido" : "aberto"}; path=/painel; max-age=31536000; samesite=lax`;
  }

  return (
    <>
      {/* ---------- computador: a coluna ---------- */}
      <aside
        className={`sticky top-0 hidden h-dvh flex-none flex-col border-r border-linha bg-tinta-2 py-4 transition-[width] duration-200 lg:flex ${
          recolhido ? "w-[76px] px-3" : "w-60 px-3"
        }`}
      >
        <div className={`flex h-12 items-center ${recolhido ? "justify-center" : "px-3"}`}>
          {/* min-h-11: o logo tambem e alvo de toque, e o raio sozinho tem
              24px de largura. */}
          <Link
            href="/painel"
            aria-label="ARS Team, ir para o painel"
            className="flex min-h-11 min-w-11 items-center justify-center"
          >
            {recolhido ? (
              <Raio className="h-7 w-auto text-raio" />
            ) : (
              <Logo className="h-8 w-auto text-papel" />
            )}
          </Link>
        </div>

        <nav aria-label="Painel" className="mt-6 flex-1 overflow-y-auto">
          <Itens itens={itens} emBreve={emBreve} recolhido={recolhido} />
        </nav>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={alternar}
            aria-label={recolhido ? "Abrir o menu" : "Recolher o menu"}
            aria-expanded={!recolhido}
            title={recolhido ? "Abrir o menu" : "Recolher o menu"}
            className={`inline-flex min-h-11 items-center gap-3 rounded-xl text-[15px] font-semibold text-nevoa transition-colors hover:bg-tinta-3/60 hover:text-papel ${
              recolhido ? "justify-center" : "px-3"
            }`}
          >
            <Icone nome="recolher" />
            {!recolhido && <span>Recolher</span>}
          </button>

          <Rodape recolhido={recolhido} nome={nome} iniciais={iniciais} data={data} />
        </div>
      </aside>

      {/* ---------- celular: barra fina e gaveta ----------
          O Allisson usa o painel quase sempre no computador (21/09). No
          celular o painel so precisa funcionar, nao ser desenhado para ele. */}
      <header className="topo-seguro sticky top-0 z-30 border-b border-linha bg-tinta-2 lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link
            href="/painel"
            aria-label="ARS Team, ir para o painel"
            className="flex min-h-11 items-center"
          >
            <Logo className="h-6 w-auto text-papel" />
          </Link>
          <button
            type="button"
            onClick={() => setGavetaAberta(true)}
            aria-label="Abrir o menu"
            aria-expanded={gavetaAberta}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-contorno text-nevoa transition-colors hover:border-nevoa hover:text-papel"
          >
            <Icone nome="menu" />
          </button>
        </div>
      </header>

      {gavetaAberta && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu do painel">
          <button
            type="button"
            aria-label="Fechar o menu"
            onClick={() => setGavetaAberta(false)}
            className="absolute inset-0 bg-black/70"
          />
          {/* `topo-seguro` aqui zeraria o py-4 (ele define padding-top), e o
              botao de fechar colava no topo. O max() cobre os dois casos. */}
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-linha bg-tinta-2 px-3 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
            <div className="flex h-12 items-center justify-between pl-3">
              <Logo className="h-5 w-auto text-papel" />
              <button
                type="button"
                onClick={() => setGavetaAberta(false)}
                aria-label="Fechar o menu"
                autoFocus
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-contorno text-nevoa transition-colors hover:border-nevoa hover:text-papel"
              >
                <Icone nome="fechar" />
              </button>
            </div>
            <nav aria-label="Painel" className="mt-6 flex-1 overflow-y-auto">
              <Itens
                itens={itens}
                emBreve={emBreve}
                recolhido={false}
                aoNavegar={() => setGavetaAberta(false)}
              />
            </nav>
            <Rodape recolhido={false} nome={nome} iniciais={iniciais} data={data} />
          </div>
        </div>
      )}
    </>
  );
}

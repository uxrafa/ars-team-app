/**
 * Regras da biblioteca de exercícios.
 *
 * Mesmo corte do `painel.ts` e do `convite.ts`: função pura recebe a linha do
 * banco e devolve o que a tela mostra.
 */

export type Grupo =
  | "peito"
  | "costas"
  | "pernas"
  | "ombro"
  | "biceps"
  | "triceps"
  | "abdomen"
  | "cardio"
  | "mobilidade"
  | "outros";

export type LinhaExercicio = {
  id: string;
  nome: string;
  grupo: Grupo;
  equipamento: string | null;
  video_url: string | null;
  instrucoes: string | null;
  ativo: boolean;
};

/** A ordem é a do corpo, de cima para baixo, e é como o Allisson pensa a ficha. */
export const GRUPOS: { valor: Grupo; nome: string }[] = [
  { valor: "peito", nome: "Peito" },
  { valor: "costas", nome: "Costas" },
  { valor: "ombro", nome: "Ombro" },
  { valor: "biceps", nome: "Bíceps" },
  { valor: "triceps", nome: "Tríceps" },
  { valor: "abdomen", nome: "Abdômen" },
  { valor: "pernas", nome: "Pernas" },
  { valor: "cardio", nome: "Cardio" },
  { valor: "mobilidade", nome: "Mobilidade" },
  { valor: "outros", nome: "Outros" },
];

export const NOME_DO_GRUPO: Record<Grupo, string> = Object.fromEntries(
  GRUPOS.map((g) => [g.valor, g.nome]),
) as Record<Grupo, string>;

/**
 * Tira acento e caixa para comparar.
 *
 * Sem isto, procurar por "triceps" não acha "Tríceps", e é exatamente assim
 * que alguém digita com pressa no meio de montar uma ficha.
 */
export function semAcento(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Casa a busca com nome e equipamento, palavra por palavra. Digitar
 * "supino halter" acha "Supino reto com halter" mesmo com o "reto com" no meio.
 */
export function casaComBusca(e: LinhaExercicio, busca: string): boolean {
  const termos = semAcento(busca).split(/\s+/).filter(Boolean);
  if (!termos.length) return true;
  const alvo = semAcento(`${e.nome} ${e.equipamento ?? ""}`);
  return termos.every((t) => alvo.includes(t));
}

export type Filtro = {
  busca: string;
  grupo: Grupo | "todos";
  soSemVideo: boolean;
};

export function filtrar(lista: LinhaExercicio[], f: Filtro): LinhaExercicio[] {
  return lista.filter((e) => {
    if (f.grupo !== "todos" && e.grupo !== f.grupo) return false;
    if (f.soSemVideo && e.video_url) return false;
    return casaComBusca(e, f.busca);
  });
}

export function agruparPorGrupo(lista: LinhaExercicio[]): { grupo: Grupo; itens: LinhaExercicio[] }[] {
  return GRUPOS.map((g) => ({
    grupo: g.valor,
    itens: lista.filter((e) => e.grupo === g.valor),
  })).filter((s) => s.itens.length > 0);
}

export function resumo(lista: LinhaExercicio[]) {
  const comVideo = lista.filter((e) => e.video_url).length;
  return {
    total: lista.length,
    comVideo,
    semVideo: lista.length - comVideo,
    semEquipamento: lista.filter((e) => !e.equipamento).length,
  };
}

/* ------------------------------------------------------------------ */
/* Link de vídeo                                                       */
/* ------------------------------------------------------------------ */

/**
 * O campo no banco é texto genérico de propósito (ver migração 0003): hoje é
 * YouTube não listado, e trocar de provedor não pode pedir migration. Então
 * aqui só exigimos que seja um endereço https de verdade.
 */
export function videoValido(url: string): boolean {
  const limpo = url.trim();
  if (!limpo) return true; // vazio é permitido: é o estado normal por enquanto
  try {
    const u = new URL(limpo);
    return u.protocol === "https:" && u.hostname.includes(".");
  } catch {
    return false;
  }
}

/** Tira o que o YouTube gruda no link ao compartilhar e não serve para nada. */
export function limparVideo(url: string): string | null {
  const limpo = url.trim();
  if (!limpo) return null;
  try {
    const u = new URL(limpo);
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      const id = u.hostname.includes("youtu.be")
        ? u.pathname.slice(1)
        : u.searchParams.get("v");
      if (id) return `https://www.youtube.com/watch?v=${id}`;
    }
    return u.toString();
  } catch {
    return limpo;
  }
}

/**
 * O id do vídeo, quando é YouTube.
 *
 * A tela de execução mostra o vídeo dentro do app, e o player embutido pede o
 * id, não o endereço. Vale para os três formatos que o YouTube devolve ao
 * compartilhar: `watch?v=`, `youtu.be/` e `/shorts/`.
 */
export function idDoYoutube(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.trim());
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1).split("/")[0] || null;
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname.startsWith("/embed/")) return u.pathname.slice(7).split("/")[0] || null;
      if (u.pathname.startsWith("/shorts/")) return u.pathname.slice(8).split("/")[0] || null;
      return u.searchParams.get("v");
    }
  } catch {
    return null;
  }
  return null;
}

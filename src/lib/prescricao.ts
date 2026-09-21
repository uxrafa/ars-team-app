/**
 * Como uma prescrição de exercício se lê em uma linha.
 *
 * Arquivo próprio, sem importar nada, de propósito: são cinco lugares que
 * escrevem isso (editor, ficha do painel, lista do treino, cartão de hoje,
 * planilha), cinco cópias divergiriam no primeiro ajuste, e assim o teste
 * consegue importar direto, sem arrastar o resto de `lib/ficha.ts`.
 */

/** O mesmo teto da constraint `item_aquecimento_valido` (migração 0016). */
export const MAX_AQUECIMENTO = 10;

/** "1 aquecimento", "2 aquecimentos", ou nada. */
export function rotuloDeAquecimento(n: number): string | null {
  if (!Number.isFinite(n) || n <= 0) return null;
  return n === 1 ? "1 aquecimento" : `${n} aquecimentos`;
}

/**
 * "1 aquecimento + 3 séries × 10-12 reps".
 *
 * O aquecimento vem na frente porque é a ordem em que acontece na academia.
 * Sem aquecimento, o texto fica exatamente como era antes da 0016: toda ficha
 * antiga tem zero na coluna nova, e o aluno não pode ver nada mudar por isso.
 */
export function prescricao(item: {
  series: number;
  series_aquecimento?: number | null;
  reps: string;
}): string {
  const validas = `${item.series || 0} ${item.series === 1 ? "série" : "séries"} × ${item.reps || "?"} reps`;
  const aquec = rotuloDeAquecimento(item.series_aquecimento ?? 0);
  return aquec ? `${aquec} + ${validas}` : validas;
}

/**
 * Foto de evolução, do lado do navegador.
 *
 * Mora fora das telas porque a anamnese e a aba Evolução sobem a mesma coisa
 * para o mesmo bucket, e duas cópias desta função acabariam divergindo.
 */

/** Reduz a foto antes de subir. Sem isto, 25 alunos estouram o storage. */
export async function comprimir(arquivo: File): Promise<Blob> {
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
    const blob = await new Promise<Blob | null>((ok) => tela.toBlob(ok, "image/jpeg", 0.82));
    return blob ?? arquivo;
  } catch {
    // Formato que o navegador nao abre (HEIC antigo, por exemplo).
    // Sobe o original: o bucket ja limita em 6 MB.
    return arquivo;
  }
}

/** Convenção do bucket: {aluno_id}/{aaaa-mm-dd}/{angulo}.jpg */
export function caminhoDaFoto(alunoId: string, data: string, angulo: string): string {
  return `${alunoId}/${data}/${angulo}.jpg`;
}

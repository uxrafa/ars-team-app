import { headers } from "next/headers";

/**
 * O endereco publico do site, visto de dentro do servidor.
 *
 * O link que vai no e-mail precisa apontar para o dominio que o aluno abre, e
 * nao para o host interno da Vercel. Ler dos cabecalhos encaminhados resolve
 * isso sem variavel de ambiente nova, e continua funcionando no `next dev`.
 */
export async function enderecoDoSite(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protocolo = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocolo}://${host}`;
}

/**
 * So aceita caminho interno.
 *
 * O `proximo` chega pela URL, e URL e coisa que qualquer um escreve: sem esta
 * peneira, um link com `proximo=https://outro-site` faria o app mandar o aluno
 * recem-autenticado para fora.
 */
export function caminhoInterno(valor: string | null, padrao = "/app"): string {
  if (!valor) return padrao;
  if (!valor.startsWith("/") || valor.startsWith("//")) return padrao;
  return valor;
}

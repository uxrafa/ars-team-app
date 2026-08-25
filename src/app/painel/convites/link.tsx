"use client";

import { useEffect, useState } from "react";
import { Botao, BotaoLink } from "@/components/ui";
import { linkWhatsapp } from "@/lib/painel";
import { mensagemDeConvite } from "@/lib/convite";

function Copia() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="12" height="12" rx="2.5" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </svg>
  );
}

function Certo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12.5l5 5L20 6.5" />
    </svg>
  );
}

function Zap() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 1.67c2.2 0 4.27.86 5.83 2.41a8.2 8.2 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.25 8.24a8.24 8.24 0 0 1-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.26-8.24zm-2.6 4.1c-.16 0-.42.06-.64.3-.22.24-.85.83-.85 2.02s.87 2.34.99 2.5c.12.16 1.7 2.6 4.13 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28-.24-.12-1.44-.71-1.66-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.95-1.2-.72-.64-1.2-1.44-1.34-1.68-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.19-.46-.39-.4-.54-.41h-.46z" />
    </svg>
  );
}

/** Copia para a area de transferencia e diz que copiou. */
export function BotaoCopiar({
  texto,
  rotulo = "Copiar link",
  aparencia = "secundario",
  largura = "auto",
}: {
  texto: string;
  rotulo?: string;
  aparencia?: "primario" | "secundario" | "fantasma";
  largura?: "auto" | "cheia";
}) {
  const [copiou, setCopiou] = useState(false);

  useEffect(() => {
    if (!copiou) return;
    const t = setTimeout(() => setCopiou(false), 2200);
    return () => clearTimeout(t);
  }, [copiou]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiou(true);
    } catch {
      // Navegador sem permissao de area de transferencia: seleciona o texto
      // para o Allisson copiar na mao, em vez de nao fazer nada.
      window.prompt("Copie o link:", texto);
    }
  }

  return (
    <Botao
      type="button"
      onClick={copiar}
      aparencia={copiou ? "primario" : aparencia}
      tamanho="sm"
      largura={largura}
    >
      {copiou ? <Certo /> : <Copia />}
      {copiou ? "Copiado" : rotulo}
    </Botao>
  );
}

/** Abre o WhatsApp com a mensagem escrita. Sem numero, nao finge que abre. */
export function BotaoWhatsapp({
  whatsapp,
  nome,
  link,
  largura = "auto",
}: {
  whatsapp: string | null;
  nome: string;
  link: string;
  largura?: "auto" | "cheia";
}) {
  const destino = linkWhatsapp(whatsapp, mensagemDeConvite(nome, link));

  if (!destino) {
    return (
      <span className="inline-flex min-h-11 items-center rounded-xl border border-dashed border-contorno px-4 text-[15px] text-nevoa">
        Sem WhatsApp no cadastro
      </span>
    );
  }

  return (
    <BotaoLink
      href={destino}
      target="_blank"
      rel="noopener noreferrer"
      aparencia="secundario"
      tamanho="sm"
      largura={largura}
    >
      <Zap />
      Mandar no WhatsApp
    </BotaoLink>
  );
}

/** O link em si, para o Allisson conferir antes de mandar. */
export function LinkVisivel({ link }: { link: string }) {
  return (
    <p className="overflow-hidden rounded-xl border border-linha bg-tinta-3 px-4 py-3 font-mono text-[13px] leading-relaxed text-nevoa">
      <span className="block break-all">{link}</span>
    </p>
  );
}

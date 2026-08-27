import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Hanken_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// Tanker e a fonte oficial de titulos da ARS Team. O arquivo mora em
// src/fonts e vem do mesmo .otf usado no site arsteam.vercel.app.
const display = localFont({
  src: "../fonts/Tanker-Regular.woff2",
  weight: "400",
  style: "normal",
  display: "swap",
  variable: "--fonte-display",
  fallback: ["Impact", "sans-serif"],
});

// Corpo: a marca usa Asterisk Sans (Typekit). Hanken Grotesk fica como
// substituta aprovada, por ser gratuita e de desenho proximo.
const corpo = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--fonte-corpo",
});

// So para dado: peso, data, contagem. Nunca para prosa.
const dado = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--fonte-mono",
});

export const metadata: Metadata = {
  title: "ARS Team",
  description: "Área do aluno e painel do treinador da ARS Team.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "ARS Team" },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // As variaveis das fontes vao no <html>, e NAO no <body>.
    //
    // O bloco `@theme` do globals.css declara, no `:root`:
    //     --font-display: var(--fonte-display), Impact, sans-serif;
    //
    // `var()` e resolvido no elemento onde a propriedade e DECLARADA. Com as
    // classes do next/font no <body>, o `:root` nunca enxergava
    // `--fonte-display`, entao `--font-display` virava valor invalido, e
    // `font-family: var(--font-display)` caia no padrao do navegador.
    //
    // Resultado: o app inteiro rodou em Arial desde o comeco. Tanker, Hanken
    // Grotesk e IBM Plex Mono carregavam e nao eram usadas por ninguem.
    <html lang="pt-BR" className={`${display.variable} ${corpo.variable} ${dado.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}

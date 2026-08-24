import type { Metadata, Viewport } from "next";
import { Anton, Hanken_Grotesk } from "next/font/google";
import "./globals.css";

// Anton entra como substituta da Tanker, que e a fonte oficial de titulos da marca.
// Para trocar pela Tanker de verdade, use next/font/local apontando para Tanker-Regular.otf.
const display = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--fonte-display",
});

const corpo = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--fonte-corpo",
});

export const metadata: Metadata = {
  title: "ARS Team",
  description: "Area do aluno e painel do treinador da ARS Team.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "ARS Team" },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${display.variable} ${corpo.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}

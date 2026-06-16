import type { Metadata } from "next";
import { DM_Mono, Fraunces, Geist } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const dmMono = DM_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-dm-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AprovaOAB — Estude só o que você precisa pra passar na 1ª fase",
  description:
    "Diagnóstico por matéria, plano de estudos montado pelos seus erros e simulados completos no padrão FGV. Comece grátis, sem cartão de crédito.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth">
      <body
        className={`${fraunces.variable} ${geist.variable} ${dmMono.variable} bg-background font-sans text-foreground antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

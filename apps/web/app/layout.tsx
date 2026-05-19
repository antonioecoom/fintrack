import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "FinTrack | Control de Finanzas Personales e Inversión",
  description: "Control total de tus finanzas e inversiones. Minimalista, seguro e inteligente con categorización por IA.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className={`${inter.variable} bg-background text-textPrimary antialiased`}>
        {children}
      </body>
    </html>
  );
}

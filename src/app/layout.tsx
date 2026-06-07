import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { auth } from "@/auth";
import { BotaoLogout } from "@/components/BotaoLogout";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Quilate — Controle de Estoque",
  description: "Controle de estoque para joalherias, by Otimiza.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {session && (
          <header className="border-b border-gray-200 dark:border-gray-800">
            <nav className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 text-sm">
              <a href="/" className="font-semibold text-amber-600">
                Quilate
              </a>
              <a href="/cadastro" className="hover:underline">
                Cadastro
              </a>
              <a href="/movimentacao" className="hover:underline">
                Movimentação
              </a>
              <a href="/catalogo" className="hover:underline">
                Catálogo
              </a>
              <a href="/produtos" className="hover:underline">
                Produtos
              </a>
              <a href="/relatorios" className="hover:underline">
                Relatórios
              </a>
              <a href="/colecoes" className="hover:underline">
                Coleções
              </a>
              <a href="/fornecedores" className="hover:underline">
                Fornecedores
              </a>
              <span className="ml-auto flex items-center gap-3 text-gray-500">
                {session.user?.name}
                <BotaoLogout />
              </span>
            </nav>
          </header>
        )}
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">{children}</main>
      </body>
    </html>
  );
}

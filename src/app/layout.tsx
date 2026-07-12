import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { auth } from "@/auth";
import { NavegacaoPrincipal } from "@/components/NavegacaoPrincipal";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const scriptTema = `
  (function () {
    try {
      var tema = localStorage.getItem("quilates-tema");
      var escuro = tema === "escuro" || (!tema && window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.classList.toggle("dark", escuro);
    } catch (_) {}
  })();
`;

export const metadata: Metadata = {
  title: "Quilates — Gestão de Joias",
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
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
        {session && <NavegacaoPrincipal usuario={session.user?.name} />}
        <main
          className={
            session
              ? "mx-auto w-full max-w-7xl flex-1 px-4 py-7 sm:px-6 sm:py-10"
              : "w-full flex-1"
          }
        >
          {children}
        </main>
      </body>
    </html>
  );
}

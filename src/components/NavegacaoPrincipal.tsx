"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlternadorTema } from "@/components/AlternadorTema";
import { BotaoLogout } from "@/components/BotaoLogout";

const LINKS = [
  { href: "/", rotulo: "Início" },
  { href: "/cadastro", rotulo: "Cadastro" },
  { href: "/movimentacao", rotulo: "Movimentação" },
  { href: "/catalogo", rotulo: "Catálogo" },
  { href: "/produtos", rotulo: "Produtos" },
  { href: "/posicao-estoque", rotulo: "Estoque" },
  { href: "/relatorios", rotulo: "Relatórios" },
  { href: "/colecoes", rotulo: "Coleções" },
  { href: "/fornecedores", rotulo: "Fornecedores" },
] as const;

export function NavegacaoPrincipal({ usuario }: { usuario: string | null | undefined }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-[#d7e2dd]/90 bg-white/90 shadow-[0_8px_30px_-24px_rgba(8,63,61,0.55)] backdrop-blur-xl dark:border-petroleo-800 dark:bg-petroleo-950/92">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex min-h-16 items-center justify-between gap-4 py-2">
          <Link href="/" className="group flex items-center gap-3" aria-label="Quilates — início">
            <span className="flex size-10 items-center justify-center rounded-full bg-petroleo-700 text-lg font-bold text-white shadow-lg shadow-petroleo-900/15 group-hover:bg-petroleo-800">
              Q
            </span>
            <span>
              <span className="block text-lg font-bold tracking-tight text-petroleo-900 dark:text-white">
                Quilates
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-ouro-600 dark:text-ouro-300">
                Gestão de joias
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden rounded-full bg-petroleo-50 px-3 py-1.5 text-xs font-medium text-petroleo-800 sm:block dark:bg-petroleo-900 dark:text-petroleo-100">
              {usuario ?? "usuário"}
            </span>
            <AlternadorTema />
            <BotaoLogout />
          </div>
        </div>

        <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0" aria-label="Navegação principal">
          {LINKS.map((link) => {
            const ativo =
              link.href === "/" ? pathname === "/" : pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={ativo ? "page" : undefined}
                className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold sm:text-sm ${
                  ativo
                    ? "bg-petroleo-700 text-white shadow-sm"
                    : "text-[#536967] hover:bg-petroleo-50 hover:text-petroleo-800 dark:text-petroleo-200 dark:hover:bg-petroleo-900 dark:hover:text-white"
                }`}
              >
                {link.rotulo}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

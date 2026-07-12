"use client";

/** Login com identidade visual Quilates. */

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlternadorTema } from "@/components/AlternadorTema";

export default function PaginaLogin() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setErro(null);
    const resultado = await signIn("credentials", { username, password, redirect: false });
    setEnviando(false);
    if (resultado?.error) {
      setErro("Usuário ou senha inválidos.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="grid min-h-screen bg-[#f5f6f2] lg:grid-cols-[1.05fr_0.95fr] dark:bg-petroleo-950">
      <aside className="relative hidden min-h-screen overflow-hidden bg-petroleo-800 p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute -right-24 -top-24 size-96 rounded-full border border-white/10" />
        <div className="absolute -right-10 top-10 size-64 rounded-full border border-ouro-300/25" />
        <div className="absolute bottom-20 left-1/2 size-72 -translate-x-1/2 rounded-full bg-petroleo-700 shadow-[0_0_120px_rgba(213,238,234,0.12)]" />
        <div className="absolute bottom-36 left-1/2 size-40 -translate-x-1/2 rotate-45 rounded-[2.8rem] border border-ouro-300/40 bg-white/5 backdrop-blur" />
        <div className="absolute bottom-48 left-1/2 size-16 -translate-x-1/2 rotate-45 rounded-2xl bg-gradient-to-br from-white via-petroleo-100 to-petroleo-300 shadow-2xl shadow-black/30" />

        <div className="relative flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-full bg-white text-xl font-bold text-petroleo-800">
            Q
          </span>
          <div>
            <p className="text-xl font-bold">Quilates</p>
            <p className="text-xs uppercase tracking-[0.2em] text-ouro-200">Gestão de joias</p>
          </div>
        </div>

        <div className="relative max-w-xl pb-5">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-ouro-200">
            Estoque com precisão
          </p>
          <h1 className="max-w-lg text-4xl font-semibold leading-tight xl:text-5xl">
            Cada joia conta uma história. Cada movimento também.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-petroleo-100">
            Controle modelos, variações, coleções e saldos em um só lugar, com clareza para a
            operação diária.
          </p>
        </div>
      </aside>

      <main className="relative flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
        <div className="absolute right-5 top-5 sm:right-8 sm:top-8">
          <AlternadorTema />
        </div>
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-full bg-petroleo-700 text-xl font-bold text-white">
                Q
              </span>
              <div>
                <p className="text-xl font-bold text-petroleo-900 dark:text-white">Quilates</p>
                <p className="text-xs uppercase tracking-[0.18em] text-ouro-600 dark:text-ouro-300">
                  Gestão de joias
                </p>
              </div>
            </div>
          </div>

          <p className="quilates-eyebrow">Acesso seguro</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-petroleo-950 dark:text-white">
            Bem-vindo de volta
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#687977] dark:text-petroleo-200">
            Entre com suas credenciais para acessar o painel de estoque.
          </p>

          <form onSubmit={entrar} className="quilates-panel mt-8 space-y-5 rounded-3xl p-6 sm:p-8 dark:bg-petroleo-900">
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-semibold text-petroleo-900 dark:text-petroleo-50">Usuário</span>
              <input
                type="text"
                value={username}
                onChange={(evento) => setUsername(evento.target.value)}
                autoFocus
                autoComplete="username"
                required
                placeholder="Digite seu usuário"
                className="rounded-xl border border-[#cbd9d4] bg-[#f9fbfa] px-4 py-3 text-petroleo-950 placeholder:text-[#93a19e] focus:border-petroleo-500 dark:border-petroleo-700 dark:bg-petroleo-950 dark:text-white"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-semibold text-petroleo-900 dark:text-petroleo-50">Senha</span>
              <input
                type="password"
                value={password}
                onChange={(evento) => setPassword(evento.target.value)}
                autoComplete="current-password"
                required
                placeholder="Digite sua senha"
                className="rounded-xl border border-[#cbd9d4] bg-[#f9fbfa] px-4 py-3 text-petroleo-950 placeholder:text-[#93a19e] focus:border-petroleo-500 dark:border-petroleo-700 dark:bg-petroleo-950 dark:text-white"
              />
            </label>

            {erro && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={enviando}
              className="w-full rounded-xl bg-petroleo-700 px-4 py-3 font-semibold text-white shadow-lg shadow-petroleo-900/15 hover:-translate-y-0.5 hover:bg-petroleo-800 disabled:translate-y-0 disabled:opacity-50"
            >
              {enviando ? "Entrando..." : "Entrar no Quilates"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-[#80918e] dark:text-petroleo-300">
            Controle de estoque · uma solução Otimiza
          </p>
        </div>
      </main>
    </div>
  );
}

"use client";

import { useSyncExternalStore } from "react";

const CHAVE_TEMA = "quilates-tema";
const EVENTO_TEMA = "quilates-tema-alterado";

function assinarTema(aoMudar: () => void): () => void {
  window.addEventListener(EVENTO_TEMA, aoMudar);
  return () => window.removeEventListener(EVENTO_TEMA, aoMudar);
}

function temaEscuroAtual(): boolean {
  return document.documentElement.classList.contains("dark");
}

export function AlternadorTema() {
  const escuro = useSyncExternalStore(assinarTema, temaEscuroAtual, () => false);

  function alternar() {
    const proximoEscuro = !escuro;
    document.documentElement.classList.toggle("dark", proximoEscuro);
    localStorage.setItem(CHAVE_TEMA, proximoEscuro ? "escuro" : "claro");
    window.dispatchEvent(new Event(EVENTO_TEMA));
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={escuro ? "Ativar modo claro" : "Ativar modo escuro"}
      title={escuro ? "Modo claro" : "Modo escuro"}
      className="flex size-8 items-center justify-center rounded-full border border-[#d7e2dd] bg-white text-petroleo-800 hover:border-petroleo-300 hover:bg-petroleo-50 dark:border-petroleo-700 dark:bg-petroleo-900 dark:text-ouro-200 dark:hover:bg-petroleo-800"
    >
      {escuro ? (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M20.5 14.2A8 8 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z" />
        </svg>
      )}
    </button>
  );
}

"use client";

import { signOut } from "next-auth/react";

export function BotaoLogout() {
  return (
    <button
      type="button"
      onClick={() => signOut({ redirectTo: "/login" })}
      className="rounded-full border border-[#d7e2dd] bg-white px-3 py-1.5 text-xs font-semibold text-petroleo-800 hover:border-petroleo-300 hover:bg-petroleo-50 dark:border-petroleo-700 dark:bg-petroleo-900 dark:text-petroleo-100 dark:hover:bg-petroleo-800"
    >
      Sair
    </button>
  );
}

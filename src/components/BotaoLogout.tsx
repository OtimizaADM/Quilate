"use client";

import { signOut } from "next-auth/react";

export function BotaoLogout() {
  return (
    <button
      type="button"
      onClick={() => signOut({ redirectTo: "/login" })}
      className="text-gray-500 hover:underline"
    >
      Sair
    </button>
  );
}

/**
 * Configuração do Auth.js (NextAuth v5) — login simples, usuário único.
 *
 * As credenciais ficam em variáveis de ambiente (single-tenant, sem tabela de
 * usuários): AUTH_USERNAME e AUTH_PASSWORD_HASH (hash bcrypt). A sessão usa JWT,
 * então não há dependência de banco — e este módulo pode rodar no middleware.
 */

import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

const esquemaCredenciais = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true, // necessário fora da Vercel (VPS)
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { username: {}, password: {} },
      authorize: async (bruto) => {
        const parsed = esquemaCredenciais.safeParse(bruto);
        if (!parsed.success) return null;

        const { username, password } = parsed.data;
        const hash = process.env.AUTH_PASSWORD_HASH ?? "";
        const usuarioOk = username === process.env.AUTH_USERNAME;
        const senhaOk = hash !== "" && (await bcrypt.compare(password, hash));
        if (!usuarioOk || !senhaOk) return null;

        return { id: username, name: username };
      },
    }),
  ],
});

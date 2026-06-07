/**
 * Protege todas as rotas: sem sessão, redireciona para /login.
 * Exclui os próprios endpoints do Auth.js e os assets internos do Next.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
  const logado = Boolean(req.auth);
  const { pathname } = req.nextUrl;

  if (logado && pathname === "/login") {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }
  if (!logado && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }
  return NextResponse.next();
});

export const config = {
  // api/integracao tem auth própria (token Bearer) — fora da proteção por sessão.
  matcher: ["/((?!api/auth|api/integracao|_next/static|_next/image|favicon.ico).*)"],
};

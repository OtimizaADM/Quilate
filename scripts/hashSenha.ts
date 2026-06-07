/**
 * Gera o hash bcrypt de uma senha para o AUTH_PASSWORD_HASH.
 * Uso: npm run auth:hash -- "SUA_SENHA"
 */

import bcrypt from "bcryptjs";

const senha = process.argv[2];
if (!senha) {
  console.error('Uso: npm run auth:hash -- "SUA_SENHA"');
  process.exit(1);
}
console.log(bcrypt.hashSync(senha, 10));

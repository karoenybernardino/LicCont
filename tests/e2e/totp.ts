import { createHmac } from "node:crypto";

// Código TOTP (RFC 6238: SHA-1, 6 dígitos, 30 s) a partir do segredo base32
// mostrado na tela de cadastro do autenticador. Só para os testes.
export function codigoTotp(segredo: string, quando = Date.now()) {
  const alfabeto = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of segredo.replace(/[\s=]/g, "").toUpperCase()) {
    bits += alfabeto.indexOf(c).toString(2).padStart(5, "0");
  }
  const chave = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const contador = Buffer.alloc(8);
  contador.writeBigUInt64BE(BigInt(Math.floor(quando / 30_000)));
  const hmac = createHmac("sha1", chave).update(contador).digest();
  const desloc = hmac[hmac.length - 1] & 0xf;
  return String((hmac.readUInt32BE(desloc) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}

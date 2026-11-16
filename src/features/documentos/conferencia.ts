import { createHash } from "node:crypto";

// Conferência do PDF no servidor (o navegador não é confiável). Lê o objeto
// em partes, sem carregar o arquivo inteiro: hash SHA-256, cabeçalho "%PDF-",
// fim "%%EOF" e "/Encrypt" (PDF com senha). Nada daqui vai para log.
export type Motivo = "nao_pdf" | "com_senha" | "corrompido" | "grande_demais" | "incompleto" | "sem_espaco";
export type Resultado = { ok: true; sha256: string; tamanho: number } | { ok: false; motivo: Motivo };

const ENCRYPT = Buffer.from("/Encrypt");
const EOF = Buffer.from("%%EOF");
const CAUDA = 2048; // o %%EOF vem nos últimos bytes (o padrão tolera lixo até 1 KB)

export class Conferidor {
  private hash = createHash("sha256");
  private total = 0;
  private cabecalho = Buffer.alloc(0);
  private cauda = Buffer.alloc(0);
  private resto = Buffer.alloc(0); // fim da parte anterior, para achar /Encrypt entre duas partes
  private senha = false;

  constructor(private limiteBytes: number) {}

  add(parte: Uint8Array) {
    const b = Buffer.from(parte);
    this.hash.update(b);
    this.total += b.length;
    if (this.cabecalho.length < 8) this.cabecalho = Buffer.concat([this.cabecalho, b]).subarray(0, 8);
    this.cauda = Buffer.concat([this.cauda, b]).subarray(-CAUDA);
    const janela = Buffer.concat([this.resto, b]);
    if (!this.senha && janela.includes(ENCRYPT)) this.senha = true;
    this.resto = janela.subarray(-(ENCRYPT.length - 1));
  }

  fim(): Resultado {
    if (this.total > this.limiteBytes) return { ok: false, motivo: "grande_demais" };
    if (this.total === 0 || !this.cabecalho.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
      return { ok: false, motivo: "nao_pdf" };
    }
    if (!this.cauda.includes(EOF)) return { ok: false, motivo: "incompleto" };
    if (this.senha) return { ok: false, motivo: "com_senha" };
    return { ok: true, sha256: this.hash.digest("hex"), tamanho: this.total };
  }
}

export const MOTIVOS: Record<Motivo, string> = {
  nao_pdf: "O arquivo não é um PDF.",
  com_senha: "O PDF tem senha. Envie uma cópia sem senha.",
  corrompido: "O PDF está corrompido.",
  grande_demais: "O PDF passa do tamanho máximo.",
  incompleto: "O envio ficou incompleto. Envie de novo.",
  sem_espaco: "O espaço de armazenamento da prefeitura acabou. Fale com a equipe LicCONT.",
};

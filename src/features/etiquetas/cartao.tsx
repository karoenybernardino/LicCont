import type { CaixaEtiqueta } from "./dados";
import { urlDaCaixa } from "./qr";
import { QrSvg } from "./qr-svg";

// Etiqueta do quadro "Prévia da folha" (também é a que sai na impressão).
// O QR leva só ao caminho /mapa?caixa=<id>: sem dado pessoal; quem lê sem login cai na entrada.
export function CartaoEtiqueta({ c, origem, qr = 56 }: { c: CaixaEtiqueta; origem: string; qr?: number }) {
  const celulas: [string, string | number][] = [["Rua", c.rua], ["Módulo", c.modulo], ["Nível", c.nivel], ["Caixa", `C${String(c.caixa).padStart(2, "0")}`]];
  return (
    <div className="box-border flex w-full flex-col overflow-hidden rounded-[10px] border border-[#1b3a44] bg-white text-[#0b2e3a] [break-inside:avoid]">
      <div className="flex bg-[#0b2e3a]">
        {celulas.map(([r, v], i) => (
          <div key={r} className={`flex-1 px-2 py-1.5 ${i < 3 ? "border-r border-white/[.14]" : ""}`}>
            <div className="text-[8px] font-semibold tracking-[.08em] text-[#8cc5cf] uppercase">{r}</div>
            <div className={`font-mono text-[12px] font-medium ${i === 3 ? "text-[#2dd4bf]" : "text-white"}`}>{v}</div>
          </div>
        ))}
      </div>
      <div className="flex items-stretch gap-2.5 px-3 py-2.5">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="font-titulo text-[12px] leading-4 font-bold">{c.titulo}</div>
          <div className="text-[10px] text-[#3f5e66]">{c.detalhe}</div>
        </div>
        <div className="shrink-0">
          {origem ? <QrSvg texto={urlDaCaixa(origem, c.id)} tamanho={qr} rotulo={`QR da caixa ${c.codigo}`} /> : <div style={{ width: qr, height: qr }} />}
        </div>
      </div>
    </div>
  );
}

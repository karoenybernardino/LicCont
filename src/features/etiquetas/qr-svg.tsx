import { gerarQr } from "./qr";

// QR em SVG (um só caminho). Margem de 1 módulo, como no quadro (viewBox -1 -1 n+2 n+2).
export function QrSvg({ texto, tamanho, rotulo }: { texto: string; tamanho: number; rotulo: string }) {
  const m = gerarQr(texto);
  const n = m.length;
  const d = m.flatMap((linha, y) => linha.map((escuro, x) => (escuro ? `M${x} ${y}h1v1h-1z` : ""))).join("");
  return (
    <svg role="img" aria-label={rotulo} viewBox={`-1 -1 ${n + 2} ${n + 2}`} width={tamanho} height={tamanho} shapeRendering="crispEdges" className="bg-white">
      <path d={d} fill="#0b2e3a" />
    </svg>
  );
}

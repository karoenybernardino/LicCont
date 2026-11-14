// Marca (canvas): ícone de blocos + "LIC" em Sora 300 e "CONT" em Sora 700.
// As cores do ícone vêm dos tokens --logo-bloco e --logo-vazio de cada tema.
const blocos = [
  [4, 6], [22.5, 6], [41, 6],
  [4, 24.5], [22.5, 24.5],
  [4, 43], [22.5, 43], [41, 43],
];

// Só o ícone de blocos (cores dos tokens do tema).
export function Marca({ largura = 30 }: { largura?: number }) {
  return (
    <svg aria-hidden width={largura} height={(largura * 64) / 66} viewBox="0 0 66 64">
      <g fill="#8cc5cf">
        {blocos.map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="15" height="15" rx="3" />
        ))}
      </g>
      <rect x="41" y="24.5" width="15" height="15" rx="3" fill="#285a66" />
      <rect x="47" y="21.5" width="15" height="15" rx="3" fill="#2dd4bf" />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="LicCONT"
      className={`inline-flex items-center gap-[0.4em] font-titulo uppercase leading-none tracking-[0.03em] ${className}`}
    >
      <svg aria-hidden viewBox="0 0 66 64" className="h-[1.3em] w-auto">
        <g fill="var(--logo-bloco)">
          {blocos.map(([x, y]) => (
            <rect key={`${x}-${y}`} x={x} y={y} width="15" height="15" rx="3" />
          ))}
        </g>
        <rect x="41" y="24.5" width="15" height="15" rx="3" fill="var(--logo-vazio)" />
        <rect x="47" y="21.5" width="15" height="15" rx="3" fill="var(--marca-aqua)" />
      </svg>
      <span aria-hidden>
        <span className="font-light">Lic</span>
        <span className="font-bold">Cont</span>
      </span>
    </span>
  );
}

// Marca: "LIC" em Sora 300, "CONT" em Sora 700.
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span role="img" aria-label="LicCONT" className={`tracking-tight ${className}`}>
      <span aria-hidden className="font-light">LIC</span>
      <span aria-hidden className="font-bold text-destaque">CONT</span>
    </span>
  );
}

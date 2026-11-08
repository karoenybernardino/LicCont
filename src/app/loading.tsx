import { Girando } from "@/ui/carregando";

// Aparece na hora em toda troca de tela, enquanto o servidor responde.
export default function Carregando() {
  return (
    <main aria-busy="true" className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-texto-suave">
      <Girando className="size-8 text-destaque" />
      <p className="text-sm">Carregando…</p>
    </main>
  );
}

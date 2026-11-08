"use client";

// Sem estado React: o tema vive no atributo data-theme do <html>, aplicado
// antes da pintura pelo script do layout. O rótulo troca só por CSS, então
// o HTML do servidor nunca diverge do tema real.
export function SeletorTema() {
  function alternar() {
    const raiz = document.documentElement;
    const proximo = raiz.getAttribute("data-theme") === "dark" ? "light" : "dark";
    raiz.setAttribute("data-theme", proximo);
    try {
      localStorage.setItem("tema", proximo);
    } catch {
      // Sem armazenamento (navegação privada): o tema vale só nesta página.
    }
  }

  return (
    <button
      type="button"
      onClick={alternar}
      className="rounded-full border border-linha px-3 py-1.5 text-sm text-texto hover:border-destaque focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
    >
      <span className="dark:hidden">
        <span aria-hidden>Escuro</span>
        <span className="sr-only">Ativar tema escuro</span>
      </span>
      <span className="hidden dark:inline">
        <span aria-hidden>Claro</span>
        <span className="sr-only">Ativar tema claro</span>
      </span>
    </button>
  );
}

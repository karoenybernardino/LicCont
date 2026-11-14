"use client";

import { useSyncExternalStore } from "react";
import type { Tema } from "./cores";

// Tema atual da página (atributo data-theme ou preferência do sistema).
function atual(): Tema {
  const t = document.documentElement.getAttribute("data-theme");
  if (t === "dark") return "escuro";
  if (t === "light") return "claro";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "escuro" : "claro";
}

function assinar(aviso: () => void) {
  const observador = new MutationObserver(aviso);
  observador.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const midia = window.matchMedia("(prefers-color-scheme: dark)");
  midia.addEventListener("change", aviso);
  return () => {
    observador.disconnect();
    midia.removeEventListener("change", aviso);
  };
}

export function useTema(): Tema {
  return useSyncExternalStore(assinar, atual, () => "claro");
}

export function usarMovimentoReduzido(): boolean {
  return useSyncExternalStore(
    (aviso) => {
      const m = window.matchMedia("(prefers-reduced-motion: reduce)");
      m.addEventListener("change", aviso);
      return () => m.removeEventListener("change", aviso);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

"use client";

import { useState, type ReactNode } from "react";

// O formulário só aparece se a prefeitura nasceu da página sem administrador e
// continua ali depois de salvar: a ação renova a sessão (cookie), a página é
// renderizada de novo já com administrador, e a senha provisória (mostrada uma
// vez) sumiria junto com o formulário.
export function PrimeiroAdmin({ semAdmin, children }: { semAdmin: boolean; children: ReactNode }) {
  const [mostrar] = useState(semAdmin);
  return mostrar ? children : null;
}

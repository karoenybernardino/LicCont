// Ação gravada na auditoria ("documentos.insert") -> rótulo da tela Auditoria.

export type Tom = "ok" | "aviso" | "erro" | "neutro";
export type Categoria = "emprestimos" | "cadastro" | "descarte" | "outras";

export function classificar(acao: string): { rotulo: string; tom: Tom } {
  const [tabela, verbo = ""] = acao.split(".");
  if (tabela.startsWith("devolucao") || (tabela === "emprestimos" && verbo === "devolucao")) return { rotulo: "Devolução", tom: "ok" };
  if (tabela.startsWith("emprestimo")) return { rotulo: "Empréstimo", tom: "aviso" };
  if (tabela.startsWith("descarte")) return { rotulo: "Descarte", tom: "erro" };
  if (["sessao", "login", "mfa", "senha"].includes(tabela)) return { rotulo: "Login", tom: "neutro" };
  if (tabela === "arquivos" && (verbo === "ver" || verbo === "baixar")) return { rotulo: "Visualização", tom: "neutro" };
  if (verbo === "insert") return { rotulo: "Cadastro", tom: "ok" };
  return { rotulo: "Edição", tom: "aviso" };
}

export function categoriaDe(acao: string): Categoria {
  const { rotulo } = classificar(acao);
  if (rotulo === "Empréstimo" || rotulo === "Devolução") return "emprestimos";
  if (rotulo === "Cadastro") return "cadastro";
  if (rotulo === "Descarte") return "descarte";
  return "outras";
}

// Só a classe do aparelho; o texto do navegador não vai para a tela.
export function origemDe(aparelho: string | null) {
  if (!aparelho) return "–";
  return /mobile|android|iphone/i.test(aparelho) ? "Celular" : "Desktop";
}

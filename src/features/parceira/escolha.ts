// Lógica pura da empresa parceira (sem banco): escolha da prefeitura em que ela atua e o que vale
// como "administrar o acervo". Fica fora de dados.ts para os testes não puxarem o servidor.
import type { Resumo } from "./indicadores";

export const COOKIE_PARCEIRA_PREF = "liccont_parceira_pref";

// O id precisa estar entre as permitidas; sem escolha válida, vale a primeira (ou "todas" quando a tela aceita).
export function escolherPrefeitura(valor: string | undefined, permitidas: Pick<Resumo, "id">[], aceitaTodas: boolean): string {
  if (aceitaTodas && valor === "todas") return "todas";
  const achada = permitidas.find((p) => p.id === valor);
  return achada ? achada.id : aceitaTodas ? "todas" : (permitidas[0]?.id ?? "");
}

// Estrutura, caixas, planta e temporalidade: administrador da prefeitura OU pessoa da empresa parceira
// (espelha app.pode_administrar_acervo). Usuários, secretarias, TCE, PNCP, importação, exportação e
// empréstimos continuam só com `administrador`.
export const administraAcervo = (u: { administrador: boolean; parceira?: boolean } | null | undefined) => !!u && (u.administrador || !!u.parceira);

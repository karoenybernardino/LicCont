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
export const administraAcervo = (u: { administrador: boolean; parceira?: boolean; prefeituraId?: string } | null | undefined) =>
  !!u && (u.administrador || (!!u.parceira && !!u.prefeituraId));

// A pessoa da empresa pode trocar de prefeitura em outra aba. Todo formulário que grava sem id de
// prefeitura manda a que a tela mostrava (campo oculto) e a ação recusa se for outra. Quem é de
// prefeitura não precisa do campo: o vínculo dela é fixo.
export const CAMPO_PREFEITURA = "prefeitura_id";
export const MENSAGEM_PREFEITURA_MUDOU = "A prefeitura mudou em outra aba. Recarregue a página e tente de novo.";
export function conferirPrefeitura(enviada: FormData | string | null | undefined, u: { parceira?: boolean; prefeituraId: string }): boolean {
  if (!u.parceira) return true;
  const valor = enviada instanceof FormData ? enviada.get(CAMPO_PREFEITURA) : enviada;
  return u.prefeituraId !== "" && valor === u.prefeituraId;
}

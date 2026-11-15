// Lista da equipe LicCONT: tipos e filtro puros (sem banco).
export type StatusPrefeitura = "implantacao" | "ativa" | "suspensa";
export type PrefeituraLista = { id: string; nome: string; cnpj: string; status: StatusPrefeitura; criadoEm: string; administradores: number; plano: string; contratoInicio: string | null; implantacaoCentavos: number | null; mensalidadeCentavos: number | null; tceCodigo: string | null };

const semAcento = (t: string) => t.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR");

export function formatarCnpj(cnpj: string) {
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

export function filtrarPrefeituras(lista: PrefeituraLista[], q: string, situacao: StatusPrefeitura | "todas") {
  const t = semAcento(q.trim());
  const numeros = q.replace(/\D/g, "");
  return lista.filter(
    (p) =>
      (situacao === "todas" || p.status === situacao) &&
      (!t || semAcento(p.nome).includes(t) || (numeros !== "" && p.cnpj.includes(numeros))),
  );
}

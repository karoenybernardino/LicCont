// Situação de empréstimos e prazos de guarda. Datas "AAAA-MM-DD" em Brasília.

const dia = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
const dias = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 86_400_000;

export function situacaoEmprestimo(prazo: string, agora = new Date()) {
  const falta = dias(prazo) - dias(dia(agora));
  const n = Math.abs(falta);
  if (falta < 0) return { tom: "erro" as const, texto: `${n} ${n === 1 ? "dia" : "dias"} de atraso`, atrasado: true };
  if (falta === 0) return { tom: "aviso" as const, texto: "Vence hoje", atrasado: false };
  if (falta <= 7) return { tom: "aviso" as const, texto: `Vence em ${n} ${n === 1 ? "dia" : "dias"}`, atrasado: false };
  return { tom: "ok" as const, texto: "No prazo", atrasado: false };
}

// Prazo de guarda a vencer: destaque até 60 dias.
export function prazoGuarda(emDias: number) {
  return { aviso: emDias <= 60, texto: `em ${emDias} ${emDias === 1 ? "dia" : "dias"}` };
}

export const dataBR = (iso: string) => iso.split("-").reverse().join("/");

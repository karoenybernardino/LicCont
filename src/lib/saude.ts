// Rota de saúde (/api/saude): só "ok" ou "falha" por parte, sem detalhe do erro.
export type Saude = { status: "ok" | "falha"; banco: "ok" | "falha"; storage: "ok" | "falha" };

const LIMITE_MS = 5000;

async function conferir(teste: () => Promise<boolean>): Promise<"ok" | "falha"> {
  let relogio: ReturnType<typeof setTimeout> | undefined;
  const tempo = new Promise<boolean>((resolver) => (relogio = setTimeout(() => resolver(false), LIMITE_MS)));
  try {
    return (await Promise.race([teste(), tempo])) ? "ok" : "falha";
  } catch {
    return "falha";
  } finally {
    clearTimeout(relogio);
  }
}

export async function conferirSaude(testes: { banco: () => Promise<boolean>; storage: () => Promise<boolean> }): Promise<Saude> {
  const [banco, storage] = await Promise.all([conferir(testes.banco), conferir(testes.storage)]);
  return { status: banco === "ok" && storage === "ok" ? "ok" : "falha", banco, storage };
}

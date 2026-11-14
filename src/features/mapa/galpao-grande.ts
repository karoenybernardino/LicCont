// Galpão fictício grande: 8 ruas x 20 módulos x 6 níveis x 16 caixas = 15.360
// caixas. Serve ao teste de desempenho e à demonstração (?galpao=grande).
// Nada aqui é dado real.
import type { Estrutura } from "@/features/estrutura/ocupacao";
import type { CaixaCompacta } from "./tipos";

const id = (p: string, n: number) => `de6${p}0000-0000-0000-0000-${String(n).padStart(12, "0")}`;

export function galpaoGrande(ruas = 8, modulos = 20, niveis = 6, caixas = 16): { estrutura: Estrutura; caixas: CaixaCompacta[] } {
  const galpao = { id: id("0", 1), nome: "Galpão Grande (teste)", ativo: true };
  const e: Estrutura = { galpoes: [galpao], galpao, ruas: [], modulos: [], niveis: [] };
  const lista: CaixaCompacta[] = [];
  for (let r = 0; r < ruas; r++) {
    const rua = { id: id("1", r + 1), galpaoId: galpao.id, codigo: String.fromCharCode(65 + r), ativo: true };
    e.ruas.push(rua);
    for (let m = 1; m <= modulos; m++) {
      const modulo = { id: id("2", (r + 1) * 1000 + m), ruaId: rua.id, numero: m, ativo: true };
      e.modulos.push(modulo);
      for (let n = 1; n <= niveis; n++) {
        const nid = id("3", (r + 1) * 100000 + m * 100 + n);
        e.niveis.push({ id: nid, moduloId: modulo.id, numero: n, capacidade: caixas, caixas, ativo: true });
        for (let c = 1; c <= caixas; c++) lista.push({ id: id("4", (r + 1) * 10000000 + m * 10000 + n * 100 + c), nivelId: nid, numero: c });
      }
    }
  }
  return { estrutura: e, caixas: lista };
}

// Estrutura física fictícia do modo demonstração (números parecidos com os do
// canvas): Galpão Central, ruas A a D, 5 módulos por rua, 4 níveis por módulo.
// Nada aqui é dado real e nada é salvo.
import type { Estrutura, Galpao, Modulo, Nivel, Rua } from "@/features/estrutura/ocupacao";

const CAPACIDADE = 16;
// Caixas por rua: dá 94%, 88%, 76% e 69% de 320 posições.
const CAIXAS_POR_RUA = { A: 300, B: 282, C: 243, D: 221 } as const;

const id = (prefixo: string, n: number) => `de3${prefixo}0000-0000-0000-0000-${String(n).padStart(12, "0")}`;

function montar(): Estrutura {
  const galpao: Galpao = { id: id("0", 1), nome: "Galpão Central", ativo: true };
  const ruas: Rua[] = [];
  const modulos: Modulo[] = [];
  const niveis: Nivel[] = [];
  Object.entries(CAIXAS_POR_RUA).forEach(([codigo, total], r) => {
    const rua: Rua = { id: id("1", r + 1), galpaoId: galpao.id, codigo, ativo: true };
    ruas.push(rua);
    let resto = total;
    for (let m = 1; m <= 5; m++) {
      const modulo: Modulo = { id: id("2", r * 10 + m), ruaId: rua.id, numero: m, ativo: true };
      modulos.push(modulo);
      for (let n = 1; n <= 4; n++) {
        // Distribui as caixas de baixo para cima, deixando os últimos níveis mais vazios.
        const vagas = 20 - ((m - 1) * 4 + (n - 1));
        const caixas = Math.min(CAPACIDADE, Math.ceil(resto / vagas));
        resto -= caixas;
        niveis.push({ id: id("3", r * 100 + m * 10 + n), moduloId: modulo.id, numero: n, capacidade: CAPACIDADE, caixas, ativo: true });
      }
    }
  });
  return { galpoes: [galpao], galpao, ruas, modulos, niveis };
}

export const ESTRUTURA_DEMO = montar();

// Últimas alterações fictícias (como no canvas), com datas relativas a hoje.
export function alteracoesDemo(agora = new Date()) {
  const dia = 24 * 60 * 60 * 1000;
  // 09:40 de hoje no horário de Brasília (o servidor da Vercel roda em UTC).
  const data = agora.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const hoje = new Date(`${data}T09:40:00-03:00`);
  return [
    { titulo: "Módulo 5 adicionado", detalhe: "Rua D", quando: hoje, tipo: "Estrutura" as const },
    { titulo: "Nível 4 ajustado", detalhe: "Rua A · M2", quando: new Date(hoje.getTime() - dia), tipo: "Ajuste" as const },
    { titulo: "3 caixas adicionadas", detalhe: "Rua C · M1 · N2", quando: new Date(hoje.getTime() - 3 * dia), tipo: "Estrutura" as const },
    { titulo: "Módulo 1 desativado", detalhe: "Rua D", quando: new Date(hoje.getTime() - 5 * dia), tipo: "Ajuste" as const },
  ];
}

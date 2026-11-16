import { paraCsv } from "@/features/importacao/planilha";
import type { UsoPrefeitura } from "./dados";

export type LinhaUso = { nome: string; status: string; uso: UsoPrefeitura | undefined };

// Totais do mês para o relatório da equipe: só contagens.
export function totaisUso(linhas: LinhaUso[]) {
  const soma = (f: (u: UsoPrefeitura) => number) => linhas.reduce((t, l) => t + (l.uso ? f(l.uso) : 0), 0);
  return {
    prefeituras: linhas.length,
    ativas: linhas.filter((l) => l.status === "ativa").length,
    usuarios: soma((u) => u.usuarios),
    documentos: soma((u) => u.documentos),
    bytesPdf: soma((u) => u.bytesPdf),
    loginsMes: soma((u) => u.loginsMes),
  };
}

export function usoParaCsv(linhas: LinhaUso[], recusados: number): string {
  const t = totaisUso(linhas);
  return paraCsv([
    ["prefeitura", "situacao", "secretarias", "usuarios_ativos", "documentos", "caixas", "pdf_bytes", "logins_no_mes"],
    ...linhas.map((l) => [l.nome, l.status, ...[l.uso?.secretarias, l.uso?.usuarios, l.uso?.documentos, l.uso?.caixas, l.uso?.bytesPdf, l.uso?.loginsMes].map((v) => String(v ?? 0))]),
    ["TOTAL", `${t.ativas} ativas`, "", String(t.usuarios), String(t.documentos), "", String(t.bytesPdf), String(t.loginsMes)],
    ["tentativas_recusadas_no_mes", "", "", "", "", "", "", String(recusados)],
  ]);
}

// Aviso só para a equipe LicCONT: a 80% do limite e ao chegar nele.
export function nivelArmazenamento(uso: Pick<UsoPrefeitura, "bytesPdf" | "limiteBytes">): { nivel: "ok" | "aviso" | "cheio"; porcento: number } {
  const porcento = uso.limiteBytes > 0 ? Math.floor((uso.bytesPdf / uso.limiteBytes) * 100) : 0;
  return { nivel: porcento >= 100 ? "cheio" : porcento >= 80 ? "aviso" : "ok", porcento };
}

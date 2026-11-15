// Termo de empréstimo de documento, mesmo formato do termo de eliminação
// (PDF e Word saem dos geradores da Fase 7). Texto-base e assinaturas vêm do
// modelo editável da prefeitura (tipo "emprestimo"). Leva o nome de quem retira
// e o setor (já registrados no empréstimo); nunca CPF.
import { dataBR } from "@/features/temporalidade/regras";
import type { ConteudoTermo, ModeloTermo } from "@/features/temporalidade/termo";
import { MODELO_EMPRESTIMO_PADRAO } from "@/features/temporalidade/termo";

export type EmprestimoParaTermo = {
  prefeitura: string;
  secretaria: string;
  titulo: string;
  objeto: string;
  caixa: string;
  quem: string;
  setor: string;
  retirada: string;
  prazo: string;
  devolvidoEm: string | null;
  observacao: string | null;
};

const corta = (t: string, max: number) => (t.length > max ? `${t.slice(0, max - 1)}…` : t);

export function conteudoTermoEmprestimo(e: EmprestimoParaTermo, modelo: ModeloTermo = MODELO_EMPRESTIMO_PADRAO): ConteudoTermo {
  const paragrafos = [
    modelo.baseLegal,
    `Retirado por ${e.quem}, do setor ${e.setor}, em ${dataBR(e.retirada)}.`,
    e.devolvidoEm ? `Documento devolvido em ${dataBR(e.devolvidoEm.slice(0, 10))}.` : `O documento deve ser devolvido até ${dataBR(e.prazo)}.`,
  ];
  if (e.observacao) paragrafos.push(`Observação: ${e.observacao}`);
  return {
    arquivo: `termo-emprestimo-${e.retirada}`,
    titulo: "TERMO DE EMPRÉSTIMO DE DOCUMENTO",
    cabecalho: [e.prefeitura, `Secretaria: ${e.secretaria}`],
    paragrafos,
    tabela: {
      colunas: ["Documento", "Objeto", "Caixa", "Retirada", "Devolver até"],
      larguras: [0.22, 0.34, 0.14, 0.15, 0.15],
      linhas: [[e.titulo, corta(e.objeto, 110), e.caixa, dataBR(e.retirada), dataBR(e.prazo)]],
    },
    assinaturas: modelo.assinaturas.split("\n").map((l) => l.trim()).filter(Boolean),
    rodape: e.devolvidoEm ? "Situação: devolvido." : "Situação: emprestado, aguardando devolução.",
  };
}

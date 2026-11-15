import type { RegistroAuditoria } from "@/features/movimento/tipos";
import { categoriaDe } from "./classificar";

const dia = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

// Números dos cartões: hoje e o mês corrente (Brasília). Só conta, não guarda dado pessoal.
export function resumirAuditoria(linhas: RegistroAuditoria[], agora = new Date()) {
  const hoje = dia(agora);
  const mes = hoje.slice(0, 7);
  const deHoje = linhas.filter((l) => dia(new Date(l.quando)) === hoje);
  const doMes = linhas.filter((l) => dia(new Date(l.quando)).startsWith(mes));
  const conta = (f: (l: RegistroAuditoria) => boolean) => doMes.filter(f).length;
  return {
    hoje: deHoje.length,
    usuariosHoje: new Set(deHoje.map((l) => l.usuarioId).filter(Boolean)).size,
    descartes: conta((l) => categoriaDe(l.acao) === "descarte"),
    emprestimos: conta((l) => categoriaDe(l.acao) === "emprestimos"),
    logins: conta((l) => l.acao === "sessao.entrada"),
    recusadas: conta((l) => l.acao === "login.falha"),
  };
}
export { dia as diaBrasilia };

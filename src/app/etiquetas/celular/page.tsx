import type { Metadata } from "next";
import { exigirSessao } from "@/features/sessao/dal";
import { PaginaSistema } from "@/features/sessao/pagina";
import { Painel } from "@/features/estrutura/componentes";

export const metadata: Metadata = { title: "Caixa lida pelo QR · LicCONT" };

// Quadro "Caixa lida pelo celular": explica o que o QR da etiqueta faz. Os dados
// do celular são de exemplo; de verdade, o QR abre /mapa?caixa=<id> (só depois do login).
const DOCUMENTOS = [
  ["Pregão Eletrônico 015/2023", "Licitação · Equipamentos hospitalares", true],
  ["Pregão Eletrônico 016/2023", "Licitação · Material de papelaria", true],
  ["Dispensa 004/2023", "Licitação · Serviço de dedetização", false],
  ["Contrato 007/2022", "Contrato · Manutenção predial", true],
  ["Contrato 012/2022", "Contrato · Locação de veículos", true],
  ["Tomada de Preços 002/2022", "Licitação · Reforma de escola", true],
  ["Contrato 019/2022", "Contrato · Coleta de lixo", true],
  ["Dispensa 011/2022", "Licitação · Material de limpeza", true],
] as const;

const PASSOS = [
  ["Ler o QR", "A etiqueta da caixa abre esta tela direto no celular, sem instalar nada."],
  ["Ver a caixa", "Aparecem rua, módulo, nível e caixa, e a contagem de documentos guardados."],
  ["Ver todos os documentos", "A lista mostra cada licitação e contrato dentro da caixa, com o status de cada um."],
  ["Registrar a movimentação", "Empréstimo ou devolução ficam com usuário, data e hora na auditoria."],
] as const;

export default async function CaixaLidaPeloCelular() {
  const { usuario, secretaria } = await exigirSessao();
  const celulas: [string, string][] = [["Rua", "B"], ["Módulo", "3"], ["Nível", "3"], ["Caixa", "02"]];
  return (
    <PaginaSistema usuario={usuario} secretaria={secretaria} titulo="Caixa lida pelo QR" trilha="Acesso pelo celular">
      <div className="grid items-center gap-10 lg:grid-cols-[auto_1fr]">
        <div role="img" aria-label="Exemplo da tela do celular ao ler o QR de uma caixa" className="box-border h-[716px] w-[330px] shrink-0 rounded-[44px] border border-linha bg-[#0b2e3a] p-3 shadow-[0_30px_60px_rgba(0,0,0,.25)] dark:bg-black dark:border-[#1b3a44]">
          <div className="flex size-full flex-col overflow-hidden rounded-[34px] bg-white text-[#0b2e3a] dark:bg-[#071a21] dark:text-[#eaf4f6]">
            <div className="flex h-[30px] items-center justify-center text-xs font-semibold">9:41</div>
            <div className="flex items-center justify-between px-[18px] pt-1 pb-2.5">
              <div className="font-titulo text-base tracking-[.5px]"><span className="font-light">LIC</span><span className="font-bold">CONT</span></div>
              <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
            </div>
            <div className="mx-3.5 overflow-hidden rounded-2xl border border-[rgba(11,46,58,.12)] dark:border-[#1b3a44]">
              <div className="flex bg-[#0b2e3a]">
                {celulas.map(([r, v], i) => (
                  <div key={r} className={`flex-1 px-2.5 py-2 ${i < 3 ? "border-r border-white/[.14]" : ""}`}>
                    <div className="text-[8px] font-semibold tracking-[.08em] text-[#8cc5cf] uppercase">{r}</div>
                    <div className={`font-mono text-[13px] font-medium ${i === 3 ? "text-[#2dd4bf]" : "text-white"}`}>{v}</div>
                  </div>
                ))}
              </div>
              <div className="bg-white px-3.5 py-[9px] text-xs text-[#3f5e66] dark:bg-[#071a21] dark:text-[#8fb8c2]">
                <b className="font-semibold text-[#0b2e3a] dark:text-[#eaf4f6]">14 documentos</b> nesta caixa
              </div>
            </div>
            <div className="mx-3.5 mt-2.5 flex min-h-0 flex-1 flex-col gap-2">
              <ul className="flex max-h-[430px] flex-col gap-2 overflow-auto pr-1">
                {DOCUMENTOS.map(([titulo, detalhe, livre]) => (
                  <li key={titulo} className="flex flex-col gap-1 rounded-xl border border-[rgba(11,46,58,.12)] bg-[#f7fbfc] px-3 py-[11px] dark:border-[#1b3a44] dark:bg-white/[.03]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-titulo text-[13px] font-semibold">{titulo}</span>
                      <span className={`rounded-[10px] px-2 py-[3px] text-[10px] font-semibold whitespace-nowrap ${livre ? "bg-[#ccfbf1] text-[#115e59] dark:bg-[rgba(45,212,191,.18)] dark:text-[#7ff0df]" : "bg-[#fef3c7] text-[#92400e] dark:bg-[rgba(251,191,36,.18)] dark:text-[#fcd34d]"}`}>{livre ? "Disponível" : "Emprestado"}</span>
                    </div>
                    <span className="text-[11px] text-[#3f5e66] dark:text-[#8fb8c2]">{detalhe}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mx-3.5 mt-2.5 mb-4 flex flex-col gap-2">
              <div className="rounded-xl bg-[#2dd4bf] py-3 text-center text-sm font-semibold text-[#0b2e3a]">Registrar movimentação</div>
              <div className="rounded-xl border border-[rgba(11,46,58,.12)] py-2.5 text-center text-[13px] dark:border-[#1b3a44]">Ver caixa no mapa 3D</div>
            </div>
          </div>
        </div>

        <Painel className="gap-3.5">
          <span className="text-[11px] font-medium tracking-[.05em] text-texto-suave uppercase">Como funciona no celular</span>
          <ol className="mt-1 flex flex-col gap-4">
            {PASSOS.map(([t, d], i) => (
              <li key={t} className="flex items-start gap-3.5">
                <span aria-hidden className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-[#2dd4bf] font-titulo text-[13px] font-bold text-white">{i + 1}</span>
                <div>
                  <div className="font-titulo text-[15px] font-semibold">{t}</div>
                  <div className="mt-0.5 text-[13px] leading-[19px] text-texto-suave">{d}</div>
                </div>
              </li>
            ))}
          </ol>
        </Painel>
      </div>
    </PaginaSistema>
  );
}

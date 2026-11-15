"use client";

import { useState, useTransition } from "react";
import { botaoContorno, botaoPrimario } from "@/ui/canvas";
import { Painel, TituloPainel } from "@/features/estrutura/componentes";
import { CampoRotulado, campo } from "@/features/movimento/ui";
import { importarAgora, salvarConfiguracao } from "./acoes";
import type { ConfigTce } from "./dados";

// Configuração da integração: liga/desliga, município, secretaria que recebe os
// importados, anos e o que importar. A busca da noite traz só o que ainda não veio.
export function FormularioConfig({ config, secretarias, anosDisponiveis }: { config: ConfigTce; secretarias: { id: string; nome: string }[]; anosDisponiveis: number[] }) {
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<{ texto: string; erro: boolean } | null>(null);

  function enviar(f: FormData) {
    iniciar(async () => {
      const r = await salvarConfiguracao(f);
      setMsg({ texto: r.erro ?? r.aviso ?? "Feito.", erro: !!r.erro });
    });
  }
  function agora() {
    iniciar(async () => {
      const r = await importarAgora();
      setMsg({ texto: r.erro ?? r.aviso ?? "Feito.", erro: !!r.erro });
    });
  }

  return (
    <Painel>
      <TituloPainel>Integração com o TCE-CE</TituloPainel>
      <p className="text-sm text-texto-suave">Traz as licitações e os contratos que a prefeitura envia ao tribunal. Toda noite, às 02:00, vêm só os registros que ainda não vieram.</p>
      <form action={enviar} className="flex flex-col gap-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="ativo" defaultChecked={config.ativo} /> Integração ligada
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <CampoRotulado rotulo="Código do município no TCE">
            <input name="codigo" inputMode="numeric" defaultValue={config.codigo} className={campo} placeholder="Ex.: 162" />
          </CampoRotulado>
          <CampoRotulado rotulo="Secretaria que recebe os importados">
            <select name="secretaria" defaultValue={config.secretariaId ?? ""} className={campo}>
              <option value="">Escolha a secretaria</option>
              {secretarias.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </select>
          </CampoRotulado>
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-[11px] font-medium tracking-[.05em] uppercase text-texto-suave">Anos a importar</legend>
          <div className="flex flex-wrap gap-3 text-sm">
            {anosDisponiveis.map((a) => (
              <label key={a} className="flex items-center gap-1.5">
                <input type="checkbox" name="anos" value={a} defaultChecked={config.anos.includes(a)} /> {a}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-[11px] font-medium tracking-[.05em] uppercase text-texto-suave">O que importar</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" name="tipos" value="licitacao" defaultChecked={config.tipos.includes("licitacao")} /> Licitações
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" name="tipos" value="contrato" defaultChecked={config.tipos.includes("contrato")} /> Contratos
            </label>
          </div>
        </fieldset>
        <p className="text-sm text-texto-suave">
          O TCE entrega os dados do processo e do contrato, mas não os arquivos. O PDF continua sendo anexado pela prefeitura. Os dados dependem do envio mensal ao SIM e podem chegar com até
          um mês de atraso.
        </p>
        {msg && (
          <p role={msg.erro ? "alert" : "status"} className={`text-sm ${msg.erro ? "text-[#b91c1c] dark:text-[#f87171]" : ""}`}>
            {msg.texto}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={pendente} className={`${botaoPrimario} disabled:opacity-55`}>
            {pendente ? "Aguarde…" : "Salvar"}
          </button>
          <button type="button" disabled={pendente || !config.ativo} className={`${botaoContorno} disabled:opacity-55`} onClick={agora}>
            Importar agora
          </button>
        </div>
      </form>
    </Painel>
  );
}

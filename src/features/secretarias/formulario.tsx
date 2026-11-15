"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, type ReactNode } from "react";
import type { EstadoAcao } from "@/ui/formulario";
import { Girando } from "@/ui/carregando";
import { CabecalhoPainel } from "@/ui/canvas";
import { Painel } from "@/features/estrutura/componentes";
import { PRAZOS_EMPRESTIMO } from "./esquemas";
import type { SecretariaDetalhe } from "./dados";

const campo =
  "min-h-10 w-full rounded-lg border border-borda-campo bg-campo px-3 text-sm text-texto focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-foco";
const rotulo = "text-[11px] font-medium tracking-[.05em] text-texto-suave uppercase";
const icone = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function Linha({ rot, children }: { rot: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-[5px]">
      <span className={rotulo}>{rot}</span>
      {children}
    </label>
  );
}

function Marca({ nome, rot, marcado }: { nome: string; rot: string; marcado: boolean }) {
  return (
    <label className="flex items-center gap-2.5 text-[13.5px]">
      <input type="checkbox" name={nome} defaultChecked={marcado} className="size-[18px] accent-[#2dd4bf]" />
      {rot}
    </label>
  );
}

const PASSOS = [
  "A secretaria passa a aparecer no login e nos filtros desta prefeitura.",
  "Ela não aparece para nenhuma outra prefeitura.",
  "O responsável recebe um aviso por e-mail.",
  "A criação fica registrada na auditoria.",
];

// Nova secretaria e Editar: os mesmos quadros (SecretariaNova*).
export function FormularioSecretaria({
  acao,
  inicial,
  usuarios,
  ruas,
}: {
  acao: (estado: EstadoAcao, dados: FormData) => Promise<EstadoAcao>;
  inicial?: SecretariaDetalhe;
  usuarios: { id: string; nome: string }[];
  ruas: { id: string; rotulo: string }[];
}) {
  const [estado, enviar, pendente] = useActionState(acao, undefined);
  const form = useRef<HTMLFormElement>(null);
  // "Salvar e cadastrar outra" limpa o formulário depois de gravar.
  useEffect(() => {
    if (estado?.aviso && !inicial && estado.aviso.startsWith("Secretaria cadastrada")) form.current?.reset();
  }, [estado, inicial]);
  const botao = "min-h-10 w-full rounded-lg text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco disabled:opacity-60";
  const prazos: number[] = [...PRAZOS_EMPRESTIMO];
  if (inicial && !prazos.includes(inicial.prazo)) prazos.push(inicial.prazo);
  prazos.sort((a, b) => a - b);

  return (
    <form ref={form} action={enviar} className="grid items-start gap-4 pr-2 xl:grid-cols-[minmax(0,1fr)_320px]">
      {inicial && <input type="hidden" name="id" value={inicial.id} />}
      <div className="flex min-w-0 flex-col gap-4">
        <Painel>
          <CabecalhoPainel
            icone={<svg aria-hidden {...icone}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>}
            titulo="Dados da secretaria"
            subtitulo="Como aparece nos filtros, etiquetas e relatórios"
          />
          <Linha rot="Nome da secretaria">
            <input name="nome" required minLength={2} maxLength={120} defaultValue={inicial?.nome} placeholder="Ex.: Secretaria de Saúde" className={campo} />
          </Linha>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Linha rot="Sigla">
              <input name="sigla" maxLength={12} defaultValue={inicial?.sigla ?? ""} placeholder="Ex.: SESAU" className={campo} />
            </Linha>
            <Linha rot="Situação">
              <select name="ativa" defaultValue={inicial && !inicial.ativa ? "nao" : "sim"} className={campo}>
                <option value="sim">Ativa</option>
                <option value="nao">Desativada</option>
              </select>
            </Linha>
            <Linha rot="Telefone">
              <input name="telefone" type="tel" maxLength={30} defaultValue={inicial?.telefone ?? ""} placeholder="(88) 0000-0000" className={campo} />
            </Linha>
            <Linha rot="E-mail da secretaria">
              <input name="email_contato" type="email" maxLength={200} defaultValue={inicial?.email ?? ""} placeholder="saude@prefeitura.gov.br" className={campo} />
            </Linha>
          </div>
        </Painel>

        <Painel>
          <CabecalhoPainel
            icone={<svg aria-hidden {...icone}><path d="M6 3h12v18H6z" /><path d="M9 8h6M9 12h6M9 16h3" /></svg>}
            titulo="Responsável"
            subtitulo="Quem responde pelos documentos desta secretaria"
          />
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Linha rot="Responsável">
              <select name="responsavel_id" defaultValue={inicial?.responsavelId ?? ""} className={campo}>
                <option value="">Escolher um usuário…</option>
                {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </Linha>
            <Linha rot="Cargo">
              <input name="cargo_responsavel" maxLength={120} defaultValue={inicial?.cargo ?? ""} placeholder="Ex.: Secretária de Saúde" className={campo} />
            </Linha>
          </div>
          <p className="text-[13px] text-texto-suave">
            Só aparecem usuários já cadastrados nesta prefeitura. O vínculo de outros usuários com a secretaria é feito em Usuários e perfis.
          </p>
        </Painel>

        <Painel>
          <CabecalhoPainel
            icone={<svg aria-hidden {...icone}><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></svg>}
            titulo="Regras do acervo"
            subtitulo="Podem mudar depois"
          />
          <div className="grid gap-x-5 gap-y-3 sm:grid-cols-2">
            <Marca nome="recebe_licitacoes" rot="Recebe licitações" marcado={inicial?.recebeLicitacoes ?? true} />
            <Marca nome="recebe_contratos" rot="Recebe contratos" marcado={inicial?.recebeContratos ?? true} />
            <Marca nome="exige_aprovacao_emprestimo" rot="Exige aprovação para empréstimo" marcado={inicial?.exigeAprovacao ?? false} />
            <Marca nome="avisar_atrasos" rot="Avisar responsável sobre atrasos" marcado={inicial?.avisarAtrasos ?? true} />
          </div>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Linha rot="Prazo padrão de empréstimo">
              <select name="prazo_emprestimo_dias" defaultValue={inicial?.prazo ?? 15} className={campo}>
                {prazos.map((p) => <option key={p} value={p}>{p} dias</option>)}
              </select>
            </Linha>
            <Linha rot="Rua preferencial no galpão">
              <select name="rua_preferencial_id" defaultValue={inicial?.ruaPreferencialId ?? ""} className={campo}>
                <option value="">Sem preferência</option>
                {ruas.map((r) => <option key={r.id} value={r.id}>{r.rotulo}</option>)}
              </select>
            </Linha>
          </div>
        </Painel>
      </div>

      <Painel className="min-h-[440px]">
        <span className={rotulo}>O que acontece ao salvar</span>
        {PASSOS.map((t, i) => (
          <div key={t} className="flex items-start gap-2.5">
            <span aria-hidden className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-[#ccfbf1] font-mono text-[11px] font-medium text-[#0e7490] dark:bg-[rgba(45,212,191,.15)] dark:text-[#2dd4bf]">
              {i + 1}
            </span>
            <span className="text-[13px] leading-[19px]">{t}</span>
          </div>
        ))}
        {estado?.erro && <p role="alert" data-testid="erro-formulario" className="text-sm text-erro">{estado.erro}</p>}
        {estado?.aviso && <p role="status" className="text-sm">{estado.aviso}</p>}
        <div className="mt-auto flex flex-col gap-2.5">
          <button type="submit" disabled={pendente} className={`${botao} bg-[linear-gradient(135deg,#0e7490,#0f766e)] font-semibold text-white dark:bg-none dark:bg-[#2dd4bf] dark:text-[#0b2e3a]`}>
            {pendente ? <span className="inline-flex items-center gap-2"><Girando />Salvando…</span> : "Salvar secretaria"}
          </button>
          {!inicial && (
            <button type="submit" name="depois" value="outra" disabled={pendente} className={`${botao} border border-linha font-medium hover:border-destaque`}>
              Salvar e cadastrar outra
            </button>
          )}
          <Link href="/secretarias" className={`${botao} inline-flex items-center justify-center border border-linha font-medium hover:border-destaque`}>
            Cancelar
          </Link>
        </div>
      </Painel>
    </form>
  );
}

"use client";

import { useEffect, useState } from "react";
import { CampoRotulado, campo } from "@/features/movimento/ui";
import { listarCaixas } from "@/features/documentos/acoes";
import type { CaixaOcupada } from "@/features/documentos/dados";
import type { OpcoesEstrutura } from "@/features/documentos/formulario";

// Rua > módulo > nível > caixa, com a ocupação de cada caixa. Devolve o id da
// caixa escolhida (ou "" enquanto faltar escolher).
export function EscolhaCaixa({ estrutura, aoMudar }: { estrutura: OpcoesEstrutura; aoMudar: (caixaId: string) => void }) {
  const [rua, setRua] = useState("");
  const [modulo, setModulo] = useState("");
  const [nivel, setNivel] = useState("");
  const [caixa, setCaixa] = useState("");
  const [caixas, setCaixas] = useState<CaixaOcupada[]>([]);

  useEffect(() => {
    let vivo = true;
    if (nivel) listarCaixas(nivel).then((l) => vivo && setCaixas(l));
    return () => {
      vivo = false;
    };
  }, [nivel]);

  function mudar(proxima: { rua?: string; modulo?: string; nivel?: string; caixa?: string }) {
    setRua(proxima.rua ?? rua);
    setModulo(proxima.modulo ?? "");
    setNivel(proxima.nivel ?? "");
    setCaixa(proxima.caixa ?? "");
    if (proxima.caixa === undefined) setCaixas([]);
    aoMudar(proxima.caixa ?? "");
  }

  return (
    <>
      <CampoRotulado rotulo="Rua">
        <select className={campo} value={rua} onChange={(e) => mudar({ rua: e.target.value })}>
          <option value="">Escolha a rua</option>
          {estrutura.ruas.map((r) => (
            <option key={r.id} value={r.id}>
              Rua {r.codigo}
            </option>
          ))}
        </select>
      </CampoRotulado>
      <CampoRotulado rotulo="Módulo">
        <select className={campo} value={modulo} disabled={!rua} onChange={(e) => mudar({ rua, modulo: e.target.value })}>
          <option value="">Escolha o módulo</option>
          {estrutura.modulos
            .filter((m) => m.ruaId === rua)
            .map((m) => (
              <option key={m.id} value={m.id}>
                Módulo {m.numero}
              </option>
            ))}
        </select>
      </CampoRotulado>
      <CampoRotulado rotulo="Nível">
        <select className={campo} value={nivel} disabled={!modulo} onChange={(e) => mudar({ rua, modulo, nivel: e.target.value })}>
          <option value="">Escolha o nível</option>
          {estrutura.niveis
            .filter((n) => n.moduloId === modulo)
            .map((n) => (
              <option key={n.id} value={n.id}>
                Nível {n.numero}
              </option>
            ))}
        </select>
      </CampoRotulado>
      <CampoRotulado rotulo="Caixa">
        <select className={campo} value={caixa} disabled={!nivel} onChange={(e) => mudar({ rua, modulo, nivel, caixa: e.target.value })}>
          <option value="">Escolha a caixa</option>
          {caixas.map((c) => (
            <option key={c.id} value={c.id} disabled={c.documentos >= c.capacidade}>
              Caixa {String(c.numero).padStart(2, "0")} · {c.documentos}/{c.capacidade}
            </option>
          ))}
        </select>
      </CampoRotulado>
    </>
  );
}

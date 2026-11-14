"use client";

// "Mover documentos" (quadro "Fase 4 · Dentro da caixa: mover documentos"):
// De e Para, listas Rua > Módulo > Nível > Caixa, "Próxima livre", ocupação do
// destino e a confirmação. Todos mudam ou nenhum muda (o banco decide).
import { useState } from "react";
import { localizarCaixa, type NoRua } from "./arvore";
import type { DetalheCaixa, LinhaDocumento } from "./dados";
import { proximaLivre } from "./acoes";
import { estilos } from "./painel-caixa";

const campo =
  "h-10 w-full rounded-lg border border-borda-campo bg-campo px-2.5 text-[13px] font-medium text-texto focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-foco max-md:h-11";

export function MoverDocumentos({
  arvore,
  origem,
  marcados,
  destinoId,
  destino,
  onDestino,
  onCancelar,
  onConfirmar,
  pendente,
  erro,
}: {
  arvore: NoRua[];
  origem: DetalheCaixa;
  marcados: LinhaDocumento[];
  destinoId: string | null;
  destino: DetalheCaixa | null | undefined;
  onDestino(id: string | null): void;
  onCancelar(): void;
  onConfirmar(): void;
  pendente: boolean;
  erro: string | null;
}) {
  const local = destinoId ? localizarCaixa(arvore, destinoId) : null;
  const [rua, setRua] = useState<string>("");
  const [modulo, setModulo] = useState<string>("");
  const [nivel, setNivel] = useState<string>("");
  const ruaId = local?.ruaId ?? rua;
  const moduloId = local?.moduloId ?? modulo;
  const nivelId = local?.nivelId ?? nivel;
  const r = arvore.find((x) => x.id === ruaId);
  const m = r?.modulos.find((x) => x.id === moduloId);
  const n = m?.niveis.find((x) => x.id === nivelId);
  const n_ = marcados.length;
  const nova = destino ? destino.total + n_ : null;
  const mesma = destinoId === origem.id;

  async function proxima() {
    const id = await proximaLivre({ nivel: nivelId || undefined, modulo: nivelId ? undefined : moduloId || undefined, rua: nivelId || moduloId ? undefined : ruaId || undefined });
    if (id) onDestino(id);
  }
  const limpar = (de: "rua" | "modulo" | "nivel", v: string) => {
    onDestino(null);
    if (de === "rua") (setRua(v), setModulo(""), setNivel(""));
    if (de === "modulo") (setModulo(v), setNivel(""));
    if (de === "nivel") setNivel(v);
  };

  return (
    <section aria-label="Mover documentos" className={`${estilos.cartao} border-[#ff9f1c]`}>
      <h2 className="font-titulo text-[15px] font-bold">Mover documentos</h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
        <dt className="text-texto-suave">De</dt>
        <dd className="font-mono">{origem.codigo}</dd>
        <dt className="text-texto-suave">Para</dt>
        <dd className="font-mono">{destino ? destino.codigo : "—"}</dd>
      </dl>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs text-texto-suave">
          Rua
          <select className={campo} value={ruaId} onChange={(e) => limpar("rua", e.target.value)}>
            <option value="">Escolha</option>
            {arvore.map((x) => (
              <option key={x.id} value={x.id}>Rua {x.codigo}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-texto-suave">
          Módulo
          <select className={campo} value={moduloId} disabled={!r} onChange={(e) => limpar("modulo", e.target.value)}>
            <option value="">Escolha</option>
            {r?.modulos.map((x) => (
              <option key={x.id} value={x.id}>Módulo {x.numero}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-texto-suave">
          Nível
          <select className={campo} value={nivelId} disabled={!m} onChange={(e) => limpar("nivel", e.target.value)}>
            <option value="">Escolha</option>
            {m?.niveis.map((x) => (
              <option key={x.id} value={x.id}>Nível {x.numero}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-texto-suave">
          Caixa
          <select className={campo} value={destinoId ?? ""} disabled={!n} onChange={(e) => onDestino(e.target.value || null)}>
            <option value="">Escolha</option>
            {n?.caixas.map((x) => (
              <option key={x.id} value={x.id}>Caixa {String(x.numero).padStart(2, "0")}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={proxima} disabled={!ruaId} className={estilos.botaoBorda}>
          Próxima livre
        </button>
        <span className="text-xs text-texto-suave">ou clique numa caixa no mapa</span>
      </div>
      <div className="rounded-[10px] border border-linha bg-superficie-2 px-3 py-2 text-[13px]" role="status">
        <span className="text-xs text-texto-suave">Ocupação da caixa destino</span>
        <p className="font-mono font-medium">{destino && nova !== null ? `${destino.total} → ${nova} de ${destino.capacidade}` : "Escolha a caixa de destino"}</p>
        {destino && nova !== null && nova > destino.capacidade && (
          <p className="text-xs text-[#b45309] dark:text-[#fbbf24]">Esta caixa vai passar da capacidade. Você pode mover mesmo assim.</p>
        )}
        {mesma && <p className="text-xs text-erro">Escolha uma caixa diferente da de origem.</p>}
      </div>
      <ul className="flex flex-col gap-1 text-[13px]" aria-label="Documentos marcados">
        {marcados.map((d) => (
          <li key={d.id} className="truncate">
            {d.titulo}
            <span className="text-texto-suave"> · {d.empresa ?? d.secretaria}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-texto-suave">
        Todos mudam ou nenhum muda. Cada documento movido fica registrado na auditoria, com a caixa de antes e a de depois.
      </p>
      {erro && (
        <p role="alert" className="text-sm text-erro">
          {erro}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onCancelar} className={estilos.botaoBorda}>
          Cancelar
        </button>
        <button type="button" onClick={onConfirmar} disabled={pendente || !destinoId || mesma || n_ === 0} className={estilos.botaoCheio}>
          {pendente ? "Movendo…" : n_ === 1 ? "Mover 1 documento" : `Mover ${n_} documentos`}
        </button>
      </div>
    </section>
  );
}

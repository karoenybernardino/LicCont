import { Etiqueta } from "@/features/estrutura/componentes";
import type { Modalidade, Tipo } from "@/features/documentos/tipos";
import { CLASSES, classeDocumento, dataBR, somarAnos, type Regra } from "./regras";
import { BLOCO, LINHA, ROTULO, SUAVE } from "./ui";

// Quadro "Prazo de guarda" do cadastro de licitação (CadastroEncerramento*):
// mostra a regra do tipo e a data em que o documento fica pronto para eliminação.
export function PrazoDeGuarda({ regras, tipo, modalidade, encerrado }: { regras: Regra[]; tipo: Tipo; modalidade: Modalidade | null; encerrado: string }) {
  const classe = classeDocumento(tipo, modalidade);
  const regra = regras.find((r) => r.classe === classe);
  const permanente = regra?.destinacao === "guarda_permanente";
  const pronto = regra && !permanente && /^\d{4}-\d{2}-\d{2}$/.test(encerrado) ? somarAnos(encerrado, regra.corrente + regra.intermediaria) : null;

  return (
    <div className={`flex min-w-0 flex-col gap-1.5 rounded-[10px] border px-3.5 py-2.5 ${LINHA} ${BLOCO}`} aria-live="polite">
      <div className="flex items-center justify-between gap-2.5">
        <span className={ROTULO}>Prazo de guarda</span>
        {regra && <Etiqueta>{permanente ? "Guarda permanente" : "Eliminação"}</Etiqueta>}
      </div>
      <div className="text-[13px] leading-[19px]">
        {regra ? (
          <>
            {CLASSES[classe]} · <b>{regra.corrente} + {regra.intermediaria} anos</b>
            {permanente ? " → guarda permanente" : pronto ? <> → pronto para eliminação em <b className="font-mono font-medium">{dataBR(pronto)}</b></> : null}
          </>
        ) : (
          "Sem regra na tabela de temporalidade para este tipo."
        )}
      </div>
      <div className={`text-xs ${SUAVE}`}>Calculado pela tabela de temporalidade. Sem data, o documento não entra na fila de descarte.</div>
    </div>
  );
}

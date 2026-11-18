import { Etiqueta } from "@/features/estrutura/componentes";
import { dataBR, somarAnos, type Regra } from "./regras";
import { textoContagem } from "./classes-tabela";
import { BLOCO, LINHA, ROTULO, SUAVE } from "./ui";

// Quadro "Prazo de guarda" do cadastro: mostra a regra da classe escolhida e a data em que o
// documento fica pronto para eliminação. `inicio` é a data de onde o prazo conta (data do
// documento no prazo fixo; o evento informado no prazo por evento).
export function PrazoDeGuarda({ regra, inicio }: { regra: Regra | undefined; inicio: string }) {
  const permanente = regra?.tipoPrazo === "permanente";
  const pronto = regra && !permanente && /^\d{4}-\d{2}-\d{2}$/.test(inicio) ? somarAnos(inicio, regra.corrente + regra.intermediaria) : null;
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 rounded-[10px] border px-3.5 py-2.5 ${LINHA} ${BLOCO}`} aria-live="polite">
      <div className="flex items-center justify-between gap-2.5">
        <span className={ROTULO}>Prazo de guarda</span>
        {regra && <Etiqueta>{permanente ? "Guarda permanente" : "Eliminação"}</Etiqueta>}
      </div>
      <div className="text-[13px] leading-[19px]">
        {regra ? (
          <>
            <span className="font-mono">{regra.codigo}</span> · {regra.classe} · <b>{permanente ? "permanente" : `${regra.corrente + regra.intermediaria} anos`}</b>
            {permanente ? null : regra.tipoPrazo === "apos_evento" && !pronto ? <> · conta após: {textoContagem(regra)}. Informe a data do evento para calcular.</> : pronto ? <> → pronto para eliminação em <b className="font-mono font-medium">{dataBR(pronto)}</b></> : null}
          </>
        ) : (
          "Escolha a classe para ver o prazo de guarda."
        )}
      </div>
      <div className={`text-xs ${SUAVE}`}>Calculado pela tabela de temporalidade do órgão. Sem a data, o documento não entra na fila de descarte.</div>
    </div>
  );
}

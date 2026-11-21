import { Etiqueta } from "@/features/estrutura/componentes";
import { dataBR, vencimentoDoPrazo, type Regra } from "./regras";
import { BLOCO, LINHA, ROTULO, SUAVE } from "./ui";

// Quadro "Prazo de guarda" do cadastro: mostra a regra da classe escolhida e a data em que o
// documento fica pronto para descarte. O prazo conta do FIM DO ANO do documento (`ano`).
export function PrazoDeGuarda({ regra, ano }: { regra: Regra | undefined; ano: string }) {
  const permanente = regra?.tipoPrazo === "permanente";
  const anoNum = Number(ano);
  const pronto = regra && !permanente && Number.isInteger(anoNum) && anoNum >= 1950 ? vencimentoDoPrazo(anoNum, regra.corrente + regra.intermediaria) : null;
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 rounded-[10px] border px-3.5 py-2.5 ${LINHA} ${BLOCO}`} aria-live="polite">
      <div className="flex items-center justify-between gap-2.5">
        <span className={ROTULO}>Prazo de guarda</span>
        {regra && <Etiqueta>{permanente ? "Guarda permanente" : "Descarte"}</Etiqueta>}
      </div>
      <div className="text-[13px] leading-[19px]">
        {regra ? (
          <>
            <span className="font-mono">{regra.codigo}</span> · {regra.classe} · <b>{permanente ? "permanente" : `${regra.corrente + regra.intermediaria} anos`}</b>
            {pronto ? <> → pronto para descarte a partir de <b className="font-mono font-medium">{dataBR(pronto)}</b></> : null}
          </>
        ) : (
          "Escolha a classe para ver o prazo de guarda."
        )}
      </div>
      <div className={`text-xs ${SUAVE}`}>Conta a partir do fim do ano do documento. Ex.: ano 2025 + 5 anos = descarte em 2031. Calculado pela tabela de temporalidade do órgão.</div>
    </div>
  );
}

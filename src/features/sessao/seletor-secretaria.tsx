import { BotaoEnviar } from "@/ui/botao-enviar";
import { trocarSecretaria } from "./acoes";
import { secretariasPermitidas, type Secretaria, type Usuario } from "./dal";

// Troca de secretaria sem novo login (docs/fases/fase-1.md, Login).
// Pílula arredondada de 38 px, como o botão de tema: rótulo pequeno, lista sem a borda nativa e seta própria.
export async function SeletorSecretaria({ usuario, atual }: { usuario: Usuario; atual: Secretaria }) {
  const opcoes = await secretariasPermitidas(usuario);
  const id = "secretaria-em-uso";
  return (
    <form action={trocarSecretaria} className="flex items-center gap-2">
      <div className="flex h-[38px] items-center gap-2 rounded-full border border-linha bg-campo pr-3 pl-4 focus-within:outline-2 focus-within:outline-foco">
        <label htmlFor={id} className="text-[11px] font-semibold tracking-[.05em] text-texto-suave uppercase">
          Secretaria
        </label>
        <select
          id={id}
          name="secretaria"
          defaultValue={atual.id ?? "todas"}
          className="max-w-[200px] cursor-pointer appearance-none truncate bg-transparent pr-1 text-[13px] font-semibold text-texto outline-0"
        >
          {opcoes.map((s) => (
            <option key={s.id ?? "todas"} value={s.id ?? "todas"}>
              {s.nome}
            </option>
          ))}
        </select>
        <svg aria-hidden width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none -ml-1.5 shrink-0 text-texto-suave">
          <path d="M2 4.5l4 4 4-4" />
        </svg>
      </div>
      <BotaoEnviar className="h-[38px] rounded-full border border-linha px-4 text-[13px] text-texto hover:border-destaque focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco">
        Trocar
      </BotaoEnviar>
    </form>
  );
}

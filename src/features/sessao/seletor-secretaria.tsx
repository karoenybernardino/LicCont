import { BotaoEnviar } from "@/ui/botao-enviar";
import { trocarSecretaria } from "./acoes";
import { secretariasPermitidas, type Secretaria, type Usuario } from "./dal";

// Troca de secretaria sem novo login (docs/fases/fase-1.md, Login).
// Visual do canvas: rótulo pequeno e lista dentro de uma pílula de 38 px.
export async function SeletorSecretaria({ usuario, atual }: { usuario: Usuario; atual: Secretaria }) {
  const opcoes = await secretariasPermitidas(usuario);
  const id = "secretaria-em-uso";
  return (
    <form action={trocarSecretaria} className="flex items-center gap-2">
      <div className="flex h-[38px] items-center gap-2 rounded-[10px] border border-linha bg-campo pr-2.5 pl-3 focus-within:outline-2 focus-within:outline-foco">
        <label htmlFor={id} className="text-[11px] font-semibold tracking-[.05em] text-texto-suave uppercase">
          Secretaria
        </label>
        <select
          id={id}
          name="secretaria"
          defaultValue={atual.id ?? "todas"}
          className="bg-transparent text-[13px] font-semibold text-texto outline-0"
        >
          {opcoes.map((s) => (
            <option key={s.id ?? "todas"} value={s.id ?? "todas"}>
              {s.nome}
            </option>
          ))}
        </select>
      </div>
      <BotaoEnviar className="h-[38px] rounded-[10px] border border-linha px-3 text-[13px] text-texto hover:border-destaque focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco">
        Trocar
      </BotaoEnviar>
    </form>
  );
}

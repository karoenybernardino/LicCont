import { Selecao } from "@/ui/selecao";
import { trocarSecretaria } from "./acoes";
import { secretariasPermitidas, type Secretaria, type Usuario } from "./dal";

// Troca de secretaria sem novo login (docs/fases/fase-1.md, Login).
export async function SeletorSecretaria({ usuario, atual }: { usuario: Usuario; atual: Secretaria }) {
  const opcoes = await secretariasPermitidas(usuario);
  return (
    <form action={trocarSecretaria} className="flex items-end gap-2">
      <Selecao rotulo="Secretaria" name="secretaria" defaultValue={atual.id ?? "todas"} className="min-h-10">
        {opcoes.map((s) => (
          <option key={s.id ?? "todas"} value={s.id ?? "todas"}>
            {s.nome}
          </option>
        ))}
      </Selecao>
      <button
        type="submit"
        className="min-h-10 rounded-lg border border-linha px-3 text-sm text-texto hover:border-destaque focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
      >
        Trocar
      </button>
    </form>
  );
}

import { BotaoEnviar } from "@/ui/botao-enviar";
import { trocarPerfilDemo } from "./acoes";
import { PERFIS_DEMO, emDemo } from "./dados";
import { perfilDemo } from "./sessao";

// Faixa do modo demonstração: avisa que os dados são fictícios e troca o perfil.
export async function FaixaDemo() {
  if (!emDemo()) return null;
  const perfil = await perfilDemo();
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 bg-[#fef3c7] px-4 py-2 text-sm text-[#78350f]">
      <span>
        <strong>Modo demonstração.</strong> Dados fictícios; nada é salvo.
      </span>
      <form action={trocarPerfilDemo} className="flex items-center gap-2">
        <label htmlFor="perfil-demo">Ver como</label>
        <select
          id="perfil-demo"
          name="perfil"
          defaultValue={perfil ?? "administrador"}
          className="rounded border border-[#b45309] bg-white px-2 py-1 text-[#78350f]"
        >
          {Object.entries(PERFIS_DEMO).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </select>
        <BotaoEnviar className="rounded border border-[#b45309] px-2 py-1 font-medium">Trocar</BotaoEnviar>
      </form>
    </div>
  );
}

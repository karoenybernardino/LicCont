import type { Metadata } from "next";
import { Campo } from "@/ui/campo";
import { Cartao } from "@/ui/cartao";
import { Formulario } from "@/ui/formulario";
import { exigirAdmin } from "@/features/sessao/dal";
import { PaginaSistema } from "@/features/sessao/pagina";
import { alternarSecretaria, cadastrarSecretaria } from "@/features/secretarias/acoes";
import { listarSecretarias } from "@/features/usuarios/dados";

export const metadata: Metadata = { title: "Secretarias · LicCONT" };

export default async function Secretarias() {
  const { usuario, secretaria } = await exigirAdmin();
  const secretarias = await listarSecretarias();

  return (
    <PaginaSistema usuario={usuario} secretaria={secretaria} titulo="Secretarias">
      <Cartao className="p-0">
        <ul className="divide-y divide-linha">
          {secretarias.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <span>
                {s.nome}
                {!s.ativa && <span className="ml-2 text-sm text-texto-suave">(desativada)</span>}
              </span>
              <Formulario
                acao={alternarSecretaria}
                botao={s.ativa ? `Desativar ${s.nome}` : `Reativar ${s.nome}`}
                enviando="Salvando…"
                variante="secundario"
                className="w-56"
              >
                <input type="hidden" name="id" value={s.id} />
                <input type="hidden" name="ativa" value={s.ativa ? "nao" : "sim"} />
              </Formulario>
            </li>
          ))}
        </ul>
      </Cartao>

      <Cartao>
        <h2 className="mb-4 text-lg">Cadastrar secretaria</h2>
        <Formulario acao={cadastrarSecretaria} botao="Cadastrar" enviando="Cadastrando…" className="max-w-md">
          <Campo rotulo="Nome da secretaria" name="nome" required maxLength={120} />
        </Formulario>
      </Cartao>
    </PaginaSistema>
  );
}

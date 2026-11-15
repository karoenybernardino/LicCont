import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Painel, TituloPainel } from "@/features/estrutura/componentes";
import { exigirSessao } from "@/features/sessao/dal";
import { PaginaSistema } from "@/features/sessao/pagina";
import { secretariasParaCadastro } from "@/features/documentos/dados";
import { contarSemEndereco, listarLotes } from "@/features/importacao/dados";
import { Assistente } from "@/features/importacao/assistente";
import { ListaLotes } from "@/features/importacao/lotes";

export const metadata: Metadata = { title: "Importar documentos · LicCONT" };

// Só administrador importa; os outros perfis voltam ao cadastro.
export default async function Importar() {
  const { usuario, secretaria } = await exigirSessao();
  if (!usuario.administrador) redirect("/documentos/novo");
  const [secretarias, lotes, semEndereco] = await Promise.all([secretariasParaCadastro(usuario), listarLotes(), contarSemEndereco()]);
  return (
    <PaginaSistema usuario={usuario} secretaria={secretaria} titulo="Importar do GED ou planilha" trilha="Acervo · Cadastro › Importar">
      <div className="flex flex-col gap-4">
        <Assistente secretarias={secretarias.map((s) => ({ id: s.id, nome: s.nome }))} semEndereco={semEndereco} />
        <Painel>
          <TituloPainel>Lotes importados</TituloPainel>
          <ListaLotes lotes={lotes} />
        </Painel>
      </div>
    </PaginaSistema>
  );
}

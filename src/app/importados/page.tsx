import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { botaoContorno } from "@/ui/canvas";
import { exigirSessao } from "@/features/sessao/dal";
import { PaginaSistema } from "@/features/sessao/pagina";
import { opcoesEstrutura, secretariasParaCadastro } from "@/features/documentos/dados";
import { ehCoordenador } from "@/features/estrutura/dados";
import { fila } from "@/features/tce/dados";
import { PainelFila } from "@/features/tce/painel-fila";

export const metadata: Metadata = { title: "Importados do TCE · LicCONT" };

export default async function Importados() {
  const { usuario, secretaria } = await exigirSessao();
  // Quem confere: administrador ou coordenador. O banco confere de novo.
  if (!usuario.administrador && !(await ehCoordenador(usuario))) redirect("/pesquisa");
  const [{ itens, duplicados }, estrutura, secretarias] = await Promise.all([fila(), opcoesEstrutura(), secretariasParaCadastro(usuario)]);
  return (
    <PaginaSistema
      usuario={usuario}
      secretaria={secretaria}
      titulo="Importados do TCE a conferir"
      trilha="Acervo · Importados do TCE"
      acoes={
        usuario.administrador ? (
          <Link href="/configuracoes/tce" className={botaoContorno}>
            Ver histórico das importações
          </Link>
        ) : undefined
      }
    >
      <PainelFila itens={itens} duplicados={duplicados} estrutura={estrutura} secretarias={secretarias.map((s) => ({ id: s.id, nome: s.nome }))} administrador={usuario.administrador} />
    </PaginaSistema>
  );
}

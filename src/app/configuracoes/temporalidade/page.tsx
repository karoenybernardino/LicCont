import type { Metadata } from "next";
import { Painel, TituloPainel } from "@/features/estrutura/componentes";
import { listarGrupos } from "@/features/classificacao/dados";
import { exigirAcervo } from "@/features/sessao/dal";
import { PaginaSistema } from "@/features/sessao/pagina";
import { EditorClasses } from "@/features/temporalidade/classes";
import { lerRegras } from "@/features/temporalidade/dados";

export const metadata: Metadata = { title: "Tabela de temporalidade · LicCONT" };

// Administrador da prefeitura edita a tabela do próprio órgão (a equipe LicCONT
// edita a de qualquer órgão em /equipe/<id>/temporalidade). O banco confere de novo.
export default async function ConfiguracaoTemporalidade() {
  const { usuario, secretaria } = await exigirAcervo();
  const [regras, grupos] = await Promise.all([lerRegras(), listarGrupos()]);
  return (
    <PaginaSistema usuario={usuario} secretaria={secretaria} titulo="Tabela de temporalidade" trilha="Configurações · Temporalidade">
      <Painel>
        <TituloPainel>Tabela de temporalidade</TituloPainel>
        <p className="text-[12.5px] text-texto-suave">Cada órgão cadastra a sua tabela oficial, aprovada por profissional habilitado.</p>
        <EditorClasses prefeitura={usuario.prefeituraId} classes={regras} grupos={grupos.filter((g) => g.ativo).map((g) => ({ id: g.id, nome: g.nome }))} />
      </Painel>
    </PaginaSistema>
  );
}

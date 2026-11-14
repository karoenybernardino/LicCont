import type { Metadata } from "next";
import Link from "next/link";
import { exigirSessao } from "@/features/sessao/dal";
import { PaginaSistema } from "@/features/sessao/pagina";
import { emDemo } from "@/features/demo/dados";
import { secretariasParaCadastro } from "@/features/documentos/dados";
import { carregarEstrutura, podeCaixas } from "@/features/estrutura/dados";
import { Painel } from "@/features/estrutura/componentes";
import { galpaoDaCaixa, plantaDoGalpao, caixasDoGalpao } from "@/features/mapa/dados";
import { galpaoGrande } from "@/features/mapa/galpao-grande";
import { MapaCliente } from "@/features/mapa/mapa-cliente";
import { PLANTA_VAZIA } from "@/features/mapa/tipos";
import { lerParametros } from "@/features/mapa/url";

export const metadata: Metadata = { title: "Mapa 3D · LicCONT" };

export default async function Mapa({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { usuario, secretaria } = await exigirSessao();
  const p = lerParametros(await searchParams);
  // ?galpao=grande só existe na demonstração (galpão de teste com 15.360 caixas).
  const grande = emDemo() && p.grande;

  const galpaoPedido = p.galpao ?? (p.caixa ? await galpaoDaCaixa(p.caixa) : null);
  const g = grande ? galpaoGrande() : null;
  const estrutura = g ? g.estrutura : await carregarEstrutura(galpaoPedido ?? undefined);
  const galpao = estrutura.galpao;

  const [caixas, planta, podeEditar, cadastra] = galpao
    ? await Promise.all([
        g ? Promise.resolve(g.caixas) : caixasDoGalpao(galpao.id),
        g ? Promise.resolve(PLANTA_VAZIA) : plantaDoGalpao(galpao.id),
        podeCaixas(usuario),
        secretariasParaCadastro(usuario),
      ])
    : [[], PLANTA_VAZIA, false, []];

  return (
    <PaginaSistema usuario={usuario} secretaria={secretaria} titulo="Mapa 3D" trilha="Acervo · Localização">
      {!galpao ? (
        <Painel>
          <p className="text-sm text-texto-suave">
            Nenhum galpão cadastrado ainda. {usuario.administrador ? <Link href="/estrutura" className="underline">Cadastre o galpão na Estrutura física.</Link> : "Peça ao administrador para cadastrar o galpão."}
          </p>
        </Painel>
      ) : (
        <MapaCliente
          // Sem a caixa na chave: a própria tela grava ?caixa= na URL e não pode se remontar por isso.
          key={`${galpao.id}:${p.codigos.join(",")}`}
          estrutura={estrutura}
          caixas={caixas}
          planta={planta}
          galpoes={estrutura.galpoes.filter((x) => x.ativo).map((x) => ({ id: x.id, nome: x.nome }))}
          galpaoId={galpao.id}
          inicial={{ caixa: p.caixa, doc: p.doc, vista: p.vista, codigos: p.codigos }}
          podeEditar={podeEditar}
          podeMover={cadastra.length > 0}
          grande={grande}
        />
      )}
    </PaginaSistema>
  );
}

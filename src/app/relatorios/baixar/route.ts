import { exigirPrefeitura, nomePrefeitura, secretariasPermitidas } from "@/features/sessao/dal";
import { secretariasParaCadastro } from "@/features/documentos/dados";
import { clienteSessao } from "@/lib/supabase/servidor";
import { emDemo } from "@/features/demo/dados";
import { lerPedido, RELATORIOS } from "@/features/relatorios/definicoes";
import { montarRelatorio } from "@/features/relatorios/dados";
import { gerarRelatorioPdf, gerarRelatorioPlanilha } from "@/features/relatorios/pdf";

// Download de relatório. A permissão é conferida aqui (quem cadastra ou o
// administrador) e de novo no banco, que registra o download (tabela e
// auditoria, sem conteúdo). Nome do arquivo fixo: nada do conteúdo.
export const dynamic = "force-dynamic";

const NEGADO = new Response("Você não tem permissão para esta ação.", { status: 403 });

export async function GET(req: Request) {
  const { usuario } = await exigirPrefeitura();
  const { id, formato, filtros } = lerPedido(new URL(req.url).searchParams);
  if (!id || !formato) return new Response("Confira os dados e tente de novo.", { status: 400 });
  if (!usuario.administrador && (await secretariasParaCadastro(usuario)).length === 0) return NEGADO;

  const secretarias = (await secretariasPermitidas(usuario)).filter((s): s is { id: string; nome: string } => s.id !== null);
  const nomes = new Map(secretarias.map((s) => [s.id, s.nome]));
  if (filtros.secretaria && !nomes.has(filtros.secretaria)) return NEGADO;

  let relatorio;
  try {
    relatorio = await montarRelatorio(id, filtros, nomes);
  } catch {
    return new Response("Não foi possível gerar o relatório.", { status: 500 });
  }

  let codigo = `${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-demo`;
  if (!emDemo()) {
    const sb = await clienteSessao();
    const { data, error } = sb
      ? await sb.rpc("registrar_relatorio", {
          p_relatorio: id,
          p_formato: formato,
          p_linhas: relatorio.linhas.length,
          p_de: RELATORIOS[id].periodo ? filtros.de : null,
          p_ate: RELATORIOS[id].periodo ? filtros.ate : null,
          p_secretaria: filtros.secretaria,
        })
      : { data: null, error: { code: "x" } };
    // Sem registro não há download: o relatório baixado sempre fica na auditoria.
    if (error || !data) return error?.code === "42501" ? NEGADO : new Response("Não foi possível gerar o relatório.", { status: 500 });
    codigo = `${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${String(data).slice(0, 4)}`;
  }

  const cab = { "cache-control": "no-store", "x-content-type-options": "nosniff" };
  const nome = `relatorio-${id}-${codigo}`;
  if (formato === "pdf") {
    const bytes = await gerarRelatorioPdf(relatorio, {
      prefeitura: await nomePrefeitura(usuario),
      emitidoEm: new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }),
      codigo,
    });
    return new Response(bytes as BodyInit, { headers: { ...cab, "content-type": "application/pdf", "content-disposition": `attachment; filename="${nome}.pdf"` } });
  }
  return new Response(gerarRelatorioPlanilha(relatorio), {
    headers: { ...cab, "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${nome}.csv"` },
  });
}

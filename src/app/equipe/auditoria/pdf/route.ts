import { exigirEquipe } from "@/features/sessao/dal";
import { acoesEquipe } from "@/features/equipe/dados";
import { aplicarFiltroAcao, auditoriaParaRelatorio, lerFiltrosAuditoria } from "@/features/equipe/exportar";
import { gerarRelatorioPdf } from "@/features/relatorios/pdf";

// Auditoria da equipe em PDF no timbrado: quem, quando, o quê e prefeitura.
// O IP é dado pessoal; vai só para a equipe que baixa.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await exigirEquipe();
  const f = lerFiltrosAuditoria(new URL(req.url).searchParams);
  const acoes = aplicarFiltroAcao(await acoesEquipe({ dias: f.dias, prefeitura: f.prefeitura, limite: 1000 }), f.acao);
  const agora = new Date();
  const filtros = [`Período: ${f.dias ? `últimos ${f.dias} dias` : "tudo"}`, ...(f.acao ? [`Ação: ${f.acao}`] : []), `${acoes.length} registros`];
  const pdf = await gerarRelatorioPdf(auditoriaParaRelatorio(acoes, filtros), {
    prefeitura: "Equipe LicCONT",
    emitidoEm: agora.toISOString(),
    codigo: `AUD-${agora.toISOString().slice(0, 10).replaceAll("-", "")}`,
  });
  return new Response(Buffer.from(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="auditoria-equipe-${agora.toISOString().slice(0, 10)}.pdf"`,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

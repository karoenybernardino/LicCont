// Erro forçado para conferir o alerta (docs/seguranca/monitoramento.md). Só em
// Preview. Os dados são fictícios de propósito: no painel de alertas eles
// precisam aparecer como [cpf], [e-mail] e [dados removidos].
export const dynamic = "force-dynamic";

export function GET() {
  if (process.env.VERCEL_ENV !== "preview") return new Response("Não encontrado", { status: 404 });
  throw new Error(
    "Erro de teste do LicCONT · CPF 123.456.789-09 · fulana@exemplo.test · Failing row contains (Maria Fictícia, texto do documento fictício)",
  );
}

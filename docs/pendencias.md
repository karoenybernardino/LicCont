# Pendências depois do PR Fase 8 + Fase 9 + Site inicial

Atualizado em 2026-11-15. O que ficou de fora e por quê.

## Código ou verificação que falta

| Item | Por que ficou | Quem / quando |
| --- | --- | --- |
| `npm run telas:comparar` das telas novas (Importar*, Fila/ConfigTce, Pncp, Painel, Relatorios, PesquisaOrigem, SiteInicial*, Equipe uso, Aceite) e anexar as imagens | Precisa abrir o app num navegador; não foi rodado. O site inicial **não tem as capturas de tela do sistema** que o canvas mostra | Próxima tarefa; bloqueia a aprovação visual |
| Teste de carga do painel com 100 mil documentos (modelo: `supabase/tests/documentos_desempenho.test.sql`) | pgTAP só roda no CI; não dá para validar localmente | Próxima tarefa |
| Revisão de segurança por agente (`auditor-seguranca`) das rotas novas | Não executada | Antes do piloto |
| Rotina que apaga pedidos de demonstração antigos | Prazo de guarda ainda não validado com advogado | Depois do advogado |
| Endereços e campos reais das APIs do TCE-CE e do PNCP | API do TCE só aceita IP brasileiro; não verificado. `tce_ativo` começa desligado | Testar em produção com a integração ligada em uma prefeitura de teste |
| Importar ZIP de PDFs (planejado 500 MB) | Não implementado; PDFs entram depois pelo envio existente | A decidir |
| Opção "importar mesmo assim" em duplicados | O banco proíbe dois documentos ativos com o mesmo processo | Só com mudança de regra |
| PNCP anexa um arquivo por vez | Simplificação | A decidir |
| Planilha da exportação em XLSX (hoje CSV) | CSV abre no Excel e evita fórmula | A decidir |
| Leitura de acervo pelo suporte com autorização | De propósito não aberta (risco ao isolamento); exige política e teste por tabela | Só se o responsável pedir, após advogado |
| Exportação acima de 150 MB de PDFs | O que passa do limite é listado em `pdfs_nao_incluidos.csv` | Exportar por partes, se precisar |

## Depende de pessoa, dinheiro ou domínio

| Item | Depende de |
| --- | --- |
| Textos de `/privacidade` e `/termos`, retenção, base legal, "Dados guardados no Brasil" | Advogado |
| Contato real em `SECURITY.md` e no site (`NEXT_PUBLIC_CONTATO_WHATSAPP`, `NEXT_PUBLIC_CONTATO_EMAIL`) | Domínio, WhatsApp e e-mail definidos |
| Ensaio de restauração de backup (`docs/seguranca/backup-restauracao.md`) | Segundo projeto Supabase gratuito criado pelo responsável |
| Varredura ZAP e autoavaliação ASVS 1 (`docs/seguranca/pentest-alternativa-gratuita.md`) | Preview publicado e pessoa que execute |
| Rotação das chaves antes do piloto | Responsável, na Vercel/Supabase |
| `CRON_SECRET` e `SUPABASE_SERVICE_ROLE_KEY` na Vercel | Responsável |
| Piloto com dados reais (tarefa 11 da Fase 8) | Itens acima fechados |
| Planos pagos (Supabase Pro, backup diário, pentest externo) | Aprovação de custo |

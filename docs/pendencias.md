# Pendências depois do PR Fase 8 + Fase 9 + Site inicial

Atualizado em 2026-11-15. O que ficou de fora e por quê.

## Código ou verificação que falta

| Item | Por que ficou | Quem / quando |
| --- | --- | --- |
| `npm run telas:comparar` das telas novas (Importar*, Fila/ConfigTce, Pncp, Painel, Relatorios, PesquisaOrigem, SiteInicial*, Equipe uso, Aceite) e anexar as imagens | Precisa abrir o app num navegador; não foi rodado. O site inicial **não tem as capturas de tela do sistema** que o canvas mostra | Próxima tarefa; bloqueia a aprovação visual |
| Teste de carga do painel com 100 mil documentos (modelo: `supabase/tests/documentos_desempenho.test.sql`) | pgTAP só roda no CI; não dá para validar localmente | Próxima tarefa |
| Revisão de segurança por agente (`auditor-seguranca`) das rotas novas | Não executada | Antes do piloto |
| Prazo de 12 meses dos pedidos de demonstração | Rotina já apaga; só o número do prazo falta validar | Advogado |
| API do TCE-CE | **Conferida em 15/11/2026** contra a especificação oficial e respostas reais (`/sim/processos_administrativos_contratacoes`, `/sim/contratos`, `/sim/contratados`). Limites: só dispensa, inexigibilidade e pregão eletrônico entram (os outros códigos de modalidade não são documentados; ficam como "ignorados"); licitação não traz empresa nem valor; a API devolve acento quebrado e letras como Á/Í às vezes se perdem ("FÃ�SICO"), sem como recuperar | Rodar uma importação de teste em uma prefeitura de teste |
| API do PNCP | Endereços ainda supostos; não verificados | Verificar como foi feito com o TCE |
| Importar ZIP de PDFs (planejado 500 MB) | Não implementado; PDFs entram depois pelo envio existente | A decidir |
| Opção "importar mesmo assim" em duplicados | O banco proíbe dois documentos ativos com o mesmo processo | Só com mudança de regra |
| PNCP anexa um arquivo por vez | Simplificação | A decidir |
| Planilha da exportação em XLSX (hoje CSV) | CSV abre no Excel e evita fórmula | A decidir |
| Leitura de acervo pelo suporte com autorização | De propósito não aberta (risco ao isolamento); exige política e teste por tabela | Só se o responsável pedir, após advogado |
| Exportação acima de 150 MB de PDFs | O que passa do limite é listado em `pdfs_nao_incluidos.csv`; o pacote sai em volumes de até 40 MB (teto de 50 MB por arquivo do Supabase gratuito) | Exportar por partes, se precisar |

## Depende de pessoa, dinheiro ou domínio

| Item | Depende de |
| --- | --- |
| Textos de `/privacidade` e `/termos`, retenção, base legal, "Dados guardados no Brasil" | Advogado |
| Contato real em `SECURITY.md` e no site (`NEXT_PUBLIC_CONTATO_WHATSAPP`, `NEXT_PUBLIC_CONTATO_EMAIL`) | Domínio, WhatsApp e e-mail definidos |
| Ensaio de restauração de backup (`docs/seguranca/backup-restauracao.md`) | Segundo projeto Supabase gratuito criado pelo responsável |
| Varredura ZAP e autoavaliação ASVS 1 (`docs/seguranca/pentest-alternativa-gratuita.md`) | Preview publicado e pessoa que execute |
| Rotação das chaves antes do piloto | Responsável, na Vercel/Supabase |
| `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` e `PEDIDO_HMAC_SECRET` (valor aleatório longo, só em Vercel Production) na Vercel | Responsável |
| Piloto com dados reais (tarefa 11 da Fase 8) | Itens acima fechados |
| Planos pagos (Supabase Pro, backup diário, pentest externo) | Aprovação de custo |

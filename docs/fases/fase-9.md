# Fase 9 — Importação, TCE-CE, painel e relatórios (antes do piloto)

Plano completo: "LicCONT — Integração TCE-CE e painel de relatórios" — https://claude.ai/artifact/XfUMpMFjH2HYKV2NWL6LJ8
Uma fase só, em tarefas ordenadas, uma branch e um PR por tarefa, com aprovação do responsável a cada PR.
Não depende da Fase 8 (conferência geral, que fica por último). O gerador de PDF no timbrado e o registro dos relatórios baixados nascem na tarefa 9.15 e a Fase 8 os reaproveita.

## Três partes
1. **Importação** do acervo existente: planilha (.xlsx ou CSV) e PDFs em zip. O GED do piloto não é conhecido, então o importador é genérico. Integração direta com um GED específico seria serviço externo novo e vira fase própria.
2. **TCE-CE**: importação noturna de licitações e contratos da API de Dados Abertos do SIM, fila de conferência, aviso de duplicado, configuração e histórico.
3. **Painel e relatórios**: painel com indicadores clicáveis e cinco relatórios em PDF e planilha.

## Modelo comum
Documento que entra sem endereço, por planilha ou pelo TCE, usa a mesma situação "pendente de localização", a mesma migração de base e a mesma fila. O filtro Origem (manual, planilha ou TCE) separa as origens. As telas "Localizar" e "Importados do TCE a conferir" leem o mesmo conjunto.

## Decisões do responsável
- Trazer a lista dos documentos e os PDFs. Entra antes do piloto.
- Painel é tela à parte (`/painel`); o "Início" atual não muda.
- Barra lateral dos quadros novos tem 11 ícones (Painel, Importados com contagem, Relatórios). Cada ícone só aparece quando a tela existe. A barra é atualizada uma vez só, em todas as telas.
- Relatórios: lista à esquerda, filtros e prévia da 1ª página à direita. Fila do TCE: lista + painel lateral.
- Quadros e seed com dados fictícios. Nunca dado real de prefeitura.

## Decisões das perguntas em aberto (respondidas em 2026-11-15)
1. **Espaço dos PDFs**: na venda, o responsável assina os planos pagos (Pro). Até lá, o sistema mede o espaço usado e avisa **só a equipe LicCONT** (painel da equipe) ao chegar perto do limite. A prefeitura não vê esse aviso. Nenhum plano pago sem aprovação do responsável.
2. **Duplicadas na importação**: aparecem na tela Conferir, marcadas como "pular". O administrador pode trocar para "importar" linha por linha. Nada é sobrescrito.
3. **Cobrança**: tudo entra na mensalidade. Nada é cobrado à parte, então não há módulo nem item escondido na barra por plano.
4. **Anos do TCE**: o administrador escolhe quais anos e o que importar (licitações, contratos ou ambos) na configuração. O que já foi importado não é trazido de novo. A atualização automática traz só registros novos ou alterados desde a última importação, nunca a base inteira.
5. **PDFs do PNCP**: entram nesta fase (tarefa 9.12). É serviço externo novo: registrar em `docs/decisoes/` e na LGPD antes do código. Os PDFs contam no espaço do item 1.
6. **Relatórios**: os cinco são inventário por secretaria, documentos sem endereço, empréstimos em atraso, descartes previstos no período e contratos por vigência.

## Regras
- Toda tabela nova com RLS, GRANT explícito e teste pgTAP de isolamento entre prefeituras. Campos novos em `prefeituras` (código do município, liga/desliga) e `documentos` (origem, lote, id no TCE, data da importação, situação). Tabelas: lotes de importação, importações do TCE, relatórios gerados.
- Entrada validada com Zod no servidor. Permissão checada no servidor (só administrador importa).
- Planilha: aceita .xlsx e CSV; recusa .xlsm e macros; até 5.000 linhas e 500 MB por envio. ZIP: bloquear caminhos com `..`, limitar tamanho descompactado e quantidade, só `.pdf`, checar o tipo real. Neutralizar `=`, `+`, `-`, `@` no início de células exportadas.
- Rotina do TCE no servidor (Supabase de São Paulo, `pg_cron`), chave de serviço nunca no navegador. A API só aceita IP do Brasil. Uma prefeitura por vez, pausa entre páginas, nova tentativa se o TCE cair. Formato inesperado: parar, avisar a equipe, não gravar pela metade.
- CPFs do TCE não são guardados (só nome e CNPJ). Nenhum dado pessoal em log ou mensagem de erro; o histórico mostra só números e datas. O TCE entra como fonte de dados em `docs/lgpd/` (não é suboperador); registrar em `docs/decisoes/`.
- Duplicado do TCE: apontar para Juntar ou Manter separado, nunca sobrescrever.
- Painel lê visões agregadas que respeitam o RLS. Meta: abrir em menos de 2 s com 100 mil documentos de teste.
- Tudo na auditoria: importar, desfazer, localizar, importar do TCE e cada relatório baixado.
- Modo demonstração: dados de `src/features/demo/`; gravações devolvem `AVISO_DEMO`.

## Quadros (`docs/telas/`, ver `telas.json`)
Importação: ImportarEnviar, ImportarMapear, ImportarPrevia, ImportarResultado, ImportarLocalizar.
TCE-CE: FilaTce, ConfigTce, PesquisaOrigem (selo "Importado do TCE" na lista e no painel do documento; filtro "Origem").
Painel e relatórios: Painel, Relatorios. Todos em escuro e claro.

## Tarefas
9.1 Migração base (lotes de importação, origem e situação "pendente de localização"), RLS e pgTAP.
9.2 Leitura e validação da planilha no servidor.
9.3 Telas Enviar arquivos e Casar colunas.
9.4 Tela Conferir, com relatório de erros em CSV.
9.5 Gravação do lote, ligação dos PDFs e auditoria.
9.6 Resultado, lista de lotes e Desfazer.
9.7 Fila Localizar documentos sem endereço.
9.8 Cliente da API do TCE com validação e testes com respostas fictícias.
9.9 Rotina agendada (só registros novos desde a última importação), Importar agora, histórico e configuração da integração (anos e tipos escolhidos pelo administrador).
9.10 Fila Importados do TCE a conferir, com aviso de duplicado e juntar.
9.11 Selo e filtro Origem na pesquisa.
9.12 Busca e ligação de PDFs no PNCP (quadros `PncpBuscaEscuro` e `PncpBuscaClaro`; registro em `docs/decisoes/` e na LGPD antes do código).
9.13 Visões agregadas do banco com teste de isolamento.
9.14 Painel inicial com cartões clicáveis e gráficos nos dois temas.
9.15 Relatórios: gerador de PDF no timbrado, registro dos baixados, cinco relatórios em PDF e planilha, prévia.
9.16 Revisão de segurança e teste de carga do painel.

## Sistema da equipe LicCONT (quadros `Equipe*`, ver `telas-novas.json`)
Área só da equipe LicCONT, com menu próprio (Início, Prefeituras, Demonstrações, Integrações, Uso, Auditoria). A equipe nunca vê o conteúdo do acervo: só quantidades, datas e situações. Vem depois do painel (9.14 a 9.16). Já existiam antes: Uso do mês (`/equipe/uso`), pedidos gravados pelo site (`pedidos_demonstracao`), suporte autorizado e o cliente do TCE.

Tarefas (um PR cada; cada uma parte da anterior):
- **9.17 Início da equipe e Prefeituras reformulada.** Início (`/equipe`): cartões, "Precisa de atenção", pedidos recentes, últimas ações. Prefeituras (`/equipe/prefeituras`): lista com Situação, TCE-CE e Docs e painel lateral (plano, contrato, uso, alerta do TCE, Importar agora). Migração: contrato em `prefeituras` (plano, início, valores), andamento do pedido (situação, data, responsável), `equipe_integracoes()` e `equipe_auditoria()`.
- **9.18 Nova prefeitura em passos e Prefeitura com abas.** Passos Órgão, Contrato e TCE-CE, Administrador, Conferir. Prefeitura com abas Resumo, Administradores, Integração TCE-CE, Uso, Auditoria; editar dados e contrato.
- **9.19 Integrações e Auditoria da equipe.** Integrações: TCE-CE por prefeitura e lotes de importação (só números e datas; CSV do histórico). Auditoria da equipe: filtros por período, quem, prefeitura e ação; exportar em PDF.
- **9.20 Demonstrações no menu da equipe.** Lista e detalhe dos pedidos do site (situação, data, responsável, descartar) e "Criar prefeitura a partir do pedido". Contato é dado pessoal: mínimo necessário, RLS só da equipe, nada em log. Registrar o pedido recebido na auditoria.

Tabelas e funções novas seguem a regra: RLS, GRANT explícito e pgTAP de isolamento. Quadros: EquipeInicio, EquipePrefeituras, EquipeNovaPrefeitura, EquipePrefeituraDetalhe, EquipeIntegracoes, EquipeAuditoria, EquipeDemos, EquipeUso (todos em escuro e claro).

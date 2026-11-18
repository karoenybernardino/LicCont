# Fase 9 — Importação, TCE-CE, painel e relatórios (antes do piloto)

Plano completo: "LicCONT — Integração TCE-CE e painel de relatórios" — https://claude.ai/artifact/XfUMpMFjH2HYKV2NWL6LJ8
Uma fase só, em tarefas ordenadas, uma branch e um PR por tarefa, com aprovação do responsável a cada PR.
Não depende da Fase 8 (conferência geral, que fica por último). O gerador de PDF no timbrado e o registro dos relatórios baixados nascem na tarefa 9.14 e a Fase 8 os reaproveita.

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

## Em aberto (perguntar antes de começar)
1. Espaço dos PDFs no plano gratuito do banco: medir e avisar antes de qualquer plano pago.
2. Duplicadas na importação: mostrar na conferência e escolher pular ou importar por linha (proposta).
3. Funções entram na mensalidade ou módulo à parte.
4. TCE: só dados novos ou também anos anteriores (até que ano).
5. Busca de PDFs no PNCP: agora tem quadro (PncpBusca), entra na tarefa 9.11. Confirmar se só administrador anexa.
6. Quais relatórios as prefeituras mais pedem (confirmar com o sócio).

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

## Quadros (`docs/telas/`, ver `telas-novas.json`)
Importação: ImportarEnviar, ImportarMapear, ImportarPrevia, ImportarResultado, ImportarLocalizar.
TCE-CE: FilaTce, ConfigTce, PncpBusca (Buscar PDF no PNCP: dados do documento, CNPJ/ano/número, arquivos encontrados com escolha, prévia e Anexar ao documento), PesquisaOrigem (selo "Importado do TCE" na lista e no painel do documento; filtro "Origem").
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
9.9 Rotina agendada, Importar agora, histórico e configuração da integração.
9.10 Fila Importados do TCE a conferir, com aviso de duplicado e juntar.
9.11 Buscar PDF no PNCP: botão na fila e no documento, consulta ao portal público, escolha dos arquivos e anexo ao documento (PNCP entra em docs/decisoes/ e docs/lgpd/ como fonte pública de dados).
9.12 Selo e filtro Origem na pesquisa.
9.13 Visões agregadas do banco com teste de isolamento.
9.14 Painel inicial com cartões clicáveis e gráficos nos dois temas.
9.15 Relatórios: gerador de PDF no timbrado, registro dos baixados, cinco relatórios em PDF e planilha, prévia.
9.16 Revisão de segurança e teste de carga do painel.

## Sistema da equipe LicCONT (quadros Equipe*, ver telas-novas.json)
Área só da equipe LicCONT, com menu próprio (Início, Prefeituras, Demonstrações, Integrações, Uso, Auditoria). A equipe nunca vê o conteúdo do acervo: só quantidades, datas e situações.
- Início: pendências, integrações com erro, pedidos novos, últimas ações.
- Prefeituras (reformulada): lista com Situação, TCE-CE e Docs, com painel lateral da prefeitura selecionada (plano, contrato, uso, alerta de TCE).
- Nova prefeitura (reformulada): passos Órgão, Contrato e TCE-CE, Administrador, Conferir. O quadro mostra o passo 2; os passos 1, 3 e 4 reaproveitam os campos do desenho antigo.
- Prefeitura (reformulada): abas Resumo, Administradores, Integração TCE-CE, Uso, Auditoria; o quadro mostra a aba Resumo.
- Pedidos de demonstração: recebe o formulário do site; situação, data, responsável, "Criar prefeitura a partir do pedido". Dados de contato são pessoais: mínimo necessário, RLS só para a equipe, nada em log.
- Integrações: TCE-CE e lotes de importação de todas as prefeituras, só números e datas.
- Auditoria da equipe: quem, quando, o quê e prefeitura; exportar em PDF.
Tabelas novas (pedidos de demonstração, auditoria da equipe) seguem a regra: RLS, GRANT explícito e pgTAP de isolamento. Tarefa sugerida: 9.17 a 9.20, depois do painel. Confirmar com o responsável antes de começar.

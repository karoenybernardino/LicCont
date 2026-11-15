# Registro das operações de tratamento (LGPD, art. 37)

Rascunho técnico da Fase 3. Não é parecer jurídico: base legal e prazos
precisam ser validados com o advogado antes do piloto.

| Operação | Finalidade | Dados | Base legal (a validar) | Quem acessa | Guarda |
| --- | --- | --- | --- | --- | --- |
| Cadastro de documento (licitação/contrato) | Arquivo morto e consulta da prefeitura | Número, objeto, empresa, CNPJ, valor, datas, caixa | Obrigação legal e execução de política pública (art. 7º, II e III; art. 23) | Servidores vinculados à secretaria; administrador | Até a eliminação pela tabela de temporalidade, com termo aprovado (Fase 7). "Desativar" não apaga; a eliminação desativa e mantém o registro e a auditoria |
| Guarda do PDF digitalizado | Preservar o original | O conteúdo do PDF: pode conter dados pessoais de terceiros (sócios, representantes, assinaturas, CPF em propostas) | Idem | Quem lê o documento; link assinado de 5 minutos | Idem |
| Conferência do PDF no servidor | Verificar formato e integridade (SHA-256) | O PDF passa pela função da Vercel (gru1), sem gravação | Idem | Servidor da aplicação | Não guarda; só o resultado |
| Auditoria | Rastrear quem criou, alterou, abriu e baixou | Id do usuário, ação, id do alvo; sem nome de arquivo nem texto do documento | Segurança e prestação de contas (art. 6º, X) | Administrador | Conforme política de logs |

Regras do sistema que protegem o titular:

- Texto lido do PDF por OCR (decisão 0011): guardado só em `arquivo_textos`, isolado por prefeitura e secretaria, fora da auditoria e de log; usado apenas na pesquisa.
- O campo "CNPJ ou CPF do credor" aceita CPF válido (credor pessoa física, decisão do responsável em 2026-11-15). O CPF vai para coluna própria (`cpf_credor`), fora da busca e fora da auditoria, não aparece em lista nem em log. Objeto e empresa continuam recusando CPF (a busca e a auditoria os repetiriam).
- Pessoa física como credor não é aceita nesta fase (decisão 12 de `docs/fases/fase-3.md`).
- Nenhum dado pessoal ou conteúdo de documento entra em log ou mensagem de erro.
- Nenhuma tabela tem DELETE para o usuário; a eliminação é só pelo termo aprovado (Fase 7), que desativa o documento sem apagá-lo.

Para validar com o advogado: base legal para guardar PDFs com dados de terceiros; prazo de
guarda contra o direito de eliminação (art. 16, I); valor legal da digitalização
(Decreto 10.278/2020); transferência internacional pela borda da Vercel.

## Pedido de demonstração (site público)

| Operação | Finalidade | Dados | Base legal (a validar) | Quem acessa | Guarda |
| --- | --- | --- | --- | --- | --- |
| Formulário "Pedir demonstração" | Responder ao interessado | Nome, cargo, órgão, e-mail, telefone, mensagem | Procedimentos preliminares a contrato, a pedido do titular (art. 7º, V) | Só a equipe LicCONT | 12 meses, apagado pela rotina diária de limpeza (prazo a validar com o advogado). O IP não é guardado, só o HMAC dele (limite de 5 por hora). Decisão 0013 |

## Fase 8: novas operações

| Operação | Finalidade | Dados | Base legal (a validar) | Quem acessa | Guarda |
| --- | --- | --- | --- | --- | --- |
| Aceite de política e termo | Prova do aceite | Id do usuário, prefeitura, documento, versão, data | Prestação de contas (art. 6º, X) | Próprio usuário; administrador da prefeitura | Enquanto a conta existir |
| Autorização de suporte | Registrar quando a equipe pode ajudar | Prefeitura, quem autorizou, motivo (texto livre, sem dado pessoal), início e fim | Execução do contrato | Administrador da prefeitura; equipe vê só "valendo até" | Como a auditoria |
| Exportação de dados | Devolução ao fim do contrato | CSVs e PDFs da própria prefeitura | Execução do contrato | Só o administrador que pediu | ZIP gerado em bucket privado `exportacoes`, link assinado de 5 minutos, apagado na próxima exportação ou pela rotina diária (volumes com mais de 2 horas); auditoria guarda só contagens |
| Números de uso | Operar o serviço | Contagens por prefeitura | Legítimo interesse (a validar) | Equipe com 2º fator | Calculado na hora |

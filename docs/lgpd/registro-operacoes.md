# Registro das operações de tratamento (LGPD, art. 37)

Rascunho técnico da Fase 3. Não é parecer jurídico: base legal e prazos
precisam ser validados com o advogado antes do piloto.

| Operação | Finalidade | Dados | Base legal (a validar) | Quem acessa | Guarda |
| --- | --- | --- | --- | --- | --- |
| Cadastro de documento (licitação/contrato) | Arquivo morto e consulta da prefeitura | Número, objeto, empresa, CNPJ, valor, datas, caixa | Obrigação legal e execução de política pública (art. 7º, II e III; art. 23) | Servidores vinculados à secretaria; administrador | Até a eliminação pela tabela de temporalidade (Fase 7). Hoje "desativar" não apaga |
| Guarda do PDF digitalizado | Preservar o original | O conteúdo do PDF: pode conter dados pessoais de terceiros (sócios, representantes, assinaturas, CPF em propostas) | Idem | Quem lê o documento; link assinado de 5 minutos | Idem |
| Conferência do PDF no servidor | Verificar formato e integridade (SHA-256) | O PDF passa pela função da Vercel (gru1), sem gravação | Idem | Servidor da aplicação | Não guarda; só o resultado |
| Auditoria | Rastrear quem criou, alterou, abriu e baixou | Id do usuário, ação, id do alvo; sem nome de arquivo nem texto do documento | Segurança e prestação de contas (art. 6º, X) | Administrador | Conforme política de logs |

Regras do sistema que protegem o titular:

- O campo CNPJ recusa CPF. Objeto e empresa também recusam CPF (a busca e a auditoria os repetiriam).
- Pessoa física como credor não é aceita nesta fase (decisão 12 de `docs/fases/fase-3.md`).
- Nenhum dado pessoal ou conteúdo de documento entra em log ou mensagem de erro.
- Nenhuma tabela tem DELETE para o usuário; a eliminação virá com a tabela de temporalidade.

Para validar com o advogado: base legal para guardar PDFs com dados de terceiros; prazo de
guarda contra o direito de eliminação (art. 16, I); valor legal da digitalização
(Decreto 10.278/2020); transferência internacional pela borda da Vercel.

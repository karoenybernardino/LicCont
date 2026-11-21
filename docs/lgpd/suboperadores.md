# Suboperadores

Empresas que tratam dados pessoais em nome do LicCONT (operador), que por
sua vez trata em nome da prefeitura (controladora). Toda entrada nova exige
uma decisão em `docs/decisoes/`.

Esta lista não substitui o registro formal das operações de tratamento,
que será feito antes do piloto com revisão jurídica.

| Fornecedor | Finalidade | Dados tratados | Região | Desde | Decisão |
| --- | --- | --- | --- | --- | --- |
| Supabase | Banco, autenticação e armazenamento de arquivos | Cadastro de servidores (nome, e-mail institucional, matrícula), registros do acervo, PDFs | Brasil (São Paulo, sa-east-1) | Fase 1 | 0003 |
| Vercel | Hospedagem e entrega do app | Dados em trânsito nas requisições; conteúdo dos PDFs em trânsito na conferência (lido e descartado, sem gravação); logs técnicos com IP e endereço acessado (sem dado pessoal gravado pelo app) | Funções em São Paulo (gru1); rede de borda global | Fase 1 | 0003 |
| E-mail transacional (Resend, **pronto e desligado**: só liga com a chave na Vercel) | Avisos por e-mail (recuperação de senha segue pelo Supabase) | E-mail institucional e texto curto do aviso | EUA (transferência a validar) | Fases 5 a 7 | 0010 |
| Sentry (plano gratuito; **só liga com o DSN na Vercel**) | Alerta de erro do app | Tipo e texto do erro já mascarados (sem CPF, e-mail, linha do banco), pilha de chamadas, navegador e sistema, caminho da página sem consulta. Sem dados de quem usa, IP, cookies, corpo ou conteúdo de documento | UE (Frankfurt) recomendada; transferência a validar | Fase 8 | 0014 |
| GitHub | Código-fonte e CI | Nenhum dado pessoal de prefeitura (só dados fictícios) | EUA | Fase 0 | 0003 |

## Fontes públicas de dados (não são suboperadores)

O LicCONT só **lê** destas fontes, e não envia a elas nenhum dado do acervo.
Decisão 0012.

| Fonte | Finalidade | O que o LicCONT envia | O que traz | Região |
| --- | --- | --- | --- | --- |
| API de Dados Abertos do TCE-CE (SIM) | Importar licitações e contratos da prefeitura | Código do município, ano e tipo | Dados públicos de processos e contratos; CPF descartado antes de gravar (só nome e CNPJ) | Brasil (só aceita IP brasileiro) |
| PNCP (Portal Nacional de Contratações Públicas) | Buscar PDFs públicos de uma compra | CNPJ do órgão, ano e número da compra | Arquivos públicos da compra | Brasil |

## Empresa parceira (operadora, sem serviço externo novo)

A empresa parceira que presta o serviço de arquivo à prefeitura (cadastrada em
`public.parceiras`) acessa o LicCONT pelo próprio sistema, com conta e senha
individuais. Como pode consultar documentos e abrir PDF das prefeituras
vinculadas, atua como **operadora** da prefeitura (controladora). Não há
serviço de terceiros novo: o acesso vai pelo mesmo Supabase e pela mesma
Vercel.

- O **dono** vê as prefeituras vinculadas à empresa; cada **funcionário**, só
  as que lhe foram alocadas. A regra vale no banco (RLS e funções `app.*`).
- Alocação, bloqueio e acesso ficam na auditoria (quem alocou, quando).
- A empresa lê números, caixas e documentos, nunca CPF ou e-mail de servidores.
- Pendência: prever cláusula de operador no contrato com a prefeitura e validar
  com o advogado antes do piloto.

## Pendências

- Transferência internacional: a rede de borda da Vercel passa por fora do
  Brasil. Base legal e cláusulas a validar com o advogado antes do piloto.
- GitHub fica nos EUA, mas não recebe dado pessoal de prefeitura.

## Ferramentas sem acesso a dado pessoal

Semgrep e Gitleaks (CLIs abertas, rodam no GitHub Actions).

UptimeRobot (plano gratuito): chama `/api/saude` e recebe só `ok`/`falha`. Decisão 0014.

Have I Been Pwned (API de senhas, gratuita): o servidor envia só os 5
primeiros caracteres do SHA-1 da senha nova (k-anonimato), nunca a senha
nem o e-mail. Decisão 0006.

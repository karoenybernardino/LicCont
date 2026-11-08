# Suboperadores

Empresas que tratam dados pessoais em nome do LicCONT (operador), que por
sua vez trata em nome da prefeitura (controladora). Toda entrada nova exige
uma decisão em `docs/decisoes/`.

Esta lista não substitui o registro formal das operações de tratamento,
que será feito antes do piloto com revisão jurídica.

| Fornecedor | Finalidade | Dados tratados | Região | Desde | Decisão |
| --- | --- | --- | --- | --- | --- |
| Supabase | Banco, autenticação e armazenamento de arquivos | Cadastro de servidores (nome, e-mail institucional, matrícula), registros do acervo, PDFs | Brasil (São Paulo, sa-east-1) | Fase 1 | 0003 |
| Vercel | Hospedagem e entrega do app | Dados em trânsito nas requisições; logs técnicos sem dado pessoal | Global (borda) | Fase 1 | 0003 |
| GitHub | Código-fonte e CI | Nenhum dado pessoal de prefeitura (só dados fictícios) | EUA | Fase 0 | 0003 |

## Ferramentas sem acesso a dado pessoal

Semgrep e Gitleaks (CLIs abertas, rodam no GitHub Actions).

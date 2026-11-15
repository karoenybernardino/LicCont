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
| GitHub | Código-fonte e CI | Nenhum dado pessoal de prefeitura (só dados fictícios) | EUA | Fase 0 | 0003 |

## Pendências

- Transferência internacional: a rede de borda da Vercel passa por fora do
  Brasil. Base legal e cláusulas a validar com o advogado antes do piloto.
- GitHub fica nos EUA, mas não recebe dado pessoal de prefeitura.

## Ferramentas sem acesso a dado pessoal

Semgrep e Gitleaks (CLIs abertas, rodam no GitHub Actions).

Have I Been Pwned (API de senhas, gratuita): o servidor envia só os 5
primeiros caracteres do SHA-1 da senha nova (k-anonimato), nunca a senha
nem o e-mail. Decisão 0006.

# Site inicial — página pública de apresentação

Quadros: `SiteInicialEscuro` e `SiteInicialClaro` (`docs/telas/`, ver `telas.json`).
Uma branch e um PR. Rodar `npm run telas:comparar -- SiteInicialEscuro SiteInicialClaro` antes do PR.

## O que entra
- Rota `/` para visitante sem login. Quem já está logado continua indo direto ao sistema.
- Formulário "Pedir demonstração", validado com Zod no servidor. Sem serviço de e-mail por enquanto (serviço novo exige registro em `docs/decisoes/` e `docs/lgpd/suboperadores.md`). Em demonstração, o envio devolve `AVISO_DEMO`.
- Contatos (WhatsApp, e-mail) em variáveis `NEXT_PUBLIC_*`, com "a definir" enquanto não houver valor.
- Links para `/privacidade` e `/termos`.

## O que não entra
- Preço.
- Números inventados (quantidade de prefeituras, documentos etc.).
- A frase "Dados guardados no Brasil" só entra se for verdade e depois de validada com o advogado.

## Regras
- Nenhum dado pessoal do formulário em log ou mensagem de erro.
- Se o formulário gravar no banco: tabela nova com RLS, GRANT explícito e teste pgTAP (regra 1 do `CLAUDE.md`), registrado antes como decisão.

## Em aberto
1. Número de WhatsApp.
2. E-mail de contato.
3. Domínio do site.

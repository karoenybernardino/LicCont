# Parceira com o acervo completo

Pedido do responsável (2026-11-21): a empresa parceira é a porta de entrada nas prefeituras e
cadastra o acervo como a prefeitura. Não basta o resumo: ela precisa do **mapa 3D completo**,
da aba **Cadastrar** (documento e caixa, com etiqueta geral e detalhada) e das **Etiquetas** com
PDF, iguais às da prefeitura.

## Desenho

- A pessoa da empresa **atua em uma prefeitura por vez** (as permitidas pelo dono/alocação).
  Tabela `parceira_contexto` (pessoa -> prefeitura atual), gravada só por `parceira_atuar(p_prefeitura)`,
  que confere `app.prefeituras_permitidas()` e o segundo fator.
- `app.prefeitura_atual()` passa a devolver também a prefeitura do contexto da pessoa da empresa.
  Assim as políticas de RLS existentes valem sem cópia. Isolamento continua por `prefeitura_id`.
- A empresa **opera** (documentos, arquivos, caixas, mover, imprimir etiqueta, pesquisar).
  **Não administra**: `app.eh_admin()` segue falso (sem usuários, secretarias, estrutura, temporalidade, TCE).
- No app, `usuarioAtual()` devolve um usuário sintético com `parceira: true` quando há contexto;
  telas e ações existentes (mapa, cadastrar documento, cadastrar caixa, etiquetas) são reaproveitadas
  dentro da moldura da parceira (`PaginaParceira`), sem cópia de componentes.
- Seletor de prefeitura da parceira grava cookie assinado de escolha e chama `parceira_atuar`.
  Limite conhecido: duas abas em prefeituras diferentes ao mesmo tempo; o nome da prefeitura fica
  sempre visível no topo e o contexto é regravado a cada requisição.
- Demonstração (`LICCONT_DEMO=1`): perfis `parceira_*` usam as mesmas telas com dados fictícios.

## Passos

1. Banco: tabela, RPC, `prefeitura_atual`, `secretarias_permitidas`, `pode_cadastrar`, políticas de
   caixas/etiquetas para a parceira; pgTAP de isolamento.
2. App: usuário sintético, seletor/cookie, menu (Painel, Pesquisa, Mapa 3D, Cadastrar, Etiquetas, Equipe).
3. Telas: `/parceira/mapa`, `/parceira/cadastrar` (documento e caixa), `/parceira/etiquetas` com o conteúdo completo.
4. Prévia da etiqueta no cadastro de documento: brasão, número da caixa por órgão, rodapé da parceira.
5. Testes (Vitest, Playwright demo) e PR.

## Correções do responsável (2026-11-21)

- A empresa **também** mexe em estrutura física (galpões, ruas, módulos, planta) e em temporalidade.
  Fica fora dela só: usuários, vínculos e secretarias (competência da equipe LicCONT).
  `app.eh_admin()` não muda; nova `app.pode_administrar_acervo()` cobre estrutura, caixas e temporalidade.
- A etiqueta leva o **brasão do órgão**: órgão Câmara = brasão da Câmara; Prefeitura = brasão da prefeitura.

# Fase 4 — Mapa

Status: **plano, aguardando aprovação do responsável** (2026-11-14).
Nenhum código antes da aprovação das perguntas do fim. O plano foi escrito
com o Opus; o código será escrito com o Sonnet, a partir deste texto.

Segue `docs/plano-de-desenvolvimento.md`:

- Linha da Fase 4: "Mapa 3D, planta baixa, painel 'Dentro da caixa', ir até
  a caixa". Pronta quando "clicar numa caixa mostra os documentos reais
  dela".
- Tabela de tecnologia: "Mapa 3D — SVG gerado dos dados (como no
  protótipo) — leve, funciona em computador fraco e no celular".
- Testes ponta a ponta: o mapa entra no Playwright.

Telas de referência: canvas "LicCONT — Telas do sistema", quadros **Mapa 3D**
(claro e escuro), **Mapa — planta baixa** (claro e escuro) e **Detalhe da rua
do galpão** (claro e escuro, que mostra os botões Frente | Planta | 3D e o
"Voltar ao mapa"). Onde este texto e o canvas divergirem, vale o que for
aprovado aqui.

## Por quê

Depois da Fase 3 o LicCONT sabe o que tem em cada caixa e acha qualquer
documento em menos de um segundo. Mas a pessoa ainda lê
"B-M3-N3-C02" e precisa saber, de cabeça, onde fica a Rua B no galpão. O
mapa resolve o último metro:

1. **Ver o galpão** como ele é: ruas, estantes, níveis e caixas, em
   perspectiva (3D) ou vista de cima (planta baixa).
2. **Ir até a caixa** a partir de um documento, de uma pesquisa ou do código
   digitado: o mapa aproxima, destaca a caixa em laranja e diz o endereço.
3. **Ver o que tem dentro**: clicar numa caixa abre o painel "Dentro da
   caixa" com os documentos reais dela, lidos com o RLS de quem consulta.

As etiquetas com QR (Fase 5) e os empréstimos (Fase 6) usam o mapa: o QR
abre a caixa, e o documento emprestado aparece como tal no mapa.

## Pronto quando

1. **Clicar numa caixa mostra os documentos reais dela** (critério do plano
   geral), no claro e no escuro, no computador e no celular:
   - o painel mostra o endereço ("Rua B · Módulo 3" / "Nível 3 · Caixa 02"),
     o total de documentos da caixa e a lista dos documentos que a pessoa
     pode ler;
   - cada documento da lista abre `/documentos/[id]`;
   - a lista é a mesma que a pesquisa devolveria para aquela caixa (mesmo
     RLS, mesmos documentos ativos).
2. **Ir até a caixa**, pelos quatro caminhos:
   - "Ir para o mapa 3D" no painel do documento e na tela do documento;
   - "Ver no mapa 3D" na pesquisa (pergunta 6);
   - a busca do mapa ("Ir para caixa, rua ou documento") aceita o código
     (`B-M3-N3-C02`, `b m3 n3 c2`), a rua (`B`) ou o número do processo;
   - o link `/mapa?caixa=<id>` (o mesmo que o QR da Fase 5 vai usar).

   Em todos, o mapa aproxima a caixa, destaca em laranja, mostra o rótulo
   "CAIXA SELECIONADA" e abre o painel. "Voltar ao documento" aparece só
   quando se chegou por um documento.
3. **Isolamento (Playwright e pgTAP).**
   - Usuário de outra prefeitura que abre `/mapa?caixa=<id de outra
     prefeitura>` vê o mapa da própria prefeitura e o aviso "Caixa não
     encontrada", igual ao de um id que não existe (sem oráculo).
   - O operador de Obras, na caixa que guarda documentos de Obras e da
     Saúde, vê só os de Obras na lista. O total mostra os dois (só o número,
     decisão 11 da Fase 3) e a frase da pergunta 3 explica a diferença.
   - Consulta abre o mapa e o painel, mas não vê nenhum botão que grava.
   - Equipe LicCONT não abre `/mapa` (como as outras telas da prefeitura).
   - O pgTAP da Fase 3 já cobre `ocupacao_caixas` com caixa de outra
     prefeitura (`documentos_isolamento.test.sql`). Esta fase **não cria
     tabela, visão nem função**, então não há teste de isolamento novo no
     banco (ver "Modelo de dados"). Se a implementação precisar de um
     objeto novo no banco, o teste pgTAP de isolamento vem junto, antes do
     código (regra fixa 1).
4. **Desempenho**, com um galpão grande gerado no teste (8 ruas × 20
   módulos × 6 níveis × 16 caixas = **15.360 caixas**):
   - Vitest: a geometria do galpão inteiro é calculada em menos de 150 ms
     no Node do CI;
   - Vitest: a caixa sob o ponteiro (clique) é achada em menos de 1 ms;
   - Playwright, na demonstração com o galpão grande (pergunta 10): a tela
     abre e fica pronta para clique em menos de 3 s, e o número de
     elementos do SVG fica abaixo de 5.000 (ver "Desempenho");
   - leitura do banco: o galpão grande é lido em no máximo 17 pedidos à
     Data API (páginas de 1.000 caixas), e a caixa selecionada em 2
     pedidos (total e lista). A medição com `EXPLAIN ANALYZE` vai no PR.
5. **Acessibilidade (Playwright com axe):**
   - o axe não aponta falha em `/mapa` (3D e planta), no claro e no escuro;
   - tudo o que o mouse faz, o teclado faz (ver "Acessibilidade"): achar
     uma caixa pela lista em texto, selecioná-la, ouvir o anúncio, abrir o
     documento, aproximar e afastar;
   - com `prefers-reduced-motion`, "ir até a caixa" pula direto, sem
     animação.
6. **Vitest:**
   - geometria isométrica (posição de cada caixa, ordem de desenho de trás
     para frente, caixa sob o ponteiro, enquadrar uma caixa);
   - leitura do código digitado (`B-M3-N3-C02`, minúsculas, sem zeros,
     com espaços; código inexistente devolve "não encontrado");
   - montagem da URL do mapa e o caminho de volta (`caixa`, `doc`,
     `vista`, `galpao`);
   - a demonstração: toda caixa com documento fictício existe no galpão
     fictício.
7. **Playwright** (`tests/e2e/mapa.spec.ts`), na prévia com banco do CI:
   - o operador abre o mapa, clica numa caixa e vê os documentos dela;
   - abre um documento da lista e volta ao mapa com a caixa ainda
     selecionada;
   - da pesquisa, "Ver no mapa 3D" leva à caixa; do painel do documento,
     "Ir para o mapa 3D" também, com "Voltar ao documento";
   - troca Perspectiva ↔ Planta e a seleção continua;
   - no celular (375 px), arrasta, aproxima com os botões e abre o painel.

   A demonstração é conferida na prévia, porque o CI roda com banco.
8. Nenhuma migração nesta fase. Os checks atuais seguem verdes.

## Fora do escopo

- **Editor da planta do galpão** (desenhar paredes, portas, ruas em L ou em
  posição livre): o desenho é gerado da estrutura (pergunta 2).
- **Mover documentos em lote** de uma caixa para outra, que a Fase 3
  deixou "para a Fase 4": vira tarefa própria depois desta fase
  (pergunta 8). Mover um documento continua sendo editar e trocar a caixa.
- **Situação "Emprestado"** na caixa e no documento, legenda "Tem documento
  emprestado" e "Registrar empréstimo": Fase 6.
- **Etiqueta com QR, "Imprimir etiqueta"** e a tela "Caixa lida pelo
  celular": Fase 5. O link `/mapa?caixa=<id>` já fica pronto para o QR.
- **Ocupação em documentos no 3D** (cor por caixa cheia): o canvas pinta
  caixa guardada x posição livre, não caixa cheia (pergunta 5).
- **Mapa e planta em PNG de 600 dpi** (Decreto 10.278, plano geral) e
  impressão do mapa.
- **Vários andares** ou mezanino: um galpão é um piso.
- **Caixa fora de estante** (no chão, em trânsito): não existe no modelo.

## Fracasso mesmo funcionando

- Uma caixa, rua ou documento de outra prefeitura aparecendo no mapa, na
  busca do mapa ou no painel; ou um aviso diferente para "caixa de outra
  prefeitura" e "caixa que não existe".
- Título, empresa ou secretaria de um documento sem vínculo aparecendo no
  painel (só o total pode aparecer).
- O mapa travando ou demorando num galpão de verdade (milhares de caixas)
  num computador fraco de prefeitura, ou não abrindo num navegador sem
  WebGL.
- O mapa como única forma de achar a caixa: quem usa teclado ou leitor de
  tela fica sem caminho.
- A caixa destacada só pela cor (daltônico não vê).
- O desenho não batendo com o galpão: Rua B desenhada à esquerda da Rua A,
  módulos fora de ordem, caixa desativada aparecendo.
- O tema escuro com caixas invisíveis ou contraste baixo.
- Chave privilegiada ou `service_role` sendo usada para montar o mapa.
- Biblioteca ou serviço novo sem registro.

## Decisão: como desenhar o mapa

Só planos gratuitos e nenhum serviço externo. As três opções avaliadas são
gratuitas e de código aberto; nenhuma envia dado a terceiros.

| Opção | Peso no navegador | Computador fraco e celular | Acessibilidade e tema | Veredito |
| --- | --- | --- | --- | --- |
| **three.js + react-three-fiber** (WebGL, MIT) | ~150 KB (three, comprimido) + ~40 KB (r3f e drei) | Precisa de WebGL. Falha em máquina virtual, acesso remoto e placa antiga, comuns em prefeitura. Bateria e calor no celular. | O desenho vira pixels num `<canvas>`: o leitor de tela não vê nada, o tema escuro exige trocar materiais à mão, o axe não confere. | **Não.** É câmera livre e luz de verdade, que o canvas não pede. |
| **CSS 3D** (`transform: rotateX`, `preserve-3d`) | zero | Um `<div>` por face: 15 mil caixas = 45 mil elementos. Trava. | Bom (HTML), mas a ordem de desenho em CSS 3D falha entre navegadores. | **Não.** |
| **SVG isométrico gerado dos dados** (sem biblioteca) | zero (código próprio, alguns KB) | Roda em qualquer navegador desde 2015, sem WebGL. Arrastar e aproximar mudam só um `transform`. | Cores por classes do Tailwind (claro e escuro, como `vista-frente.tsx`). Texto alternativo e lista em HTML ao lado. | **Sim.** É como o canvas foi feito e o que o plano geral decidiu. |

Detalhes da opção escolhida:

- **Projeção isométrica fixa**, a do canvas (eixos a 30°, sem câmera
  girando). Girar a vista não está no canvas e fica fora (pergunta 4).
- **Nenhuma dependência nova.** Arrastar, roda do mouse, botões + e −,
  "Centralizar" e pinça no celular são feitos com Pointer Events, como no
  script do canvas. Não há decisão nova em `docs/decisoes/` nem
  suboperador novo em `docs/lgpd/suboperadores.md`, porque nada externo
  entra. Se a implementação concluir que precisa de uma biblioteca, para e
  pergunta (registro pela decisão 0007).
- **CSP sem mudança**: SVG em linha, sem `eval`, sem imagem externa.

## Modelo de dados

**Nenhuma tabela, coluna, visão ou função nova.** O mapa só lê, pela sessão
da pessoa (`clienteSessao`), o que já existe com RLS:

| O quê | De onde | Quem vê |
| --- | --- | --- |
| Galpões, ruas, módulos, níveis | `galpoes`, `ruas`, `modulos`, `estrutura_ocupacao` (já lidos por `carregarEstrutura()` em `src/features/estrutura/dados.ts`) | todos da prefeitura (RLS da Fase 2) |
| Caixas do galpão (id, nível, número) | `caixas`, filtrada pelo galpão com junção `niveis!inner(modulos!inner(ruas!inner(galpao_id)))`, só as ativas, em páginas de 1.000 (a função `todas()` que já existe) | todos da prefeitura |
| Total de documentos da caixa selecionada | `public.ocupacao_caixas([caixa_id])` (security definer, só o número, de todas as secretarias) | todos da prefeitura |
| Documentos da caixa selecionada | `documentos` com `caixa_id = X` e `ativo`, pelo RLS (`app.secretarias_permitidas()`); índice `documentos_caixa_idx` já existe | só as secretarias permitidas |
| Ir até um documento pelo número | `public.pesquisar_documentos(p_busca, p_limite := 5)`, que já devolve o `codigo` da caixa | só as secretarias permitidas |

Regras:

- Nada com `service_role` nem `clienteServico`. Nada no navegador além do
  que a pessoa já pode ler.
- O id da caixa na URL é conferido no servidor: se não estiver entre as
  caixas lidas pelo RLS, a tela mostra "Caixa não encontrada" e o mapa do
  galpão padrão. Não importa se a caixa é de outra prefeitura ou não
  existe: a mensagem é a mesma.
- A lista "Dentro da caixa" lê até 200 documentos por caixa, ordenados por
  ano e título. Caixa com mais de 200 (raro: a capacidade padrão é 50)
  mostra "Ver todos na pesquisa", que abre a pesquisa filtrada por aquele
  código.
- Documentos lidos para o painel não ficam no HTML do mapa: são buscados
  só quando a caixa é escolhida, por uma Server Action de leitura
  (`documentosDaCaixa`, com Zod no id) ou por um componente de servidor
  sob `?caixa=`. O desenho do galpão leva só ids, códigos e números.
- Se a medição do critério 4 mostrar que a junção das caixas passa de 1 s
  num galpão grande, a saída é uma visão `security_invoker`
  `estrutura_caixas` com `galpao_id`, com GRANT só a `authenticated` e
  teste pgTAP de isolamento antes do código. Isso é decidido no PR, com a
  medição, e avisado ao responsável.

## Desempenho com milhares de caixas

Um galpão de prefeitura média tem de 2 mil a 15 mil caixas. Desenhar cada
caixa com 3 polígonos, como o protótipo do canvas (2.486 polígonos para
cerca de 320 caixas), daria até 45 mil elementos: trava o navegador.

1. **Geometria pura** em `src/features/mapa/geometria.ts` (sem React, sem
   DOM): da estrutura sai a posição de cada estante, nível e caixa no plano
   isométrico, e a ordem de desenho de trás para frente (rua, módulo,
   nível, caixa). É testada no Vitest com o galpão grande.
2. **Um `<g>` por nível**, na ordem de trás para frente. Dentro do nível,
   as caixas entram como subcaminhos de **3 `<path>`** (topo, frente e
   lado), e não um elemento por caixa. Com 6 níveis × 160 módulos são
   cerca de 3 mil elementos, e não 45 mil.
3. **Clique sem um elemento por caixa**: o ponto clicado volta para o plano
   do galpão (projeção inversa) e a geometria diz qual caixa está ali,
   respeitando a ordem de desenho. A caixa selecionada é desenhada por
   cima, num elemento próprio (laranja, contorno e brilho, como no canvas).
4. **Nível de detalhe**: com o galpão inteiro na tela e mais de 4 mil
   caixas, cada nível vira **um bloco só** (uma barra do comprimento das
   caixas ocupadas). As caixas uma a uma aparecem quando a pessoa aproxima
   (escala ≥ 1,6) ou vai até uma caixa. A troca acontece ao soltar o zoom,
   não a cada quadro.
5. **Arrastar e aproximar** mudam só o `transform` do grupo do mundo,
   dentro de `requestAnimationFrame`. O React não redesenha o galpão
   durante o gesto.
6. **Leitura**: a estrutura é lida uma vez no servidor (componente de
   servidor) e vai para o componente do mapa como dados compactos
   (`[nivelId, numero]` por caixa). Os documentos só são lidos ao escolher
   a caixa.

Se o galpão grande passar de 3 s para abrir no Playwright, a próxima saída
é desenhar o galpão num `<canvas>` 2D (também sem biblioteca), com a lista
em texto como alternativa acessível. Isso só entra com a aprovação do
responsável, porque perde o desenho em SVG que o axe confere.

## Acessibilidade (alternativa ao 3D)

O mapa é um desenho. Ninguém depende só dele:

- **Lista das caixas** ao lado do mapa (no celular, abaixo), em HTML: Rua →
  Módulo → Nível → Caixa, como árvore com `<details>`/`<summary>` e botões.
  Escolher na lista é o mesmo que clicar no mapa: seleciona, aproxima e
  abre o painel. É também o caminho do leitor de tela. Pergunta 7 decide se
  a lista fica aberta ou atrás de um botão "Ver em lista".
- **Busca do mapa** ("Ir para caixa, rua ou documento"), com `<label>`
  visível para leitor de tela, Enter vai até o resultado.
- **Teclado no desenho**: o SVG recebe foco (`tabindex="0"`) e tem
  instruções em `aria-describedby`. Setas ← → mudam de caixa no nível,
  ↑ ↓ mudam de nível, Page Up/Down mudam de módulo, Enter abre o painel,
  `+` e `-` aproximam e afastam, `0` centraliza. Os botões +, −,
  "Centralizar" e "Perspectiva | Planta" são `<button>` com nome.
- **Anúncio**: a seleção é anunciada numa região `aria-live="polite"`
  ("Rua B, módulo 3, nível 3, caixa 2. 14 documentos.").
- **Não só pela cor**: a caixa selecionada é laranja **e** tem contorno,
  brilho e o rótulo "CAIXA SELECIONADA" com o código. A legenda do canvas
  (Caixa selecionada, Caixa-arquivo guardada, Estante de aço, Faixa de
  segurança) fica embaixo do desenho, com texto.
- **Contraste** de 4,5:1 nos textos e 3:1 nas formas, conferido nos dois
  temas.
- **Movimento**: com `prefers-reduced-motion`, o "ir até" pula sem
  animação.
- O SVG tem `role="img"` e `aria-label` com o resumo ("Galpão Central: 4
  ruas, 20 módulos, 1.046 caixas"); as formas internas são `aria-hidden`.

## Telas

O código fica em `src/features/mapa/`:

- `geometria.ts` (pura, testada): posições, ordem, caixa sob o ponteiro,
  enquadrar, nível de detalhe;
- `codigo.ts` (puro, testado): ler o código digitado e achar a caixa;
- `url.ts` (puro, testado): `?galpao=&caixa=&doc=&vista=`;
- `dados.ts` (só no servidor), com o ramo da demonstração:
  `caixasDoGalpao`, `documentosDaCaixa`, `caixaPorId`;
- `mapa-3d.tsx` e `planta.tsx` (componentes do navegador, só desenho e
  gestos);
- `painel-caixa.tsx` ("Caixa selecionada" e "Dentro da caixa");
- `lista-caixas.tsx` (a alternativa em texto).

Reutiliza `carregarEstrutura()`, `codigoPosicao`, `Painel`,
`TituloPainel`, `Rotulo`, `tituloDocumento` e o `ocupacao_caixas` que o
cadastro já usa. O menu "Mapa 3D" da barra lateral
(`src/features/sessao/pagina.tsx`) ganha o link `/mapa` e deixa de estar
"em breve". Todas as telas seguem o canvas, no claro e no escuro, com as
fontes e cores da marca (`src/ui/`, `docs/marca/`).

- **Mapa 3D** (`/mapa`, todos os perfis da prefeitura). Trilha "Acervo ·
  Localização", título "Mapa 3D do galpão". Como no quadro do canvas:
  - no cabeçalho, a busca "Ir para caixa, rua ou documento" e "Voltar ao
    documento" (só com `?doc=`); seletor de galpão quando houver mais de um;
  - à esquerda, o desenho: "Dica: Arraste para andar · roda do mouse para
    zoom · clique numa caixa", botões +, − e "Centralizar", o chão com a
    faixa de segurança, "ENTRADA", as ruas (A, B, C, D) e os módulos
    (M1…M5) com rótulos, o rótulo flutuante "CAIXA SELECIONADA", e a
    legenda;
  - à direita (330 px), **"Caixa selecionada"**: quadrado laranja, endereço
    em fonte mono em duas linhas, selo "N documentos". O selo "Disponível"
    do canvas fica para a Fase 6 (é do empréstimo);
  - abaixo, **"Dentro da caixa"**: "N documentos" e a lista com rolagem
    (título do documento, "empresa · secretaria · ano"). Cada item é um
    link para o documento;
  - sem caixa escolhida, o painel diz "Clique numa caixa ou use a busca
    para ver o que tem dentro".
- **Planta baixa** (`/mapa?vista=planta`). Trilha "Acervo · Localização",
  título "Mapa — planta baixa". Como no quadro do canvas:
  - "Planta baixa · Galpão — visão de cima" e o botão "Perspectiva |
    Planta" (o mesmo no 3D);
  - ruas como faixas com "Corredor" entre elas, módulos como retângulos,
    "ENTRADA DO GALPÃO", a caixa escolhida marcada com o código (C02);
  - legenda: Módulo com caixas, Posição livre, Caixa selecionada;
  - à direita, o mesmo painel da caixa ("documentos guardados nesta
    caixa"). "Registrar empréstimo" e "Imprimir etiqueta" do canvas ficam
    para as Fases 6 e 5;
  - clicar num módulo aproxima o módulo e mostra as posições dele; clicar
    numa posição seleciona a caixa.
- **Detalhe da rua** (`/estrutura/rua/[id]`, da Fase 2). Ganha o que o
  quadro do canvas mostra e ainda falta: trilha "Mapa do galpão › Rua B",
  "Voltar ao mapa" e os botões "Frente | Planta | 3D" (Frente é a vista
  atual; Planta e 3D abrem o mapa já na rua). Clicar numa caixa da vista
  de frente abre o mesmo painel "Dentro da caixa".
- **Atalhos para o mapa** (os botões que a Fase 3 deixou escondidos):
  - painel do documento e `/documentos/[id]`: "Ir para o mapa 3D" →
    `/mapa?caixa=<caixa>&doc=<id>`;
  - pesquisa: "Ver no mapa 3D" (pergunta 6);
  - estrutura física: a nota "O mapa 3D e as etiquetas são gerados a partir
    desta estrutura" ganha o link para o mapa.

### Celular

O canvas não tem quadro do mapa no celular; vale a regra das outras telas:

- abaixo de 768 px, as colunas empilham: busca, desenho (largura inteira,
  altura de 60% da tela), painel da caixa, lista das caixas;
- arrastar com um dedo, pinça para aproximar, toque seleciona; os botões
  +, − e "Centralizar" ficam com 44 px;
- `touch-action: none` só no desenho, para a página continuar rolando fora
  dele;
- ao selecionar, a página rola até o painel "Dentro da caixa";
- a vista inicial no celular está na pergunta 9.

### Tema claro e escuro

- Cores dos quadros "Mapa 3D — claro/escuro" e "Mapa — planta baixa —
  claro/escuro" viram classes (`fill-…`, `dark:fill-…`) ou variáveis em
  `src/ui/`, como `vista-frente.tsx` já faz. Nada de cor fixa no código do
  desenho.
- O laranja da seleção (`#ff9f1c`) é o mesmo nos dois temas; o contorno
  muda para manter 3:1 sobre o fundo.
- O seletor de tema da moldura troca o mapa sem recarregar.

### Demonstração (`LICCONT_DEMO=1`)

- Usa o galpão fictício da Fase 2 (`ESTRUTURA_DEMO`, ruas A a D, 5 módulos,
  4 níveis) e os documentos fictícios da Fase 3 (`DOCUMENTOS_DEMO`, nas
  caixas de `idCaixaDemo`).
- `caixasDoGalpao`, `documentosDaCaixa` e `caixaPorId` têm o ramo
  `emDemo()`, sem banco.
- A caixa do canvas, **Rua B · Módulo 3 · Nível 3 · Caixa 02**, existe na
  demonstração com 14 documentos e vem selecionada no primeiro acesso
  (`/mapa` sem `?caixa=`), como no canvas.
- A troca de perfil pela faixa amarela mostra a diferença do total ×
  lista: como Operador de uma secretaria, a lista da caixa do canvas mostra
  parte dos 14; como Administrador, todos.
- Galpão grande para o teste de desempenho: ver pergunta 10.
- O mapa não grava nada, então não há `AVISO_DEMO` nesta fase.

## Segurança e LGPD

- **Nenhuma chave privilegiada.** Tudo pela sessão da pessoa, com RLS.
  `service_role` não é usada em nenhum ponto do mapa.
- **Nenhum dado pessoal novo.** O mapa mostra endereço de caixa, número do
  processo, empresa (razão social, CNPJ não aparece no painel), secretaria
  e ano. Nada de CPF, e-mail ou nome de usuário.
- **Total x lista**: o total da caixa conta todas as secretarias (só o
  número). A lista mostra só as permitidas. É o que a Fase 3 aprovou
  (pergunta 11). A frase da pergunta 3 não diz de quais secretarias são os
  outros.
- **Sem oráculo**: caixa de outra prefeitura e caixa inexistente dão a
  mesma resposta ("Caixa não encontrada"), com o mesmo tempo de resposta
  aproximado (a mesma consulta nos dois casos).
- **Entrada validada**: `?caixa=`, `?doc=` e `?galpao=` passam por Zod
  (uuid) no servidor; `vista` só aceita `3d` ou `planta`. A busca do mapa é
  texto livre até 60 caracteres, tratado como no `pesquisar_documentos`.
- **Sem logs com conteúdo**: nenhum `console` com código de caixa, título
  ou empresa. Erros com mensagem fixa ("Não foi possível abrir o mapa.").
- **Nenhum serviço externo novo.** Sem mapa de terceiros, sem biblioteca
  3D, sem fonte nova.
- Revisão pelo `auditor-seguranca` e pelo `conformidade-lgpd` (por causa do
  total × lista).

## Entregas e ordem

Uma branch por tarefa (regra do projeto). A pergunta 1 decide se viram um
PR só, como na Fase 3.

| # | Branch | Entrega | Como provar |
| --- | --- | --- | --- |
| 1 | `fase-4/geometria` | `geometria.ts`, `codigo.ts`, `url.ts`, gerador do galpão grande para teste | Vitest dos critérios 4 e 6 (geometria, código, URL, desempenho da geometria) |
| 2 | `fase-4/mapa-3d` | `/mapa` com o desenho 3D, gestos, nível de detalhe, painel "Caixa selecionada" e "Dentro da caixa", lista das caixas, teclado, menu "Mapa 3D", demonstração | Playwright: clicar mostra os documentos; isolamento (critério 3); teclado; axe claro e escuro |
| 3 | `fase-4/ir-ate-a-caixa` | Busca do mapa, `?caixa=`/`?doc=`, "Voltar ao documento", "Ir para o mapa 3D" no documento, "Ver no mapa 3D" na pesquisa, link na estrutura | Playwright: os quatro caminhos do critério 2 |
| 4 | `fase-4/planta-celular` | Planta baixa, "Perspectiva | Planta", botões "Frente | Planta | 3D" na rua, celular (pinça, empilhar), medição de desempenho com o galpão grande | Playwright: troca de vista mantém a seleção; celular 375 px; tempo de abertura do critério 4 |

Cada tarefa:

- o teste que falha vem primeiro (Vitest ou Playwright);
- passa pela revisão do `revisor-codigo` e do `auditor-seguranca` antes do
  PR; a tarefa 2 também pelo `conformidade-lgpd` e pelo `revisor-design`
  (canvas, contraste, celular);
- o mapa do código é atualizado com o Graphify antes de começar.

No fechamento, a seção "Resultado" é preenchida neste arquivo.

## Riscos

| Risco | Efeito | O que fazer |
| --- | --- | --- |
| Galpão real maior que o teste (30 mil caixas) | Abertura lenta | O nível de detalhe por nível já cobre; se não bastar, `<canvas>` 2D (com aprovação) |
| Junção das caixas lenta pela Data API | Mais de 1 s para ler | Visão `estrutura_caixas` com teste pgTAP (decidido no PR, com medição) |
| Erro de sobreposição ao juntar caixas em 3 `<path>` por nível | Caixa de trás aparecendo por cima | Ordem de desenho por nível testada no Vitest; caixa selecionada sempre por cima; ao aproximar uma rua, caixas uma a uma |
| Desenho gerado diferente do galpão real (ruas em outra ordem, entrada do outro lado) | A pessoa procura no lugar errado | Pergunta 2: ordem pelo código e entrada na frente; ajuste fino vira tarefa futura |
| Celular fraco com o 3D | Gestos travando | Vista inicial em planta no celular (pergunta 9) e lista das caixas |
| Total × lista confundindo a pessoa ("14 documentos" e só 9 na lista) | Chamado de suporte | Frase da pergunta 3 |
| Selo "Disponível" do canvas sem dado (empréstimo é da Fase 6) | Selo mentindo | Escondido até a Fase 6 |
| Script do canvas copiado com `document.querySelector` e `innerHTML` | Código frágil fora do React | O canvas é referência visual; o comportamento é reescrito em React com estado |

## O que você precisa fazer

- **Nenhuma chave nova** e nenhuma migração. Não há variável nova na Vercel
  nem segredo novo no GitHub. Se alguma tarefa descobrir que falta algo, o
  PR lista o que é e onde colar. Nunca no chat.
- **Responder às perguntas abaixo** (ou aprovar as recomendações).
- **Conferir a demonstração** na prévia: abrir o mapa, clicar na caixa
  laranja, trocar o perfil na faixa amarela, abrir no celular.

## Perguntas que só o responsável decide

| # | Pergunta | Recomendação |
| --- | --- | --- |
| 1 | **Quantos PRs?** | **Um PR só**, com as 4 tarefas em commits separados, como foi a Fase 3 (PR 31). As tarefas dependem umas das outras (a geometria serve o 3D e a planta) e o PR único tem uma demonstração só para aprovar. |
| 2 | **Como o galpão é desenhado** se o banco não guarda a planta (paredes, portas, posição das ruas)? | **Gerado da estrutura**: ruas lado a lado na ordem do código (A, B, C…), módulos em ordem ao longo da rua, corredor entre as ruas, entrada na frente, como no canvas. Um editor da planta (rua em L, entrada lateral, pilares) fica para depois, se o piloto mostrar que o desenho gerado confunde. |
| 3 | **Total × lista**: a caixa tem 14 documentos e a pessoa só pode ler 9. O que aparece? | **"14 documentos nesta caixa"** no selo e, embaixo da lista, **"Você vê 9. Os outros 5 são de secretarias sem acesso."**, sem dizer quais. Alternativa: mostrar só "9 documentos", mas aí a caixa parece ter espaço que não tem. |
| 4 | **Girar a vista** do 3D (ver o galpão pelo outro lado)? | **Não nesta fase.** O canvas tem ângulo fixo; girar exige refazer a ordem de desenho e aumenta o risco de erro. Planta baixa e lista cobrem o "não estou vendo a caixa". Pode entrar depois em passos de 90°. |
| 5 | **Cor da caixa pela ocupação** (cheia, quase cheia) no 3D e na planta? | **Não**: o canvas pinta só caixa guardada × posição livre, e contar documentos de milhares de caixas pesa a abertura. A ocupação em documentos continua no cadastro e na tela da rua. Pode virar um botão "Mostrar ocupação" depois. |
| 6 | **"Ver no mapa 3D" da pesquisa**: o que mostra? | **As caixas dos documentos da página atual** (até 50), destacadas em laranja, com a primeira selecionada e a frase "Mostrando as caixas dos 50 primeiros resultados". Mostrar as caixas de todos os resultados pediria uma consulta nova no banco. |
| 7 | **Lista das caixas** (alternativa em texto): sempre aberta ou atrás de um botão? | **Atrás de um botão "Ver em lista"**, ao lado de "Centralizar", que abre a lista no lugar do painel (no celular, abaixo). Fica sempre acessível pelo teclado e pelo leitor de tela, sem ocupar espaço do canvas. |
| 8 | **Mover documentos em lote** (a Fase 3 deixou "para a Fase 4")? | **Tarefa própria, logo depois desta fase**, com plano curto. Mexe em escrita, auditoria e permissão, e esta fase só lê. Misturar atrasa o critério "clicar mostra os documentos". |
| 9 | **Vista inicial no celular**: 3D ou planta? | **Planta baixa**, com o botão para o 3D. A planta é mais leve, mais legível numa tela pequena e mais fácil de tocar. No computador, a vista inicial é o 3D, como no canvas. |
| 10 | **Galpão grande na demonstração** (para medir desempenho na prévia)? | **Sim, só para teste**: `?galpao=grande` na prévia com `LICCONT_DEMO=1` gera as 15.360 caixas fictícias em memória. Não aparece no menu, não vai para Production (a demonstração já não liga lá). |
| 11 | **Vários galpões**: como escolher? | **Seletor no cabeçalho do mapa**, só quando houver mais de um galpão ativo, como já é na Estrutura física. O padrão é o galpão da caixa pedida ou, sem caixa, o primeiro ativo. |

## Decisões do responsável

(Preencher após a resposta.)

## Resultado

(Preencher no fechamento.)

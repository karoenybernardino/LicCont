# Fase 4 — Mapa

Status: **plano aprovado com mudanças pelo responsável** (2026-11-14). Ver
"Decisões do responsável" no fim. O plano foi escrito com o Opus; o código
será escrito com o Sonnet, a partir deste texto.

Segue `docs/plano-de-desenvolvimento.md`:

- Linha da Fase 4: "Mapa 3D, planta baixa, painel 'Dentro da caixa', ir até
  a caixa". Pronta quando "clicar numa caixa mostra os documentos reais
  dela".
- Testes ponta a ponta: o mapa entra no Playwright.
- A tabela de tecnologia do plano geral dizia "Mapa 3D — SVG gerado dos
  dados". O responsável trocou por **three.js com react-three-fiber**, para
  um 3D bonito e de verdade (decisão 3 abaixo). O plano geral é atualizado
  no mesmo PR da implementação.

Telas de referência: canvas "LicCONT — Telas do sistema", quadros **Mapa 3D**
(claro e escuro), **Mapa — planta baixa** (claro e escuro) e **Detalhe da rua
do galpão** (claro e escuro), e os quadros desenhados para esta fase (claro
e escuro): **Fase 4 · Mapa 3D com girar e ocupação**, **Fase 4 · Dentro da
caixa: mover documentos** e **Fase 4 · Editor da planta**. As telas devem
ficar **iguais ao canvas** (decisão 12, seção "Fidelidade ao canvas").

## Por quê

Depois da Fase 3 o LicCONT sabe o que tem em cada caixa e acha qualquer
documento em menos de um segundo. Mas a pessoa ainda lê "B-M3-N3-C02" e
precisa saber, de cabeça, onde fica a Rua B no galpão. O mapa resolve o
último metro:

1. **Ver o galpão** como ele é: ruas, estantes, níveis e caixas, em 3D (com
   giro) ou em planta baixa, na posição real que o coordenador desenhou no
   editor.
2. **Ir até a caixa** a partir de um documento, de uma pesquisa ou do código
   digitado: a câmera vai até a caixa, que fica laranja, com o endereço.
3. **Ver o que tem dentro**: clicar numa caixa abre o painel "Dentro da
   caixa" com os documentos reais dela, lidos com o RLS de quem consulta.
4. **Ver onde há espaço**: "Mostrar ocupação" pinta as caixas pela
   quantidade de documentos.
5. **Reorganizar**: mover vários documentos de uma caixa para outra de uma
   vez, com registro na auditoria.

As etiquetas com QR (Fase 5) e os empréstimos (Fase 6) usam o mapa: o QR
abre a caixa, e o documento emprestado aparece como tal no mapa.

## Pronto quando

1. **Clicar numa caixa mostra os documentos reais dela** (critério do plano
   geral), no claro e no escuro, no computador e no celular:
   - o painel mostra o endereço ("Rua B · Módulo 3" / "Nível 3 · Caixa
     02"), o total de documentos da caixa e a lista dos documentos que a
     pessoa pode ler;
   - cada documento da lista abre `/documentos/[id]`;
   - a lista é a mesma que a pesquisa devolveria para aquela caixa (mesmo
     RLS, só documentos ativos);
   - quando a pessoa não lê todos: "14 documentos nesta caixa" e, embaixo
     da lista, "Você vê 9. Os outros 5 são de secretarias sem acesso."
2. **Ir até a caixa**, pelos quatro caminhos:
   - "Ir para o mapa 3D" no painel do documento e em `/documentos/[id]`;
   - "Ver no mapa 3D" na pesquisa: destaca as caixas dos documentos da
     página atual (até 50), seleciona a primeira e diz "Mostrando as caixas
     dos 50 primeiros resultados";
   - a busca do mapa ("Ir para caixa, rua ou documento") aceita o código
     (`B-M3-N3-C02`, `b m3 n3 c2`), a rua (`B`) ou o número do processo;
   - o link `/mapa?caixa=<id>` (o mesmo que o QR da Fase 5 vai usar).

   Em todos, a câmera vai até a caixa, que fica laranja com o rótulo "CAIXA
   SELECIONADA", e o painel abre. "Voltar ao documento" aparece só quando se
   chegou por um documento.
3. **Girar**: arrastar com o botão direito (ou dois dedos no celular) gira a
   vista; os botões "Girar 90° para a esquerda" e "Girar 90° para a
   direita" giram com animação; o indicador "Ângulo 0°" mostra o ângulo;
   "Centralizar" volta ao ângulo do canvas. A caixa selecionada continua
   selecionada e visível.
4. **Ocupação**: "Mostrar ocupação" pinta cada caixa pela faixa de
   ocupação (abaixo de 50%, 50% a 89%, 90% a 100%, acima de 100%, os mesmos
   cortes do cadastro da Fase 3), com legenda em texto. A planta pinta cada
   módulo pela média. Desligar volta às cores do canvas.
5. **Editor da planta** (`/mapa/editar`, administrador e coordenador),
   como o quadro "Fase 4 · Editor da planta":
   - define o tamanho do galpão (em células de módulo), arrasta cada rua,
     gira 90°, marca a entrada (lado e posição) e coloca portas, pilares,
     paredes e áreas com nome;
   - mostra "N alterações não salvas", Desfazer, Refazer, "Descartar" e
     "Salvar planta";
   - rua fora das paredes ou sobreposta aparece como "Passa da parede", com
     o aviso "Rua D passa da parede. Arraste para dentro do galpão ou gire
     90° para salvar.", e "Salvar planta" é recusado (na tela e no
     servidor);
   - salva, e o 3D e a planta passam a usar as posições salvas;
   - rua sem posição salva cai no desenho automático (ruas lado a lado na
     ordem do código, entrada na frente);
   - Operador e Consulta não abrem o editor e são recusados no servidor.
6. **Mover em lote**, como o quadro "Fase 4 · Dentro da caixa: mover
   documentos": no painel, quem pode cadastrar marca documentos ("Marcar
   todos", "3 marcados") e escolhe "Mover 3 documentos". A janela "Mover
   documentos" mostra De e Para, as listas Rua → Módulo → Nível → Caixa com
   "Próxima livre" (ou clique numa caixa no mapa), a "Ocupação da caixa
   destino" ("9 → 12 de 20"), os documentos marcados, o texto "Todos mudam
   ou nenhum muda. Cada documento movido fica registrado na auditoria, com
   a caixa de antes e a de depois.", "Cancelar" e "Mover 3 documentos".
   Todos mudam ou nenhum muda. Caixa destino cheia avisa e deixa (regra 5
   da Fase 3).
7. **pgTAP — isolamento e regras do banco** (tudo o que esta fase cria, ver
   "Modelo de dados"):
   - `planta_elementos` (`supabase/tests/mapa_isolamento.test.sql`):
     outra prefeitura não lê, não insere e não altera; Operador e Consulta
     leem e não escrevem; administrador e coordenador escrevem; `anon` sem
     privilégio; DELETE sem GRANT para ninguém; elemento não aponta para
     galpão de outra prefeitura (chave composta) e o erro é o mesmo de um
     galpão inexistente;
   - colunas novas de `galpoes` e `ruas`: só administrador e coordenador
     alteram; outra prefeitura não altera;
   - `ocupacao_galpao`: devolve só caixa, número de documentos e
     capacidade; galpão de outra prefeitura devolve vazio, igual a galpão
     inexistente; `anon` não executa;
   - `mover_documentos`: outra prefeitura, outra secretaria e Consulta são
     recusados; caixa destino desativada ou de outra prefeitura dá o mesmo
     erro de caixa inexistente; se um dos documentos não puder ser movido,
     nenhum é movido; mais de 200 de uma vez é recusado; cada documento
     movido gera uma linha em `auditoria` com a caixa antes e depois.
8. **Desempenho**, com um galpão grande gerado no teste (8 ruas × 20
   módulos × 6 níveis × 16 caixas = **15.360 caixas**):
   - Vitest: o leiaute do galpão inteiro (posição de cada caixa no mundo
     3D) é calculado em menos de 150 ms no Node do CI;
   - Playwright, na demonstração com o galpão grande: a tela abre e o 3D
     fica pronto para clique em menos de 3 s; girar e aproximar ficam acima
     de 50 quadros por segundo no computador do responsável (medido e
     anotado no PR);
   - todas as caixas são **uma** malha instanciada (`InstancedMesh`): uma
     chamada de desenho para as caixas, não 15 mil;
   - leitura do banco: a estrutura em no máximo 17 pedidos (páginas de
     1.000 caixas), a ocupação em 1 pedido (só ao ligar "Mostrar
     ocupação"), a caixa selecionada em 2 pedidos;
   - a página `/mapa` carrega o three.js só nela (import dinâmico); as
     outras telas não ficam mais pesadas.
9. **Acessibilidade (Playwright com axe):**
   - o axe não aponta falha em `/mapa`, `/mapa?vista=planta` e
     `/mapa/editar`, no claro e no escuro;
   - tudo o que o mouse faz no 3D, o teclado faz (ver "Acessibilidade");
   - com `prefers-reduced-motion`, a câmera pula sem animação;
   - sem WebGL (navegador antigo, acesso remoto), a tela abre na planta
     baixa com o aviso "O 3D não está disponível neste computador".
10. **Vitest:**
    - leiaute (posição de cada caixa no mundo, a partir da estrutura e das
      posições do editor; desenho automático sem posição salva);
    - sobreposição de ruas e limite das paredes (a mesma função que o
      servidor usa para recusar);
    - faixas de ocupação e cores;
    - leitura do código digitado (`B-M3-N3-C02`, minúsculas, sem zeros, com
      espaços; código inexistente devolve "não encontrado");
    - URL do mapa (`galpao`, `caixa`, `doc`, `vista`) e o caminho de volta;
    - esquemas Zod do editor e do mover em lote;
    - a demonstração: toda caixa com documento fictício existe no galpão
      fictício.
11. **Playwright** (`tests/e2e/mapa.spec.ts`), na prévia com banco do CI:
    - o operador abre o mapa, escolhe uma caixa pela lista e vê os
      documentos; depois "ir até" e um clique no centro do 3D (onde a caixa
      está) abre o mesmo painel;
    - abre um documento e volta ao mapa com a caixa ainda selecionada;
    - os quatro caminhos do critério 2;
    - gira 90° e a seleção continua;
    - troca Perspectiva / Planta / Corredor e a seleção continua;
    - liga "Mostrar ocupação" e a legenda aparece;
    - o coordenador move uma rua no editor, salva e a planta muda;
    - o operador move 3 documentos para outra caixa e a lista das duas
      caixas muda; Consulta não vê as caixas de marcar e é recusada no
      servidor;
    - isolamento: usuário de outra prefeitura em `/mapa?caixa=<id de outra
      prefeitura>` vê "Caixa não encontrada", igual a um id inexistente; o
      operador de Obras vê só os documentos de Obras na caixa mista;
    - no celular (375 px): arrastar, pinça, girar com dois dedos, painel.

    A demonstração é conferida na prévia, porque o CI roda com banco.
12. **Fidelidade ao canvas** conferida tela a tela (seção própria abaixo),
    com as capturas lado a lado no PR.
13. As migrações só adicionam (compatíveis com a versão anterior do app),
    são aplicadas pelo job `migracoes` (decisão 0005), e os checks atuais
    seguem verdes.

## Fora do escopo

- **Situação "Emprestado"**, legenda "Tem documento emprestado" e
  "Registrar empréstimo" funcionando: Fase 6. O botão aparece como no
  canvas, desabilitado "em breve" (ver "Fidelidade ao canvas").
- **Etiqueta com QR e "Imprimir etiqueta"** funcionando, e a tela "Caixa
  lida pelo celular": Fase 5. O link `/mapa?caixa=<id>` já fica pronto para
  o QR.
- **Rua em L ou curva**: no editor, cada rua é reta (posição + giro de 90°).
- **Vários andares** ou mezanino: um galpão é um piso.
- **Mapa e planta em PNG de 600 dpi** (Decreto 10.278) e impressão do mapa.
- **Caixa fora de estante** (no chão, em trânsito): não existe no modelo.
- **Mover entre prefeituras** ou trocar a secretaria do documento ao mover:
  mover só troca a caixa.
- **Desfazer** um movimento em lote com um botão: desfaz-se movendo de
  volta (a auditoria guarda a caixa de origem).

## Fracasso mesmo funcionando

- Uma caixa, rua ou documento de outra prefeitura aparecendo no mapa, na
  busca, no editor ou no painel; ou uma resposta diferente para "caixa de
  outra prefeitura" e "caixa que não existe".
- Título, empresa ou secretaria de um documento sem vínculo aparecendo no
  painel (só o total pode aparecer).
- Um movimento em lote pela metade (parte dos documentos mudou de caixa e
  parte não), ou sem registro na auditoria.
- Um documento de outra secretaria movido por quem não tem vínculo.
- O desenho não batendo com o galpão: Rua B no lugar da Rua A, módulos fora
  de ordem, caixa desativada aparecendo, rua salva no editor e o 3D
  mostrando outra posição.
- O 3D bonito mas travando ao girar, ou a tela em branco num navegador sem
  WebGL.
- O 3D como única forma de achar a caixa: quem usa teclado ou leitor de
  tela fica sem caminho.
- A caixa destacada só pela cor.
- O 3D buscando arquivo fora do site (fonte, textura, ambiente HDR de CDN):
  serviço externo sem registro e falha da CSP.
- As telas diferentes do canvas sem motivo registrado.
- Chave privilegiada ou `service_role` usada para montar o mapa.

## Decisão: three.js com react-three-fiber

O responsável pediu um 3D bonito e que funcione, e não descartar o
three.js (o computador de uso não é fraco). O plano avaliou:

| Opção | Visual | Peso | Riscos | Veredito |
| --- | --- | --- | --- | --- |
| **three.js + @react-three/fiber + @react-three/drei** (MIT, código aberto, roda no navegador) | 3D de verdade: luz, sombra suave, câmera que gira e voa até a caixa | ~150 KB (three, comprimido) + ~40 KB (fiber e o que se usa do drei), só na página do mapa | Precisa de WebGL (fallback: planta em SVG). O desenho é pixel: acessibilidade vem da lista em texto e do teclado. | **Sim** (escolha do responsável) |
| SVG isométrico próprio (o protótipo do canvas) | Fiel ao canvas, mas sem giro de verdade nem luz | zero | Ordem de desenho manual; milhares de elementos | Usado só na **planta baixa** e como fallback sem WebGL |
| CSS 3D | Fraco | zero | Trava com milhares de caixas | Não |

Como o three.js entra:

- **Dependências novas**: `three`, `@react-three/fiber` (a versão para
  React 19) e `@react-three/drei`. Versões exatas fixadas no PR, com o
  registro em `docs/decisoes/0008-mapa-3d-threejs.md` (padrão da decisão
  0007) e o Dependabot atualizando (decisão 0004). Não são suboperadores:
  rodam na máquina da pessoa e não enviam dado a ninguém. Nada entra em
  `docs/lgpd/suboperadores.md`. Qualquer biblioteca além dessas três para e
  pergunta.
- **Nada de rede**: nenhum recurso do drei que baixa arquivo de CDN. Sem
  `<Environment preset>` (baixa HDR de fora), sem `<Text>` com fonte
  padrão (baixa fonte e cria worker por `blob:`). Os rótulos (A, B, M1,
  "ENTRADA", "CAIXA SELECIONADA") são HTML por cima do 3D (`<Html>` do
  drei), com as fontes da marca já carregadas. Texturas, se houver, são
  geradas em código ou ficam em `public/`. A CSP não muda; se mudar, o PR
  explica cada diretiva.
- **Câmera**: ortográfica, no mesmo ângulo isométrico do canvas na
  abertura e no "Centralizar". `CameraControls` do drei: girar (botão
  direito ou dois dedos, com o ângulo vertical limitado para não ir para
  baixo do piso), arrastar para andar, roda e pinça para aproximar,
  `fitToBox` animado para "ir até a caixa", ↺ e ↻ de 90°.
- **Desempenho**: uma `InstancedMesh` para todas as caixas, uma para as
  prateleiras e uma para os montantes das estantes. Cor por instância
  (guardada, selecionada, destacada, faixas de ocupação). Clique pelo
  `instanceId` do raycast do fiber. A caixa selecionada ganha uma malha
  própria por cima, laranja, com contorno (`<Outlines>` do drei) e brilho.
  `frameloop="demand"`: o 3D só redesenha quando algo muda (bateria e
  ventoinha agradecem).
- **Bonito e igual ao canvas**: as três faces de cada caixa usam as cores
  do canvas (claro: topo `#9be9d6`, frente `#3cbfa6`, lado `#26937f`;
  escuro: `#7fe3cf`, `#2fb59b`, `#1f8a78`; estante `#86abb6`, `#6c929e`,
  `#b8d2d9`; faixa de segurança `#f5c542`; selecionada `#ff9f1c` com
  `#ffd27a` e brilho `#fff3d1`). Luz hemisférica e direcional calibradas
  para que, no ângulo do canvas, cada face fique no tom desenhado.
  `ContactShadows` do drei no piso. O fundo do 3D é o degradê do quadro.
- **Tema**: as cores vêm de um único arquivo de tokens do mapa
  (`src/features/mapa/cores.ts`, claro e escuro). Trocar o tema troca as
  cores das malhas sem recarregar.
- **Sem WebGL**: detecção antes de montar o `<Canvas>`. Sem suporte, a tela
  abre na planta baixa (SVG) com o aviso. Erro do WebGL durante o uso (perda
  de contexto) mostra o mesmo aviso e o botão "Tentar de novo".
- **Carregamento**: o componente 3D entra por `next/dynamic` com
  `ssr: false` só em `/mapa`. Enquanto carrega, aparece o esqueleto do
  quadro (mesmas medidas), sem pulo de leiaute.

## Modelo de dados (migração em `supabase/migrations/`)

Tudo com RLS ligado e GRANT explícito por coluna. Nada para `anon` nem para
`service_role`: as telas usam a sessão da pessoa. Convenções das Fases 1 a
3: `unique (id, prefeitura_id)` no pai e chave estrangeira composta no
filho, auditoria por gatilho, funções `app.*` com `search_path = ''`,
nenhum DELETE, políticas só com funções `app.*` (nunca o JWT direto).

### O que o mapa só lê (já existe)

| O quê | De onde | Quem vê |
| --- | --- | --- |
| Galpões, ruas, módulos, níveis | `carregarEstrutura()` (`src/features/estrutura/dados.ts`) | todos da prefeitura |
| Caixas do galpão (id, nível, número) | `caixas` com junção `niveis!inner(modulos!inner(ruas!inner(galpao_id)))`, só ativas, em páginas de 1.000 (`todas()`) | todos da prefeitura |
| Total da caixa selecionada | `public.ocupacao_caixas([caixa_id])` | todos da prefeitura (só o número) |
| Documentos da caixa selecionada | `documentos` com `caixa_id = X` e `ativo`, pelo RLS; índice `documentos_caixa_idx` | só as secretarias permitidas |
| Ir até um documento pelo número | `public.pesquisar_documentos(p_busca, p_limite := 5)`, que devolve o `codigo` da caixa | só as secretarias permitidas |

Se a medição mostrar que a junção das caixas passa de 1 s no galpão
grande, entra uma visão `security_invoker` `estrutura_caixas` com
`galpao_id`, GRANT só a `authenticated` e teste pgTAP antes do código.

### Planta do galpão (editor)

A unidade é a **célula de módulo**: uma célula tem a largura de um módulo
de estante. O editor encaixa tudo nessa grade. Isso evita medir o galpão
em metros e casa com o que a estrutura já sabe (quantos módulos cada rua
tem).

Colunas novas (só adicionam, todas opcionais; vazio = desenho automático):

| Tabela | Coluna | Tipo e regra |
| --- | --- | --- |
| `galpoes` | `planta_largura`, `planta_profundidade` | `smallint`, de 4 a 200 células |
| `galpoes` | `entrada_lado` | `frente`, `fundo`, `esquerda`, `direita` |
| `galpoes` | `entrada_posicao` | `smallint`, célula onde a entrada começa |
| `ruas` | `planta_x`, `planta_y` | `smallint`, de 0 a 199: canto da rua na grade (Coluna x, Linha y no editor) |
| `ruas` | `planta_giro` | `smallint`, só 0, 90, 180 ou 270 |

Uma rua ocupa **módulos × 2 células** (como o quadro mostra: "7 módulos",
"Tamanho 7 × 2 células"); girada 90°, 2 × módulos. No editor, cada rua tem
um estado: "Posicionada" (tem posição salva), "Automática" (sem posição,
desenho automático) ou "Passa da parede".

- GRANT de UPDATE nessas colunas a `authenticated`. Hoje a política de
  UPDATE de `galpoes` e `ruas` aceita só o administrador. O coordenador
  também precisa editar a planta (como já mexe em caixas), mas não pode
  renomear galpão nem desativar rua. Por isso: um gatilho
  `app.planta_confere()` em `galpoes` e `ruas` que, para quem não é
  administrador, recusa mudança fora das colunas da planta; e as políticas
  de UPDATE passam a aceitar `app.eh_admin() or app.eh_coordenador()`. O
  pgTAP confere as duas coisas.
- Os limites (rua dentro das paredes, sem sobreposição) dependem do número
  de módulos, que muda depois. Por isso **não** ficam no banco: a Server
  Action confere com a mesma função do leiaute (`geometria.ts`), e o mapa
  avisa "Rua B passa da parede" se um módulo novo empurrar a rua para fora.

Tabela nova `planta_elementos` (portas, pilares, paredes internas, áreas):

| Campo | Tipo e regra |
| --- | --- |
| `id` | uuid |
| `prefeitura_id`, `galpao_id` | obrigatórios; chave composta `(galpao_id, prefeitura_id)` para `galpoes` |
| `tipo` | `porta`, `pilar`, `parede`, `area` |
| `rotulo` | texto de até 40 caracteres, opcional ("Mesa de conferência") |
| `x`, `y`, `largura`, `profundidade` | `smallint`, em células; largura e profundidade de 1 a 200 |
| `giro` | 0, 90, 180 ou 270 |
| `ativo` | `false` = removido (nunca apagado) |
| `criado_por`, `criado_em` | preenchidos pelo banco |

- Leitura: toda a prefeitura (`prefeitura_id = (select
  app.prefeitura_atual())`). Escrita: administrador ou coordenador. GRANT
  de INSERT e UPDATE só nas colunas de dado. Sem DELETE.
- Auditoria pelo gatilho `app.auditar_alteracao()`, como a estrutura. As
  mudanças de planta em `galpoes` e `ruas` já entram pela auditoria da Fase
  2.

### Ocupação do galpão inteiro ("Mostrar ocupação")

`public.ocupacao_galpao(p_galpao uuid)`, `security definer`, `stable`,
`search_path = ''`, igual a `ocupacao_caixas` mas para o galpão inteiro numa
chamada:

- devolve só `caixa_id`, `documentos` e `capacidade`;
- só caixas ativas do galpão da prefeitura atual;
- galpão de outra prefeitura ou inexistente: resultado vazio, igual;
- `revoke` de `public` e `anon`, `grant execute` só a `authenticated`.

É chamada só quando a pessoa liga "Mostrar ocupação", para não atrasar a
abertura. Medida com `EXPLAIN ANALYZE` no galpão grande (usa
`documentos_caixa_idx`).

### Mover documentos em lote

`public.mover_documentos(p_documentos uuid[], p_destino uuid) returns
int`, `security invoker` (o RLS e os GRANT de quem chama valem):

- recusa lista vazia, repetida ou com mais de 200 ids;
- `update public.documentos set caixa_id = p_destino where id = any
  (p_documentos) and ativo`; quem não pode editar o documento (outra
  prefeitura, outra secretaria, Consulta) não o enxerga no UPDATE;
- se o número de linhas mudadas for diferente do número de ids, levanta o
  erro LC006 ("Não foi possível mover. Nenhum documento foi movido."), e a
  transação inteira volta. A mensagem é a mesma para documento
  inexistente, de outra prefeitura ou sem permissão (sem oráculo);
- a caixa destino passa pelo gatilho que já existe (`app.documento_confere`):
  caixa de outra prefeitura, desativada ou inexistente dá o mesmo erro;
- cada documento movido gera sua linha em `auditoria` pelo gatilho da Fase
  3, com a caixa antes e depois;
- a Server Action valida com Zod (lista de uuids, 1 a 200, destino uuid) e
  confere a permissão no servidor antes de chamar a função.

## Desempenho com milhares de caixas

1. **Leiaute puro** em `src/features/mapa/geometria.ts` (sem React, sem
   three): da estrutura e da planta saem a posição e o tamanho de cada
   estante, prateleira e caixa no mundo 3D, e a mesma geometria em 2D para
   a planta baixa. Testado no Vitest com o galpão grande.
2. **Malhas instanciadas**: caixas, prateleiras e montantes, uma
   `InstancedMesh` cada. As matrizes são montadas uma vez, a partir do
   leiaute; mudar a seleção ou a ocupação só troca cores por instância.
3. **Desenho sob demanda** (`frameloop="demand"`) e sombra só de contato no
   piso, sem sombra dinâmica por caixa.
4. **Dados compactos**: a estrutura é lida no servidor e vai ao componente
   como listas de números (`[nivelIndex, numero]` por caixa). Documentos e
   ocupação só sob demanda.
5. **Rótulos HTML** só para ruas, módulos da rua em foco, entrada e caixa
   selecionada (dezenas, não milhares).

Se o galpão grande ficar abaixo de 50 quadros por segundo ao girar, o
próximo passo é juntar as caixas de cada nível num bloco quando a câmera
está longe (nível de detalhe), decidido no PR com a medição.

## Acessibilidade (alternativa ao 3D)

O 3D é um desenho num `<canvas>`. Ninguém depende só dele:

- **"Ver em lista"** (botão ao lado de "Centralizar"): abre, no lugar do
  painel (no celular, abaixo), a árvore Rua → Módulo → Nível → Caixa, em
  HTML com `<details>`/`<summary>` e botões. Escolher na lista é o mesmo que
  clicar no 3D. É o caminho do leitor de tela.
- **Busca do mapa** com `<label>` para leitor de tela; Enter vai até o
  resultado.
- **Teclado no 3D**: a área do 3D recebe foco (`tabindex="0"`), com
  instruções em `aria-describedby`. Setas ← → mudam de caixa no nível,
  ↑ ↓ de nível, Page Up/Down de módulo, Enter abre o painel, `+` e `-`
  aproximam, `[` e `]` giram 90°, `0` centraliza. Os botões +, −, ↺, ↻,
  "Centralizar", "Mostrar ocupação" e "Perspectiva | Planta | Corredor" são
  `<button>` com nome.
- **Anúncio**: a seleção é anunciada em `aria-live="polite"` ("Rua B,
  módulo 3, nível 3, caixa 2. 14 documentos.").
- **Não só pela cor**: a selecionada é laranja **e** tem contorno, brilho e
  o rótulo "CAIXA SELECIONADA". As faixas de ocupação diferem também na
  claridade, e a legenda tem texto e percentuais.
- **Editor** com teclado: elemento escolhido anda com as setas, `R` gira,
  Delete remove (desativa); cada ação anunciada.
- **Mover em lote**: as caixas de marcar são `<input type="checkbox">` com
  `<label>`; o destino também pode ser escolhido pelas listas, sem o 3D.
- **Movimento**: com `prefers-reduced-motion`, a câmera pula sem animação.
- O `<canvas>` tem `role="img"` e `aria-label` com o resumo ("Galpão
  Central: 4 ruas, 20 módulos, 1.046 caixas").

## Telas

O código fica em `src/features/mapa/`:

- `geometria.ts`, `codigo.ts`, `url.ts`, `cores.ts`, `ocupacao.ts` (puros,
  testados);
- `dados.ts` (só no servidor), com o ramo da demonstração:
  `caixasDoGalpao`, `documentosDaCaixa`, `caixaPorId`, `plantaDoGalpao`,
  `ocupacaoDoGalpao`;
- `acoes.ts` (Server Actions com Zod: `salvarPlanta`, `moverDocumentos`;
  devolvem `AVISO_DEMO` em demonstração);
- `mapa-3d.tsx` (fiber, só no navegador), `planta.tsx` (SVG),
  `corredor.tsx` (reusa a vista de frente da rua), `editor.tsx`;
- `painel-caixa.tsx` ("Caixa selecionada", "Dentro da caixa", mover em
  lote), `lista-caixas.tsx`.

Reutiliza `carregarEstrutura()`, `codigoPosicao`, `VistaFrente`, `Painel`,
`TituloPainel`, `Rotulo`, `tituloDocumento`, `ocupacao_caixas`,
`proximaCaixaLivre` e as listas dependentes de caixa do cadastro. O menu
"Mapa 3D" da barra lateral (`src/features/sessao/pagina.tsx`) ganha o link
`/mapa` e deixa de estar "em breve".

- **Mapa 3D** (`/mapa`, todos os perfis da prefeitura). Igual ao quadro
  "Fase 4 · Mapa 3D com girar e ocupação" (que segue o quadro "Mapa 3D"
  original): busca, "Voltar ao documento", "Perspectiva | Planta |
  Corredor", "Mostrar ocupação", "Ver em lista", +, −, "Centralizar", os
  dois botões de girar, "Ângulo 0°", a dica "Arraste para andar · botão
  direito ou dois dedos para girar · roda do mouse para zoom", e a legenda
  (Caixa selecionada, Caixa-arquivo guardada, Estante de aço, Faixa de
  segurança; com a ocupação ligada, "Ocupação da caixa": Abaixo de 50%, 50%
  a 89%, 90% a 100%, Acima de 100%).
- **Planta baixa** (`/mapa?vista=planta`). Igual ao quadro do canvas: botão
  "Perspectiva | Planta | Corredor", ruas como faixas, módulos como
  quadrados de 52 px (com caixas: degradê; sem caixa: "Posição livre"
  tracejada), "ENTRADA DO GALPÃO", módulo da caixa escolhida em laranja com
  o código (C02), painel de 300 px. Com posições do editor, desenha o
  galpão salvo, com portas, pilares e paredes.
- **Corredor** (`/mapa?vista=corredor`): a vista de frente da rua da caixa
  escolhida (a `VistaFrente` da Fase 2), com a caixa em laranja. É o
  terceiro botão do quadro da planta.
- **Editor da planta** (`/mapa/editar`, administrador e coordenador). Igual
  ao quadro "Fase 4 · Editor da planta": trilha "Mapa do galpão › Editar
  planta"; grade de três colunas (`230px minmax(0,1fr) 260px`); à esquerda,
  "Tamanho do galpão" (Largura, Profundidade, "Medidas em células. 1 célula
  = largura de um módulo de estante."), "Entrada" (Lado, Posição) e
  "Ferramentas" (Selecionar e arrastar, Porta, Pilar, Parede, Área com
  nome); no meio, a grade com régua em células, "ENTRADA", as ruas e as
  áreas, a dica "Arraste as ruas na grade · clique no ícone laranja para
  girar · Delete remove o elemento" e o aviso de rua fora; à direita,
  "Selecionado" (Coluna x, Linha y, Giro 0°/90°/180°/270°, Módulos "da
  estrutura", Tamanho, Caixas, "Girar 90°") e a lista "Ruas" com o estado
  de cada uma.
- **Detalhe da rua** (`/estrutura/rua/[id]`): ganha o que o quadro do
  canvas mostra e ainda falta: trilha "Mapa do galpão › Rua B", "Voltar ao
  mapa" e "Frente | Planta | 3D". Clicar numa caixa abre o painel "Dentro
  da caixa".
- **Atalhos**: "Ir para o mapa 3D" no documento, "Ver no mapa 3D" na
  pesquisa, link na nota da Estrutura física.
- **Vários galpões**: seletor no cabeçalho do mapa, só com mais de um
  galpão ativo. O padrão é o galpão da caixa pedida ou o primeiro ativo.

### Celular

- Abaixo de 768 px as colunas empilham: busca, vista (largura inteira, 60%
  da altura da tela), painel, lista.
- **As duas vistas** (decisão 9): 3D e planta, com o mesmo botão
  "Perspectiva | Planta | Corredor". Abre no 3D, como no computador, e
  lembra a última vista escolhida (no navegador da pessoa, com `try/catch`).
  Sem WebGL, abre na planta.
- Um dedo anda, pinça aproxima, dois dedos giram; toque seleciona. Botões
  com 44 px. `touch-action: none` só na área do 3D.
- Ao selecionar, a página rola até "Dentro da caixa".
- O editor da planta no celular só mostra; editar pede tela de 1024 px ou
  mais ("Abra no computador para editar a planta").

### Tema claro e escuro

- Cores do 3D e da planta em `src/features/mapa/cores.ts`, tiradas dos
  quadros claro e escuro do canvas; o restante da tela usa as classes da
  marca (`src/ui/`).
- O laranja da seleção é o mesmo nos dois temas.
- O seletor de tema troca o mapa sem recarregar.

### Demonstração (`LICCONT_DEMO=1`)

- Galpão fictício da Fase 2 (`ESTRUTURA_DEMO`) e documentos fictícios da
  Fase 3 (`DOCUMENTOS_DEMO`). Planta fictícia com entrada na frente, um
  pilar e uma porta lateral.
- A caixa do canvas, **Rua B · Módulo 3 · Nível 3 · Caixa 02**, existe com
  14 documentos e vem selecionada no primeiro acesso, como no canvas.
- Salvar planta e mover em lote devolvem `AVISO_DEMO`. Nada é gravado.
- A faixa amarela mostra a diferença entre perfis: Operador vê parte dos 14
  e marca só os seus; Consulta não marca; Coordenador abre o editor.
- `?galpao=grande` gera as 15.360 caixas fictícias em memória para medir
  desempenho na prévia. Não aparece no menu e não existe em Production (a
  demonstração já não liga lá).

## Fidelidade ao canvas (decisão 12)

O responsável quer as telas **iguais ao que foi desenhado**. Regras:

1. **Medidas, fontes, cores e textos dos quadros**, conferidos um a um:
   - Mapa 3D: grade `1fr 330px` com 16 px de espaço; cartões com raio 16 e
     fundo `rgba(255,255,255,.78)` (claro); linha "Dica" (rótulo 11 px
     maiúsculo + texto 13 px); botões + e − de 38 px, "Centralizar";
     legenda com os quatro itens (Caixa selecionada, Caixa-arquivo
     guardada, Estante de aço, Faixa de segurança); rótulo flutuante
     "CAIXA SELECIONADA" (11 px) com o código em JetBrains Mono 14 px;
     painel "Caixa selecionada" (quadrado 42 px em degradê laranja,
     endereço em mono 16 px em duas linhas, selos) e "Dentro da caixa"
     (lista com rolagem até 300 px, itens com título Sora 13 px e linha
     "empresa · secretaria · ano" 11 px, selo à direita);
   - Planta baixa: grade `1fr 300px`; cabeçalho com ícone 34 px, "Planta
     baixa" Sora 17 px e "Galpão · visão de cima" 12 px; botão de três
     opções com raio 13; desenho com fundo `#eef9f8 → #e2f2f1`; rótulos das
     ruas em caixa escura 34×26; módulos 52×52 com raio 8;
   - Detalhe da rua: os números do topo (Módulos, Níveis, Caixas,
     Ocupação, Documentos), "Ocupação por módulo" e a legenda (Ocupada,
     Posição livre, Selecionada, Tem documento emprestado).
2. **Os textos do canvas são usados como estão.** Os dados (nomes de
   empresa, números) vêm do banco ou da demonstração.
3. **Elemento de fase futura aparece como desenhado**, desabilitado com
   "em breve" (como o responsável decidiu para os ícones da Fase 3):
   "Registrar empréstimo", "Imprimir etiqueta".
4. **Selo "Disponível"** em cada documento e na caixa: aparece, porque
   antes da Fase 6 nenhum documento pode estar emprestado. "Emprestado" e
   a legenda "Tem documento emprestado" só passam a aparecer na Fase 6.
5. **Diferenças inevitáveis**, listadas no PR com o motivo: "Voltar ao
   documento" só aparece quando se chegou por um documento; o 3D é
   iluminado pelo three.js (no ângulo do canvas, os tons das faces batem,
   mas a sombra de contato é nova). Os quadros da Fase 4 valem sobre os
   originais onde os dois mostram a mesma tela (por exemplo, a dica e os
   botões do Mapa 3D).
6. **Prova**: o PR traz capturas do Playwright de cada tela (1280×880,
   claro e escuro) ao lado da captura do quadro do canvas, e o
   `revisor-design` confere a lista acima item a item antes do PR.

## Segurança e LGPD

- **Nenhuma chave privilegiada.** Tudo pela sessão da pessoa, com RLS.
- **Nenhum dado pessoal novo.** O mapa mostra endereço de caixa, número do
  processo, empresa (razão social), secretaria e ano. CNPJ não aparece no
  painel. Nada de CPF, e-mail ou nome de usuário.
- **Total × lista**: o total conta todas as secretarias (só o número, como
  a Fase 3 aprovou). A frase não diz de quais secretarias são os outros.
- **Sem oráculo**: caixa, galpão e documento de outra prefeitura respondem
  igual a inexistentes, no mapa, no editor, na ocupação e no mover em lote.
- **Entrada validada com Zod** no servidor: `?caixa=`, `?doc=`, `?galpao=`
  (uuid), `vista` (`3d`, `planta`, `corredor`), busca até 60 caracteres,
  planta (inteiros nos limites, giro em 0/90/180/270), mover (1 a 200
  uuids).
- **Permissão no servidor** em toda ação: editor (administrador ou
  coordenador), mover (pode cadastrar na secretaria de cada documento).
- **Sem logs com conteúdo** e mensagens de erro fixas.
- **Nenhum serviço externo novo.** As bibliotecas novas rodam no navegador
  e não buscam nada fora do site (ver a decisão do three.js).
- Revisão pelo `auditor-seguranca`, `conformidade-lgpd` (total × lista e
  mover em lote) e `revisor-design` (fidelidade ao canvas).

## Entregas e ordem

**Um PR só** (decisão 1), com uma branch de trabalho e um commit por
tarefa, na ordem abaixo. Cada tarefa começa pelo teste que falha.

| # | Entrega | Como provar |
| --- | --- | --- |
| 0 | **Canvas primeiro**: quadros "Fase 4 · Mapa 3D com girar e ocupação", "Fase 4 · Dentro da caixa: mover documentos" e "Fase 4 · Editor da planta", claro e escuro. **Feito pelo responsável em 2026-11-14.** | Quadros no canvas |
| 1 | Migração: colunas da planta, `app.planta_confere()`, políticas de UPDATE, `planta_elementos`, `ocupacao_galpao`, `mover_documentos`, auditoria, `seed.sql` com planta fictícia | pgTAP do critério 7; `EXPLAIN ANALYZE` no PR |
| 2 | `geometria.ts`, `codigo.ts`, `url.ts`, `cores.ts`, `ocupacao.ts`, gerador do galpão grande | Vitest do critério 10 e do leiaute do critério 8 |
| 3 | Dependências e decisão 0008; `/mapa` com o 3D (instâncias, câmera, giro, ir até, seleção), painel, lista, teclado, ocupação, fallback sem WebGL, menu, demonstração | Playwright: clicar mostra os documentos, giro, ocupação, isolamento, teclado, axe |
| 4 | Ir até a caixa: busca, `?caixa=`/`?doc=`, "Voltar ao documento", atalhos na pesquisa, no documento e na estrutura | Playwright: os quatro caminhos |
| 5 | Planta baixa, Corredor, "Frente \| Planta \| 3D" na rua, celular | Playwright: troca de vista mantém a seleção; celular 375 px |
| 6 | Editor da planta | Playwright: coordenador move rua e a planta muda; operador recusado |
| 7 | Mover em lote | Playwright: operador move 3 documentos; Consulta recusada |
| 8 | Fidelidade ao canvas e medição de desempenho | Capturas lado a lado; tempo de abertura e quadros por segundo no PR |

Antes do PR: `revisor-codigo`, `auditor-seguranca`, `conformidade-lgpd` e
`revisor-design`. O mapa do código é atualizado com o Graphify antes de
começar. No fechamento, a seção "Resultado" é preenchida neste arquivo.

## Riscos

| Risco | Efeito | O que fazer |
| --- | --- | --- |
| Navegador sem WebGL (acesso remoto, máquina virtual da prefeitura) | 3D em branco | Detecção e planta em SVG com aviso (critério 9) |
| Recurso do drei baixando arquivo de CDN | Falha da CSP, serviço externo sem registro | Lista proibida na decisão do three.js; teste do Playwright falha se houver pedido para fora do site |
| Galpão real maior que o teste (30 mil caixas) | Giro lento | Instâncias já cobrem; nível de detalhe por nível se a medição pedir |
| Peso do three.js | Página do mapa mais lenta para abrir | Import dinâmico só em `/mapa`; esqueleto enquanto carrega |
| Luz do 3D mudando os tons do canvas | Telas "diferentes do desenhado" | Luz calibrada no ângulo do canvas; captura lado a lado no PR |
| Política de UPDATE de `galpoes`/`ruas` aberta ao coordenador | Coordenador renomeando galpão ou desativando rua | Gatilho `app.planta_confere()` e pgTAP |
| Movimento em lote grande travando o banco | Lentidão | Limite de 200 por vez |
| Editor salvo e depois a rua ganha módulos | Rua passando da parede | Aviso no mapa e no editor; o banco não bloqueia |

## O que você precisa fazer

- **Nenhuma chave nova.** A migração é aplicada pelo CI no merge (decisão
  0005). Se alguma tarefa descobrir que falta algo, o PR lista o que é e
  onde colar. Nunca no chat.
- **Conferir a demonstração** na prévia: abrir o mapa, girar, clicar na
  caixa laranja, ligar a ocupação, trocar o perfil na faixa amarela, abrir
  o editor como Coordenador, abrir no celular.

## Perguntas que só o responsável decide

| # | Pergunta | Recomendação |
| --- | --- | --- |
| 1 | **Quantos PRs?** | Um PR só, com as tarefas em commits separados. |
| 2 | **Como o galpão é desenhado?** | Gerado da estrutura; editor da planta depois. |
| 3 | **Total × lista** | "14 documentos nesta caixa" e "Você vê 9. Os outros 5 são de secretarias sem acesso." |
| 4 | **Girar a vista?** | Não nesta fase. |
| 5 | **Cor pela ocupação?** | Não nesta fase. |
| 6 | **"Ver no mapa 3D" da pesquisa** | Caixas da página atual (até 50). |
| 7 | **Lista das caixas** | Atrás do botão "Ver em lista". |
| 8 | **Mover documentos em lote** | Tarefa própria, depois desta fase. |
| 9 | **Vista inicial no celular** | Planta baixa. |
| 10 | **Galpão grande na demonstração** | Sim, só para teste. |
| 11 | **Vários galpões** | Seletor no cabeçalho, só com mais de um. |

## Decisões do responsável

Em 2026-11-14 o responsável respondeu:

| # | Resposta | O que muda no plano |
| --- | --- | --- |
| 1 | Aprovada | Um PR só. |
| 2 | **Com o editor** | Editor da planta nesta fase: colunas em `galpoes` e `ruas`, tabela `planta_elementos`, tela `/mapa/editar`. |
| 3 | Aprovada | Frase do total × lista. |
| 4 | **Pode girar** | Giro livre (com limite vertical) e botões de 90°. |
| 5 | **Nesta fase, sim** | "Mostrar ocupação" e a função `ocupacao_galpao`. |
| 6 | Aprovada | Caixas da página atual. |
| 7 | Aprovada | "Ver em lista". |
| 8 | **Agora** | Mover em lote nesta fase, com `mover_documentos`. |
| 9 | **Os dois** | No celular, 3D e planta disponíveis; abre no 3D e lembra a última escolha. (Interpretação: se "os dois" quis dizer as duas vistas ao mesmo tempo, uma acima da outra, o responsável avisa no PR.) |
| 10 | Aprovada | `?galpao=grande` na demonstração. |
| 11 | Aprovada | Seletor de galpão. |
| 12 | **Conferir tudo; o canvas igual ao desenhado** | Seção "Fidelidade ao canvas", quadros da Fase 4 já desenhados pelo responsável (tarefa 0) e tarefa 8 (capturas lado a lado). |
| — | **Não descartar three.js / react-three-fiber**: "quero um 3D bonito e que funcione" | O 3D passa a ser three.js + react-three-fiber + drei (decisão 0008 no PR da implementação). SVG fica para a planta baixa e para o fallback sem WebGL. |

## Resultado

Implementado em um PR só (decisão 1). Teste de isolamento: `supabase/tests/mapa_isolamento.test.sql`.

Diferenças em relação ao plano:

- **Conferido:** quando quem move não é coordenador, o gatilho que já existia (`app.documento_conferir`) zera a conferência do documento movido, porque a troca de caixa conta como mudança. Comportamento mantido e registrado aqui; a Consulta não move.
- **Caixa destino:** caixa desativada dá LC004; caixa de outra prefeitura ou inexistente dá o mesmo 42501.
- **Salvar a planta:** vira a função `salvar_planta` (uma transação só). Elemento que sai da lista é desativado, nunca apagado.
- **Rótulos do 3D:** camada de HTML própria, projetada a cada quadro (o `Html` do drei quebrava o laço de desenho).
- **Demonstração:** ruas sem posição na planta ficam em leiaute automático; pesquisa abre o mapa com `?codigos=`.
- **Celular (resposta 9):** 3D e planta no mesmo seletor, abre no 3D e lembra a última escolha.
- **Ocupação do galpão:** lida em páginas, para passar do limite de linhas do PostgREST.

Não verificado localmente: pgTAP e Playwright (só rodam no CI); arrastar e salvar no editor; fps no galpão grande.

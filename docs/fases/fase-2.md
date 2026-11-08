# Fase 2 — Estrutura física

Status: **implementada, aguardando aprovação da demonstração** (2026-11-08).
O responsável aprovou todas as recomendações do fim e pediu a fase inteira
num PR só, com o link da demonstração para aprovar. Ver "Resultado" no fim.

Segue `docs/plano-de-desenvolvimento.md` (Modelo de dados: `galpoes`,
`ruas`, `modulos`, `niveis`, `caixas` com `prefeitura_id`; linha da Fase 2:
"Cadastro por listas de escolha, como no protótipo; ocupação calculada").
Telas de referência: canvas "LicCONT — Telas do sistema" (Estrutura física;
Planta baixa e Mapa 3D só como referência da nomenclatura, são da Fase 4).
Onde este texto e o plano divergirem, vale o que for aprovado aqui.

## Por quê

Na Fase 3 cada documento precisa de um endereço físico: "Rua B · Módulo 3 ·
Nível 3 · Caixa 02". Antes disso o arquivo precisa estar descrito no
sistema — galpões, ruas, módulos, níveis e caixas — e o administrador
precisa ver quanto espaço sobra. O mapa 3D, a planta baixa (Fase 4) e as
etiquetas (Fase 5) saem desta estrutura.

## Pronto quando

1. **pgTAP — isolamento por prefeitura** (`supabase/tests/estrutura_isolamento.test.sql`):
   nas 5 tabelas novas, usuário de outra prefeitura não lê, não insere e não
   altera (INSERT/UPDATE barrados pelo `WITH CHECK`). A chave composta
   `(pai_id, prefeitura_id)` impede rua, módulo, nível ou caixa de apontar
   para um pai de outra prefeitura, mesmo por `service_role`.
2. **pgTAP — papéis e secretarias:** usuário com vínculo só em Obras lê a
   estrutura inteira da própria prefeitura (é compartilhada, ver pergunta 1)
   e não escreve; coordenador, operador e consulta não escrevem (exceto o
   que a pergunta 2 decidir para caixas); administrador sem segundo fator,
   quando ele for obrigatório, não escreve; equipe LicCONT não lê; `anon`
   não tem nenhum privilégio; DELETE não tem GRANT para ninguém.
3. **pgTAP — capacidade:** caixa além da capacidade do nível é recusada;
   reduzir a capacidade abaixo das caixas ativas é recusado; desativar
   nível, módulo, rua ou galpão com caixas ativas é recusado; duas
   inclusões simultâneas na última posição não passam as duas (trava na
   linha do nível; e o único `(nivel_id, numero)` impede duas caixas na
   mesma posição).
4. **pgTAP — ocupação calculada:** a visão `estrutura_ocupacao` devolve
   capacidade e caixas que batem com a contagem, respeita o RLS (outra
   prefeitura vê zero linhas) e não guarda nada (nenhuma coluna de
   ocupação gravada).
5. **pgTAP — auditoria:** inclusão e alteração nas 5 tabelas entram em
   `auditoria` pelo gatilho `app.auditar_alteracao()`.
6. **Vitest:** soma e percentual de ocupação (arredondamento, nível sem
   capacidade, galpão vazio), código da posição (`B-M3-N3-C02`) e esquemas
   Zod das ações.
7. **Playwright** (`tests/e2e/estrutura.spec.ts`): administrador cria rua,
   gera módulos e níveis pelas listas de escolha, cadastra caixas e vê a
   ocupação mudar; coordenador cadastra caixas sem ver os controles de
   estrutura; perfil Consulta abre as telas só para leitura; axe sem falhas
   em todas as telas novas. A recusa de ação chamada direto fica provada no
   banco (pgTAP, critério 2) e conferida no servidor em cada ação. O modo
   demonstração (dados fictícios, toda ação devolve `AVISO_DEMO`) é
   conferido na prévia, porque o CI roda com banco.
8. Migrações compatíveis com a versão anterior do app (só adicionam),
   aplicadas pelo job `migracoes`; os checks atuais seguem verdes.

## Fora do escopo

- Mapa 3D, planta baixa, painel "Dentro da caixa" e "ir até a caixa" — Fase 4.
- Etiqueta e QR da caixa (código aleatório) — Fase 5.
- Documentos dentro da caixa e ocupação da caixa em documentos — Fase 3
  (ver pergunta 3).
- Mover caixa de lugar — entra com "mover documento" (Fase 3/4).
- Apagar qualquer parte da estrutura: só desativar (pergunta 6).
- Planta do galpão em escala (medidas, posição das ruas no desenho).

## Fracasso mesmo funcionando

- Uma rua ou caixa de outra prefeitura aparecendo em qualquer lista.
- Ocupação gravada numa coluna e desatualizada em relação às caixas.
- Caixa cadastrada numa posição que não existe ou acima da capacidade.
- Botão de editar escondido para quem não pode, mas a ação passando no
  servidor ou no banco.
- Parte da estrutura apagada e o histórico de onde um documento estava
  perdido.

## Modelo de dados (migração em `supabase/migrations/`)

Todas com RLS, GRANT explícito por coluna, sem GRANT para `anon` nem para
`service_role` (nenhuma tela do servidor precisa; o `seed.sql` roda como
dono). Mesmas convenções da Fase 1: `unique (id, prefeitura_id)` em cada
pai, chave estrangeira composta em cada filho, auditoria por gatilho.

| Tabela | Campos principais | Únicos |
| --- | --- | --- |
| `galpoes` | prefeitura_id, nome (3–80), ativo, criado_em | (prefeitura_id, nome) |
| `ruas` | prefeitura_id, galpao_id, codigo (`^[A-Z]{1,2}$`), ativo | (galpao_id, codigo) |
| `modulos` | prefeitura_id, rua_id, numero (1–99), ativo | (rua_id, numero) |
| `niveis` | prefeitura_id, modulo_id, numero (1–20), capacidade (1–200 caixas), ativo | (modulo_id, numero) |
| `caixas` | prefeitura_id, nivel_id, numero (1–capacidade), ativo, criado_em | (nivel_id, numero) |

Sem `secretaria_id` na estrutura: no protótipo uma mesma caixa guarda
documentos de várias secretarias (Saúde, Obras, Cultura). O filtro por
secretaria fica no documento (Fase 3), por `app.secretarias_permitidas()`.

### Quem lê e quem escreve

| Papel | Lê | Escreve |
| --- | --- | --- |
| Administrador (com segundo fator, quando obrigatório) | tudo da própria prefeitura | galpões, ruas, módulos, níveis, caixas |
| Coordenador | tudo da própria prefeitura | caixas, se a pergunta 2 aprovar |
| Operador, Consulta | tudo da própria prefeitura | nada |
| Equipe LicCONT | nada | nada |

Políticas só com funções `app.*` (nunca o JWT direto):

- Leitura: `prefeitura_id = (select app.prefeitura_atual())`.
- Escrita: o mesmo `and (select app.eh_admin())`; para caixas, se aprovado,
  `or` uma nova `app.eh_coordenador()` (tem algum vínculo `coordenador`).

GRANT por coluna (a hierarquia e a prefeitura não mudam depois de criadas):

- `insert` em todas as colunas de dado (`prefeitura_id`, pai, código ou
  número, nome, capacidade); `update` só em `nome`, `capacidade`, `ativo`.
- Nenhum `delete`.

### Capacidade e ocupação

- **Capacidade** mora no nível: quantas caixas cabem nele. "Adicionar
  módulos" (tela) cria módulos e níveis já com a capacidade escolhida em
  "Caixas por nível".
- **Ocupação** é calculada, nunca gravada: visão `public.estrutura_ocupacao`
  (`security_invoker = true`, respeita o RLS) com uma linha por nível
  ativo: galpao_id, rua_id, modulo_id, nivel_id, códigos, capacidade e
  caixas ativas. Rua, módulo e galpão somam essas linhas no servidor do app
  (poucas centenas por galpão). Percentual = caixas ÷ capacidade.
- Gatilhos (`app.*`, `search_path = ''`):
  - caixa nova ou reativada: trava a linha do nível (`for update`), recusa
    se o número passa da capacidade ou se o nível, módulo, rua ou galpão
    está inativo;
  - capacidade menor que o maior número de caixa ativa: recusa;
  - desativar pai com caixa ativa embaixo: recusa.
- "Adicionar módulos" vira uma função `public.adicionar_modulos(rua,
  quantidade, niveis_por_modulo, capacidade)` `security invoker` (o RLS
  vale), que grava tudo numa transação e numera a partir do último módulo.
  Limites por chamada: 20 módulos, 10 níveis, 50 caixas por nível
  (pergunta 7). EXECUTE só para `authenticated`. Mesmo esquema para
  `public.adicionar_caixas(nivel, quantidade)`, que ocupa as posições livres
  de menor número.

## Telas

Código em `src/features/estrutura/` (`dados.ts` com o ramo da
demonstração, `acoes.ts`, `esquemas.ts`, `ocupacao.ts`). Dados fictícios em
`src/features/demo/` (1 galpão, ruas A a D, números parecidos com os do
canvas); toda ação devolve `AVISO_DEMO` em demonstração. Item "Estrutura
física" no menu de `src/features/sessao/pagina.tsx`.

- **Estrutura física** (`/estrutura`, todos os perfis; edição só para quem
  pode, conferida no servidor), como no canvas:
  - cartões Ruas, Módulos, Níveis e Posições (caixas cadastradas e
    capacidade);
  - tabela "Ruas do galpão": rua, módulos, níveis, caixas, ocupação (%) e
    Editar; seletor de galpão quando houver mais de um;
  - árvore "Estrutura da rua": módulos → níveis com "N caixas";
  - "Últimas alterações": últimas linhas da auditoria da estrutura (só o
    administrador, que já lê a auditoria);
  - formulário "Adicionar módulos" com **listas de escolha**: Rua (lista),
    Módulos, Níveis por módulo e Caixas por nível (listas numéricas dentro
    dos limites), botão "Adicionar ao galpão";
  - "Nova rua" (próxima letra sugerida) e "Novo galpão".
- **Caixas** (na mesma tela ou `/estrutura/caixas`): listas dependentes
  Galpão → Rua → Módulo → Nível, mostra posições livres e cadastra uma ou
  várias caixas; desativar caixa vazia.
- **Editar** (rua, módulo, nível): nome, capacidade, ativar/desativar, com
  a mensagem do banco traduzida ("Este nível ainda tem caixas").

Erros do banco viram mensagens fixas em português; nada de dado pessoal em
log (não há dado pessoal nestas tabelas).

## Entregas e ordem (uma branch e um PR por tarefa)

| # | Branch | Entrega | Como provar |
| --- | --- | --- | --- |
| 1 | `fase-2/banco-estrutura` | Migração das 5 tabelas, gatilhos, visão de ocupação, `adicionar_modulos`, `adicionar_caixas`, auditoria, `seed.sql` fictício (1 galpão por prefeitura de teste) | pgTAP dos critérios 1 a 5 |
| 2 | `fase-2/tela-estrutura` | `/estrutura` só leitura com ocupação, menu, dados da demonstração | Vitest do critério 6; Playwright de leitura + axe; prévia em demonstração |
| 3 | `fase-2/cadastro-estrutura` | Novo galpão, nova rua, adicionar módulos por listas, editar e desativar | Playwright: administrador monta a rua; Consulta recusado no servidor |
| 4 | `fase-2/caixas` | Cadastro de caixas por listas dependentes, desativar caixa | Playwright: ocupação muda; capacidade cheia recusada |

Cada tarefa: teste que falha primeiro, revisão pelo `revisor-codigo` e pelo
`auditor-seguranca` antes do PR. Fechamento: seção "Resultado" neste
arquivo.

## O que você precisa fazer

Nada de chave ou painel nesta fase: não há serviço externo novo nem
variável nova. Só aprovar (ou mudar) as respostas abaixo.

## Perguntas que só o responsável decide

| # | Pergunta | Recomendação |
| --- | --- | --- |
| 1 | Galpão é **compartilhado** pela prefeitura ou cada secretaria tem o seu? | **Compartilhado.** O protótipo mostra caixa com documentos de várias secretarias; o sigilo por secretaria fica no documento (Fase 3). Se for por secretaria, entra `secretaria_id` e a política passa a usar `app.secretarias_permitidas()`. |
| 2 | Quem cadastra **caixas**: só o administrador ou também o coordenador? | **Administrador e coordenador.** Caixa nova chega todo dia; galpão, rua, módulo e nível continuam só do administrador. |
| 3 | **Ocupação da caixa** em documentos (caixa cheia) entra agora? | **Na Fase 3.** Sem documento não há o que contar; aqui a ocupação é de posições (caixas ÷ capacidade dos níveis). |
| 4 | Nomenclatura: ruas por letra, módulos/níveis/caixas por número, código `B-M3-N3-C02` para tela e etiqueta? | **Sim**, como no canvas. O código é calculado, não gravado. |
| 5 | Mais de um galpão por prefeitura? | **Sim no banco, seletor na tela só quando houver mais de um.** Custa quase nada agora e evita migração depois. |
| 6 | Parte da estrutura pode ser **apagada** ou só desativada? | **Só desativada**, e só quando vazia. Preserva o histórico e a auditoria. |
| 7 | Limites de "Adicionar módulos" por vez: 20 módulos, 10 níveis por módulo, 50 caixas por nível? | **Sim.** Evita clique errado gerar milhares de linhas; dá para repetir. |

## Decisões do responsável (2026-11-08)

Aprovadas todas as recomendações acima: galpão compartilhado pela
prefeitura; administrador e coordenador cadastram caixas; ocupação da caixa
em documentos na Fase 3; nomenclatura `B-M3-N3-C02`; mais de um galpão por
prefeitura; só desativar, nunca apagar; limites de 20 módulos, 10 níveis e
50 caixas por nível em cada "Adicionar módulos". Telas "tudo daquela forma"
(igual ao canvas). Fase inteira num PR só, aprovada pela demonstração.

## Resultado (2026-11-08)

Um PR (`fase-2/estrutura`), a pedido do responsável, em vez das 4 tarefas.

| Entrega | Onde |
| --- | --- |
| Tabelas, gatilhos de capacidade, visão de ocupação, `adicionar_modulos`, `adicionar_caixas`, auditoria, `app.eh_coordenador()` | `supabase/migrations/20261108200000_estrutura_fisica.sql` |
| Estrutura fictícia no seed (Galpão Central nas 2 prefeituras de teste) | `supabase/seed.sql` |
| pgTAP dos critérios 1 a 5 | `supabase/tests/estrutura_isolamento.test.sql` |
| Ocupação, código da posição, próxima rua, últimas alterações, esquemas (Vitest, critério 6) | `src/features/estrutura/*.test.ts` |
| Tela Estrutura física igual ao canvas (cartões, Ruas do galpão, árvore da rua, Últimas alterações, Adicionar módulos, Nova rua, Novo galpão, seletor de galpão) | `src/app/estrutura/page.tsx` |
| Tela da rua: módulos e níveis com ocupação; por nível, caixas, cadastrar e desativar caixa, capacidade, desativar nível | `src/app/estrutura/rua/[id]/page.tsx` |
| Demonstração (ruas A a D com 94%, 88%, 76% e 69%, como no canvas) | `src/features/demo/estrutura.ts` |
| Playwright com axe (critério 7) | `tests/e2e/estrutura.spec.ts` |

### O que mudou em relação ao plano

- **Coluna `ativo` em todas as tabelas** (o plano dizia `ativa` em ruas e
  caixas): um nome só para a mesma coisa.
- **Duas caixas na mesma posição** são barradas pelo único
  `(nivel_id, numero)`; os gatilhos travam a cadeia (`FOR SHARE`) contra
  redução de capacidade e desativação ao mesmo tempo. O pgTAP prova a
  posição repetida; a corrida em si não dá para provar numa transação só.
- **`adicionar_caixas` reativa** caixas desativadas antes de ocupar posição
  nova (a posição continua da caixa antiga).
- **Tela da rua** (`/estrutura/rua/[id]`), que o canvas não tem: é onde se
  cadastram caixas e se ajusta a capacidade, com o mesmo visual.
- **Menu para todos os perfis**: "Início" e "Estrutura física" aparecem
  para todos; "Usuários e perfis" e "Secretarias" só para o administrador.
- **Cartões com linha acumulada rua a rua** (o canvas tem uma linha
  decorativa; aqui ela mostra os números reais de A até a última rua).
  O cartão Posições mostra "caixas de N posições · X%".
- A moldura com a barra lateral de ícones do canvas vale para todas as
  telas e ainda não existe no app (as telas da Fase 1 usam o cabeçalho de
  cima). Fica para um PR próprio, depois desta fase.
- **`service_role` sem privilégio** nas tabelas novas (revogado na
  migração): nenhuma tela do servidor precisa delas.

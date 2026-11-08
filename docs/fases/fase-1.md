# Fase 1 — Acesso

Status: **aprovado em 2026-11-08**, em construção.
Segue `docs/plano-de-desenvolvimento.md` (Modelo de dados, Papéis, Regras do
login, Controles técnicos, linha da Fase 1). Telas de referência: canvas
"LicCONT — Telas do sistema" (Login, Login 1 — escolher prefeitura,
Usuários e perfis, Prefeituras). Onde este texto e o plano divergirem, vale
o que for aprovado aqui.

## Por quê

Antes de qualquer documento real entrar, o sistema precisa saber quem é a
pessoa, de qual prefeitura ela é e quais secretarias pode ver — e o banco
precisa recusar o resto mesmo que o código erre. A Fase 1 entrega isso, com
a auditoria já ligada para que toda fase seguinte nasça registrada.

## Pronto quando

1. Teste pgTAP prova que um usuário **não lê** (nem insere, nem altera)
   dado de outra prefeitura, nem de secretaria sem vínculo. Inclui
   INSERT/UPDATE barrados pelo `WITH CHECK`.
2. Usuário bloqueado ou com sessões encerradas perde o acesso **na hora**
   (não espera o token de 1 hora vencer) — provado em pgTAP.
3. Administrador sem o segundo fator não consegue gerir usuários — provado
   em pgTAP.
4. Auditoria não aceita UPDATE nem DELETE de ninguém — provado em pgTAP.
5. Playwright: login em duas etapas de ponta a ponta; mensagem de erro
   idêntica para e-mail inexistente e senha errada; bloqueio após tentativas;
   saída por inatividade; axe sem falhas nas telas novas.
6. Migrações aplicadas em produção pelo CI depois do merge (decisão abaixo).
7. Os 7 checks atuais seguem verdes, mais o novo job de migração no `main`.

## Fora do escopo

- Painel completo da equipe LicCONT (plano, mensalidade, contagem de
  documentos) — Fase 8. Aqui só o mínimo para cadastrar prefeitura e o
  primeiro administrador.
- Aceite de termo de uso e política de privacidade — depende do texto do
  advogado. Entra quando o texto existir.
- "Confiar neste aparelho por 30 dias" — o Supabase não oferece; exige
  guardar um segredo por aparelho. Reavaliar depois do piloto. Até lá, o
  segundo fator é pedido a cada login de administrador e equipe.
- Banco de homologação (decisão 0001, opção B). Prévias da Vercel continuam
  sem chave de banco: as telas abrem, o login não funciona nelas.
- Qualquer tabela de acervo (documentos, caixas etc.).

## Fracasso mesmo funcionando

- Uma linha de outra prefeitura aparecendo em qualquer consulta.
- A tela de login revelando se um e-mail existe (texto, tempo de resposta
  muito diferente ou código HTTP).
- `service_role` usado em código que roda no navegador.
- E-mail, senha ou nome em log, mensagem de erro ou tabela de tentativas.
- Migração que quebra a versão do app que ainda está no ar.

## Decisão já tomada pelo responsável

**O CI aplica as migrações em produção sozinho** (2026-11-08). Vira a
decisão `docs/decisoes/0005-migracoes-pelo-ci.md`:

- Novo job `migracoes` no `ci.yml`, só em `push` no `main`, depois de
  `lint`, `tipos`, `vitest`, `playwright`, `pgtap`, `semgrep` e `gitleaks`
  passarem. `concurrency` próprio, sem cancelar no meio.
- Passos: `supabase/setup-cli` 3.0.0 → `supabase db push
  --remote="$SUPABASE_DB_URL"`.
- Segredo (GitHub → Settings → Secrets and variables → Actions → New
  repository secret): `SUPABASE_DB_URL`, a string de conexão do Session
  pooler do projeto LicCont. Sem token da conta Supabase, que abriria
  também os projetos do Prummo (achado da revisão de segurança).
- Riscos e travas:
  - A Vercel publica o app ao mesmo tempo, sem esperar a migração. Regra:
    toda migração é **compatível com a versão anterior do app** (adicionar
    antes, remover num PR seguinte — "expandir e depois contrair").
  - O plano gratuito não tem backup diário. Antes de migração que apaga ou
    altera dado, o PR traz o passo de `supabase db dump` feito à mão.
  - PR de branch deste repositório recebe o segredo e pode alterar o
    `ci.yml`: todo PR que mexe em `.github/` é conferido linha a linha.

## Modelo de dados (migrações em `supabase/migrations/`)

Todas com RLS, GRANT explícito só para quem precisa (inclusive
`service_role`, achado da Fase 0) e teste de isolamento.

| Tabela | Campos principais | Quem lê | Quem escreve |
| --- | --- | --- | --- |
| `prefeituras` | nome, cnpj, status (implantacao, ativa, suspensa) | equipe; usuário lê só a própria | equipe |
| `secretarias` | prefeitura_id, nome, ativa | usuários da prefeitura | admin da prefeitura |
| `usuarios` | id (= `auth.users.id`), prefeitura_id, nome, matricula, ativo | o próprio; admin da prefeitura | admin da prefeitura |
| `vinculos` | prefeitura_id, usuario_id, secretaria_id, papel | o próprio; admin | admin |
| `equipe_liccont` | usuario_id | ninguém pela API | só migração / SQL do responsável |
| `auditoria` | prefeitura_id, usuario_id, acao, alvo, antes, depois, ip, aparelho, criado_em | admin da própria prefeitura | só pela função `app.registrar()`; UPDATE/DELETE barrados por gatilho |
| `tentativas_login` | hash do e-mail, ip, sucesso, criado_em | ninguém pela API | só o servidor |

O e-mail fica só em `auth.users` (Supabase Auth); `usuarios` não repete.
`tentativas_login` guarda o **hash** do e-mail, nunca o e-mail.

### De onde vem o vínculo (troca a origem provisória da Fase 0)

As políticas continuam chamando só funções do esquema `app`. Elas passam a
ler as **tabelas**, não o token:

- `app.prefeitura_atual()` — `prefeitura_id` de `usuarios` onde
  `id = auth.uid()`, `ativo = true` **e** a sessão do token ainda existe em
  `auth.sessions`. Bloquear o usuário ou encerrar as sessões dele corta o
  acesso na hora, sem esperar o token vencer.
- `app.secretarias_permitidas()` — as secretarias dos vínculos do usuário;
  para o administrador, todas as da prefeitura.
- `app.eh_admin()` — tem papel de administrador **e** o token é de segundo
  fator (`aal2`). Sem o código do autenticador, o administrador não tem
  poderes de administrador.
- `app.eh_equipe()` — está em `equipe_liccont` e o token é `aal2`.

Funções `security definer`, `search_path = ''`, EXECUTE só para
`authenticated`. O teste da convenção da Fase 0 é ajustado para o novo
modelo.

Uma pessoa pertence a **uma** prefeitura (o e-mail é único no Supabase
Auth). Servidor de duas prefeituras usa dois e-mails institucionais.

A secretaria escolhida na tela de login é um **filtro da tela**, guardado
na sessão do app. A trava do banco é o conjunto de vínculos: quem tem
vínculo com Saúde e Obras e escolheu Saúde não vê Obras na tela, mas o
banco permitiria. Trocar de secretaria não exige novo login e fica na
auditoria.

## Papéis (decidido: os 4 do canvas)

| Papel | Pode |
| --- | --- |
| Administrador | Tudo na própria prefeitura, todas as secretarias; gere usuários, secretarias, estrutura física e temporalidade; vê a auditoria |
| Coordenador | Nas secretarias vinculadas: cadastra, empresta, descarta e aprova termos |
| Operador | Nas secretarias vinculadas: cadastra documentos e registra empréstimos |
| Consulta | Nas secretarias vinculadas: pesquisa e vê etiquetas |

A matriz de permissões do canvas ("Permissões por perfil") vira uma função
`app.pode(acao, secretaria_id)` na tarefa 3. Na Fase 1 só "gerenciar
usuários" e "ver auditoria" têm efeito; as demais ações ganham política
quando as tabelas delas nascerem.

Equipe LicCONT fica fora dessa lista: cadastra prefeitura e o primeiro
administrador e **não lê o acervo**.

## Login (decidido: como no canvas)

Decisão do responsável: a secretaria é escolhida **na mesma tela** do
e-mail e da senha, como no canvas. Isso substitui a regra 2 do plano
("a lista mostra apenas as secretarias com vínculo").

1. **Tela 1 — Prefeitura** (canvas "Login 1"). Lista de prefeituras
   ativas, só nome. Guarda o identificador num cookie.
2. **Tela 2 — Secretaria, e-mail e senha** (canvas "Login"). Mostra a
   prefeitura escolhida com o link "Trocar". A lista traz todas as
   secretarias ativas da prefeitura e a opção "Todas as secretarias".
3. **Segundo fator** — só administrador e equipe. Primeiro acesso: cadastra
   o autenticador (QR do TOTP).
4. **Troca de senha obrigatória** se a senha for provisória (ver abaixo).

As duas listas vêm de funções que devolvem só `id` e `nome` das
prefeituras/secretarias ativas, liberadas para `anon`. Motivo registrado:
o nome de órgão cliente e de suas secretarias é informação pública. Elas
não devolvem nada de usuário.

Regras:

- Uma só mensagem de erro para tudo: e-mail inexistente, senha errada,
  usuário de outra prefeitura, secretaria sem vínculo, "Todas" escolhida por
  quem não é administrador, usuário bloqueado: "Não foi possível entrar.
  Confira os dados ou fale com o administrador da sua prefeitura."
- Equipe LicCONT entra por um endereço próprio (`/equipe/entrar`), sem
  escolher prefeitura.
- Trocar de secretaria dentro do sistema, sem novo login, entre as que têm
  vínculo; fica na auditoria.
- Tudo por Server Action com Zod. Nenhuma chave privilegiada no navegador.

## Controles técnicos desta fase

| Controle | Como |
| --- | --- |
| Senha mínima de 12 | `minimum_password_length = 12` no `config.toml` e no painel do Supabase; Zod também checa |
| Senha vazada | Decidido: consulta ao Have I Been Pwned (gratuito) na hora de definir ou trocar senha, pelo servidor, enviando só os 5 primeiros caracteres do hash SHA-1 (k-anonimato). Se o serviço não responder, aceita a senha e registra o fato na auditoria (sem a senha). Decisão `docs/decisoes/0006-checagem-de-senha-vazada.md` e entrada em `docs/lgpd/suboperadores.md` como ferramenta sem dado pessoal |
| Dois fatores | TOTP do Supabase Auth (gratuito), obrigatório para administrador e equipe, exigido também pelo banco (`aal2`) |
| Cadastro público | Desligado: `enable_signup = false` no `config.toml` e no painel |
| Força bruta | Além do limite do Supabase por IP: 5 falhas em 15 min por conta ou 20 por IP → bloqueio de 15 min, contado em `tentativas_login` |
| Inatividade | 30 min sem uso → sai. Cookie `HttpOnly` com a hora da última ação, conferido no `proxy.ts` do Next em toda requisição (o tempo de inatividade do Supabase é do plano pago) |
| Encerrar sessões | Administrador encerra as sessões de um usuário (apaga em `auth.sessions` por função do servidor); o acesso cai na hora pela regra de `app.prefeitura_atual()` |
| Navegador | CSP com hash do script de tema (pendência da Fase 0), `frame-ancestors 'none'`, HSTS, cookies `HttpOnly`, `Secure`, `SameSite=Lax` |
| Logs | Nenhum e-mail, senha ou nome em `console` ou erro; erro do Supabase vira mensagem genérica |

## Auditoria básica

Função única `app.registrar(acao, alvo, antes, depois, ip, aparelho)`,
chamada pelo servidor. Eventos desta fase: entrada, falha de entrada (sem
e-mail), saída, saída por inatividade, troca de secretaria, segundo fator
ativado, usuário criado/alterado/bloqueado, vínculo criado/removido,
sessões encerradas, prefeitura criada. `antes`/`depois` nunca levam senha.
O administrador vê a auditoria da própria prefeitura; a tela de auditoria
completa é de fase posterior.

## Como o usuário recebe a senha (decidido: sem e-mail na Fase 1)

- O administrador cadastra o usuário e define uma **senha provisória**,
  que passa a ele por fora do sistema. Mesma coisa para o primeiro
  administrador, cadastrado pela equipe LicCONT.
- `usuarios.troca_senha_obrigatoria = true`. Enquanto estiver assim,
  `app.prefeitura_atual()` devolve nulo (o banco não mostra nada) e o app
  só abre a tela de nova senha.
- "Esqueci a senha" mostra: "Peça ao administrador da sua prefeitura uma
  senha provisória." O administrador tem a ação "Redefinir senha".
- "Convidar usuário" do canvas vira "Cadastrar usuário".
- E-mail transacional fica para antes do piloto (decisão e suboperador
  próprios). A linha "a escolher" em `suboperadores.md` continua.

## Telas desta fase

Com a marca do canvas (tarefa 2):

- Login 1 (prefeitura), Login (e-mail e senha), segundo fator, escolha da
  secretaria, seletor de secretaria dentro do sistema, botão Sair.
- Usuários e perfis (administrador): lista, cadastrar, editar papel e
  vínculos, bloquear, encerrar sessões.
- Secretarias (administrador): cadastrar e desativar.
- Prefeituras (equipe, mínimo): nome, CNPJ, status e primeiro
  administrador.
- Tela de nova senha (primeiro acesso e depois de redefinição).

## Entregas e ordem (uma branch e um PR por tarefa)

| # | Branch | Entrega | Como provar |
| --- | --- | --- | --- |
| 1 | `fase-1/migracoes-ci` | Job `migracoes` + decisão 0005 | Merge aplica uma migração sem efeito (só comentário) e o job fica verde |
| 2 | `fase-1/marca` | Guia em `docs/marca/` a partir do canvas; tokens de texto, linhas e superfícies em `src/app/globals.css`; IBM Plex Sans no texto e Sora nos títulos (via `next/font`, servida pelo próprio app) | Testes atuais + axe verdes; prévia da Vercel |
| 3 | `fase-1/banco-acesso` | Tabelas, funções `app.*`, auditoria, tentativas, `config.toml` (signup desligado, senha 12), `seed.sql` fictício com 2 prefeituras | pgTAP dos critérios 1 a 4 |
| 4 | `fase-1/login` | Telas 1 e 2, Server Actions, mensagem única, limite de tentativas, troca de senha obrigatória com checagem de vazamento, inatividade, Sair, CSP; decisão 0006; job do Playwright passa a subir o Supabase local | Playwright do critério 5 |
| 5 | `fase-1/dois-fatores` | Cadastro e verificação do TOTP; troca de secretaria dentro do sistema | Playwright + pgTAP do `aal2` |
| 6 | `fase-1/usuarios` | Telas de usuários, secretarias e prefeituras (mínimo); encerrar sessões | Playwright: admin cria usuário que entra só na secretaria vinculada |

Cada tarefa: teste que falha primeiro, revisão pelo `revisor-codigo` e pelo
`auditor-seguranca` antes do PR.

## O que você precisa fazer (sem colar nada no chat)

- **GitHub → Settings → Secrets and variables → Actions:**
  `SUPABASE_DB_URL` (antes do merge da tarefa 1).
- **Vercel → Settings → Environment Variables (só Production):**
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e
  `SUPABASE_SERVICE_ROLE_KEY` (servidor; criar usuário exige) — antes do
  merge da tarefa 4.
- **Painel do Supabase (projeto LicCont) → Authentication:** desligar
  "Allow new users to sign up"; senha mínima 12; Site URL
  `https://lic-cont.vercel.app`; conferir TOTP ligado em Multi-Factor.
- Pôr o seu usuário da equipe LicCONT em `equipe_liccont` (passo a passo
  no PR da tarefa 6, por SQL, sem dado no repositório).
- Ligar os alertas do Dependabot (Settings → Code security), pendente da
  Fase 0.

## Decisões do responsável (2026-11-08)

1. CI aplica as migrações em produção sozinho.
2. Login como no canvas: secretaria na mesma tela do e-mail e senha.
3. Papéis: os 4 do canvas.
4. Sem e-mail na Fase 1: senha provisória pelo administrador.
5. Senha vazada: Have I Been Pwned.

# LicCONT — Plano de desenvolvimento

Nov 8, 2026 · @Karoeny

O LicCONT será construído como produto próprio, em repositório separado do Prummo, com a mesma base técnica e um processo de engenharia com testes, revisão e segurança desde o primeiro dia.

## Decisões assumidas e o que falta decidir

Assumi as decisões abaixo para não travar o plano. Todas podem ser trocadas antes da Fase 0.

| Tema | Decisão assumida | Por quê |
| --- | --- | --- |
| Stack | Next.js na Vercel + Supabase (Postgres, Auth, Storage) | Mesma do Prummo: você já domina a publicação e o custo é conhecido |
| Repositório | Novo, separado do Prummo (`liccont`) | Produto vendido à parte, com dados e contratos próprios |
| Região dos dados | Supabase em São Paulo (sa-east-1) | Dados de órgão público ficam no Brasil |
| Ferramentas do Claude Code | Superpowers (processo), Ponytail (código enxuto), Graphify (mapa do código) | Seu pedido |
| Publicação | Branch por tarefa, revisão sua, main publica sozinho | Mesmo fluxo aprovado no Prummo |
| Piloto | Prefeitura de Caririaçu | Já é o piloto do Prummo; trocar se preferir outra |

**Falta você decidir:**

- [ ] Confirmar a prefeitura piloto. (CARIRIAÇU)
- [x] Fazer ou não um teste de invasão (pentest) por empresa externa antes da primeira venda. Recomendo fazer.
- [ ] Quem será o encarregado de dados (DPO) do lado do LicCONT, você ou o sócio. (OS DOIS)
- [x] Revisão jurídica do contrato e dos termos de LGPD por um advogado.

## Visão geral e escopo da v1

A v1 entrega o arquivo morto completo de licitações e contratos: localizar qualquer documento físico em segundos, saber com quem ele está e quando pode ser descartado.

**Entra na v1**

- Login em duas etapas: prefeitura, depois secretaria, e-mail e senha.
- Perfis e permissões por secretaria.
- Estrutura física: galpão, ruas, módulos, níveis e caixas.
- Cadastro de documento (licitação ou contrato), com PDF opcional.
- Pesquisa com painel de filtros compacto no topo: busca única por número do processo, objeto, credor ou CNPJ; abas Todos, Licitações e Contratos com contagem; filtros de Período (ano inicial e final), Licitação (modalidade e secretaria) e Contratos (situação, valor e vigência); botão Limpar; total de documentos encontrados e atalho "Ver no mapa 3D". Lista de resultados e painel do documento logo abaixo.
- Mapa 3D, planta baixa e painel "Dentro da caixa" ligados ao banco.
- Etiqueta com QR code e leitura pelo celular.
- Empréstimo e devolução, com prazo e alerta de atraso.
- Temporalidade e descarte, com termo de eliminação.
- Auditoria de todas as ações.
- Painel da equipe LicCONT para cadastrar prefeituras e acompanhar o uso.
- Temas claro e escuro, iguais às telas aprovadas no canvas.

**Fica para depois**

- Digitalização em lote e leitura de texto (OCR) dos PDFs, em fila de segundo plano.
- Integração com outros sistemas da prefeitura e com o Prummo.
- IA para busca e classificação, que só entra com contrato e aprovação específicos.
- Aplicativo instalável; na v1 o celular usa o site responsivo.

## Arquitetura e stack

Uma aplicação única atende todas as prefeituras, e o isolamento entre elas fica no próprio banco, não só no código.

&#91;embedded content: arquitetura do LicCONT · Vercel, Supabase e GitHub\]

| Camada | Tecnologia | Papel |
| --- | --- | --- |
| Interface | Next.js (App Router), TypeScript estrito, Tailwind | Telas do canvas, tema claro e escuro |
| Regras | Ações no servidor + Zod | Toda entrada validada no servidor antes do banco |
| Banco | Postgres (Supabase) com RLS | Isolamento por prefeitura e secretaria |
| Arquivos | Supabase Storage privado | PDFs e imagens de etiqueta |
| Mapa 3D | three.js + react-three-fiber (planta baixa e reserva sem WebGL em SVG) | 3D de verdade com giro; decisão 0008 |
| QR code | Biblioteca `qrcode` no servidor | QR leva a um link interno que exige login |
| Documentos | PDF e Word com timbrado | Etiquetas, termo de empréstimo, termo de eliminação |
| Testes | Vitest, Playwright, pgTAP | Unidade, ponta a ponta e regras do banco |

## Modelo de dados e isolamento

Toda tabela com dado de cliente carrega `prefeitura_id`, e as de acervo carregam também `secretaria_id`; o banco só devolve linhas que batem com o vínculo do usuário logado.

| Tabela | O que guarda | Chave de isolamento |
| --- | --- | --- |
| `prefeituras` | Nome, CNPJ, brasão, plano contratado, status | — (só equipe LicCONT) |
| `secretarias` | Secretarias de cada prefeitura | `prefeitura_id` |
| `usuarios` | Perfil ligado ao Auth: nome, e-mail, ativo | `prefeitura_id` |
| `vinculos` | Usuário × secretaria × papel | `prefeitura_id`, `secretaria_id` |
| `galpoes`, `ruas`, `modulos`, `niveis`, `caixas` | Estrutura física e capacidade | `prefeitura_id` |
| `documentos` | Tipo, modalidade, número/ano, objeto, empresa, valor, situação, caixa | `prefeitura_id`, `secretaria_id` |
| `arquivos` | PDF no Storage, hash, tamanho | `prefeitura_id`, `secretaria_id` |
| `emprestimos` | Documento, quem retirou, prazo, devolução | `prefeitura_id`, `secretaria_id` |
| `tabela_temporalidade` | Prazo de guarda por tipo de documento | `prefeitura_id` |
| `descartes` | Termo de eliminação, documentos, aprovadores | `prefeitura_id` |
| `etiquetas` | Lote impresso, código do QR | `prefeitura_id` |
| `auditoria` | Quem, o quê, quando, de onde, antes e depois | `prefeitura_id` (só inclusão) |

**Papéis**

| Papel | Pode |
| --- | --- |
| Equipe LicCONT | Cadastrar prefeituras e o primeiro administrador; não lê o acervo sem autorização registrada |
| Administrador da prefeitura | Ver todas as secretarias, gerir usuários, estrutura física e temporalidade |
| Arquivista | Cadastrar, mover, emprestar e devolver nas secretarias vinculadas |
| Consulta | Pesquisar e ver documentos das secretarias vinculadas |

**Regras do login**

1. A pessoa escolhe a prefeitura; o sistema guarda só o identificador dela na sessão.
2. Na segunda tela, a lista de secretarias mostra apenas as que o usuário tem vínculo; o administrador vê também "Todas".
3. Trocar de secretaria é possível dentro do sistema, sem novo login, e fica na auditoria.
4. A mensagem de erro do login é sempre a mesma, para não revelar se o e-mail existe.

## Segurança e LGPD

A segurança é construída em camadas: se uma falhar, a próxima ainda protege o dado. A parte jurídica da LGPD precisa de revisão de advogado antes da primeira venda.

**Papéis na LGPD**

- A prefeitura é a controladora dos dados; o LicCONT é o operador.
- Cada contrato traz um anexo de tratamento de dados: finalidade, dados tratados, suboperadores (Vercel, Supabase, envio de e-mail), prazo de guarda e devolução ao fim do contrato.
- Política de privacidade e termo de uso aceitos no primeiro acesso, com registro da aceitação.
- Canal para pedidos de titulares encaminhados ao encarregado da prefeitura.

**Controles técnicos**

| Área | Controle |
| --- | --- |
| Isolamento | RLS em todas as tabelas; teste automatizado que tenta ler dado de outra prefeitura e precisa falhar |
| Autenticação | Senha de no mínimo 12 caracteres e checada contra vazamentos; dois fatores obrigatórios para administrador e equipe LicCONT |
| Sessão | Saída após 30 min sem uso; "confiar neste aparelho" por 30 dias, exceto equipe LicCONT; encerrar sessões remotamente |
| Força bruta | Limite de tentativas por IP e por conta, com bloqueio temporário |
| Permissão | Menor privilégio; checagem no servidor em toda ação, nunca só escondendo o botão |
| Entradas | Validação com Zod no servidor; consultas parametrizadas; upload só de PDF, com checagem do tipo real e tamanho máximo |
| Navegador | CSP restritiva, HSTS, proteção contra clickjacking e cookies `HttpOnly`, `Secure`, `SameSite` |
| Arquivos | Storage privado; links assinados de poucos minutos; nome do arquivo trocado por identificador |
| QR code | O QR leva a um endereço interno com código aleatório; sem login, não mostra nada |
| Segredos | Chaves só nas variáveis da Vercel e do GitHub; busca automática de segredos a cada commit |
| Auditoria | Tabela só de inclusão, sem permissão de alterar ou apagar, com IP e aparelho |
| Logs | Sem CPF, senha ou conteúdo de documento nos logs de erro |
| Backup | Backup diário com recuperação pontual e teste de restauração a cada trimestre |
| Dependências | Atualização automática e alerta de vulnerabilidade no GitHub |

**Minimização de dados pessoais**

- Dos servidores: nome, e-mail institucional e matrícula. CPF só se a prefeitura exigir, e mascarado na tela.
- Das empresas: razão social e CNPJ, que são dados públicos de licitação.
- O conteúdo dos PDFs é do acervo da prefeitura; o LicCONT não o lê nem processa.

**Incidentes**

- Plano escrito de resposta: conter, avaliar, avisar a prefeitura e apoiar a comunicação à ANPD e aos titulares no prazo da regulamentação.
- Contato de segurança publicado (`SECURITY.md` e página do site).

## PDFs e digitalizações

Os PDFs não deixam o sistema lento porque as telas usam só os dados do documento; o arquivo é baixado apenas quando alguém clica para abrir. O original nunca é comprimido com perda, para manter o valor legal.

**Regras do [Decreto nº 10.278/2020](https://planalto.gov.br/ccivil_03/_ato2019-2022/2020/decreto/d10278.htm) que o sistema segue**

| Documento | Resolução mínima | Formato |
| --- | --- | --- |
| Textos impressos | 300 dpi | PDF/A |
| Textos com ilustração ou cores, manuscritos | 300 dpi | PDF/A |
| Plantas e mapas | 600 dpi | PNG |

Se houver compressão no original, ela precisa ser sem perda. Metadados e assinatura digital para substituir o papel ficam para confirmar com o advogado.

**Como o sistema trata cada arquivo**

1. **Envio direto ao armazenamento**, em partes, retomando se a internet cair; o documento aparece cadastrado na hora.
2. **Checagem no envio:** confere se o arquivo abre, se não tem senha nem está corrompido, e a resolução. Abaixo do mínimo, avisa que a digitalização pode não ter valor legal.
3. **Aviso de página ruim:** páginas em branco, escuras demais ou tortas são apontadas antes de salvar.
4. **Duas versões:** o original intacto, que vale legalmente, e uma cópia leve gerada em segundo plano só para ver na tela.
5. **Visualizador próprio**, página por página, com zoom, igual em qualquer navegador e no celular; se a cópia leve falhar, abre o original.
6. **Botão "Baixar original"** sempre disponível para quem tem permissão.
7. **Miniatura da primeira página** na lista e no painel "Dentro da caixa".
8. **Leitura de texto (OCR) em fila**, numa fase posterior, para a pesquisa achar palavras dentro da digitalização.

**Limites e custos**

- Tamanho máximo por arquivo configurável por prefeitura (ponto de partida: 50 MB).
- Listas paginadas e índices no banco: a pesquisa não depende da quantidade de PDFs.
- O que cresce com os PDFs é o espaço ocupado; a mensalidade inclui uma faixa de armazenamento e cobra o excedente.
- Uma digitalização borrada, cortada ou escura não tem conserto no sistema; a implantação entrega uma orientação curta para quem digitaliza.

## Repositório e fluxo de trabalho

O código é organizado por funcionalidade, e cada mudança segue o mesmo ciclo: plano, teste, código, revisão, aprovação sua.

**Estrutura de pastas**

```
liccont/
  CLAUDE.md              regras do projeto para o Claude Code
  SECURITY.md            como reportar falhas
  docs/
    arquitetura.md
    decisoes/            uma decisão por arquivo (ADR)
    fases/               plano de cada fase
    lgpd/                mapa de dados, anexo contratual, plano de incidentes
  supabase/
    migrations/          banco versionado, com RLS
    tests/               testes das regras do banco (pgTAP)
    seed.sql             dados fictícios para desenvolvimento
  src/
    app/                 rotas e telas
    features/            login, acervo, estrutura, emprestimos,
                         temporalidade, etiquetas, auditoria, admin
    lib/                 supabase, segurança, validação, pdf
    ui/                  componentes e tema (cores e fontes do LicCONT)
  tests/e2e/             Playwright
  .github/workflows/     testes e checagens
```

**Papel de cada ferramenta**

| Ferramenta | Quando entra | O que garante |
| --- | --- | --- |
| Superpowers | Do início ao fim de cada tarefa | Brainstorm, plano escrito, teste antes do código, revisão por outro agente |
| Ponytail | Ao escrever código | Só o código necessário, reaproveitando o que já existe |
| Graphify | Antes de mexer em qualquer parte | Mapa do código para achar o que muda e gastar menos tokens |
| Revisão de segurança | Antes de cada PR ir para o main | Checklist de RLS, permissão, entradas e dados pessoais |

**Ciclo de cada tarefa**

1. Atualizar o mapa com o Graphify e ler o trecho afetado.
2. Escrever o plano curto da tarefa em `docs/fases/`.
3. Escrever o teste que falha.
4. Escrever o mínimo de código para passar.
5. Rodar revisão de código e de segurança.
6. Abrir o PR com o que mudou, como testar e a lista de chaves ou assinaturas que faltam.
7. Você aprova; o main publica na Vercel e aplica as migrações no Supabase sozinho.

**Regras fixas no CLAUDE.md**

- Nenhuma tabela nova sem RLS e sem teste de isolamento.
- Nenhuma chave privilegiada no navegador.
- Nenhum dado pessoal em log ou em mensagem de erro.
- Nenhum serviço externo novo sem registro em `docs/decisoes/` e na lista de suboperadores.
- Textos da interface em português, com as fontes e cores da marca.

## Fases de construção

São onze etapas; cada uma só começa depois que a anterior passa nos critérios de pronto e você aprova. Ordem a partir da Fase 7: Fase 9 (antes do piloto), Site inicial e, por último, a Fase 8 (conferência geral).

| Fase | Entrega | Pronta quando |
| --- | --- | --- |
| 0 · Fundação | Repositório, CLAUDE.md, CI, ambientes de teste e produção, tema e componentes base | CI roda testes, lint, checagem de tipos e busca de segredos em todo PR |
| 1 · Acesso | Prefeituras, secretarias, usuários, vínculos, login em duas etapas, dois fatores, saída por inatividade, auditoria básica | Teste prova que um usuário não lê outra prefeitura nem secretaria sem vínculo |
| 2 · Estrutura física | Galpões, ruas, módulos, níveis, caixas, capacidade e ocupação | Cadastro por listas de escolha, como no protótipo; ocupação calculada |
| 3 · Documentos | Cadastro, edição, upload de PDF com checagem e cópia leve, visualizador, pesquisa com o painel de filtros aprovado (busca única, abas por tipo, Período, Licitação e Contratos) | Pesquisa responde em menos de 1 s com 100 mil documentos de teste, combinando qualquer filtro; contagem das abas atualiza junto |
| 4 · Mapa | Mapa 3D, planta baixa, painel "Dentro da caixa", ir até a caixa | Clicar numa caixa mostra os documentos reais dela |
| 5 · Etiquetas e QR | Geração e impressão em lote, leitura pelo celular | QR lido no celular abre a caixa só depois do login |
| 6 · Empréstimos | Retirada, devolução, prazo, alerta de atraso, termo em PDF e Word | Documento emprestado aparece como tal no mapa e na pesquisa |
| 7 · Temporalidade | Tabela de prazos, fila de descarte, termo de eliminação com aprovação | Nenhum documento é apagado sem termo aprovado e registrado |
| 8 · Prontidão (por último, código entregue; ver `docs/pendencias.md`) | Painel da equipe LicCONT, relatórios, documentação de LGPD, revisão de segurança, pentest se aprovado | Checklist de segurança completo e piloto rodando com dados reais |
| 9 · Importação, TCE-CE, painel e relatórios (código entregue; ver `docs/pendencias.md`) | Importação do acervo (planilha e PDFs em zip), importação do TCE-CE com fila de conferência, PDFs do PNCP, painel `/painel` e cinco relatórios em PDF e planilha. Plano: `docs/fases/fase-9.md` | Antes do piloto. Painel abre em menos de 2 s com 100 mil documentos de teste; nada importado sobrescreve documento existente |
| Site inicial (entregue; ver `docs/pendencias.md`) | Página pública em `/` para visitante, com "Pedir demonstração". Plano: `docs/fases/site-inicial.md` | Visitante vê o site; quem está logado vai ao sistema; formulário validado no servidor |

A Fase 1 já nasce com a auditoria, para que toda ação das fases seguintes seja registrada desde o primeiro dia.

## Testes e qualidade

Nenhum PR entra no main com teste falhando, e o isolamento entre prefeituras tem testes próprios que rodam em todo PR.

| Tipo | Ferramenta | Cobre |
| --- | --- | --- |
| Regras do banco | pgTAP | RLS de cada tabela, auditoria que não aceita alteração, gatilhos |
| Unidade | Vitest | Prazo de empréstimo, cálculo de temporalidade, validações |
| Ponta a ponta | Playwright | Login em duas etapas, cadastro, pesquisa, empréstimo, descarte, mapa |
| Isolamento | Playwright + pgTAP | Usuário da prefeitura A tentando ler, editar e baixar dado da B |
| Estática | ESLint, TypeScript estrito, Semgrep | Erros comuns e padrões inseguros |
| Dependências e segredos | Dependabot, Gitleaks | Bibliotecas vulneráveis e chaves vazadas |
| Acessibilidade | axe no Playwright | Contraste, rótulos e navegação por teclado |

Meta de cobertura: 80% nas regras de negócio e 100% nas políticas de RLS.

## Assinaturas, chaves e equipamentos

O código fica pronto para receber cada chave; você só contrata e cola nas variáveis de ambiente. Os preços entram na proposta depois de conferidos.

| Item | Para quê | Quando |
| --- | --- | --- |
| Supabase (plano pago) | Backup diário, recuperação pontual, sem pausa por inatividade | Antes do piloto |
| Vercel (plano pago) | Uso comercial e proteção contra abuso | Antes do piloto |
| Domínio (ex.: liccont.com.br) | Endereço do sistema e e-mails | Fase 0 |
| Serviço de e-mail transacional | Recuperação de senha e avisos de atraso | Fase 1 |
| Teste de invasão externo | Laudo de segurança para mostrar às prefeituras | Fase 8, se aprovado |
| Impressora de etiquetas | Imprimir os QR das caixas | Equipamento da prefeitura, na implantação |
| Celular ou leitor de QR | Ler a etiqueta no galpão | Equipamento da prefeitura |

## Riscos e próximos passos

O maior risco é vazar dado entre prefeituras; por isso o isolamento vem na Fase 1, antes de qualquer documento real.

| Risco | Como evitamos |
| --- | --- |
| Uma prefeitura ver dado de outra | RLS em tudo e testes de isolamento em todo PR |
| Conta de administrador invadida | Dois fatores obrigatórios e alerta de login em aparelho novo |
| Perda de dados | Backup diário, recuperação pontual e teste de restauração trimestral |
| Descarte indevido de documento | Termo de eliminação com aprovação e auditoria |
| Escopo crescer demais | Fases fechadas; ideia nova entra na lista de depois |

**Próximos passos**

- [ ] Você revisa este plano e responde as decisões em aberto.
- [x] Instalar Superpowers, Ponytail e Graphify no Claude Code.
- [ ] Criar o repositório `liccont` no GitHub e o projeto no Supabase em São Paulo.
- [ ] Eu entrego o texto da Fase 0 pronto para o Claude Code executar.

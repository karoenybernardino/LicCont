# LicCONT — Fase: Etiquetas, classificação documental e GED

> Instrução para o Claude Code. Antes de codar, leia as telas do canvas "LicCONT — Telas do sistema" citadas abaixo e siga o layout delas à risca (cores, fontes Sora / IBM Plex Sans / JetBrains Mono, espaçamentos). Trabalhe em branch própria, com migrações versionadas, RLS em todas as tabelas novas e testes. Faça um plano curto e me mostre antes de começar.

---

## 0. Ponto de partida: o sistema já está pronto

Todas as fases anteriores já foram concluídas. Esta fase **altera e amplia o que existe**, não recria nada.

1. Antes de qualquer código, mapeie o que já existe sobre: etiqueta com QR, temporalidade e descarte, tipologias, cadastro de caixa e documento, upload/visualização de PDF, importação (Fase 9), permissões e auditoria.
2. Me entregue uma tabela **"já existe / muda / é novo"** para cada item desta instrução, e só comece depois que eu aprovar.
3. Reaproveite tabelas, componentes e rotas existentes; nada de módulo paralelo.
4. **Ainda não há nenhum dado real cadastrado** (o sistema não rodou para ninguém). Pode reestruturar tabelas livremente, sem migração de dados: se for melhor, torne classe obrigatória no cadastro da caixa e do documento. Atualize os dados de exemplo (seed) para refletir a nova estrutura.
5. **Importação (Fase 9)**: incluir no mapeamento as colunas de classe/código de classificação, tipologia e volume, ligando à tabela de temporalidade do órgão.
6. Rodar todos os testes existentes ao final: nada do que já funciona pode regredir.

## 1. Contexto

- O arquivo do órgão hoje monta a etiqueta da caixa à mão no Word e depois digita tudo de novo no sistema. O objetivo é cadastrar **uma vez** e o LicCONT gerar etiquetas e folhas prontas para imprimir.
- O LicCONT passa a cobrir **todos os grupos documentais** do órgão (não só licitações e contratos): administrativo, licitações e contratos, financeiro e contábil, RH, jurídico, técnico/obras, correspondências e cadastros.
- Uso principal: **organização do arquivo físico**. A digitalização fica **pronta**, mas o físico continua guardado.

## 2. Tabela de temporalidade e plano de classificação (por órgão)

Cada prefeitura e cada Câmara tem a **sua própria** tabela de temporalidade, feita por profissional habilitado. O sistema **não cria** a tabela: ela é cadastrada manualmente na implantação, e depois o sistema aplica sozinha.

- Tabela `classes_documentais` por órgão: código de classificação (ex.: 031), classe (ex.: Licitações e Contratos), grupo documental, tipologias ligadas (opcional), prazo de guarda, destinação final (eliminação ou guarda permanente).
- **Prazo de guarda com evento**: aceitar "N anos após [evento]" (ex.: 12 anos após o término do contrato), além de prazo fixo e "permanente". A data de descarte só é calculada quando o evento é informado; até lá o item fica "aguardando evento".
- Prefeitura e Câmara são órgãos separados, cada um com sua tabela.
- **Duas formas de cadastrar a tabela, já no cadastro da prefeitura ou Câmara** (e editável depois):
  1. **Subir arquivo**: botão "Baixar modelo" (planilha .xlsx com as colunas: código, classe, grupo, tipologias, prazo, tipo de prazo [fixo / após evento / permanente], evento, destinação, observação) e botão "Enviar tabela" aceitando **.xlsx, .csv e PDF**. No PDF, o sistema lê a tabela sozinho: extrai o texto quando o PDF já tem texto e usa OCR quando for digitalizado (escaneado), dentro do plano gratuito (proponha a forma antes de implementar). Como a leitura de PDF pode errar, a **conferência na prévia é obrigatória** e as linhas com leitura duvidosa vêm marcadas. Antes de salvar, mostrar uma **prévia para conferência**, destacando linhas com erro (código repetido, prazo inválido, campo obrigatório vazio), com opção de corrigir na própria prévia.
  2. **Cadastrar à mão**: adicionar, editar e excluir classes uma a uma.
  - As duas formas podem ser usadas juntas (subir o arquivo e depois ajustar à mão). Reenviar arquivo pergunta se substitui a tabela ou só acrescenta as classes novas.
  - Não deixar excluir classe que já tem caixa ou documento ligado; nesse caso, só desativar.
- Telas de referência: `Temporalidade*`, `TemporalidadeRegra*`, `TemporalidadeRegraPermanente*`.
- Ao cadastrar caixa ou documento, escolher a classe preenche automaticamente código, prazo e destinação.

## 3. Tipologias e grupos documentais

- Tipologias cadastráveis por órgão, com uma **lista padrão** já carregada para os 7 grupos acima.
- **Tipologia é opcional**: para licitação, por exemplo, não é usada. Campo vazio não aparece em etiqueta nem em folha.
- **Permissões por grupo documental** (LGPD): RH e jurídico restritos por padrão; o administrador do órgão define quais perfis veem cada grupo. Respeitar isso em busca, listagens, etiquetas, PDFs, relatórios e API.

## 4. Empresas parceiras

Tela de referência: `EquipeParceirasClaro` / `EquipeParceirasEscuro` (área da Equipe LicCONT).

- Cadastro: nome, CNPJ, logo (PNG ou SVG, até 1 MB, preferência fundo transparente).
- Ligação com órgãos: **cada órgão usa uma empresa por vez**; uma empresa pode atender vários órgãos.
- Órgão sem empresa ligada: etiqueta sai sem o logo da parceira (espaço some, sem placeholder).
- Logo do órgão continua vindo do cadastro do órgão, como já é hoje.
- **Logo do LicCONT é fixo** no canto direito do rodapé de todas as peças.

## 5. Etiquetas e folha de conteúdo

Todas geradas em **PDF** a partir do cadastro, com impressão individual e **em lote** (selecionar várias caixas/documentos → um PDF). Faixa decorativa no gradiente da marca (#0e7490 → #2dd4bf), igual ao canvas.

### 5.1 Etiqueta da caixa — `EtqPapelCaixa`
A4 deitada, **2 por folha**, com linha de corte tracejada.
1. Logo do órgão (topo, centralizado).
2. Faixa em gradiente.
3. Título grande: **GRUPO – ANO** (ex.: LICITAÇÃO – 2026) + selo **VOL. x/y** só quando o conteúdo ocupa mais de uma caixa.
4. Classe e tipologia documental (tipologia só se tiver valor; sem ela, classe ocupa a linha).
5. Lista do conteúdo: **até 4 itens**, cada um "MODALIDADE Nº/ANO – SEC. X" + "Objeto: …" (uma linha cada, cortando com reticências). Se houver mais: caixa tracejada "**+ N itens · ver folha de conteúdo**".
6. Bloco cinza: **Código** de classificação e **Prazo de guarda**.
7. Faixa escura: **CX - 0001** (CX em aqua), "LOCALIZAÇÃO" + pílula "Rua B · Módulo 2 · Nível 4", e **QR code** à direita.
8. Rodapé: logo da empresa parceira (esquerda) e LicCONT (direita).

### 5.2 Folha de conteúdo da caixa — `EtqPapelConteudo`
A4 em pé, vai **dentro** da caixa.
- Cabeçalho: logo do órgão, faixa, GRUPO – ANO, VOL., faixa escura com CX, localização e QR.
- Tabela com **todos** os itens: Modalidade, Nº/ano, Secretaria, Objeto, Vol. (linhas zebradas).
- Bloco final: Código, Classe, Prazo de guarda, "Folha X de Y" e total de itens da caixa.
- Paginação automática quando não couber; cabeçalho repete em cada folha.
- Rodapé igual ao da etiqueta.

### 5.3 Etiqueta do documento — `EtqPapelDocumento`
A4 em pé, **4 por folha** (2×2). Opcional: só existe para documento cadastrado.
1. Logo do órgão + faixa.
2. Título: **MODALIDADE Nº/ANO** (ou CONTRATO Nº/ANO etc.).
3. Secretaria, Objeto, Data e **Observação** (só se tiver).
4. Bloco cinza: Classe e Código.
5. Faixa escura: **CX - 0001**, "GUARDADO EM" + pílula de localização, QR do documento.
6. Rodapé: logo parceira + LicCONT.

### 5.4 Regras gerais das etiquetas
- Nada é digitado na etiqueta: todo campo vem do cadastro da caixa ou do documento. Se faltar algum campo no cadastro, criar no cadastro primeiro.
- QR da caixa abre a caixa no LicCONT (conteúdo + localização); QR do documento abre o documento. Exige login e respeita permissões.
- Ao mudar a caixa de lugar ou o conteúdo, a etiqueta muda na próxima impressão; registrar na auditoria quem imprimiu e quando.
- Tela de geração/visualização: `EtiquetasClaro` / `EtiquetasEscuro`.

### 5.5 Botão "Baixar etiquetas" (escolher quais)
- Na tela de etiquetas: lista de caixas (e de documentos) com **caixa de seleção** em cada linha, "selecionar todas" e **filtros** (rua, módulo, nível, classe/grupo, ano, secretaria, só as nunca impressas).
- Escolher o que baixar: **etiqueta da caixa**, **folha de conteúdo** e/ou **etiqueta do documento** (pode marcar mais de uma).
- Botão **"Baixar etiquetas (N)"** gera um PDF único com tudo o que foi escolhido, já na ordem de impressão (2 por folha para caixas, 4 por folha para documentos).
- Também ter o atalho "Baixar etiqueta" dentro da própria caixa e do próprio documento.
- Marcar na lista quais já foram impressas e quando.

## 6. Digitalização (deixar pronta)

O PDF continua **opcional**. Quando houver:

- **Metadados mínimos do Decreto 10.278/2020 (Anexo II)** em cada documento digitalizado: assunto, autor, data e local da digitalização, identificador do documento digital, responsável pela digitalização, título, tipo documental, hash do arquivo; e, para órgão público, classe, data de produção do original, destinação prevista, gênero e prazo de guarda. Os técnicos (hash SHA-256, data, responsável = usuário do upload, identificador) são preenchidos automaticamente; classe, prazo e destinação vêm da tabela de temporalidade.
- **Checagem de qualidade no upload**: verificar se o PDF abre, se é PDF/A e a resolução (mínimo 300 dpi para texto). Fora do padrão → aviso claro, sem bloquear o upload de consulta.
- **Busca pelo conteúdo do PDF** sem deixar o sistema lento: extrair primeiro a camada de texto que o PDF já tiver; só rodar OCR quando não houver texto. Processar **em segundo plano** (fila), salvar o texto no banco e buscar com o full-text search do Postgres. Precisa caber no plano gratuito: proponha a opção (ex.: OCR no navegador com tesseract.js no momento do upload) antes de implementar.
- **Selo do documento**: "Digitalizado – apenas consulta" (padrão) ou "Digitalizado com valor legal".
- **Assinatura ICP-Brasil**: só a estrutura (campos para assinatura, certificado e data), **desligada**. Integração real fica para um módulo futuro.
- **Eliminação do papel bloqueada** para qualquer documento sem assinatura ICP-Brasil e sem passar pela listagem de eliminação.

## 7. Critérios de aceite

- [ ] Cadastrar tabela de temporalidade de um órgão e ver código/prazo preenchidos sozinhos no cadastro da caixa.
- [ ] No cadastro da prefeitura/Câmara: baixar o modelo, subir a tabela (.xlsx/.csv/PDF, inclusive PDF escaneado), conferir na prévia com erros destacados e salvar; e também cadastrar classes à mão.
- [ ] Selecionar algumas caixas e documentos, escolher os tipos de etiqueta e baixar um PDF único com só o que foi escolhido.
- [ ] Prazo "após evento" calcula a data de descarte só depois de informado o evento.
- [ ] Cadastrar empresa parceira com logo, ligar a um órgão e ver o logo nas três peças; órgão sem parceira sai sem o logo.
- [ ] Etiqueta da caixa idêntica ao canvas, com 4 itens + "+ N itens" quando passar; VOL. só quando houver volumes.
- [ ] Folha de conteúdo com todos os itens e paginação "Folha X de Y".
- [ ] Etiqueta do documento 4 por folha, observação só quando existir.
- [ ] Impressão em lote gera um PDF único.
- [ ] QR abre a caixa/documento certo e respeita login e permissões.
- [ ] Usuário sem permissão de RH não vê documentos, etiquetas nem busca de RH.
- [ ] Upload de PDF grava hash e metadados, avisa PDF fora do padrão e o texto fica pesquisável sem travar a tela.
- [ ] Documento sem assinatura ICP-Brasil não pode entrar em eliminação.
- [ ] Dados de exemplo (seed) atualizados, com classes, empresa parceira e caixas com mais de 4 itens para testar as etiquetas.
- [ ] Importação aceita classe/código, tipologia e volume.
- [ ] Todos os testes que já existiam continuam passando.

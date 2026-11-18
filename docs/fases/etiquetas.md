# Etiquetas e empresas parceiras

Três peças impressas e o cadastro da empresa parceira. Quadros em `docs/telas/` (ver `telas-novas.json`):
`EtiquetasEscuro/Claro` (tela de impressão, **substitui** o quadro antigo), `EtqPapelCaixa`, `EtqPapelDocumento`,
`EtqPapelConteudo` (como sai no papel) e `EquipeParceirasEscuro/Claro` (cadastro, área da equipe LicCONT).
Se a Fase 5 já tiver etiqueta pronta, ajustar ao desenho novo; não criar uma segunda.

## As três peças (cores LicCONT: petróleo e aqua; no papel os logos são quadros tracejados "reservados")
1. **Etiqueta da caixa** — A4 deitada, 2 por folha (linha de corte tracejada). Logo da prefeitura no topo; faixa; título
   (ex.: "LICITAÇÃO – 2026") com "VOL. 1/2" só se houver mais de uma caixa; Classe; Tipologia documental só se tiver valor;
   até 4 itens (modalidade nº/ano – secretaria, "Objeto: …") e, passando de 4, a linha "+ N itens · ver folha de conteúdo";
   Código de classificação e Prazo de guarda (da tabela de temporalidade do órgão); painel escuro "CX - 0001" com QR e
   localização por extenso ("Rua B · Módulo 2 · Nível 4"); rodapé com logo da empresa parceira e LicCONT.
2. **Etiqueta do documento** — A4 em pé, 4 por folha (capa da pasta). Logo; modalidade/número/ano; Secretaria, Objeto, Data e
   Observação (só se tiver); Classe e Código; painel "CX - 0001 / Guardado em / localização" com QR que abre o documento no
   sistema; rodapé parceira + LicCONT.
3. **Folha de conteúdo da caixa** — A4 em pé, vai dentro da caixa. Cabeçalho como o da etiqueta (logo, título, volume, painel
   da caixa com QR); tabela com todos os itens (modalidade, nº/ano, secretaria, objeto, volume), paginada ("Folha 1 de 3 · 39 itens
   nesta caixa"); Código, Classe, Prazo de guarda; rodapé parceira + LicCONT.

## Origem dos logos
- Prefeitura ou Câmara: do cadastro do órgão, como já é hoje. Sem logo cadastrado, mostrar o nome do órgão em texto.
- Empresa parceira: cadastro novo (nome, CNPJ, logo PNG ou SVG até 1 MB), ligado a cada prefeitura; uma empresa por prefeitura.
  Prefeitura sem empresa ligada sai sem logo de parceira. Fica na área da equipe LicCONT.
- LicCONT: fixo no sistema, sempre no canto do rodapé.
- Cor da faixa de destaque: padrão LicCONT (petróleo para aqua). Cor própria do órgão fica fora desta tarefa.

## Regras
- Tabela nova de empresas parceiras: RLS, GRANT explícito só para a equipe, pgTAP de isolamento; o vínculo prefeitura–empresa
  carrega `prefeitura_id`. Bucket do logo com acesso restrito. Nada de dado pessoal em log.
- Serviço externo novo (se algum): registrar em `docs/decisoes/` e `docs/lgpd/suboperadores.md`.
- QR com código aleatório (já definido na Fase 2); nunca o ID do banco.
- Impressão em PDF gerado no servidor; o painel escuro gasta mais tinta (avaliar versão clara se o responsável pedir).

## Tarefas sugeridas (depois da Fase 5 e do cadastro de órgãos)
E1 Cadastro de empresas parceiras (tabela, RLS, teste, tela) · E2 Ligação prefeitura–empresa e upload do logo ·
E3 Etiqueta da caixa em PDF · E4 Etiqueta do documento em PDF · E5 Folha de conteúdo paginada em PDF ·
E6 Tela de impressão com prévia e seleção de caixas. Confirmar com o responsável antes de começar.

## Tela de etiquetas (quadro EtiquetasEscuro/Claro, atualizado)
- "O que imprimir": caixas de seleção, um ou mais tipos (caixa, documento, folha de conteúdo); cada tipo sai em PDF próprio.
- "O que etiquetar": abas Caixas e Documentos (cada uma com a contagem de marcados); busca; filtros Secretaria, Classe, Ano e Etiqueta
  (ainda não impressa / já impressa); lista com caixa de seleção e situação da etiqueta (impressa em dd/mm ou não impressa).
- Direita: prévia da folha com abas por tipo, resumo (etiquetas, folhas A4, total) e botões Baixar PDF e Imprimir.
- Permissão checada no servidor; nada de dado pessoal em log.

## Logo e tabela de temporalidade no cadastro do órgão (quadro EquipePrefeituraLogoEscuro/Claro)
Nova aba "Logo e temporalidade" na tela da prefeitura (área da equipe; abas: Resumo, Administradores, Integração TCE-CE,
Logo e temporalidade, Uso, Auditoria; o quadro EquipePrefeituraDetalhe já mostra a aba nova).
- Logo do órgão: envio PNG ou SVG até 1 MB, remover, nome na etiqueta (usado quando não há logo), empresa parceira da prefeitura.
- Tabela de temporalidade: código, classe, prazo e "contagem a partir de", com editar, nova linha e importar planilha. Código e prazo saem
  nas etiquetas da caixa e do documento. Tabela nova: RLS, GRANT explícito, pgTAP de isolamento, `prefeitura_id`.

# Telas do canvas (fonte da verdade do visual)

Cópia exata dos quadros do canvas **"LicCONT — Telas do sistema"**, exportada em 14/11/2026.
O canvas é privado (só abre logado no claude.ai), então **quem programa usa estes arquivos**, não o link.

- `html/<Quadro>.html` — o quadro como foi desenhado: cores, medidas, fontes, textos e ícones exatos. Abra no navegador ou leia o código.
- `png/<Quadro>.png` — print do quadro no tamanho real (1280 px de largura).
- `telas.json` — lista de quadros com tema, tamanho e rota do sistema.

## Regras de fidelidade

1. **Copiar, não reinterpretar.** Medidas (px), raios, espaçamentos, cores (hex), pesos e tamanhos de fonte, textos e ordem dos elementos saem do HTML do quadro. Nada de "arredondar" para a escala do Tailwind: se o quadro diz `padding: 14px 18px`, use `px-[18px] py-[14px]` ou um token com esse valor.
2. **Não inventar.** Elemento que não está no quadro não entra na tela. Se faltar algo para a tela funcionar (estado vazio, carregando, erro), perguntar antes ou seguir o padrão de um quadro que já tem isso.
3. **Claro e escuro são o mesmo layout.** Muda só a cor. O que mudar num, muda no outro.
4. **Laranja/amarelo (#ff9f1c / #ffd27a) só na caixa selecionada.**
5. **Marca:** títulos em Sora, interface em IBM Plex Sans, códigos em JetBrains Mono. Cores: petróleo #0b2e3a, teal #0e7490, aqua #2dd4bf, menta #ccfbf1, aço #4f8592.
6. **Dados do quadro são de exemplo.** Os textos fixos (rótulos, botões, títulos) são copiados; os dados (nomes de processos, números) vêm do banco ou da demonstração.
7. **Conferir antes do PR.** Rodar `node scripts/comparar-telas.mjs <Quadro>` com a prévia de demonstração ligada e anexar ao PR as imagens lado a lado de `test-results/comparacao/`, claro e escuro. Diferença visível que não seja dado = corrigir antes de abrir o PR.

## Qual quadro vale quando há dois

- **Pesquisa:** filtros = `PesquisaNova*`; painel do documento = `Lateral` (escuro) / `PesquisaClara`.
- **Início:** `InicioFase*` durante a implantação; `Inicio*` depois.
- **Equipe LicCONT:** `EquipePrefeituras*`, `EquipeNovaPrefeitura*`, `EquipePrefeituraDetalhe*`. `Prefeituras*` (visão NOVVA) é referência antiga.
- **Mapa:** `MapaGirarOcupacao*`, `MapaMover*` e `EditorPlanta*` (Fase 4) completam `Mapa*` e `Planta*`.

## Quadros

| Quadro | Tema | Tamanho | Onde fica no sistema |
|---|---|---|---|
| [E3 — Pesquisa com painel do documento (escuro)](png/Lateral.png) | escuro | 1280×1000 | /pesquisa (painel do documento) |
| [Login — fundo E1](png/Login.png) | escuro | 1280×820 | /entrar/dados |
| [Pesquisa com painel do documento (claro)](png/PesquisaClara.png) | claro | 1280×1000 | /pesquisa (painel do documento) |
| [Login — versão clara](png/LoginClaro.png) | claro | 1280×820 | /entrar/dados |
| [Cadastro novo — escuro](png/CadastroNovo.png) | escuro | 1280×720 | /documentos/novo |
| [Cadastro novo — claro](png/CadastroClaro.png) | claro | 1280×720 | /documentos/novo |
| [Mapa 3D — escuro](png/MapaEscuro.png) | escuro | 1280×880 | /mapa |
| [Mapa 3D — claro](png/MapaClaro.png) | claro | 1280×880 | /mapa |
| [Início — escuro](png/InicioEscuro.png) | escuro | 1280×940 | /inicio |
| [Início — claro](png/InicioClaro.png) | claro | 1280×940 | /inicio |
| [Empréstimos — escuro](png/EmprestimosEscuro.png) | escuro | 1280×720 | (ainda sem rota) |
| [Empréstimos — claro](png/EmprestimosClaro.png) | claro | 1280×720 | (ainda sem rota) |
| [Temporalidade e descarte — escuro](png/TemporalidadeEscuro.png) | escuro | 1280×740 | /temporalidade |
| [Temporalidade e descarte — claro](png/TemporalidadeClaro.png) | claro | 1280×740 | /temporalidade |
| [Auditoria — escuro](png/AuditoriaEscuro.png) | escuro | 1280×800 | (ainda sem rota) |
| [Auditoria — claro](png/AuditoriaClaro.png) | claro | 1280×800 | (ainda sem rota) |
| [Usuários e perfis — escuro](png/UsuariosEscuro.png) | escuro | 1280×1000 | /usuarios |
| [Usuários e perfis — claro](png/UsuariosClaro.png) | claro | 1280×1000 | /usuarios |
| [Etiquetas — escuro](png/EtiquetasEscuro.png) | escuro | 1280×900 | (ainda sem rota) |
| [Etiquetas — claro](png/EtiquetasClaro.png) | claro | 1280×900 | (ainda sem rota) |
| [Estrutura física — escuro](png/EstruturaEscuro.png) | escuro | 1280×880 | /estrutura |
| [Estrutura física — claro](png/EstruturaClaro.png) | claro | 1280×880 | /estrutura |
| [Prefeituras (visão NOVVA) — escuro](png/PrefeiturasEscuro.png) | escuro | 1280×880 | /equipe (antiga, ver Equipe*) |
| [Prefeituras (visão NOVVA) — claro](png/PrefeiturasClaro.png) | claro | 1280×880 | /equipe (antiga, ver Equipe*) |
| [Caixa lida pelo celular — escuro](png/CelularEscuro.png) | escuro | 1280×880 | (ainda sem rota) |
| [Caixa lida pelo celular — claro](png/CelularClaro.png) | claro | 1280×880 | (ainda sem rota) |
| [Mapa — planta baixa — escuro](png/PlantaEscuro.png) | escuro | 1280×880 | /mapa (modo planta) |
| [Mapa — planta baixa — claro](png/PlantaClaro.png) | claro | 1280×880 | /mapa (modo planta) |
| [Login 1 — escolher prefeitura (escuro)](png/LoginPrefeitura.png) | escuro | 1280×820 | /entrar |
| [Login 1 — escolher prefeitura (claro)](png/LoginPrefeituraClaro.png) | claro | 1280×820 | /entrar |
| [Pesquisa — filtros novos (escuro)](png/PesquisaNovaEscuro.png) | escuro | 1280×1064 | /pesquisa (filtros) |
| [Pesquisa — filtros novos (claro)](png/PesquisaNovaClaro.png) | claro | 1280×1064 | /pesquisa (filtros) |
| [Início — fase de implantação — escuro](png/InicioFaseEscuro.png) | escuro | 1280×900 | /inicio (fase de implantação) |
| [Início — fase de implantação — claro](png/InicioFaseClaro.png) | claro | 1280×900 | /inicio (fase de implantação) |
| [Equipe LicCONT · Prefeituras — escuro](png/EquipePrefeiturasEscuro.png) | escuro | 1280×600 | /equipe |
| [Equipe LicCONT · Prefeituras — claro](png/EquipePrefeiturasClaro.png) | claro | 1280×600 | /equipe |
| [Equipe LicCONT · Nova prefeitura — escuro](png/EquipeNovaPrefeituraEscuro.png) | escuro | 1280×900 | /equipe (nova prefeitura) |
| [Equipe LicCONT · Nova prefeitura — claro](png/EquipeNovaPrefeituraClaro.png) | claro | 1280×900 | /equipe (nova prefeitura) |
| [Equipe LicCONT · Prefeitura e administradores — escuro](png/EquipePrefeituraDetalheEscuro.png) | escuro | 1280×640 | /equipe (prefeitura) |
| [Equipe LicCONT · Prefeitura e administradores — claro](png/EquipePrefeituraDetalheClaro.png) | claro | 1280×640 | /equipe (prefeitura) |
| [Secretarias da prefeitura — escuro](png/SecretariasEscuro.png) | escuro | 1280×640 | /secretarias |
| [Secretarias da prefeitura — claro](png/SecretariasClaro.png) | claro | 1280×640 | /secretarias |
| [Nova secretaria — escuro](png/SecretariaNovaEscuro.png) | escuro | 1280×800 | /secretarias (nova) |
| [Nova secretaria — claro](png/SecretariaNovaClaro.png) | claro | 1280×800 | /secretarias (nova) |
| [Detalhe da rua do galpão — escuro](png/RuaDetalheEscuro.png) | escuro | 1280×970 | /estrutura/rua/[id] |
| [Detalhe da rua do galpão — claro](png/RuaDetalheClaro.png) | claro | 1280×970 | /estrutura/rua/[id] |
| [Visualizador de PDF — escuro](png/PdfViewerEscuro.png) | escuro | 1280×900 | /documentos/[id]/pdf |
| [Visualizador de PDF — claro](png/PdfViewerClaro.png) | claro | 1280×900 | /documentos/[id]/pdf |
| [Erro · sessão expirada — escuro](png/ErroSessaoEscuro.png) | escuro | 1280×760 | sessão expirada |
| [Erro · sessão expirada — claro](png/ErroSessaoClaro.png) | claro | 1280×760 | sessão expirada |
| [Erro · página não encontrada — escuro](png/Erro404Escuro.png) | escuro | 1280×760 | not-found.tsx |
| [Erro · página não encontrada — claro](png/Erro404Claro.png) | claro | 1280×760 | not-found.tsx |
| [Erro · sem permissão — escuro](png/Erro403Escuro.png) | escuro | 1280×760 | sem permissão |
| [Erro · sem permissão — claro](png/Erro403Claro.png) | claro | 1280×760 | sem permissão |
| [Erro · falha do sistema — escuro](png/Erro500Escuro.png) | escuro | 1280×760 | error.tsx / global-error.tsx |
| [Erro · falha do sistema — claro](png/Erro500Claro.png) | claro | 1280×760 | error.tsx / global-error.tsx |
| [Fase 4 · Mapa 3D com girar e ocupação — escuro](png/MapaGirarOcupacaoEscuro.png) | escuro | 1280×970 | /mapa (girar + ocupação) |
| [Fase 4 · Mapa 3D com girar e ocupação — claro](png/MapaGirarOcupacaoClaro.png) | claro | 1280×970 | /mapa (girar + ocupação) |
| [Fase 4 · Dentro da caixa: mover documentos — escuro](png/MapaMoverEscuro.png) | escuro | 1280×880 | /mapa (dentro da caixa → mover) |
| [Fase 4 · Dentro da caixa: mover documentos — claro](png/MapaMoverClaro.png) | claro | 1280×880 | /mapa (dentro da caixa → mover) |
| [Fase 4 · Editor da planta — escuro](png/EditorPlantaEscuro.png) | escuro | 1280×880 | /mapa/editar |
| [Fase 4 · Editor da planta — claro](png/EditorPlantaClaro.png) | claro | 1280×880 | /mapa/editar |
| [Fase 7 · Temporalidade com termos de eliminação — escuro](png/TemporalidadeTermosEscuro.png) | escuro | 1280×1083 | /temporalidade (painel Termos de eliminação) |
| [Fase 7 · Temporalidade com termos de eliminação — claro](png/TemporalidadeTermosClaro.png) | claro | 1280×1083 | /temporalidade (painel Termos de eliminação) |
| [Fase 7 · Temporalidade: janela da regra de prazo — escuro](png/TemporalidadeRegraEscuro.png) | escuro | 1280×740 | /temporalidade (janela Nova regra / Editar tabela) |
| [Fase 7 · Temporalidade: janela da regra de prazo — claro](png/TemporalidadeRegraClaro.png) | claro | 1280×740 | /temporalidade (janela Nova regra / Editar tabela) |
| [Fase 7 · Termo de eliminação (em ciência) — escuro](png/TermoCienciaEscuro.png) | escuro | 1280×700 | /temporalidade/termo/[id] (em ciência) |
| [Fase 7 · Termo de eliminação (em ciência) — claro](png/TermoCienciaClaro.png) | claro | 1280×700 | /temporalidade/termo/[id] (em ciência) |
| [Fase 7 · Termo de eliminação (rascunho) — escuro](png/TermoRascunhoEscuro.png) | escuro | 1280×700 | /temporalidade/termo/[id] (rascunho) |
| [Fase 7 · Termo de eliminação (rascunho) — claro](png/TermoRascunhoClaro.png) | claro | 1280×700 | /temporalidade/termo/[id] (rascunho) |
| [Fase 7 · Cadastro: encerramento do processo — escuro](png/CadastroEncerramentoEscuro.png) | escuro | 1280×740 | /documentos/novo e /documentos/[id]/editar (licitação) |
| [Fase 7 · Cadastro: encerramento do processo — claro](png/CadastroEncerramentoClaro.png) | claro | 1280×740 | /documentos/novo e /documentos/[id]/editar (licitação) |
| [Fase 7 · Termo de eliminação (prazo de ciência em andamento) — escuro](png/TermoAndamentoEscuro.png) | escuro | 1280×700 | /temporalidade/termo/[id] (em ciência, prazo correndo) |
| [Fase 7 · Termo de eliminação (prazo de ciência em andamento) — claro](png/TermoAndamentoClaro.png) | claro | 1280×700 | /temporalidade/termo/[id] (em ciência, prazo correndo) |
| [Fase 7 · Termo de eliminação (aprovado) — escuro](png/TermoAprovadoEscuro.png) | escuro | 1280×700 | /temporalidade/termo/[id] (aprovado) |
| [Fase 7 · Termo de eliminação (aprovado) — claro](png/TermoAprovadoClaro.png) | claro | 1280×700 | /temporalidade/termo/[id] (aprovado) |
| [Fase 7 · Termo de eliminação (cancelado) — escuro](png/TermoCanceladoEscuro.png) | escuro | 1280×700 | /temporalidade/termo/[id] (cancelado) |
| [Fase 7 · Termo de eliminação (cancelado) — claro](png/TermoCanceladoClaro.png) | claro | 1280×700 | /temporalidade/termo/[id] (cancelado) |
| [Fase 7 · Janela da regra: guarda permanente — escuro](png/TemporalidadeRegraPermanenteEscuro.png) | escuro | 1280×740 | /temporalidade (janela da regra, guarda permanente) |
| [Fase 7 · Janela da regra: guarda permanente — claro](png/TemporalidadeRegraPermanenteClaro.png) | claro | 1280×740 | /temporalidade (janela da regra, guarda permanente) |

# Painel da empresa parceira

Acesso da empresa parceira (a que presta o serviço de arquivo para a prefeitura). Quadros em `docs/telas/`: `PartPainelDono`, `PartPainelFunc`,
`PartPesquisa`, `PartMapa`, `PartEtiquetas`, `PartEquipe` (escuro e claro) e `EquipeParceiraDetalhe` (área da equipe LicCONT).

## Quem vê o quê
- **Dono da empresa:** painel com todas as prefeituras atendidas (caixas, documentos, etiquetas pendentes, pessoas alocadas, última etiqueta),
  atividade recente, tela Equipe (convidar, alocar prefeituras). Vê Painel, Pesquisa, Mapa 3D, Etiquetas e Equipe.
- **Funcionário:** só as prefeituras em que está alocado. Vê Painel, Pesquisa, Mapa 3D e Etiquetas; não vê Equipe.
- **Alocação:** o dono e a equipe LicCONT podem alocar e retirar prefeituras de qualquer pessoa. A coluna "Alocado por" mostra quem fez a última mudança.
- Cada prefeitura tem uma empresa parceira; o vínculo vem do cadastro de empresas parceiras (`etiquetas.md`).

## Telas e regras
1. Painel do dono / do funcionário: seletor de prefeitura no topo ("Todas (5)" só para o dono; funcionário vê "Minhas prefeituras").
2. Pesquisa: a mesma pesquisa do sistema, limitada às prefeituras permitidas, com abertura do PDF (decisão do responsável). Sem empréstimo.
3. Mapa 3D: o mesmo mapa, uma prefeitura por vez. Sem registrar empréstimo.
4. Etiquetas: a tela de etiquetas com vários tipos, filtros e prévia, uma prefeitura por vez.
5. Equipe (dono): lista de pessoas, perfil, prefeituras, alocado por, situação; convite; caixas de seleção para alocar.
6. Equipe LicCONT: aba/tela da empresa parceira com funcionários e alocação e prefeituras vinculadas.

## Segurança e LGPD
- Tabelas novas (empresa parceira, pessoa da empresa, alocação pessoa–prefeitura): RLS, GRANT explícito, pgTAP de isolamento. A alocação é checada no servidor em toda ação e nas políticas de RLS (por função do esquema `app`), nunca só escondendo botão.
- Funcionário sem alocação não lê nada daquela prefeitura. Dono vê só as prefeituras vinculadas à empresa dele.
- Como a empresa abre o PDF dos documentos, ela atua como operadora: registrar em `docs/lgpd/suboperadores.md` e prever cláusula no contrato com a prefeitura (a validar com o advogado). Acesso e abertura de PDF vão para a auditoria.
- Nada de dado pessoal em log. Convite por e-mail só se houver serviço de e-mail registrado em `docs/decisoes/`.

## Tarefas sugeridas
P1 Cadastro de pessoas da empresa e alocação (tabelas, RLS, testes) · P2 Papéis dono e funcionário e menu · P3 Painel do dono · P4 Painel do funcionário ·
P5 Pesquisa, Mapa e Etiquetas limitadas por alocação · P6 Tela Equipe (convite e alocação) · P7 Visão da equipe LicCONT · P8 Auditoria e revisão de segurança.
Confirmar com o responsável antes de começar.

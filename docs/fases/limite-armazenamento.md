# Limite de armazenamento por prefeitura

Plano curto. Decidido em 16/11/2026: padrão de **10 GB** por prefeitura, e o aviso
de 80% e 100% aparece **só para a equipe LicCONT** (como na decisão 1 da Fase 9).

1. Banco: `prefeituras.limite_armazenamento_mb` (padrão 10240), ao lado de
   `limite_pdf_mb`. O uso é a soma de `arquivos.tamanho` dos ativos da prefeitura.
   A troca de PDF de um documento conta só a diferença.
2. Bloqueio em dois pontos:
   - ao iniciar o envio, um gatilho em `arquivos` recusa com o código `LC007`
     e a tela mostra "O espaço de armazenamento da prefeitura acabou…";
   - ao concluir a conferência, que trava a prefeitura e confere de novo para
     dois envios simultâneos não passarem juntos. Nesse caso o arquivo fica
     recusado com o motivo `sem_espaco`.
3. Equipe: `equipe_uso_prefeituras()` passa a devolver `limite_bytes`. Início da
   equipe: item em "Precisa de atenção" ("Armazenamento") a 80% e a 100%.
   Detalhe da prefeitura: "PDFs guardados" mostra "x de y".
4. Testes: pgTAP do bloqueio, da troca de PDF e do isolamento entre prefeituras
   (o uso de uma não bloqueia a outra; um gatilho não revela o uso de outra
   prefeitura), mais um Vitest dos limites de 80% e 100%.
5. O limite é ajustado por SQL, como o `limite_pdf_mb`. Não tem tela para isso.

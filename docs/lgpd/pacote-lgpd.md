# Pacote LGPD (rascunho técnico)

Nada aqui é parecer jurídico. Tudo que é lei está marcado **a validar com advogado** antes do piloto.

## 1. Anexo contratual (pontos mínimos)

- Papéis: prefeitura = controladora; LicCONT = operadora. Para pedidos de demonstração do site, LicCONT = controladora.
- Finalidade: arquivo de licitações e contratos; nenhum outro uso, nenhuma venda ou cruzamento de dados.
- Suboperadores: lista em `suboperadores.md`; aviso à prefeitura antes de trocar.
- A equipe LicCONT não lê o acervo. Acesso de suporte só com autorização do administrador, até 5 horas, revogável e auditada.
- Segurança: isolamento por prefeitura e secretaria, auditoria só de inclusão, 2º fator para administrador, saída por inatividade.
- Incidente: aviso à prefeitura em até 48 h depois de confirmado (prazo **a validar**).
- Devolução: exportação completa (`/configuracoes/exportar`) ao fim do contrato; eliminação do que restar depois do prazo combinado e confirmação escrita (prazo **a validar**).
- Suspensão: bloqueia o acesso, não apaga nada.

## 2. Plano de incidentes

1. **Detectar**: alerta de CI/Semgrep/Gitleaks, relato ao contato de segurança, comportamento estranho na auditoria.
2. **Conter**: suspender a prefeitura afetada (`/equipe/[id]`), revogar sessões, rotacionar chaves (Vercel e Supabase).
3. **Avaliar**: quais dados, de quais prefeituras, por quanto tempo; usar `auditoria` (só ids e contagens).
4. **Avisar**: prefeitura controladora primeiro; ANPD e titulares conforme a controladora decidir (**a validar**).
5. **Corrigir e registrar**: correção em PR, teste que reproduz a falha, lição no registro de incidentes (data, causa, efeito, ação). Sem dado pessoal no registro.

## 3. Pedidos de titulares (LGPD, art. 18)

- Dados do acervo: o pedido vai à prefeitura (encarregado dela). LicCONT apoia com exportação e correção, sem decidir pela prefeitura.
- Pedidos de demonstração: o titular escreve ao contato do site; LicCONT apaga o registro (tabela `pedidos_demonstracao`) em até 15 dias (**a validar**).
- Todo atendimento é registrado com data e resultado, sem copiar o dado.

## 4. Retenção (proposta, a validar)

| Dado | Proposta |
| --- | --- |
| Acervo da prefeitura | Enquanto durar o contrato; depois de confirmada a exportação, eliminar em 90 dias |
| Auditoria | Acompanha o acervo; só inclusão |
| Pedido de demonstração | 90 dias depois da resposta (hoje **sem rotina automática**) |
| Aceites | Enquanto a conta existir |
| Cópias de backup | Apagar o dump local após o uso; cópia restaurada segue o prazo do acervo |

## 5. Política de privacidade e termo de uso

Rascunhos publicados em `/privacidade` e `/termos`, com aviso de "em revisão".
Versão em `src/features/site/versao.ts`; mudar a versão exige novo aceite de todos.

## 6. RIPD

Só se o advogado pedir. Pontos de partida: PDFs com dados de terceiros (CPF em propostas), CPF de credor pessoa física (`cpf_credor`), nome de quem retira documento (empréstimos).

# 0012 · Fontes públicas de dados: TCE-CE e PNCP

Status: aceita (2026-11-15), a validar com o advogado antes do piloto.
Fase: 9 (`docs/fases/fase-9.md`).

## Decisão

O LicCONT lê duas fontes **públicas e gratuitas**, só pelo servidor:

1. **API de Dados Abertos do TCE-CE (SIM)**: licitações e contratos da
   prefeitura, importados toda noite (`/api/tce/importar`, região `gru1`) ou
   por "Importar agora". A API só aceita IP do Brasil, por isso a rotina roda
   em São Paulo.
2. **PNCP (Portal Nacional de Contratações Públicas)**: lista e baixa os
   arquivos públicos de uma compra, a pedido de quem cadastra, para anexar ao
   documento.

## Por que não são suboperadores

Não recebem dado da prefeitura para tratar por conta dela. O LicCONT só **lê**
dados já públicos. O que sai do LicCONT em cada chamada:

| Fonte | O que vai na requisição | O que nunca vai |
| --- | --- | --- |
| TCE-CE | Código do município, ano, tipo (licitação ou contrato), página | Nenhum dado do acervo |
| PNCP | CNPJ do órgão, ano e número da compra (conferidos pela pessoa na tela) | Nenhum dado do acervo, nenhum dado da pessoa |

## Regras que decorrem

- **CPF do TCE não é guardado**: só nome e CNPJ válido. CPF que venha no campo
  do credor é descartado antes de gravar (`src/features/tce/cliente.ts`).
- **Formato inesperado para a rotina** e nada é gravado pela metade; o
  histórico guarda só números, datas e um código fixo de erro (`indisponivel`,
  `formato`, `sem_configuracao`, `interno`). Nenhum conteúdo em log.
- **Uma prefeitura por vez, uma página por vez**, com pausa entre páginas e
  nova tentativa se o tribunal cair. Sem custo (planos gratuitos).
- **Nada é sobrescrito**: registro do TCE com o mesmo processo de um documento
  já cadastrado vira "possível duplicado" e a pessoa escolhe Juntar ou Manter
  separado.
- **A integração nasce desligada** (`prefeituras.tce_ativo = false`): só o
  administrador liga, depois de informar município, secretaria e anos.
- **Anos e tipos escolhidos pelo administrador**; a rotina da noite não
  reimporta o que já veio (`tce_id` único por prefeitura).
- **PDF do PNCP** passa pela mesma conferência dos envios manuais (assinatura
  `%PDF`, tamanho dentro do limite da prefeitura, hash e cópia leve).

## O que falta confirmar

Os caminhos e os nomes dos campos das duas APIs estão isolados em
`src/features/tce/cliente.ts` e `src/features/pncp/cliente.ts`, escritos a
partir do plano e testados com respostas **fictícias**. A API do TCE não
respondeu a partir do ambiente de desenvolvimento (bloqueio por IP fora do
Brasil). Antes de ligar em produção: conferir uma resposta real de cada fonte
e ajustar esses dois arquivos.

## Atualização 2026-11-15: API do TCE verificada

Endereço base com `/sim/`, datas `AAAAMMDD`, paginação `$count`/`$start_index` (máx. 1000), sem autenticação. Licitação = `processos_administrativos_contratacoes`; contrato = `contratos` + `contratados` (empresa e CNPJ). Sem id próprio: a chave é número + data. CPFs vêm criptografados e nunca são guardados. A API tem acento quebrado (UTF-8 lido como Windows-1252); o cliente conserta o que dá. Detalhes em `src/features/tce/cliente.ts`.

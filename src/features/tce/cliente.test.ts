import { describe, expect, it, vi } from "vitest";
import { ErroTce, POR_PAGINA, lerTce, normalizar } from "./cliente";

// Respostas fictícias: nada aqui veio do TCE de verdade.
const LICITACAO = {
  id: 101,
  numero_licitacao: "001/2024",
  ano: 2024,
  objeto: "Compra de material fictício",
  modalidade: "Pregão Eletrônico",
  situacao: "Concluída",
  nome_fornecedor: "Empresa Fictícia",
  cnpj: "00.000.000/0001-91",
  valor: "1500.50",
  cpf: "529.982.247-25",
};
const CONTRATO = {
  codigo: "9",
  numero_contrato: "010/2024",
  exercicio: 2024,
  descricao: "Serviço fictício",
  nome_contratado: "Pessoa Fictícia",
  cpf_cnpj: "529.982.247-25",
  valor_global: 1000,
  data_inicio_vigencia: "2024-01-01T00:00:00",
  data_fim_vigencia: "31/12/2024",
};
const resposta = (corpo: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(corpo), { status }));
const sem = { esperar: () => Promise.resolve() };

describe("normalizar", () => {
  it("licitação vira registro do LicCONT, sem CPF", () => {
    const n = normalizar(LICITACAO, "licitacao");
    expect(n).toMatchObject({ registro: { tce_id: "L101", tipo: "licitacao", modalidade: "pregao_eletronico", situacao: "concluida", cnpj: "00000000000191", valor: 1500.5, ano: 2024 } });
    expect(JSON.stringify(n)).not.toContain("52998224725");
  });
  it("contrato com CPF: guarda o nome, descarta o CPF; datas em dois formatos", () => {
    const n = normalizar(CONTRATO, "contrato");
    expect(n).toMatchObject({ registro: { tce_id: "C9", cnpj: null, empresa: "Pessoa Fictícia", situacao: "vigente", vigencia_inicio: "2024-01-01", vigencia_fim: "2024-12-31", modalidade: null } });
    expect(JSON.stringify(n)).not.toMatch(/52998224725|529\.982/);
  });
  it("modalidade desconhecida é ignorada, não derruba", () => {
    expect(normalizar({ ...LICITACAO, modalidade: "Outra Coisa" }, "licitacao")).toEqual({ ignorado: true });
  });
  it("sem id, número, ano ou objeto é formato inesperado", () => {
    for (const mudar of [{ id: undefined }, { numero_licitacao: undefined }, { ano: undefined }, { objeto: "" }]) {
      expect(() => normalizar({ ...LICITACAO, ...mudar }, "licitacao")).toThrow(ErroTce);
    }
    expect(() => normalizar("texto", "licitacao")).toThrow(ErroTce);
  });
  it("CNPJ inválido é descartado em vez de gravado", () => {
    expect(normalizar({ ...LICITACAO, cnpj: "11.111.111/1111-11" }, "licitacao")).toMatchObject({ registro: { cnpj: null } });
  });
});

describe("lerTce", () => {
  it("lê as páginas até a última, com pausa entre elas", async () => {
    const cheia = Array.from({ length: POR_PAGINA }, (_, i) => ({ ...LICITACAO, id: i + 1, numero_licitacao: `${i}/2024` }));
    const buscar = vi.fn().mockReturnValueOnce(resposta(cheia)).mockReturnValueOnce(resposta({ data: [LICITACAO] }));
    const esperar = vi.fn().mockResolvedValue(undefined);
    const r = await lerTce("licitacao", "162", 2024, { buscar, esperar });
    expect(r.registros).toHaveLength(POR_PAGINA + 1);
    expect(buscar).toHaveBeenCalledTimes(2);
    expect(buscar.mock.calls[0][0]).toContain("codigo_municipio=162&exercicio_orcamento=2024&pagina=1");
    expect(esperar).toHaveBeenCalledWith(500);
  });
  it("tenta de novo quando o TCE cai e desiste com 'indisponivel'", async () => {
    const buscar = vi.fn().mockReturnValue(resposta({}, 503));
    const erro = await lerTce("licitacao", "162", 2024, { buscar, ...sem, tentativas: 3 }).catch((e) => e);
    expect(erro).toMatchObject({ codigo: "indisponivel" });
    expect(buscar).toHaveBeenCalledTimes(3);
  });
  it("recupera depois de uma queda", async () => {
    const buscar = vi.fn().mockReturnValueOnce(resposta({}, 500)).mockReturnValueOnce(resposta([LICITACAO]));
    const r = await lerTce("licitacao", "162", 2024, { buscar, ...sem });
    expect(r.registros).toHaveLength(1);
  });
  it("formato inesperado para tudo, sem tentar de novo e sem devolver nada", async () => {
    const buscar = vi.fn().mockReturnValue(resposta({ erro: "x" }));
    const erro = await lerTce("licitacao", "162", 2024, { buscar, ...sem }).catch((e) => e);
    expect(erro).toMatchObject({ codigo: "formato" });
    expect(buscar).toHaveBeenCalledTimes(1);
  });
  it("item quebrado no meio da página também para tudo", async () => {
    const buscar = vi.fn().mockReturnValue(resposta([LICITACAO, { id: 1 }]));
    await expect(lerTce("licitacao", "162", 2024, { buscar, ...sem })).rejects.toMatchObject({ codigo: "formato" });
  });
  it("recusa município fora do padrão (nada de montar URL com texto solto)", async () => {
    const buscar = vi.fn();
    await expect(lerTce("licitacao", "162&x=1", 2024, { buscar, ...sem })).rejects.toBeInstanceOf(ErroTce);
    expect(buscar).not.toHaveBeenCalled();
  });
  it("entrega por página quando recebe o callback", async () => {
    const buscar = vi.fn().mockReturnValue(resposta([LICITACAO]));
    const paginas: number[] = [];
    const r = await lerTce("licitacao", "162", 2024, { buscar, ...sem }, async (p) => void paginas.push(p.length));
    expect(paginas).toEqual([1]);
    expect(r.registros).toEqual([]);
  });
});

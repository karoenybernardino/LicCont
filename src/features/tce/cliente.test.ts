import { describe, expect, it, vi } from "vitest";
import { ErroTce, POR_PAGINA, consertarTexto, indexarContratados, lerTce, normalizar } from "./cliente";

// Formato igual ao da API real (conferido em 15/11/2026); valores fictícios.
const LICITACAO = {
  codigo_municipio: "002",
  data_realizacao_autuacao_licitacao: "2025-05-23T00:00:00",
  numero_licitacao: "D-05.29.2/2025",
  modalidade_licitacao: "9",
  modalidade_processo_administrativo: "D",
  descricao_objeto_licitacao: "CONTRATAÃ‡ÃƒO DE SERVIÃ‡OS FICTICIOS",
  data_homologacao: "2025-06-06T00:00:00",
  cpf_gestor: "/Z6NNEXjaEoDtstd4z59aw==",
};
const CONTRATO = {
  codigo_municipio: "002",
  cpf_gestor: "/Z6NNEXjaEoDtstd4z59aw==",
  data_contrato: "2025-02-04T00:00:00",
  numero_contrato: "01.27.2/2025",
  descricao_objeto_contrato: "SERVIÇO FICTÍCIO",
  valor_total_contrato: 30000.0,
  data_inicio_vigencia_contrato: "2025-02-04T00:00:00",
  data_fim_vigencia_contrato: "2999-02-04T00:00:00",
};
const CONTRATADO = {
  codigo_municipio: "002",
  data_contrato: "2025-02-04T00:00:00",
  numero_contrato: "01.27.2/2025",
  numero_documento_negociante: "00000000000191",
  codigo_tipo_negociante: "1",
  nome_negociante: "EMPRESA FICTICIA",
};
const resposta = (elements: unknown[], status = 200) => Promise.resolve(new Response(JSON.stringify({ name: "x", elements }), { status }));
const sem = { esperar: () => Promise.resolve() };

describe("consertarTexto", () => {
  it("desfaz o acento quebrado e deixa texto normal como está", () => {
    expect(consertarTexto("CONTRATAÃ‡ÃƒO DE SERVIÃ‡OS")).toBe("CONTRATAÇÃO DE SERVIÇOS");
    expect(consertarTexto("SERVIÇO NORMAL")).toBe("SERVIÇO NORMAL");
  });
  it("o que não tem volta fica como veio", () => {
    expect(consertarTexto("FICTÃ�CIO")).toBe("FICTÃ�CIO");
  });
});

describe("normalizar licitação", () => {
  it("dispensa vira registro, com chave número + data, texto consertado e sem CPF", () => {
    const n = normalizar(LICITACAO, "licitacao");
    expect(n).toMatchObject({
      registro: { tce_id: "L|D-05.29.2/2025|2025-05-23", tipo: "licitacao", modalidade: "dispensa", situacao: "concluida", ano: 2025, empresa: null, valor: null },
    });
    expect("registro" in n && n.registro.objeto).toBe("CONTRATAÇÃO DE SERVIÇOS FICTICIOS");
    expect(JSON.stringify(n)).not.toContain("Z6NNEX");
  });
  it("pregão eletrônico (código 6) entra; sem homologação fica em andamento", () => {
    const n = normalizar({ ...LICITACAO, modalidade_processo_administrativo: "N", modalidade_licitacao: "6", data_homologacao: null }, "licitacao");
    expect(n).toMatchObject({ registro: { modalidade: "pregao_eletronico", situacao: "em_andamento" } });
  });
  it("modalidade não confirmada é ignorada, e registro sem número é formato inesperado", () => {
    expect(normalizar({ ...LICITACAO, modalidade_processo_administrativo: "N", modalidade_licitacao: "3" }, "licitacao")).toEqual({ ignorado: true });
    expect(() => normalizar({ ...LICITACAO, numero_licitacao: "" }, "licitacao")).toThrow(ErroTce);
  });
});

describe("normalizar contrato", () => {
  it("junta a empresa e o CNPJ vindos de /contratados; vigente quando o fim é futuro", () => {
    const mapa = indexarContratados([CONTRATADO]);
    const n = normalizar(CONTRATO, "contrato", mapa);
    expect(n).toMatchObject({
      registro: { tce_id: "C|01.27.2/2025|2025-02-04", empresa: "EMPRESA FICTICIA", cnpj: "00000000000191", valor: 30000, situacao: "vigente", vigencia_fim: "2999-02-04", modalidade: null },
    });
  });
  it("encerrado quando o fim já passou; CPF do contratado nunca é guardado", () => {
    const mapa = indexarContratados([{ ...CONTRATADO, numero_documento_negociante: "52998224725", codigo_tipo_negociante: "2", nome_negociante: "PESSOA FICTICIA" }]);
    const n = normalizar({ ...CONTRATO, data_fim_vigencia_contrato: "2020-01-01T00:00:00" }, "contrato", mapa);
    expect(n).toMatchObject({ registro: { situacao: "encerrado", cnpj: null, empresa: "PESSOA FICTICIA" } });
    expect(JSON.stringify(n)).not.toContain("52998224725");
  });
});

describe("lerTce", () => {
  it("pede o método certo com datas AAAAMMDD, junta os contratados e para na última página", async () => {
    const buscar = vi.fn((url: string | URL | Request) =>
      String(url).includes("/sim/contratados") ? resposta([CONTRATADO]) : resposta([CONTRATO]),
    );
    const r = await lerTce("contrato", "002", 2025, { buscar: buscar as unknown as typeof fetch, ...sem });
    expect(r.registros).toHaveLength(1);
    expect(r.registros[0].empresa).toBe("EMPRESA FICTICIA");
    const urls = buscar.mock.calls.map((c) => String(c[0]));
    expect(urls[1]).toContain("/sim/contratos?codigo_municipio=002&data_inicio=20250101&data_fim=20251231&%24count=1000&%24start_index=0");
  });
  it("página cheia puxa a seguinte com $start_index", async () => {
    const cheia = Array.from({ length: POR_PAGINA }, (_, i) => ({ ...LICITACAO, numero_licitacao: `D-${i}` }));
    const buscar = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ elements: cheia }))).mockResolvedValueOnce(new Response(JSON.stringify({ elements: [LICITACAO] })));
    const r = await lerTce("licitacao", "002", 2025, { buscar: buscar as unknown as typeof fetch, ...sem });
    expect(r.registros).toHaveLength(POR_PAGINA + 1);
    expect(String(buscar.mock.calls[1][0])).toContain("start_index=1000");
  });
  it("resposta de erro da API (__errors__) para tudo como formato inesperado", async () => {
    const buscar = vi.fn(() => Promise.resolve(new Response(JSON.stringify({ __errors__: [{ code: 1 }] }))));
    await expect(lerTce("licitacao", "002", 2025, { buscar: buscar as unknown as typeof fetch, ...sem })).rejects.toMatchObject({ codigo: "formato" });
  });
  it("erro 500 tenta de novo e depois falha como indisponível", async () => {
    const buscar = vi.fn(() => Promise.resolve(new Response("x", { status: 503 })));
    await expect(lerTce("licitacao", "002", 2025, { buscar: buscar as unknown as typeof fetch, ...sem })).rejects.toMatchObject({ codigo: "indisponivel" });
    expect(buscar).toHaveBeenCalledTimes(3);
  });
  it("recusa município ou ano inválidos sem chamar a rede", async () => {
    const buscar = vi.fn();
    await expect(lerTce("licitacao", "../x", 2025, { buscar: buscar as unknown as typeof fetch })).rejects.toMatchObject({ codigo: "formato" });
    await expect(lerTce("licitacao", "002", 1800, { buscar: buscar as unknown as typeof fetch })).rejects.toMatchObject({ codigo: "formato" });
    expect(buscar).not.toHaveBeenCalled();
  });
});

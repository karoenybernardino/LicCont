import { describe, expect, it } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { conferirLinhas, gerarModeloXlsx, prazoDeGuarda, linhasDeItens, mapearColunas, montarLinhas, paraBanco, planilhaDeLinhasPdf, textoPrazo } from "./classes-tabela";

const cab = ["Código", "Classe", "Grupo", "Tipologias", "Prazo (anos)", "Tipo de prazo", "Destinação", "Observação"];

describe("montarLinhas", () => {
  it("lê prazo fixo e permanente (\"após evento\" de tabela antiga vira fixo)", () => {
    const { linhas } = montarLinhas([...cab], [
      ["031", "Licitações", "Licitações e Contratos", "", "12", "fixo", "eliminação", ""],
      ["035", "Dispensas", "Licitações e Contratos", "", "5 anos", "fixo", "", ""],
      ["010", "Atas", "Administrativo", "", "", "permanente", "guarda permanente", ""],
    ]);
    expect(linhas.map((l) => [l.tipoPrazo, l.corrente, l.destinacao])).toEqual([
      ["fixo", 12, "eliminacao"],
      ["fixo", 5, "eliminacao"],
      ["permanente", 0, "guarda_permanente"],
    ]);
  });
  it("tabela antiga com coluna de evento lê como prazo fixo e entende 5 + 7", () => {
    const { linhas } = montarLinhas(["codigo", "classe", "prazo", "tipo de prazo", "evento"], [["1", "Convênios", "5 + 7", "após evento", "Prestação de contas"]], "Financeiro");
    expect(linhas[0]).toMatchObject({ tipoPrazo: "fixo", corrente: 5, intermediaria: 7, grupo: "Financeiro" });
  });
  it("sem coluna de código ou classe não lê nada", () => {
    expect(montarLinhas(["a", "b"], [["1", "2"]])).toEqual({ linhas: [], semColunas: ["Código", "Classe"] });
  });
  it("ignora linha em branco e acento no título", () => {
    expect(mapearColunas(["CÓDIGO", "Destinação"])).toEqual({ codigo: 0, destinacao: 1 });
    expect(montarLinhas(cab, [["", "", "", "", "", "", "", "", ""]]).linhas).toHaveLength(0);
  });
});

describe("conferirLinhas", () => {
  const base = { nome: "Classe", grupo: "Administrativo", tipologias: "", corrente: 5, intermediaria: 0, tipoPrazo: "fixo" as const, destinacao: "eliminacao" as const, observacao: "" };
  it("aponta código repetido, grupo desconhecido e prazo inválido", () => {
    const erros = conferirLinhas(
      [
        { ...base, codigo: "1" },
        { ...base, codigo: "1" },
        { ...base, codigo: "2", grupo: "Inexistente" },
        { ...base, codigo: "3", corrente: 0 },
        { ...base, codigo: "", nome: "" },
      ],
      ["Administrativo"],
    );
    expect(erros[0]).toEqual(["Código repetido na tabela."]);
    expect(erros[2]).toEqual(["Grupo não cadastrado neste órgão."]);
    expect(erros[3]).toEqual(["Prazo inválido (de 1 a 99 anos)."]);
    expect(erros[4]).toContain("Falta o código.");
  });
  it("linha certa não tem erro e vai para o banco sem espaço sobrando", () => {
    const l = { ...base, codigo: " 031 ", grupo: "administrativo" };
    expect(conferirLinhas([l], ["Administrativo"])).toEqual([[]]);
    expect(paraBanco([l])[0]).toMatchObject({ codigo: "031", prazo_corrente: 5, tipo_prazo: "fixo" });
  });
  it("permanente com destinação de eliminação é erro", () => {
    expect(conferirLinhas([{ ...base, codigo: "9", tipoPrazo: "permanente" }], ["Administrativo"])[0]).toContain("Guarda permanente e prazo permanente têm de andar juntos.");
  });
});

describe("textos da lista", () => {
  it("prazo", () => {
    expect(textoPrazo({ corrente: 5, intermediaria: 7, tipoPrazo: "fixo" })).toBe("12 anos");
    expect(textoPrazo({ corrente: 0, intermediaria: 0, tipoPrazo: "permanente" })).toBe("Permanente");
  });
});

describe("prazo de guarda na etiqueta", () => {
  it("monta a frase como no quadro", () => {
    expect(prazoDeGuarda({ corrente: 12, intermediaria: 0, tipoPrazo: "fixo" })).toBe("12 anos a partir do fim do ano do documento");
    expect(prazoDeGuarda({ corrente: 5, intermediaria: 5, tipoPrazo: "fixo" })).toBe("10 anos a partir do fim do ano do documento");
    expect(prazoDeGuarda({ corrente: 1, intermediaria: 0, tipoPrazo: "fixo" })).toBe("1 ano a partir do fim do ano do documento");
    expect(prazoDeGuarda({ corrente: 0, intermediaria: 0, tipoPrazo: "permanente" })).toBe("Guarda permanente");
  });
});

describe("PDF", () => {
  const it_ = (texto: string, x: number, y: number, conf = 95) => ({ texto, x, y, largura: texto.length * 5, confianca: conf });
  it("agrupa trechos em linhas e colunas e junta a continuação", () => {
    const linhas = linhasDeItens([
      it_("Código", 10, 700), it_("Classe", 80, 700), it_("Prazo", 300, 700),
      it_("031", 10, 680), it_("Licitações e", 80, 680), it_("12 anos", 300, 680),
      it_("Contratos", 80, 668),
      it_("032", 10, 650, 60), it_("Contratos e aditivos", 80, 650), it_("10 anos", 300, 650),
    ]);
    expect(linhas[0].celulas).toEqual(["Código", "Classe", "Prazo"]);
    const p = planilhaDeLinhasPdf(linhas);
    expect(p.cabecalhos).toEqual(["Código", "Classe", "Prazo"]);
    expect(p.linhas).toEqual([["031", "Licitações e Contratos", "12 anos"], ["032", "Contratos e aditivos", "10 anos"]]);
    expect(p.duvidosas).toEqual([false, true]);
  });
  it("sem linha de títulos marca tudo como duvidoso", () => {
    const p = planilhaDeLinhasPdf([{ celulas: ["031", "Licitações", "12 anos", "eliminação"], confianca: 99 }]);
    expect(p.duvidosas).toEqual([true]);
  });
});

describe("modelo .xlsx", () => {
  it("é um zip com a planilha e os títulos certos", () => {
    const arq = unzipSync(gerarModeloXlsx(["Administrativo", "Licitações e Contratos"]));
    const folha = strFromU8(arq["xl/worksheets/sheet1.xml"]);
    expect(folha).toContain("<t>Código</t>");
    expect(folha).toContain("Tipo de prazo");
    expect(Object.keys(arq)).toContain("xl/workbook.xml");
  });
});

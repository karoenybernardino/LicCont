import { describe, expect, it } from "vitest";
import { CAMPO_PREFEITURA, administraAcervo, conferirPrefeitura, escolherPrefeitura } from "./escolha";

const prefs = [{ id: "a" }, { id: "b" }];

describe("escolherPrefeitura", () => {
  it("aceita só id permitido", () => {
    expect(escolherPrefeitura("b", prefs, false)).toBe("b");
    expect(escolherPrefeitura("x", prefs, false)).toBe("a");
    expect(escolherPrefeitura(undefined, prefs, false)).toBe("a");
  });
  it("sem permitidas devolve vazio", () => expect(escolherPrefeitura("a", [], false)).toBe(""));
  it("todas só quando a tela aceita", () => {
    expect(escolherPrefeitura("todas", prefs, true)).toBe("todas");
    expect(escolherPrefeitura("todas", prefs, false)).toBe("a");
  });
});

describe("administraAcervo", () => {
  it("administrador ou parceira com prefeitura; consulta e parceira sem prefeitura não", () => {
    expect(administraAcervo({ administrador: true })).toBe(true);
    expect(administraAcervo({ administrador: false, parceira: true, prefeituraId: "a" })).toBe(true);
    expect(administraAcervo({ administrador: false, parceira: true, prefeituraId: "" })).toBe(false);
    expect(administraAcervo({ administrador: false })).toBe(false);
  });
});

describe("conferirPrefeitura", () => {
  const campo = (v: string) => {
    const f = new FormData();
    f.set(CAMPO_PREFEITURA, v);
    return f;
  };
  it("quem é de prefeitura não precisa do campo", () => expect(conferirPrefeitura(new FormData(), { prefeituraId: "a" })).toBe(true));
  it("parceira: só a prefeitura atual passa", () => {
    const u = { parceira: true, prefeituraId: "a" };
    expect(conferirPrefeitura(campo("a"), u)).toBe(true);
    expect(conferirPrefeitura("a", u)).toBe(true);
    expect(conferirPrefeitura(campo("b"), u)).toBe(false);
    expect(conferirPrefeitura(new FormData(), u)).toBe(false);
    expect(conferirPrefeitura(undefined, u)).toBe(false);
  });
  it("parceira sem prefeitura nunca passa", () => expect(conferirPrefeitura("", { parceira: true, prefeituraId: "" })).toBe(false));
});

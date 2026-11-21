import { describe, expect, it } from "vitest";
import { administraAcervo, escolherPrefeitura } from "./escolha";

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
  it("administrador ou parceira; consulta não", () => {
    expect(administraAcervo({ administrador: true })).toBe(true);
    expect(administraAcervo({ administrador: false, parceira: true })).toBe(true);
    expect(administraAcervo({ administrador: false })).toBe(false);
  });
});

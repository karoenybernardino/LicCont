import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SeletorTema } from "./seletor-tema";

// O rótulo visível troca por CSS (coberto no Playwright); aqui, o comportamento.
describe("SeletorTema", () => {
  beforeEach(() => {
    document.documentElement.setAttribute("data-theme", "light");
    localStorage.clear();
  });
  afterEach(cleanup);

  it("alterna para o tema escuro e guarda a escolha", () => {
    render(<SeletorTema />);
    fireEvent.click(screen.getByRole("button"));
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("tema")).toBe("dark");
  });

  it("volta para o tema claro", () => {
    document.documentElement.setAttribute("data-theme", "dark");
    render(<SeletorTema />);
    fireEvent.click(screen.getByRole("button"));
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem("tema")).toBe("light");
  });
});

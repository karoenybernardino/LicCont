import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BarraLateral } from "./barra-lateral";

vi.mock("next/navigation", () => ({ usePathname: () => "/pesquisa" }));

const montar = () =>
  render(
    <BarraLateral
      grupos={[[{ href: "/pesquisa", rotulo: "Pesquisa", dica: "Busca documentos.", icone: "pesquisa" }], [{ rotulo: "Auditoria", icone: "auditoria" }]]}
      rodape={[]}
      sair={<button aria-label="Sair">x</button>}
    />,
  );

afterEach(cleanup);

describe("BarraLateral", () => {
  it("mostra a aba ao passar o mouse e esconde ao sair", () => {
    montar();
    expect(screen.queryByRole("tooltip")).toBeNull();
    const link = screen.getByRole("link", { name: "Pesquisa" });
    fireEvent.mouseEnter(link.closest("li")!);
    const dica = screen.getByRole("tooltip");
    expect(dica.textContent).toContain("Busca documentos.");
    expect(link.getAttribute("aria-describedby")).toBe(dica.id);
    fireEvent.mouseLeave(link.closest("li")!);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("abre ao focar pelo teclado e fecha com Esc", () => {
    montar();
    fireEvent.focus(screen.getByRole("link", { name: "Pesquisa" }));
    expect(screen.getByRole("tooltip")).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("item em breve também explica", () => {
    montar();
    fireEvent.focus(screen.getByRole("img", { name: "Auditoria (em breve)" }));
    expect(screen.getByRole("tooltip").textContent).toContain("Em breve.");
  });
});

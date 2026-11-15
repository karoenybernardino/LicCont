import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EscolhaRua } from "./escolha-rua";

afterEach(cleanup);

const RUAS = [
  { id: "1", codigo: "A", modulos: 12, percentual: 82 },
  { id: "2", codigo: "B", modulos: 10, percentual: 64 },
  { id: "3", codigo: "AB", modulos: 8, percentual: 15 },
];

describe("EscolhaRua", () => {
  it("filtra pela digitação e escolhe a rua", () => {
    const aoEscolher = vi.fn();
    render(<EscolhaRua ruas={RUAS} valor="" aoEscolher={aoEscolher} />);
    fireEvent.click(screen.getByRole("button", { name: /Escolha/ }));
    fireEvent.change(screen.getByPlaceholderText("Buscar rua…"), { target: { value: "b" } });
    expect(screen.queryByText("Rua A")).toBeNull();
    fireEvent.click(screen.getByText("Rua B"));
    expect(aoEscolher).toHaveBeenCalledWith("2");
  });

  it("mostra a rua escolhida e módulos e ocupação", () => {
    render(<EscolhaRua ruas={RUAS} valor="2" aoEscolher={() => {}} />);
    expect(screen.getByRole("button", { name: /Rua B/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Rua B/ }));
    expect(screen.getByText("10 módulos · 64% ocupada")).toBeTruthy();
  });
});

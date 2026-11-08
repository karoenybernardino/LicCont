import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Campo } from "./campo";

afterEach(cleanup);

it("liga o rótulo ao campo para leitores de tela", () => {
  render(<Campo rotulo="Número do processo" name="numero" />);
  const campo = screen.getByLabelText("Número do processo");
  expect(campo.getAttribute("name")).toBe("numero");
});

it("mostra a mensagem de erro ligada ao campo", () => {
  render(<Campo rotulo="Ano" name="ano" erro="Informe o ano" />);
  const campo = screen.getByLabelText("Ano");
  expect(campo.getAttribute("aria-invalid")).toBe("true");
  expect(screen.getByText("Informe o ano").id).toBe(campo.getAttribute("aria-describedby"));
});

import { z } from "zod";

// Pedido de demonstração: validado no servidor antes de gravar.
// `empresa_site` é o campo-isca: pessoa de verdade não vê nem preenche.
const texto = (max: number) => z.string().trim().max(max);

export const esquemaPedido = z.object({
  nome: texto(120).min(2, "Informe seu nome."),
  cargo: texto(120).optional().default(""),
  orgao: texto(160).min(2, "Informe o órgão."),
  email: texto(200).pipe(z.email("Informe um e-mail válido.")),
  telefone: texto(30).optional().default(""),
  mensagem: texto(1000).optional().default(""),
  empresa_site: z.string().max(0).optional().default(""),
});

export type Pedido = z.infer<typeof esquemaPedido>;

export function lerPedido(dados: FormData) {
  const bruto = Object.fromEntries(
    ["nome", "cargo", "orgao", "email", "telefone", "mensagem", "empresa_site"].map((k) => [k, String(dados.get(k) ?? "")]),
  );
  return esquemaPedido.safeParse(bruto);
}

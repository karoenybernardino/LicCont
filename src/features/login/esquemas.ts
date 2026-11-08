import { z } from "zod";

// Uma só mensagem para toda falha de login (docs/fases/fase-1.md, Login).
export const MENSAGEM_ERRO_LOGIN =
  "Não foi possível entrar. Confira os dados ou fale com o administrador da sua prefeitura.";

export const MENSAGEM_INDISPONIVEL =
  "O login está indisponível: falta configuração no servidor. Avise a equipe LicCONT.";

// z.guid: os ids fictícios do seed não seguem a variante do RFC 4122.
export const idSchema = z.guid();

const email = z.email().max(254);
const senha = z.string().min(1).max(200);

export const esquemaLogin = z.object({
  secretaria: z.union([z.literal("todas"), idSchema]),
  email,
  senha,
});

export const esquemaLoginEquipe = z.object({ email, senha });

export const esquemaNovaSenha = z
  .object({
    senha: z
      .string()
      .min(8, "A senha precisa ter pelo menos 8 caracteres.")
      .refine(
        (s) => /[a-z]/.test(s) && /[A-Z]/.test(s) && /\d/.test(s) && /[^A-Za-z0-9]/.test(s),
        "A senha precisa ter letra maiúscula, letra minúscula, número e símbolo.",
      )
      // bcrypt usa só os primeiros 72 bytes (acento ocupa mais de um).
      .refine((s) => new TextEncoder().encode(s).length <= 72, "A senha pode ter no máximo 72 caracteres."),
    confirmacao: z.string(),
  })
  .refine((d) => d.senha === d.confirmacao, {
    message: "As duas senhas não são iguais.",
    path: ["confirmacao"],
  });

import { randomBytes } from "node:crypto";
import { z } from "zod";
import { idSchema } from "@/features/login/esquemas";

export const PERFIS = {
  administrador: "Administrador",
  coordenador: "Coordenador",
  operador: "Operador",
  consulta: "Consulta",
} as const;

export type Perfil = keyof typeof PERFIS;

export const esquemaUsuario = z
  .object({
    nome: z.string().trim().min(2, "Informe o nome.").max(200, "Nome muito longo."),
    matricula: z
      .string()
      .trim()
      .max(40, "Matrícula muito longa.")
      .transform((v) => v || null),
    perfil: z.enum(["administrador", "coordenador", "operador", "consulta"], "Escolha o perfil."),
    secretarias: z.array(idSchema),
  })
  .refine((d) => d.perfil === "administrador" || d.secretarias.length > 0, {
    message: "Escolha ao menos uma secretaria.",
    path: ["secretarias"],
  });

export const emailSchema = z.email("Informe um e-mail válido.").max(254);

export function lerUsuario(formData: FormData) {
  return esquemaUsuario.safeParse({
    nome: formData.get("nome") ?? "",
    matricula: formData.get("matricula") ?? "",
    perfil: formData.get("perfil"),
    secretarias: formData.getAll("secretarias"),
  });
}

// 16 caracteres aleatórios (96 bits). A pessoa troca no primeiro acesso.
export function senhaProvisoria() {
  return randomBytes(12).toString("base64url");
}

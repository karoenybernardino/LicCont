import { randomInt } from "node:crypto";
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

// 12 caracteres com os 4 tipos exigidos, sem os que se confundem (l, I, 0, O).
// A pessoa troca no primeiro acesso.
const TIPOS = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnpqrstuvwxyz", "23456789", "!@#$%*-_"];
export function senhaProvisoria() {
  const sortear = (s: string) => s[randomInt(s.length)];
  const todos = TIPOS.join("");
  const letras = [...TIPOS.map(sortear), ...Array.from({ length: 8 }, () => sortear(todos))];
  for (let i = letras.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [letras[i], letras[j]] = [letras[j], letras[i]];
  }
  return letras.join("");
}

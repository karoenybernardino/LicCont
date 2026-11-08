import { redirect } from "next/navigation";
import { usuarioAtual } from "@/features/sessao/dal";

export default async function Raiz() {
  redirect((await usuarioAtual()) ? "/inicio" : "/entrar");
}

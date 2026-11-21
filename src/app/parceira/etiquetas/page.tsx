import { redirect } from "next/navigation";

// Versão enxuta aposentada: a empresa usa a tela completa da prefeitura.
export default function Redireciona() {
  redirect("/etiquetas");
}

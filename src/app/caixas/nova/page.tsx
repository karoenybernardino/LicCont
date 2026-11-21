import { redirect } from "next/navigation";

// O cadastro de caixa agora fica em Cadastrar documento > Cadastro geral.
export default function NovaCaixa() {
  redirect("/documentos/novo?modo=geral");
}

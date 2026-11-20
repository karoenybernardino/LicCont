import { notFound, redirect } from "next/navigation";
import { exigirEquipe, membroEquipe } from "@/features/sessao/dal";

// Só a equipe LicCONT cadastra secretarias e usuários, e o faz no cadastro de
// cada prefeitura. Para os demais perfis a tela não existe (404).
export default async function Rota() {
  if (!(await membroEquipe())) notFound();
  await exigirEquipe();
  redirect("/equipe/prefeituras");
}

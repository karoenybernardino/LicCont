import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { SENHA, USUARIOS, type UsuarioTeste } from "./dados";

// Cria os usuários fictícios no Supabase local (só no CI). A equipe LicCONT
// entra por SQL, como em produção (ninguém inclui na equipe pela API).
export default async function preparar() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) {
    if (process.env.CI) throw new Error("CI sem Supabase local: confira o job playwright.");
    return;
  }
  const sb = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: prefeituras } = await sb.from("prefeituras").select("id, nome").throwOnError();
  const { data: secretarias } = await sb.from("secretarias").select("id, nome, prefeitura_id").throwOnError();

  for (const u of Object.values(USUARIOS) as UsuarioTeste[]) {
    const { data, error } = await sb.auth.admin.createUser({
      email: u.email,
      password: SENHA,
      email_confirm: true,
    });
    if (error) throw new Error(`createUser ${u.email}: ${error.message}`);
    const id = data.user.id;

    if (u.equipe) {
      execFileSync("psql", [
        process.env.E2E_DB_URL ?? "",
        "-v",
        "ON_ERROR_STOP=1",
        "-c",
        `insert into public.equipe_liccont (usuario_id) values ('${id}')`,
      ]);
      continue;
    }

    const prefeitura = prefeituras.find((p) => p.nome === u.prefeitura)!.id;
    await sb
      .from("usuarios")
      .insert({
        id,
        prefeitura_id: prefeitura,
        nome: `Pessoa fictícia ${u.email.split("@")[0]}`,
        administrador: !!u.administrador,
        troca_senha_obrigatoria: !!u.troca,
      })
      .throwOnError();

    for (const nome of u.secretarias ?? []) {
      const secretaria = secretarias.find((s) => s.nome === nome && s.prefeitura_id === prefeitura)!.id;
      await sb
        .from("vinculos")
        .insert({ prefeitura_id: prefeitura, usuario_id: id, secretaria_id: secretaria, papel: "operador" })
        .throwOnError();
    }
  }
}

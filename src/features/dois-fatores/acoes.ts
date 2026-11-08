"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { clienteServico, clienteSessao } from "@/lib/supabase/servidor";
import { membroEquipe, nivelSessao, origemDaRequisicao, usuarioAtual } from "@/features/sessao/dal";
import { MENSAGEM_INDISPONIVEL, idSchema } from "@/features/login/esquemas";
import { hashEmail } from "@/features/login/seguranca";
import { emDemo } from "@/features/demo/dados";

export type EstadoCadastro = { erro?: string; factorId?: string; qr?: string; segredo?: string } | undefined;
type Estado = { erro?: string } | undefined;

const codigoSchema = z.string().regex(/^\d{6}$/);
const MENSAGEM_CODIGO = "Código inválido ou vencido. Confira a hora do celular e tente de novo.";
const MENSAGEM_BLOQUEIO = "Muitas tentativas. Aguarde 15 minutos e tente de novo.";

// Quem precisa do segundo fator: administrador de prefeitura e equipe LicCONT.
async function contexto() {
  if (emDemo()) redirect("/inicio");
  const supabase = await clienteSessao();
  const servico = clienteServico();
  const segredo = process.env.LOGIN_HASH_SEGREDO;
  if (!supabase || !servico || !segredo || segredo.length < 32) return null;
  const usuario = await usuarioAtual();
  const equipe = usuario ? null : await membroEquipe();
  if (!usuario?.administrador && !equipe) redirect("/entrar");
  return { supabase, servico, segredo, usuario, equipe };
}

type Contexto = NonNullable<Awaited<ReturnType<typeof contexto>>>;

function destinoDepoisDoFator(usuario: { trocaSenha: boolean } | null) {
  return !usuario ? "/equipe" : usuario.trocaSenha ? "/nova-senha" : "/inicio";
}

// Mesmo limite do login (5 falhas em 15 min), contado por pessoa.
async function comLimite(c: Contexto, verificar: () => Promise<boolean>): Promise<Estado> {
  const id = c.usuario?.id ?? c.equipe!.id;
  const { ip } = await origemDaRequisicao();
  const { data: tentativa, error } = await c.servico.rpc("iniciar_tentativa_login", {
    p_email_hash: hashEmail(`mfa:${id}`, c.segredo),
    p_ip: ip,
  });
  if (error || tentativa === null) return { erro: MENSAGEM_BLOQUEIO };
  if (!(await verificar())) return { erro: MENSAGEM_CODIGO };
  await c.servico.rpc("concluir_tentativa_login", { p_id: tentativa });
  return undefined;
}

export async function iniciarCadastro(): Promise<EstadoCadastro> {
  const c = await contexto();
  if (!c) return { erro: MENSAGEM_INDISPONIVEL };
  const { data: fatores } = await c.supabase.auth.mfa.listFactors();
  // Quem já tem autenticador confirmado não cadastra outro sem o código.
  if (fatores?.totp.length) redirect("/segundo-fator");
  for (const f of fatores?.all ?? []) {
    if (f.factor_type === "totp" && f.status === "unverified") await c.supabase.auth.mfa.unenroll({ factorId: f.id });
  }
  const { data, error } = await c.supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "LicCONT" });
  if (error || !data) return { erro: "Não foi possível gerar o QR code. Tente de novo." };
  return { factorId: data.id, qr: data.totp.qr_code, segredo: data.totp.secret };
}

export async function confirmarCadastro(_: Estado, formData: FormData): Promise<Estado> {
  const c = await contexto();
  if (!c) return { erro: MENSAGEM_INDISPONIVEL };
  const factorId = idSchema.safeParse(formData.get("fator"));
  const codigo = codigoSchema.safeParse(formData.get("codigo"));
  if (!factorId.success || !codigo.success) return { erro: MENSAGEM_CODIGO };
  // Só confirma o fator novo, ainda não verificado (quem já tem usa verificarCodigo).
  const { data: fatores } = await c.supabase.auth.mfa.listFactors();
  if (fatores?.totp.length) redirect("/segundo-fator");
  const pendente = fatores?.all.some((f) => f.id === factorId.data && f.status === "unverified");
  if (!pendente) return { erro: MENSAGEM_CODIGO };

  const falha = await comLimite(c, async () => {
    const { error } = await c.supabase.auth.mfa.challengeAndVerify({ factorId: factorId.data, code: codigo.data });
    return !error;
  });
  if (falha) return falha;

  const { ip, aparelho } = await origemDaRequisicao();
  if (c.usuario) {
    await c.supabase.rpc("registrar_auditoria", { p_acao: "mfa.ativado", p_ip: ip, p_aparelho: aparelho });
  } else {
    await c.servico.rpc("registrar_auditoria_sistema", {
      p_prefeitura: null,
      p_usuario: c.equipe!.id,
      p_acao: "mfa.ativado",
      p_ip: ip,
      p_aparelho: aparelho,
    });
  }
  redirect(destinoDepoisDoFator(c.usuario));
}

export async function verificarCodigo(_: Estado, formData: FormData): Promise<Estado> {
  const c = await contexto();
  if (!c) return { erro: MENSAGEM_INDISPONIVEL };
  if ((await nivelSessao()) === "aal2") redirect(destinoDepoisDoFator(c.usuario));
  const codigo = codigoSchema.safeParse(formData.get("codigo"));
  if (!codigo.success) return { erro: MENSAGEM_CODIGO };

  const { data: fatores } = await c.supabase.auth.mfa.listFactors();
  const fator = fatores?.totp[0];
  if (!fator) redirect("/segundo-fator");

  const falha = await comLimite(c, async () => {
    const { error } = await c.supabase.auth.mfa.challengeAndVerify({ factorId: fator.id, code: codigo.data });
    return !error;
  });
  if (falha) return falha;
  redirect(destinoDepoisDoFator(c.usuario));
}

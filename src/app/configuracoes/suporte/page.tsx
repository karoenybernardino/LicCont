import type { Metadata } from "next";
import { Campo } from "@/ui/campo";
import { Formulario } from "@/ui/formulario";
import { Painel, TituloPainel } from "@/features/estrutura/componentes";
import { exigirAdmin } from "@/features/sessao/dal";
import { PaginaSistema } from "@/features/sessao/pagina";
import { clienteSessao } from "@/lib/supabase/servidor";
import { emDemo } from "@/features/demo/dados";
import { formatarData } from "@/features/documentos/formato";
import { autorizarSuporte, revogarSuporte } from "@/features/suporte/acoes";

export const metadata: Metadata = { title: "Acesso de suporte · LicCONT" };

type Linha = { id: string; motivo: string; inicio: string; fim: string; revogada_em: string | null };

export default async function Suporte() {
  const { usuario, secretaria } = await exigirAdmin();
  let lista: Linha[] = [];
  if (!emDemo()) {
    const sb = await clienteSessao();
    const { data } = sb
      ? await sb.from("autorizacoes_suporte").select("id, motivo, inicio, fim, revogada_em").order("inicio", { ascending: false }).limit(20)
      : { data: [] };
    lista = (data ?? []) as Linha[];
  }
  const vale = (l: Linha) => !l.revogada_em && new Date(l.fim) > new Date();
  return (
    <PaginaSistema usuario={usuario} secretaria={secretaria} titulo="Acesso de suporte" trilha="Configurações · Suporte">
      <Painel>
        <TituloPainel>Autorizar a equipe LicCONT</TituloPainel>
        <p className="text-sm text-texto-suave">
          Por padrão a equipe do LicCONT não lê o acervo. Se precisar de ajuda, você autoriza por no máximo 5 horas, pode revogar a qualquer momento, e tudo fica na auditoria. Não escreva dados pessoais no motivo.
        </p>
        <Formulario acao={autorizarSuporte} botao="Autorizar" enviando="Autorizando…" className="max-w-[520px]">
          <Campo rotulo="Motivo" name="motivo" required minLength={5} maxLength={300} placeholder="Ex.: ajuda para importar a planilha" />
          <Campo rotulo="Horas (1 a 5)" name="horas" type="number" min={1} max={5} defaultValue={2} required />
        </Formulario>
      </Painel>
      <Painel>
        <TituloPainel>Autorizações</TituloPainel>
        {lista.length === 0 && <p className="text-sm text-texto-suave">Nenhuma autorização até agora.</p>}
        <ul className="flex flex-col gap-2">
          {lista.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-linha pt-2 text-sm">
              <span>
                {l.motivo} · até {formatarData(l.fim)} {new Date(l.fim).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })}
                {l.revogada_em ? " · revogada" : vale(l) ? " · valendo" : " · vencida"}
              </span>
              {vale(l) && (
                <Formulario acao={revogarSuporte} botao="Revogar" enviando="Revogando…" variante="secundario">
                  <input type="hidden" name="id" value={l.id} />
                </Formulario>
              )}
            </li>
          ))}
        </ul>
      </Painel>
    </PaginaSistema>
  );
}

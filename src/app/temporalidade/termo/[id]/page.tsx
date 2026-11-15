import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pilula } from "@/ui/canvas";
import { Formulario } from "@/ui/formulario";
import { Painel, TituloPainel } from "@/features/estrutura/componentes";
import { exigirSessao } from "@/features/sessao/dal";
import { podeConferir } from "@/features/documentos/dados";
import { PaginaSistema } from "@/features/sessao/pagina";
import { esquemaId } from "@/features/documentos/esquemas";
import { formatarData } from "@/features/documentos/formato";
import { campo } from "@/features/movimento/ui";
import { aprovarTermo, cancelarTermo, publicarEdital } from "@/features/temporalidade/acoes";
import { obterTermo } from "@/features/temporalidade/dados";
import { PRAZO_CIENCIA_DIAS, aprovavelDesde, hojeSaoPaulo } from "@/features/temporalidade/regras";
import { ROTULO_SITUACAO } from "@/features/temporalidade/rotulos";

export const metadata: Metadata = { title: "Termo de eliminação · LicCONT" };

const link = "inline-flex min-h-10 items-center justify-center rounded-lg border border-linha px-5 text-sm font-medium text-texto hover:border-destaque focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco";

// Termo de eliminação: rascunho (listagem) → edital de ciência → aprovação.
// Não há quadro no canvas para esta tela: usa os painéis e botões das telas vizinhas.
export default async function Termo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!esquemaId.safeParse({ id }).success) notFound();
  const { usuario, secretaria } = await exigirSessao();
  const t = await obterTermo(id);
  if (!t) notFound();
  const hoje = hojeSaoPaulo();
  // Coordenador da secretaria do termo ou administrador (o banco confere de novo).
  const podeAndar = await podeConferir(usuario, t.secretariaId);
  const liberaEm = t.editalEm ? aprovavelDesde(t.editalEm) : null;
  const numero = `${String(t.numero).padStart(3, "0")}/${t.ano}`;
  const baixar = (formato: "pdf" | "docx") => `/temporalidade/termo/${t.id}/arquivo?formato=${formato}`;

  return (
    <PaginaSistema
      usuario={usuario}
      secretaria={secretaria}
      titulo={`Termo de eliminação ${numero}`}
      trilha={
        <span>
          <Link href="/temporalidade" className="text-destaque hover:underline">Temporalidade</Link>
          {" › "}Termo {numero}
        </span>
      }
    >
      <div className="grid items-start gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Painel>
          <div className="flex items-center justify-between gap-3">
            <TituloPainel>{t.itens} {t.itens === 1 ? "documento" : "documentos"} · {t.secretaria}</TituloPainel>
            <Pilula tom={t.situacao === "aprovado" ? "ok" : t.situacao === "cancelado" ? "erro" : "aviso"}>{ROTULO_SITUACAO[t.situacao]}</Pilula>
          </div>
          <ul className="flex flex-col gap-1">
            {t.documentos.map((d) => (
              <li key={`${d.titulo}-${d.caixa}`} className="flex items-center gap-3 rounded-[10px] px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{d.titulo}</p>
                  <p className="truncate text-xs text-texto-suave">{d.objeto}</p>
                </div>
                <span className="font-mono text-xs font-medium whitespace-nowrap text-texto-suave">{d.caixa}</span>
              </li>
            ))}
          </ul>
        </Painel>

        <Painel>
          <TituloPainel>Andamento</TituloPainel>
          <ol className="flex flex-col gap-2 text-sm">
            <li>Listagem gerada em {formatarData(t.geradoEm)}.</li>
            <li>{t.editalEm ? `Edital de ciência publicado em ${formatarData(t.editalEm)}.` : "Edital de ciência ainda não registrado."}</li>
            <li>
              {t.aprovadoEm
                ? `Eliminação aprovada em ${formatarData(t.aprovadoEm)}. Os documentos foram desativados.`
                : liberaEm
                  ? `Aprovação possível a partir de ${formatarData(liberaEm)} (${PRAZO_CIENCIA_DIAS} dias do edital).`
                  : "Aprovação depois do edital e do prazo de ciência."}
            </li>
          </ol>

          {t.situacao === "rascunho" && podeAndar && (
            <Formulario acao={publicarEdital} botao="Registrar edital" enviando="Registrando…" className="gap-3">
              <input type="hidden" name="id" value={t.id} />
              <label className="flex flex-col gap-[5px] text-xs text-texto-suave">
                Data de publicação do edital de ciência
                <input name="data" type="date" required max={hoje} className={campo} />
              </label>
            </Formulario>
          )}
          {t.situacao === "em_ciencia" && usuario.administrador && (
            <Formulario acao={aprovarTermo} botao="Aprovar e eliminar" enviando="Aprovando…" className="gap-3">
              <input type="hidden" name="id" value={t.id} />
              <p className="text-xs leading-[18px] text-texto-suave">
                Ao aprovar, os documentos deste termo são desativados e saem da pesquisa e do mapa. O registro de cada um e a auditoria permanecem. Quem gerou o termo não pode aprová-lo.
              </p>
            </Formulario>
          )}
          {(t.situacao === "rascunho" || t.situacao === "em_ciencia") && podeAndar && (
            <Formulario acao={cancelarTermo} botao="Cancelar termo" enviando="Cancelando…" variante="secundario" className="gap-3">
              <input type="hidden" name="id" value={t.id} />
            </Formulario>
          )}

          <a className={link} href={baixar("pdf")}>Baixar PDF</a>
          <a className={link} href={baixar("docx")}>Baixar Word</a>
        </Painel>
      </div>
    </PaginaSistema>
  );
}

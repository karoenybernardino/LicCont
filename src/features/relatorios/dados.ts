import "server-only";
import { clienteSessao } from "@/lib/supabase/servidor";
import { emDemo } from "@/features/demo/dados";
import { ORGAOS, type Orgao } from "@/features/documentos/tipos";
import { tituloDocumento } from "@/features/documentos/titulo";
import { lerTemporalidadeReal } from "@/features/temporalidade/dados";
import { RELATORIOS, dataBR, descreverFiltros, type Filtros, type IdRelatorio, type Relatorio } from "./definicoes";

// Cada relatório lê pela sessão da pessoa: o RLS limita à prefeitura e às
// secretarias dela. Teto de 5.000 linhas por relatório (o cabeçalho avisa).
export const LIMITE_LINHAS = 5000;
const PAGINA = 1000;

type Linha = Record<string, unknown>;
const hoje = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
const dias = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 86_400_000;
const codigo = (c: { numero: number; niveis: { numero: number; modulos: { numero: number; ruas: { codigo: string } } } } | null) =>
  c ? `${c.niveis.modulos.ruas.codigo}-M${c.niveis.modulos.numero}-N${c.niveis.numero}-C${String(c.numero).padStart(2, "0")}` : "Sem endereço";

const CAIXA = "caixas(numero, niveis(numero, modulos(numero, ruas(codigo))))";

async function paginar(consulta: (de: number, ate: number) => PromiseLike<{ data: unknown[] | null; error: unknown }>): Promise<Linha[]> {
  const saida: Linha[] = [];
  for (let de = 0; saida.length < LIMITE_LINHAS; de += PAGINA) {
    const { data, error } = await consulta(de, de + PAGINA - 1);
    if (error) throw new Error("Não foi possível gerar o relatório.");
    saida.push(...((data ?? []) as Linha[]));
    if ((data?.length ?? 0) < PAGINA) break;
  }
  return saida.slice(0, LIMITE_LINHAS);
}

export async function montarRelatorio(id: IdRelatorio, f: Filtros, nomesSecretaria: Map<string, string>): Promise<Relatorio> {
  const def = RELATORIOS[id];
  const nomeSec = f.secretaria ? (nomesSecretaria.get(f.secretaria) ?? null) : null;
  const filtroTexto = descreverFiltros(f, nomeSec, def.periodo);
  const pronto = (colunas: string[], larguras: number[], linhas: string[][]): Relatorio => ({
    id,
    titulo: def.nome,
    linhasDeCabecalho: [`${filtroTexto} · ${linhas.length} registros${linhas.length >= LIMITE_LINHAS ? ` (limite de ${LIMITE_LINHAS} linhas)` : ""}`],
    colunas,
    larguras,
    linhas,
  });
  if (emDemo()) return pronto(["Documento", "Órgão"], [0.7, 0.3], [["Exemplo de demonstração", "—"]]);
  const sb = await clienteSessao();
  if (!sb) throw new Error("Não foi possível gerar o relatório.");

  if (id === "inventario" || id === "sem_endereco") {
    const linhas = await paginar((de, ate) => {
      let q = sb
        .from("documentos")
        .select(`id, tipo, modalidade, numero, ano, orgao, secretaria_id, ${CAIXA}`)
        .eq("ativo", true)
        .order("secretaria_id")
        .order("ano")
        .order("id")
        .range(de, ate);
      if (id === "sem_endereco") q = q.is("caixa_id", null);
      if (f.secretaria) q = q.eq("secretaria_id", f.secretaria);
      return q;
    });
    return pronto(
      ["Documento", "Secretaria", "Ano", "Órgão", "Endereço"],
      [0.3, 0.22, 0.08, 0.15, 0.25],
      linhas.map((d) => [
        tituloDocumento(d as never),
        nomesSecretaria.get(d.secretaria_id as string) ?? "—",
        String(d.ano),
        ORGAOS[d.orgao as Orgao] ?? String(d.orgao),
        codigo(d.caixas as never),
      ]),
    );
  }

  if (id === "emprestimos_atraso") {
    const h = hoje();
    const linhas = await paginar((de, ate) => {
      let q = sb
        .from("emprestimos")
        .select(`retirado_por_nome, retirado_por_setor, retirado_em, prazo_em, secretaria_id, documentos(tipo, modalidade, numero, ano), ${CAIXA}`)
        .is("devolvido_em", null)
        .lt("prazo_em", h)
        .order("prazo_em")
        .range(de, ate);
      if (f.secretaria) q = q.eq("secretaria_id", f.secretaria);
      return q;
    });
    return pronto(
      ["Documento", "Com", "Setor", "Retirada", "Prazo", "Atraso"],
      [0.26, 0.17, 0.17, 0.12, 0.12, 0.16],
      linhas.map((e) => [
        tituloDocumento(e.documentos as never),
        String(e.retirado_por_nome),
        String(e.retirado_por_setor),
        dataBR(e.retirado_em as string),
        dataBR(e.prazo_em as string),
        `${Math.round(dias(h) - dias(e.prazo_em as string))} dias`,
      ]),
    );
  }

  if (id === "descartes") {
    const t = await lerTemporalidadeReal();
    const itens = [...t.prontos, ...t.aVencer]
      .filter((i) => (!f.secretaria || i.secretariaId === f.secretaria) && (!f.de || i.vencimento >= f.de) && (!f.ate || i.vencimento <= f.ate))
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
      .slice(0, LIMITE_LINHAS);
    return pronto(
      ["Documento", "Secretaria", "Caixa", "Fim do prazo", "Situação"],
      [0.3, 0.22, 0.18, 0.14, 0.16],
      itens.map((i) => [i.titulo, nomesSecretaria.get(i.secretariaId) ?? "—", i.caixa, dataBR(i.vencimento), i.emDias <= 0 ? "Pronto para eliminar" : `Em ${i.emDias} dias`]),
    );
  }

  throw new Error("Não foi possível gerar o relatório.");
}

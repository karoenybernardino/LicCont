import type { Metadata } from "next";
import { MODULOS } from "@/features/modulos/ocultos";
import Link from "next/link";
import { Painel, Rotulo, TituloPainel } from "@/features/estrutura/componentes";
import { exigirSessao, secretariasPermitidas } from "@/features/sessao/dal";
import { PaginaSistema } from "@/features/sessao/pagina";
import { lerPainel, porcento } from "@/features/painel/dados";

export const metadata: Metadata = { title: "Painel · LicCONT" };

const num = (n: number) => n.toLocaleString("pt-BR");
const ver = "text-[13px] font-medium text-destaque underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-foco";

function Cartao({ rotulo, valor, legenda, href, acao }: { rotulo: string; valor: string; legenda: string; href: string; acao: string }) {
  return (
    <Painel>
      <Rotulo>{rotulo}</Rotulo>
      <p className="text-3xl font-bold">{valor}</p>
      <p className="text-xs text-texto-suave">{legenda}</p>
      <Link href={href} className={ver}>
        {acao}
      </Link>
    </Painel>
  );
}

// Barras empilhadas por ano (licitações e contratos). Cores com contraste nos dois temas.
function GraficoAnos({ dados }: { dados: { ano: number; licitacoes: number; contratos: number }[] }) {
  const max = Math.max(1, ...dados.map((d) => d.licitacoes + d.contratos));
  const w = 520;
  const h = 180;
  const largura = w / Math.max(1, dados.length);
  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${w} ${h + 24}`} role="img" aria-label="Documentos por ano e por tipo" className="w-full">
        {dados.map((d, i) => {
          const hl = (d.licitacoes / max) * h;
          const hc = (d.contratos / max) * h;
          const x = i * largura + largura * 0.18;
          const bw = largura * 0.64;
          return (
            <g key={d.ano}>
              <rect x={x} y={h - hl - hc} width={bw} height={hc} rx="3" className="fill-[#b45309] dark:fill-[#fbbf24]" />
              <rect x={x} y={h - hl} width={bw} height={hl} rx="3" className="fill-[#0e7490] dark:fill-[#2dd4bf]" />
              <text x={x + bw / 2} y={h + 16} textAnchor="middle" className="fill-current text-[11px]">
                {d.ano}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="flex gap-4 text-xs text-texto-suave">
        <span>
          <span aria-hidden className="mr-1 inline-block size-2.5 rounded-sm bg-[#0e7490] dark:bg-[#2dd4bf]" />
          Licitações
        </span>
        <span>
          <span aria-hidden className="mr-1 inline-block size-2.5 rounded-sm bg-[#b45309] dark:bg-[#fbbf24]" />
          Contratos
        </span>
      </figcaption>
    </figure>
  );
}

export default async function PainelPagina({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { usuario, secretaria } = await exigirSessao();
  const secretarias = (await secretariasPermitidas(usuario)).filter((s): s is { id: string; nome: string } => s.id !== null);
  const p = await searchParams;
  const pedida = typeof p.secretaria === "string" ? p.secretaria : "";
  const filtro = secretarias.some((s) => s.id === pedida) ? pedida : null;
  const orgao = p.orgao === "prefeitura" || p.orgao === "camara" ? p.orgao : null;
  const d = await lerPainel(filtro, orgao);
  const { documentos: doc, emprestimos: emp, tce } = d.resumo;
  const pdf = porcento(doc.com_pdf, doc.total);
  const ocupadas = porcento(d.caixas.com_documento, d.caixas.total);

  return (
    <PaginaSistema usuario={usuario} secretaria={secretaria} titulo="Painel" trilha="Acervo · Painel">
      <form className="mb-4 flex items-center gap-2 text-sm" action="/painel">
        <label htmlFor="secretaria" className="text-texto-suave">
          Secretaria
        </label>
        <select id="secretaria" name="secretaria" defaultValue={filtro ?? ""} className="min-h-10 rounded-lg border border-linha bg-campo px-3">
          <option value="">Todas as secretarias</option>
          {secretarias.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome}
            </option>
          ))}
        </select>
        <label htmlFor="orgao" className="text-texto-suave">
          Órgão
        </label>
        <select id="orgao" name="orgao" defaultValue={orgao ?? ""} className="min-h-10 rounded-lg border border-linha bg-campo px-3">
          <option value="">Prefeitura e Câmara</option>
          <option value="prefeitura">Prefeitura</option>
          <option value="camara">Câmara</option>
        </select>
        <button type="submit" className="min-h-10 rounded-lg border border-linha px-3 hover:border-destaque">
          Aplicar
        </button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Cartao rotulo="Documentos no acervo" valor={num(doc.total)} legenda={`${num(doc.licitacoes)} licitações · ${num(doc.contratos)} contratos`} href="/pesquisa" acao="Abrir na pesquisa" />
        {MODULOS.tce && <Cartao rotulo="Importados do TCE a conferir" valor={num(tce.a_conferir)} legenda={`ainda sem caixa · ${tce.duplicados} possíveis duplicados`} href="/importados" acao="Abrir a fila" />}
        <Cartao
          rotulo="Empréstimos abertos"
          valor={num(emp.abertos)}
          legenda={`${emp.atrasados} atrasados${emp.mais_antigo_dias ? ` · o mais antigo há ${emp.mais_antigo_dias} dias` : ""}`}
          href="/emprestimos"
          acao="Ver empréstimos"
        />
        <Cartao rotulo="Caixas ocupadas" valor={`${ocupadas}%`} legenda={`${num(d.caixas.com_documento)} de ${num(d.caixas.total)} com algum documento`} href="/mapa" acao="Abrir o mapa 3D" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[2fr_1fr_1fr]">
        <Painel>
          <TituloPainel>Documentos por ano e por tipo</TituloPainel>
          <GraficoAnos dados={d.resumo.por_ano} />
          <Link href="/pesquisa" className={ver}>
            Abrir na pesquisa
          </Link>
        </Painel>
        <Painel>
          <TituloPainel>Digitalização</TituloPainel>
          <p className="text-3xl font-bold">{pdf}%</p>
          <div role="img" aria-label={`${pdf}% com PDF`} className="h-2.5 overflow-hidden rounded-full bg-linha">
            <div className="h-full bg-[#0e7490] dark:bg-[#2dd4bf]" style={{ width: `${pdf}%` }} />
          </div>
          <p className="text-sm">
            {num(doc.com_pdf)} com PDF · {num(doc.sem_pdf)} sem PDF
          </p>
          <Link href="/pesquisa" className={ver}>
            Ver os que faltam digitalizar
          </Link>
        </Painel>
        <Painel>
          <TituloPainel>Ocupação do galpão</TituloPainel>
          <p className="text-sm text-texto-suave">{num(d.caixas.total)} caixas no total</p>
          <dl className="grid grid-cols-3 gap-2 text-center">
            {[
              ["Cheias", d.caixas.cheias],
              ["Com espaço", d.caixas.com_espaco],
              ["Vazias", d.caixas.vazias],
            ].map(([r, v]) => (
              <div key={String(r)}>
                <dd className="text-xl font-bold">{num(Number(v))}</dd>
                <dt className="text-xs text-texto-suave">{r}</dt>
              </div>
            ))}
          </dl>
          <Link href="/mapa" className={ver}>
            Abrir o mapa 3D
          </Link>
        </Painel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Painel>
          <TituloPainel>Empréstimos atrasados · {emp.atrasados}</TituloPainel>
          <ul className="text-sm">
            {d.atrasados.map((a) => (
              <li key={a.titulo} className="flex justify-between gap-2 border-t border-linha py-2">
                <span>
                  {a.titulo}
                  <span className="block text-xs text-texto-suave">
                    {a.setor} · com {a.quem}
                  </span>
                </span>
                <span className="text-[#b91c1c] dark:text-[#f87171]">{a.dias} dias</span>
              </li>
            ))}
            {!d.atrasados.length && <li className="py-2 text-texto-suave">Nenhum empréstimo atrasado.</li>}
          </ul>
          <Link href="/emprestimos?situacao=atrasados" className={ver}>
            Ver empréstimos atrasados
          </Link>
        </Painel>
        <Painel>
          <TituloPainel>Descarte nos próximos 90 dias · {d.descarte.total}</TituloPainel>
          <ul className="text-sm">
            {d.descarte.itens.map((a) => (
              <li key={a.titulo} className="flex justify-between gap-2 border-t border-linha py-2">
                <span>{a.titulo}</span>
                <span className="text-texto-suave">{a.emDias} dias</span>
              </li>
            ))}
            {!d.descarte.itens.length && <li className="py-2 text-texto-suave">Nada para descartar em breve.</li>}
          </ul>
          <Link href="/temporalidade" className={ver}>
            Abrir a fila de descarte
          </Link>
        </Painel>
      </div>
    </PaginaSistema>
  );
}

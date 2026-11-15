import Link from "next/link";
import { Pilula } from "@/ui/canvas";
import { BarraOcupacao, CartaoNumero, Etiqueta, Painel, Rotulo, botaoPequeno } from "@/features/estrutura/componentes";
import { numeroBR } from "@/features/estrutura/ocupacao";
import { dataBR, prazoGuarda, situacaoEmprestimo } from "@/features/movimento/situacao";
import type { Emprestimo, Movimentacao, PrazoAVencer, ResumoTemporalidade } from "@/features/movimento/tipos";
import { avisoRuas, type RuaOcupada } from "./resumo";

// Início com o acervo já cadastrado (quadros "Início — escuro/claro").
export type DadosInicio = {
  prefeitura: string;
  saudacao: string;
  podeCadastrar: boolean;
  documentos: number;
  caixas: number;
  percentual: number;
  livres: number;
  ruas: RuaOcupada[];
  emprestimos: Emprestimo[];
  atrasados: number;
  abertos: number;
  resumo: ResumoTemporalidade;
  movimentacoes: Movimentacao[];
  aVencer: PrazoAVencer[];
};

const botaoMapa = `${botaoPequeno} !h-10 !rounded-lg !px-5 !text-sm`;

function Linha({ titulo, detalhe, fim }: { titulo: string; detalhe: string; fim: React.ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-3 border-b border-linha py-2.5 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{titulo}</p>
        <p className="text-xs text-texto-suave">{detalhe}</p>
      </div>
      {fim}
    </li>
  );
}

const Vazio = ({ children }: { children: React.ReactNode }) => <p className="py-2 text-sm text-texto-suave">{children}</p>;

function Anel({ percentual }: { percentual: number }) {
  return (
    <svg width="132" height="132" viewBox="0 0 120 120" role="img" aria-label={`Ocupação do galpão: ${percentual}%`}>
      <circle cx="60" cy="60" r="46" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="12" />
      <circle cx="60" cy="60" r="46" fill="none" stroke="#2dd4bf" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${((Math.min(percentual, 100) / 100) * 289).toFixed(1)} 289`} transform="rotate(-90 60 60)" />
      <text x="60" y="63" textAnchor="middle" fontFamily="Sora,sans-serif" fontWeight="700" fontSize="24" fill="#fff">{percentual}%</text>
      <text x="60" y="80" textAnchor="middle" fontSize="10" fill="rgba(255,255,255,.7)">ocupado</text>
    </svg>
  );
}

export function InicioCompleto(d: DadosInicio) {
  const atencao = d.emprestimos
    .filter((e) => !e.devolvido)
    .sort((a, b) => a.prazo.localeCompare(b.prazo))
    .slice(0, 4);

  return (
    <>
      <section className="relative flex shrink-0 flex-wrap items-center justify-between gap-6 overflow-hidden rounded-[22px] bg-[radial-gradient(520px_260px_at_92%_10%,rgba(45,212,191,.55),rgba(45,212,191,0)_70%),radial-gradient(420px_240px_at_0%_120%,rgba(94,234,212,.28),rgba(94,234,212,0)_70%),linear-gradient(120deg,#0b2e3a_0%,#0e4a5c_60%,#0f766e_120%)] px-[30px] py-[26px] text-white shadow-[0_18px_40px_rgba(11,46,58,.22)]">
        <div className="relative flex max-w-[560px] flex-col gap-2.5">
          <p className="text-[13px] tracking-[.06em] text-[#99f6e4] uppercase">
            {d.saudacao} · {d.prefeitura}
          </p>
          <p className="font-titulo text-[28px] leading-[34px] font-bold">Seu acervo está organizado e sob controle.</p>
          <p className="text-[15px] leading-[22px] text-white/82">
            {numeroBR(d.documentos)} documentos em {numeroBR(d.caixas)} caixas. Hoje, {d.atrasados} empréstimos atrasados e {d.resumo.vencem90} prazos de guarda pedem atenção.
          </p>
          <div className="mt-1.5 flex flex-wrap gap-3">
            {d.podeCadastrar && (
              <Link href="/documentos/novo" className="inline-flex min-h-11 items-center rounded-[10px] bg-[#2dd4bf] px-5 text-sm font-semibold text-[#0b2e3a] hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqua">
                Cadastrar documento
              </Link>
            )}
            <Link href="/mapa" className="inline-flex min-h-11 items-center rounded-[10px] border border-white/35 bg-white/8 px-5 text-sm font-medium text-white hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqua">
              Abrir mapa 3D
            </Link>
          </div>
        </div>
        <div className="relative flex items-center gap-[18px] pr-2">
          <Anel percentual={d.percentual} />
          <div className="flex flex-col gap-2.5">
            <div>
              <p className="text-xl font-bold">{numeroBR(d.livres)}</p>
              <p className="text-xs text-white/70">posições livres</p>
            </div>
            <div>
              <p className="text-xl font-bold">{numeroBR(d.abertos)}</p>
              <p className="text-xs text-white/70">emprestados</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <CartaoNumero rotulo="Documentos" valor={numeroBR(d.documentos)} legenda={`${numeroBR(d.caixas)} caixas no acervo`} cor="teal" icone="folha" serie={[d.documentos]} />
        <CartaoNumero rotulo="Ocupação do galpão" valor={`${d.percentual}%`} legenda={`Restam ${numeroBR(d.livres)} posições livres`} cor="aco" icone="pasta" serie={d.ruas.map((r) => r.percentual)} />
        <CartaoNumero rotulo="Emprestados" valor={numeroBR(d.abertos)} legenda={`${d.atrasados} com prazo vencido`} cor="ambar" icone="caixa" serie={[d.abertos]} />
        <CartaoNumero rotulo="Prazo de guarda" valor={numeroBR(d.resumo.vencem90)} legenda="vencem nos próximos 90 dias" cor="vermelho" icone="sol" serie={[d.resumo.vencem90]} />
      </div>

      <div className="grid items-stretch gap-4 xl:grid-cols-[1fr_1.4fr]">
        <Painel>
          <Rotulo>Ocupação por rua</Rotulo>
          <div className="flex flex-col gap-3.5">
            {d.ruas.length === 0 && <Vazio>Nenhuma rua cadastrada.</Vazio>}
            {d.ruas.map((r) => (
              <div key={r.codigo} className="flex items-center gap-3">
                <span className="w-12 shrink-0 text-xs font-medium text-texto-suave uppercase">Rua {r.codigo}</span>
                <div className="flex-1">
                  <BarraOcupacao percentual={r.percentual} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-auto flex items-center justify-between gap-3 pt-1.5">
            <span className="text-[13px] text-texto-suave">{avisoRuas(d.ruas)}</span>
            <Link href="/mapa" className={botaoMapa}>
              Abrir mapa 3D
            </Link>
          </div>
        </Painel>

        <Painel>
          <div className="flex items-center justify-between gap-3">
            <Rotulo>Empréstimos que precisam de atenção</Rotulo>
            <Link href="/emprestimos" className="text-[13px] font-medium text-destaque">
              Ver todos
            </Link>
          </div>
          <ul>
            {atencao.length === 0 && <Vazio>Nenhum empréstimo registrado.</Vazio>}
            {atencao.map((e) => {
              const s = situacaoEmprestimo(e.prazo);
              return <Linha key={e.id} titulo={e.titulo} detalhe={`${e.quem} · ${e.setor} · prazo ${dataBR(e.prazo).slice(0, 5)}`} fim={<Pilula tom={s.tom}>{s.texto}</Pilula>} />;
            })}
          </ul>
        </Painel>
      </div>

      <div className="grid items-stretch gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Painel>
          <Rotulo>Últimas movimentações</Rotulo>
          <ul>
            {d.movimentacoes.length === 0 && <Vazio>Nenhuma movimentação registrada.</Vazio>}
            {d.movimentacoes.map((m) => (
              <Linha key={m.titulo + m.detalhe} titulo={m.titulo} detalhe={m.detalhe} fim={<Etiqueta>{m.tag}</Etiqueta>} />
            ))}
          </ul>
        </Painel>

        <Painel>
          <div className="flex items-center justify-between gap-3">
            <Rotulo>Prazos de guarda a vencer</Rotulo>
            <Link href="/temporalidade" className="text-[13px] font-medium text-destaque">
              Abrir temporalidade
            </Link>
          </div>
          <ul>
            {d.aVencer.length === 0 && <Vazio>Nenhum prazo de guarda a vencer.</Vazio>}
            {d.aVencer.map((p) => {
              const g = prazoGuarda(p.emDias);
              return <Linha key={p.titulo} titulo={p.titulo} detalhe={p.posicao} fim={g.aviso ? <Pilula tom="aviso">{g.texto}</Pilula> : <Etiqueta>{g.texto}</Etiqueta>} />;
            })}
          </ul>
        </Painel>
      </div>
    </>
  );
}

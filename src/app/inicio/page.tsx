import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { CartaoResumo, Pilula } from "@/ui/canvas";
import { carregarEstrutura } from "@/features/estrutura/dados";
import { Painel, Rotulo } from "@/features/estrutura/componentes";
import { exigirSessao, nomePrefeitura, secretariasPermitidas } from "@/features/sessao/dal";
import { Icone, PaginaSistema } from "@/features/sessao/pagina";
import { listarSecretarias, listarUsuarios } from "@/features/usuarios/dados";

export const metadata: Metadata = { title: "Início · LicCONT" };

const ic = (nome: Parameters<typeof Icone>[0]["nome"]) => <Icone nome={nome} />;
const botaoHero =
  "inline-flex min-h-10 items-center rounded-[10px] border border-white/30 bg-white/8 px-[18px] text-sm font-medium text-white hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqua";

export default async function Inicio() {
  const { usuario, secretaria } = await exigirSessao();
  const admin = usuario.administrador;
  const [prefeitura, usuarios, secretarias, estrutura] = await Promise.all([
    nomePrefeitura(usuario),
    admin ? listarUsuarios() : Promise.resolve(null),
    admin ? listarSecretarias() : secretariasPermitidas(usuario).then((l) => l.filter((s) => s.id).map((s) => ({ ...s, ativa: true }))),
    carregarEstrutura(),
  ]);
  const caixas = estrutura.niveis.reduce((soma, n) => soma + n.caixas, 0);
  const ativas = secretarias.filter((s) => s.ativa).length;
  const bloqueados = usuarios?.filter((u) => !u.ativo).length ?? 0;
  const provisorios = usuarios?.filter((u) => u.ativo && u.trocaSenha).length ?? 0;

  const cartoes = [
    ...(usuarios
      ? [{ rotulo: "Usuários", valor: usuarios.length, legenda: `${usuarios.length - bloqueados} ativos · ${provisorios} com senha provisória`, cor: "teal" as const, icone: ic("usuarios") }]
      : []),
    { rotulo: "Secretarias", valor: secretarias.length, legenda: admin ? `${ativas} ativas` : "com o seu acesso", cor: "aco" as const, icone: ic("secretarias") },
    { rotulo: "Documentos", valor: 0, legenda: "chega na Fase 3", cor: "ambar" as const, icone: ic("cadastro") },
    { rotulo: "Caixas", valor: caixas, legenda: `${estrutura.niveis.length} níveis cadastrados`, cor: "vermelho" as const, icone: ic("emprestimos") },
  ];

  const passos = [
    ...(usuarios
      ? [{ titulo: "Usuários e perfis", texto: "Convide quem vai usar o sistema", feito: usuarios.length > 1 }]
      : []),
    { titulo: "Secretarias", texto: "Cadastre as secretarias desta prefeitura", feito: ativas > 0 },
    { titulo: "Estrutura física", texto: "Ruas, módulos, níveis e caixas", feito: caixas > 0 },
    { titulo: "Documentos", texto: "Cadastro e pesquisa do acervo", feito: false, futuro: true },
  ];

  return (
    <PaginaSistema usuario={usuario} secretaria={secretaria} titulo="Início" trilha={prefeitura}>
      <section className="flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-[18px] bg-[linear-gradient(120deg,#0e7490_0%,#0b2e3a_100%)] px-[30px] py-7 text-white dark:bg-[linear-gradient(120deg,#0f3d47_0%,#081a20_100%)]">
        <div className="flex max-w-[620px] flex-col gap-2.5">
          <p className="text-xs tracking-[.06em] text-[#99f6e4] uppercase">
            Olá, {usuario.nome} · {prefeitura}
          </p>
          <p className="font-titulo text-[26px] leading-[1.25] font-bold">Vamos montar o acervo da prefeitura.</p>
          <p className="text-sm leading-[21px] text-white/82">
            Comece pela estrutura física e pelos usuários. O cadastro de documentos e a pesquisa chegam nas próximas
            fases.
          </p>
          <div className="mt-1.5 flex flex-wrap gap-2.5">
            {admin ? (
              <>
                <Link href="/usuarios" className="inline-flex min-h-10 items-center rounded-[10px] bg-[#2dd4bf] px-[18px] text-sm font-semibold text-[#0b2e3a] hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqua">
                  Convidar usuários
                </Link>
                <Link href="/secretarias" className={botaoHero}>Cadastrar secretarias</Link>
              </>
            ) : (
              <Link href="/estrutura" className="inline-flex min-h-10 items-center rounded-[10px] bg-[#2dd4bf] px-[18px] text-sm font-semibold text-[#0b2e3a] hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqua">
                Ver a estrutura física
              </Link>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-[repeat(var(--n),1fr)]" style={{ "--n": cartoes.length } as CSSProperties}>
        {cartoes.map((c) => (
          <CartaoResumo key={c.rotulo} {...c} valor={String(c.valor)} />
        ))}
      </div>

      <Painel>
        <Rotulo>Implantação</Rotulo>
        <ol>
          {passos.map((p, i) => (
            <li key={p.titulo} className="flex items-center gap-3.5 border-b border-linha py-3 last:border-0">
              <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#ccfbf1] font-mono text-xs font-medium text-[#0e7490] dark:bg-[#0e4a45] dark:text-[#7ff0df]">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{p.titulo}</p>
                <p className="text-[12.5px] text-texto-suave">{p.texto}</p>
              </div>
              <Pilula tom={p.feito ? "ok" : "aviso"}>{p.feito ? "Concluído" : p.futuro ? "Próxima fase" : "Pendente"}</Pilula>
            </li>
          ))}
        </ol>
      </Painel>
    </PaginaSistema>
  );
}

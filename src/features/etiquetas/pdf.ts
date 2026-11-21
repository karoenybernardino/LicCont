import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import { LINHAS_POR_FOLHA, folhasDoConteudo } from "./esquemas";
import { AREA_ITENS, MESES_ABREV, ajustarRotulos, dividirItens, rotulosDosItens, usaLayoutGeral } from "./ajuste";
import { gerarQr } from "./qr";

// Etiquetas e folha de conteúdo em PDF, geradas no servidor com pdf-lib (sem serviço externo).
// As medidas vêm dos quadros EtqPapelCaixa, EtqPapelDocumento e EtqPapelConteudo (em px de tela, 96 dpi):
// S converte px em pontos. Fontes: Helvetica e Courier (as da marca, Sora e IBM Plex, não vão no PDF).
const S = 0.75;
const A4_PE: [number, number] = [595.28, 841.89];
const A4_DEITADA: [number, number] = [841.89, 595.28];

const PETROLEO = rgb(0.043, 0.18, 0.227); // #0b2e3a
const AQUA = rgb(0.176, 0.831, 0.749); // #2dd4bf
const SUAVE = rgb(0.247, 0.369, 0.4); // #3f5e66
const BLOCO = rgb(0.929, 0.961, 0.969); // #edf5f7
const LINHA = rgb(0.8, 0.86, 0.88);
const BRANCO = rgb(1, 1, 1);

export type MarcaPdf = { orgaoNome: string; logoOrgao: Uint8Array | null; logoParceira: Uint8Array | null; logoCamara?: Uint8Array | null };
export type ItemConteudo = { modalidade: string; numeroAno: string; secretaria: string; objeto: string; volume: number };
export type CaixaPdf = {
  numero: string; // "0001"
  titulo: string; // "LICITAÇÃO – 2026"
  volume: { n: number; total: number } | null;
  classe: string;
  tipologia: string | null;
  codigo: string;
  prazo: string;
  localizacao: string; // "Rua B · Módulo 2 · Nível 4"
  url: string; // o que o QR abre
  itens: ItemConteudo[];
  // Etiqueta geral (caixa de arquivo geral, ou detalhada com etiqueta_geral). Tudo opcional: sem eles, é a detalhada de sempre.
  orgao?: "prefeitura" | "camara";
  tipo?: "geral" | "detalhada";
  etiquetaGeral?: boolean;
  fundo?: string | null;
  setor?: string | null;
  meses?: number[];
  anoLimite?: number | null;
  digitalizada?: boolean;
  observacao?: string | null;
  dividir?: boolean; // dividir a lista em partes iguais (parte 1/2, 2/2) em vez de encher a fonte mínima
};
export type DocumentoPdf = {
  titulo: string; // "PREGÃO 001/2026"
  secretaria: string;
  objeto: string;
  data: string; // "12/02/2026"
  observacao: string | null;
  classe: string;
  codigo: string;
  caixa: string; // "0001"
  localizacao: string;
  url: string;
};
export type EntradaPdf = { marca: MarcaPdf; caixas?: CaixaPdf[]; conteudos?: CaixaPdf[]; documentos?: DocumentoPdf[] };

type Fontes = { n: PDFFont; b: PDFFont; m: PDFFont };
type Contexto = { pdf: PDFDocument; f: Fontes; logoOrgao: PDFImage | null; logoCamara: PDFImage | null; logoParceira: PDFImage | null; marca: MarcaPdf };

// Caractere fora do alfabeto da fonte vira "?" em vez de derrubar o PDF.
const seguro = (t: string, f: PDFFont) => {
  let s = "";
  for (const c of t) {
    try {
      f.encodeText(c);
      s += c;
    } catch {
      s += "?";
    }
  }
  return s;
};
// Quebra o texto em linhas que cabem na largura (pontos). Palavra maior que a linha é partida, nunca cortada.
const quebra = (t: string, f: PDFFont, tam: number, largura: number): string[] => {
  const linhas: string[] = [];
  let atual = "";
  for (const p of seguro(t.replace(/\s+/g, " ").trim(), f).split(" ")) {
    let palavra = p;
    const tenta = atual ? `${atual} ${palavra}` : palavra;
    if (f.widthOfTextAtSize(tenta, tam) <= largura) {
      atual = tenta;
      continue;
    }
    if (atual) linhas.push(atual);
    atual = "";
    while (f.widthOfTextAtSize(palavra, tam) > largura && palavra.length > 1) {
      let n = palavra.length - 1;
      while (n > 1 && f.widthOfTextAtSize(palavra.slice(0, n), tam) > largura) n--;
      linhas.push(palavra.slice(0, n));
      palavra = palavra.slice(n);
    }
    atual = palavra;
  }
  if (atual) linhas.push(atual);
  return linhas.length ? linhas : [""];
};

// Desenho em px (origem no canto superior esquerdo de uma "folha" deslocada por ox, oy).
class Tela {
  constructor(private page: PDFPage, private ox: number, private oy: number, private c: Contexto) {}
  private X = (x: number) => (this.ox + x) * S;
  private Y = (y: number) => this.page.getHeight() - (this.oy + y) * S;

  rect(x: number, y: number, w: number, h: number, cor: ReturnType<typeof rgb>) {
    this.page.drawRectangle({ x: this.X(x), y: this.Y(y + h), width: w * S, height: h * S, color: cor });
  }
  rrect(x: number, y: number, w: number, h: number, r: number, o: { fill?: ReturnType<typeof rgb>; borda?: ReturnType<typeof rgb>; tracejado?: boolean }) {
    const p = `M ${r} 0 H ${w - r} Q ${w} 0 ${w} ${r} V ${h - r} Q ${w} ${h} ${w - r} ${h} H ${r} Q 0 ${h} 0 ${h - r} V ${r} Q 0 0 ${r} 0 Z`;
    this.page.drawSvgPath(p, {
      x: this.X(x), y: this.Y(y), scale: S, color: o.fill, borderColor: o.borda, borderWidth: o.borda ? 0.75 : 0,
      borderDashArray: o.tracejado ? [3, 2] : undefined,
    });
  }
  linha(x1: number, y: number, x2: number, cor = LINHA, tracejado = false) {
    this.page.drawLine({ start: { x: this.X(x1), y: this.Y(y) }, end: { x: this.X(x2), y: this.Y(y) }, thickness: 0.75, color: cor, dashArray: tracejado ? [4, 3] : undefined });
  }
  linhaV(x: number, y1: number, y2: number, cor = LINHA, tracejado = false) {
    this.page.drawLine({ start: { x: this.X(x), y: this.Y(y1) }, end: { x: this.X(x), y: this.Y(y2) }, thickness: 0.75, color: cor, dashArray: tracejado ? [4, 3] : undefined });
  }
  // y = linha de base do texto, em px.
  texto(t: string, x: number, y: number, tam: number, f: PDFFont, cor = PETROLEO, o: { largura?: number; alinhar?: "esq" | "centro" | "dir"; espaco?: number } = {}) {
    let s = seguro(t.replace(/\s+/g, " ").trim(), f);
    if (o.espaco) s = s.toUpperCase();
    // Com largura: reduz a fonte até 60% e, se ainda não couber, continua na linha de baixo. Nunca corta.
    let pt = tam * S;
    let linhas = [s];
    if (o.largura) {
      while (pt > tam * S * 0.6 && f.widthOfTextAtSize(s, pt) > o.largura * S) pt -= 0.25;
      if (f.widthOfTextAtSize(s, pt) > o.largura * S) linhas = quebra(s, f, pt, o.largura * S);
    }
    linhas.forEach((l, i) => {
      const w = f.widthOfTextAtSize(l, pt);
      const dx = o.alinhar === "dir" ? -w / S : o.alinhar === "centro" ? -w / S / 2 : 0;
      this.page.drawText(l, { x: this.X(x + dx), y: this.Y(y + (i * pt * 1.15) / S), size: pt, font: f, color: cor });
    });
  }
  // Texto em várias linhas, ancorado no topo: a maior fonte (de tamMax a tamMin) em que tudo cabe em `altura` px.
  // No mínimo, desenha tudo mesmo assim (cresce para baixo): nunca corta. Devolve a altura usada em px.
  bloco(t: string, x: number, yTopo: number, largura: number, tamMax: number, tamMin: number, altura: number, f: PDFFont, cor = PETROLEO): number {
    let tam = tamMax;
    let linhas = quebra(t, f, tam * S, largura * S);
    while (tam > tamMin && linhas.length * tam * 1.18 > altura) {
      tam = Math.max(tamMin, tam - 0.5);
      linhas = quebra(t, f, tam * S, largura * S);
    }
    linhas.forEach((l, i) => this.page.drawText(l, { x: this.X(x), y: this.Y(yTopo + i * tam * 1.18 + tam * 0.85), size: tam * S, font: f, color: cor }));
    return linhas.length * tam * 1.18;
  }
  largura(t: string, tam: number, f: PDFFont) {
    return f.widthOfTextAtSize(seguro(t, f), tam * S) / S;
  }
  faixa(x: number, y: number, w: number, h: number) {
    const n = 48;
    const a = [0.055, 0.455, 0.565];
    const b = [0.176, 0.831, 0.749];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      this.rect(x + (w * i) / n, y, w / n + 0.6, h, rgb(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t));
    }
  }
  // Logo (ou nome em texto) centralizado numa caixa; sem logo da parceira, nada aparece.
  imagem(img: PDFImage, x: number, y: number, w: number, h: number, alinhar: "centro" | "esq" = "centro") {
    const e = Math.min(w / img.width, h / img.height);
    const lw = img.width * e;
    const lh = img.height * e;
    this.page.drawImage(img, { x: this.X(x + (alinhar === "centro" ? (w - lw) / 2 : 0)), y: this.Y(y + (h + lh) / 2), width: lw * S, height: lh * S });
  }
  logoOrgao(x: number, y: number, w: number, h: number, tam = 15, orgao: "prefeitura" | "camara" = "prefeitura") {
    const img = orgao === "camara" ? (this.c.logoCamara ?? this.c.logoOrgao) : this.c.logoOrgao;
    if (img) return this.imagem(img, x, y, w, h);
    this.texto(nomeDoOrgao(this.c.marca, orgao), x + w / 2, y + h / 2 + tam / 3, tam, this.c.f.b, PETROLEO, { largura: w, alinhar: "centro" });
  }
  logoParceira(x: number, y: number, w: number, h: number) {
    if (this.c.logoParceira) this.imagem(this.c.logoParceira, x, y, w, h, "esq");
  }
  // Marca LicCONT: quadradinhos e a palavra.
  licCont(xDir: number, yMeio: number, escala = 1) {
    const f = this.c.f;
    const tam = 22 * escala;
    const lic = this.largura("LIC", tam, f.n);
    const cont = this.largura("CONT", tam, f.b);
    const x0 = xDir - lic - cont;
    this.texto("LIC", x0, yMeio + tam * 0.35, tam, f.n);
    this.texto("CONT", x0 + lic, yMeio + tam * 0.35, tam, f.b);
    const q = 8 * escala;
    const g = 2.4 * escala;
    const ix = x0 - 14 * escala - (3 * q + 2 * g);
    const iy = yMeio - (3 * q + 2 * g) / 2;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) this.rrect(ix + c * (q + g), iy + r * (q + g), q, q, 1.6 * escala, { fill: r === 0 && c === 2 ? AQUA : PETROLEO });
  }
  qr(texto: string, x: number, y: number, lado: number) {
    const m = gerarQr(texto);
    const n = m.length;
    const modulo = lado / (n + 4); // zona silenciosa de 2 módulos
    this.rrect(x, y, lado, lado, 8, { fill: BRANCO });
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (m[r][c]) this.rect(x + (c + 2) * modulo, y + (r + 2) * modulo, modulo + 0.2, modulo + 0.2, PETROLEO);
  }
  // "CX - 0001" com CX em aqua.
  caixaNumero(numero: string, x: number, y: number, tam: number) {
    const f = this.c.f.b;
    const cx = this.largura("CX", tam, f);
    this.texto("CX", x, y, tam, f, AQUA);
    this.texto(`- ${numero}`, x + cx + tam * 0.22, y, tam, f, BRANCO);
  }
  pilula(t: string, x: number, y: number, h: number, tam: number) {
    const w = this.largura(t, tam, this.c.f.m) + h * 1.1;
    this.rrect(x, y, w, h, h / 2, { fill: AQUA });
    this.texto(t, x + h * 0.55, y + h / 2 + tam * 0.34, tam, this.c.f.m, PETROLEO);
    return w;
  }
}

async function contexto(entrada: EntradaPdf): Promise<Contexto> {
  const pdf = await PDFDocument.create();
  pdf.setTitle("Etiquetas LicCONT");
  pdf.setProducer("LicCONT");
  const f = { n: await pdf.embedFont(StandardFonts.Helvetica), b: await pdf.embedFont(StandardFonts.HelveticaBold), m: await pdf.embedFont(StandardFonts.CourierBold) };
  const png = async (b: Uint8Array | null) => {
    if (!b) return null;
    try {
      return await pdf.embedPng(b);
    } catch {
      return null; // logo ilegível: a etiqueta sai sem ele em vez de falhar
    }
  };
  return { pdf, f, marca: entrada.marca, logoOrgao: await png(entrada.marca.logoOrgao), logoCamara: await png(entrada.marca.logoCamara ?? null), logoParceira: await png(entrada.marca.logoParceira) };
}

// "Prefeitura Municipal de X" ou, na caixa da Câmara, "Câmara Municipal de X".
export function nomeDoOrgao(m: MarcaPdf, orgao: "prefeitura" | "camara"): string {
  const nome = m.orgaoNome.trim();
  if (orgao !== "camara") return nome || "Prefeitura";
  if (/^prefeitura/i.test(nome)) return nome.replace(/^prefeitura/i, "Câmara");
  return nome ? `Câmara – ${nome}` : "Câmara Municipal";
}

const rotulo = (t: Tela, c: Contexto, txt: string, x: number, y: number, tam = 11) => t.texto(txt, x, y, tam, c.f.b, SUAVE, { espaco: 0.7 });

// Unidade impressa: uma caixa (ou uma parte dela) numa etiqueta.
type Unidade = { cx: CaixaPdf; itens: ItemConteudo[]; parte: { k: number; n: number } | null; geral: boolean };

export function unidadesDaCaixa(cx: CaixaPdf): Unidade[] {
  if (usaLayoutGeral({ tipo: cx.tipo ?? "detalhada", etiquetaGeral: cx.etiquetaGeral ?? false })) return [{ cx, itens: [], parte: null, geral: true }];
  const partes = dividirItens(cx.itens, cx.dividir ?? false);
  return partes.map((itens, i) => ({ cx, itens, parte: partes.length > 1 ? { k: i + 1, n: partes.length } : null, geral: false }));
}

const MESES_CHEIOS = 12;

// Cabeçalho comum: brasão do órgão e o nome do órgão em destaque, depois a faixa.
function cabecalho(t: Tela, c: Contexto, cx: CaixaPdf, T: (x: number) => number) {
  const orgao = cx.orgao ?? "prefeitura";
  const logo = orgao === "camara" ? (c.logoCamara ?? c.logoOrgao) : c.logoOrgao;
  const nome = nomeDoOrgao(c.marca, orgao);
  if (logo) {
    t.imagem(logo, T(24), 14, 84, 84, "esq");
    t.bloco(nome, T(122), 22, 376, 24, 12, 68, c.f.b);
  } else {
    t.bloco(nome, T(24), 22, 474, 26, 12, 68, c.f.b);
  }
  t.faixa(T(0), 108, 522, 6);
}

function tituloEVolume(t: Tela, c: Contexto, u: Unidade, T: (x: number) => number) {
  const { cx } = u;
  const pilulas: { texto: string; w: number }[] = [];
  if (cx.volume) pilulas.push({ texto: `VOL. ${cx.volume.n}/${cx.volume.total}`, w: 86 });
  if (u.parte) pilulas.push({ texto: `PARTE ${u.parte.k}/${u.parte.n}`, w: 96 });
  const tomado = pilulas.reduce((s, p) => s + p.w + 6, 0);
  t.texto(cx.titulo, T(24), 152, 30, c.f.b, PETROLEO, { largura: 474 - tomado });
  let x = 498;
  for (const p of [...pilulas].reverse()) {
    x -= p.w;
    t.rrect(T(x), 130, p.w, 27, 13.5, { fill: PETROLEO });
    t.texto(p.texto, T(x + p.w / 2), 148, 13, c.f.b, BRANCO, { alinhar: "centro", espaco: 1 });
    x -= 6;
  }
}

// Código, prazo, número da caixa, localização, QR e rodapé: iguais nos dois modelos.
function rodapeCaixa(t: Tela, c: Contexto, cx: CaixaPdf, T: (x: number) => number) {
  t.rrect(T(20), 457, 482, 52, 12, { fill: BLOCO });
  rotulo(t, c, "CÓDIGO", T(36), 472, 10.5);
  t.bloco(cx.codigo, T(36), 478, 100, 17, 9, 26, c.f.b);
  rotulo(t, c, "PRAZO DE GUARDA", T(146), 472, 10.5);
  t.bloco(cx.prazo, T(146), 478, 340, 14, 8.5, 28, c.f.b);
  t.rrect(T(20), 521, 482, 128, 24, { fill: PETROLEO });
  t.caixaNumero(cx.numero, T(40), 574, 56);
  t.texto("LOCALIZAÇÃO", T(40), 610, 10.5, c.f.b, rgb(0.6, 0.72, 0.75), { espaco: 1 });
  t.pilula(cx.localizacao, T(138), 594, 24, 13);
  t.qr(cx.url, T(382), 535, 100);
  t.linha(T(20), 659, T(502));
  t.logoParceira(T(46), 673, 166, 52);
  t.licCont(T(476), 699);
}

// Itens por número de processo, em colunas, na maior fonte em que tudo cabe (mínimo TAM_MIN). Sem "+N itens".
function listaItens(t: Tela, c: Contexto, itens: ItemConteudo[], T: (x: number) => number) {
  const rotulos = rotulosDosItens(itens);
  const a = ajustarRotulos(rotulos);
  rotulo(t, c, itens.length === 1 ? "PROCESSO" : `PROCESSOS · ${itens.length}`, T(24), 232, 10.5);
  const topo = 240;
  const lh = a.tam * 1.22;
  const larguraColuna = AREA_ITENS.largura / a.colunas;
  rotulos.forEach((r, i) => {
    const col = Math.floor(i / a.linhas);
    const lin = i % a.linhas;
    t.texto(r, T(24 + col * larguraColuna), topo + lin * lh + a.tam, a.tam, c.f.b, PETROLEO);
  });
}

// ---------------------------------------------------------------------------
// Etiqueta da caixa: A4 deitada, 2 por folha (EtqPapelCaixa).
// Detalhada: todos os itens por número do processo. Geral: fundo, setor, meses etc., sem itens.
// ---------------------------------------------------------------------------
function etiquetaCaixa(t: Tela, c: Contexto, u: Unidade, x0: number) {
  const f = c.f;
  const { cx } = u;
  const T = (x: number) => x0 + x;
  t.rrect(T(0), 0, 522, 738, 28, { borda: LINHA });
  cabecalho(t, c, cx, T);
  tituloEVolume(t, c, u, T);
  const campo = (rot: string, valor: string, x: number, y: number, larg: number, tam: number, alt: number) => {
    rotulo(t, c, rot, T(x), y + 10, 10.5);
    t.bloco(valor, T(x), y + 15, larg, tam, 8.5, alt, f.b);
  };
  if (!u.geral) {
    campo("CLASSE", cx.classe, 24, 168, cx.tipologia ? 232 : 474, 15, 40);
    if (cx.tipologia) campo("TIPOLOGIA DOCUMENTAL", cx.tipologia, 268, 168, 230, 15, 40);
    listaItens(t, c, u.itens, T);
  } else {
    campo("FUNDO", cx.fundo || "—", 24, 164, 230, 15, 36);
    campo("SETOR", cx.setor || "—", 268, 164, 230, 15, 36);
    campo("CLASSE", cx.classe, 24, 214, cx.tipologia ? 232 : 474, 14, 36);
    if (cx.tipologia) campo("TIPOLOGIA DOCUMENTAL", cx.tipologia, 268, 214, 230, 14, 36);
    // Grade de meses: marcados em petróleo, os demais só com a borda.
    rotulo(t, c, "MESES", T(24), 272, 10.5);
    const meses = new Set(cx.meses ?? []);
    const cel = 474 / MESES_CHEIOS;
    MESES_ABREV.forEach((m, i) => {
      const marcado = meses.has(i + 1);
      t.rrect(T(24 + i * cel + 1), 278, cel - 2, 24, 6, marcado ? { fill: PETROLEO } : { borda: LINHA });
      t.texto(m, T(24 + i * cel + cel / 2), 294, 9.5, f.b, marcado ? BRANCO : SUAVE, { alinhar: "centro" });
    });
    campo("ANO LIMITE", cx.anoLimite ? String(cx.anoLimite) : "—", 24, 308, 150, 15, 24);
    campo("DIGITALIZADO", cx.digitalizada ? "Sim" : "Não", 190, 308, 150, 15, 24);
    campo("OBSERVAÇÕES", cx.observacao || "—", 24, 346, 474, 13, 80);
  }
  rodapeCaixa(t, c, cx, T);
}

// ---------------------------------------------------------------------------
// Etiqueta do documento: A4 em pé, 4 por folha (EtqPapelDocumento)
// ---------------------------------------------------------------------------
function etiquetaDocumento(t: Tela, c: Contexto, d: DocumentoPdf, x0: number, y0: number) {
  const f = c.f;
  const T = (x: number) => x0 + x;
  const Y = (y: number) => y0 + y;
  t.rrect(T(0), Y(0), 358, 522, 22, { borda: LINHA });
  t.logoOrgao(T(86), Y(13), 186, 62, 11);
  t.faixa(T(0), Y(88), 358, 6);
  t.texto(d.titulo.toUpperCase(), T(18), Y(128), 26, f.b, PETROLEO, { largura: 322 });
  const campo = (rot: string, valor: string, y: number, largura = 322) => {
    rotulo(t, c, rot, T(18), Y(y), 9.5);
    t.texto(valor, T(18), Y(y + 14), 13, f.b, PETROLEO, { largura });
  };
  campo("SECRETARIA", d.secretaria, 153);
  campo("OBJETO", d.objeto, 190);
  campo("DATA", d.data, 227);
  if (d.observacao) campo("OBSERVAÇÃO", d.observacao, 270);
  t.rrect(T(14), Y(300), 330, 43, 10, { fill: BLOCO });
  rotulo(t, c, "CLASSE", T(26), Y(317), 9.5);
  t.texto(d.classe, T(26), Y(333), 12, f.b, PETROLEO, { largura: 200 });
  rotulo(t, c, "CÓDIGO", T(262), Y(317), 9.5);
  t.texto(d.codigo, T(262), Y(333), 12, f.b, PETROLEO, { largura: 70 });
  t.rrect(T(14), Y(353), 330, 104, 20, { fill: PETROLEO });
  t.caixaNumero(d.caixa, T(34), Y(394), 28);
  t.texto("GUARDADO EM", T(34), Y(424), 9.5, f.b, rgb(0.6, 0.72, 0.75), { espaco: 1 });
  t.pilula(d.localizacao, T(34), Y(433), 18, 10);
  t.qr(d.url, T(244), Y(365), 80);
  t.linha(T(14), Y(459), T(344));
  t.logoParceira(T(28), Y(471), 122, 38);
  t.licCont(T(330), Y(490), 0.78);
}

// ---------------------------------------------------------------------------
// Folha de conteúdo: A4 em pé, paginada (EtqPapelConteudo)
// ---------------------------------------------------------------------------
function folhaConteudo(t: Tela, c: Contexto, cx: CaixaPdf, linhas: ItemConteudo[], folha: number, folhas: number) {
  const f = c.f;
  t.logoOrgao(292, 57, 210, 70, 15, cx.orgao ?? "prefeitura");
  t.faixa(40, 145, 714, 6);
  t.texto(cx.titulo, 40, 190, 30, f.b, PETROLEO, { largura: 560 });
  if (cx.volume) {
    t.rrect(664, 169, 90, 27, 13.5, { fill: PETROLEO });
    t.texto(`VOL. ${cx.volume.n}/${cx.volume.total}`, 709, 187, 13, f.b, BRANCO, { alinhar: "centro", espaco: 1 });
  }
  t.rrect(40, 211, 714, 108, 18, { fill: PETROLEO });
  t.caixaNumero(cx.numero, 60, 268, 40);
  t.texto("LOCALIZAÇÃO", 60, 298, 10.5, f.b, rgb(0.6, 0.72, 0.75), { espaco: 1 });
  t.pilula(cx.localizacao, 158, 280, 24, 13);
  t.qr(cx.url, 650, 223, 84);
  // tabela
  t.rrect(40, 336, 714, 36 + LINHAS_POR_FOLHA * 36, 10, { borda: LINHA });
  t.rect(40, 336, 714, 36, PETROLEO);
  const col = { mod: 57, num: 237, sec: 337, obj: 487, vol: 737 };
  for (const [txt, x, al] of [["MODALIDADE", col.mod, "esq"], ["Nº/ANO", col.num, "esq"], ["SECRETARIA", col.sec, "esq"], ["OBJETO", col.obj, "esq"], ["VOL.", col.vol, "dir"]] as const) {
    t.texto(txt, x, 359, 10.5, f.b, BRANCO, { alinhar: al, espaco: 0.9 });
  }
  linhas.forEach((it, i) => {
    const y = 372 + i * 36;
    if (i % 2 === 1) t.rect(41, y, 712, 36, BLOCO);
    t.texto(it.modalidade, col.mod, y + 23, 13, f.b, PETROLEO, { largura: 170 });
    t.texto(it.numeroAno, col.num, y + 23, 13, f.m, PETROLEO, { largura: 95 });
    t.texto(it.secretaria, col.sec, y + 23, 13, f.n, PETROLEO, { largura: 140 });
    t.texto(it.objeto, col.obj, y + 23, 13, f.n, SUAVE, { largura: 195 });
    t.texto(String(it.volume), col.vol, y + 23, 13, f.n, PETROLEO, { alinhar: "dir" });
  });
  // rodapé de dados
  t.rrect(40, 891, 714, 76, 12, { fill: BLOCO });
  rotulo(t, c, "CÓDIGO", 60, 920, 10.5);
  t.texto(cx.codigo, 60, 942, 17, f.b, PETROLEO, { largura: 110 });
  rotulo(t, c, "CLASSE", 188, 920, 10.5);
  t.texto(cx.classe, 188, 942, 15, f.b, PETROLEO, { largura: 200 });
  rotulo(t, c, "PRAZO DE GUARDA", 396, 920, 10.5);
  t.texto(cx.prazo, 396, 938, 14, f.b, PETROLEO, { largura: 200 });
  t.texto(`Folha ${folha} de ${folhas}`, 734, 925, 13, f.n, SUAVE, { alinhar: "dir" });
  const n = cx.itens.length;
  t.texto(`${n} ${n === 1 ? "item" : "itens"} nesta caixa`, 734, 945, 13, f.b, PETROLEO, { alinhar: "dir" });
  t.linha(40, 1008, 754);
  t.logoParceira(48, 1022, 192, 59);
  t.licCont(748, 1051);
}


export async function gerarEtiquetasPdf(entrada: EntradaPdf): Promise<Uint8Array> {
  const c = await contexto(entrada);
  // Caixas: 2 por folha deitada, com a linha de corte tracejada no meio.
  // Uma caixa com lista grande vira mais de uma etiqueta (parte k/n): nada é cortado.
  const caixas = (entrada.caixas ?? []).flatMap(unidadesDaCaixa);
  for (let i = 0; i < caixas.length; i += 2) {
    const page = c.pdf.addPage(A4_DEITADA);
    const t = new Tela(page, 0, 0, c);
    etiquetaCaixa(t, c, caixas[i], 28);
    if (caixas[i + 1]) etiquetaCaixa(t, c, caixas[i + 1], 593);
    t.linhaV(561.5, 28, 766, LINHA, true);
  }
  for (const cx of entrada.conteudos ?? []) {
    const folhas = folhasDoConteudo(cx.itens.length);
    for (let n = 0; n < folhas; n++) {
      const page = c.pdf.addPage(A4_PE);
      folhaConteudo(new Tela(page, 0, 0, c), c, cx, cx.itens.slice(n * LINHAS_POR_FOLHA, (n + 1) * LINHAS_POR_FOLHA), n + 1, folhas);
    }
  }
  // Documentos: 4 por folha em pé (2 x 2).
  const docs = entrada.documentos ?? [];
  for (let i = 0; i < docs.length; i += 4) {
    const page = c.pdf.addPage(A4_PE);
    const t = new Tela(page, 0, 0, c);
    docs.slice(i, i + 4).forEach((d, k) => etiquetaDocumento(t, c, d, k % 2 ? 408 : 28, k > 1 ? 572 : 28));
  }
  if (c.pdf.getPageCount() === 0) c.pdf.addPage(A4_PE);
  return c.pdf.save();
}

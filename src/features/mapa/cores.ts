// Cores do 3D e da planta, tiradas dos quadros claro e escuro do canvas.
// Trocar o tema troca só este objeto (o 3D não recarrega).

export type Trio = { topo: string; frente: string; lado: string };
export type Tema = "claro" | "escuro";

export type PaletaMapa = {
  caixa: Trio;
  estante: Trio;
  faixaSeguranca: string;
  selecionada: Trio & { brilho: string; contorno: string };
  ocupacao: [string, string, string, string];
  fundo: [string, string];
  piso: string;
  sombra: string;
  planta: { fundo: [string, string]; rua: string; livreBorda: string; livre: string; modulo: [string, string]; rotulo: string; rotuloTexto: string };
};

export const CORES: Record<Tema, PaletaMapa> = {
  claro: {
    caixa: { topo: "#9be9d6", frente: "#3cbfa6", lado: "#26937f" },
    estante: { topo: "#b8d2d9", frente: "#86abb6", lado: "#6c929e" },
    faixaSeguranca: "#f5c542",
    selecionada: { topo: "#ffd27a", frente: "#ff9f1c", lado: "#e08500", brilho: "#fff3d1", contorno: "#d97706" },
    ocupacao: ["#8bdcc6", "#f5c542", "#f08a24", "#d14343"],
    fundo: ["#eef9f8", "#d6ecea"],
    piso: "#dcecef",
    sombra: "#0b2e3a",
    planta: { fundo: ["#eef9f8", "#e2f2f1"], rua: "#dcecef", livreBorda: "#7fd4cc", livre: "#e6f7f5", modulo: ["#2dd4bf", "#0e7490"], rotulo: "#0b2e3a", rotuloTexto: "#ffffff" },
  },
  escuro: {
    caixa: { topo: "#7fe3cf", frente: "#2fb59b", lado: "#1f8a78" },
    estante: { topo: "#b8d2d9", frente: "#86abb6", lado: "#6c929e" },
    faixaSeguranca: "#f5c542",
    selecionada: { topo: "#ffd27a", frente: "#ff9f1c", lado: "#e08500", brilho: "#fff3d1", contorno: "#ffb84d" },
    ocupacao: ["#6fd3bb", "#f5c542", "#f08a24", "#ef6b6b"],
    fundo: ["#0e1d22", "#08131a"],
    piso: "#12262d",
    sombra: "#000000",
    planta: { fundo: ["#0e1d22", "#0a171c"], rua: "#13272e", livreBorda: "#2f6b73", livre: "#0f2127", modulo: ["#2dd4bf", "#0e7490"], rotulo: "#8cc5cf", rotuloTexto: "#0b2e3a" },
  },
};

const canais = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

// Tom da face em relação ao topo, canal a canal: o 3D usa uma só cor por
// instância (a do topo) e esta razão devolve o tom da frente e do lado.
export function razaoFace(topo: string, face: string): [number, number, number] {
  const [a, b] = [canais(topo), canais(face)];
  return [b[0] / a[0], b[1] / a[1], b[2] / a[2]];
}

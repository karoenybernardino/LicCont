"use client";

// Logo enviado pela equipe: PNG ou SVG de até 1 MB. O SVG (que pode ter script) nunca vai ao servidor:
// é desenhado num canvas e sai como PNG, que é o que o PDF das etiquetas e o bucket aceitam.
export const LIMITE_LOGO = 1024 * 1024;

export async function logoParaPng(arquivo: File): Promise<Blob> {
  const svg = arquivo.type === "image/svg+xml" || /\.svg$/i.test(arquivo.name);
  const png = arquivo.type === "image/png" || /\.png$/i.test(arquivo.name);
  if (!svg && !png) throw new Error("Use um arquivo PNG ou SVG.");
  if (arquivo.size > LIMITE_LOGO) throw new Error("O logo passa de 1 MB.");
  const url = URL.createObjectURL(arquivo);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    // SVG sem tamanho próprio vem com 0: desenha numa base de 600 px.
    const largura = img.naturalWidth || 600;
    const altura = img.naturalHeight || 300;
    const escala = svg && !img.naturalWidth ? 1 : Math.min(1, 900 / largura, 450 / altura);
    const tela = document.createElement("canvas");
    tela.width = Math.max(1, Math.round(largura * escala));
    tela.height = Math.max(1, Math.round(altura * escala));
    tela.getContext("2d")!.drawImage(img, 0, 0, tela.width, tela.height);
    const blob = await new Promise<Blob | null>((ok) => tela.toBlob(ok, "image/png"));
    if (!blob || blob.size > LIMITE_LOGO) throw new Error("Não foi possível preparar o logo. Use um arquivo menor.");
    return blob;
  } catch (e) {
    throw e instanceof Error && /Use |1 MB|preparar/.test(e.message) ? e : new Error("Não foi possível ler a imagem.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

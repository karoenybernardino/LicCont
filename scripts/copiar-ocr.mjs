// Copia o motor de OCR (tesseract.js, Apache-2.0) e o idioma português para
// public/ocr, para o navegador carregar do próprio site (sem CDN, sem serviço
// externo). Roda no postinstall; se os pacotes não estiverem lá, só avisa.
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

const raiz = process.cwd();
const origem = {
  worker: join(raiz, "node_modules/tesseract.js/dist/worker.min.js"),
  core: join(raiz, "node_modules/tesseract.js-core"),
  idioma: join(raiz, "node_modules/@tesseract.js-data/por/4.0.0_best_int/por.traineddata.gz"),
};

if (!existsSync(origem.worker) || !existsSync(origem.core) || !existsSync(origem.idioma)) {
  console.warn("copiar-ocr: pacotes de OCR ausentes; leitura de texto do PDF fica indisponível.");
  process.exit(0);
}

const destino = join(raiz, "public/ocr");
mkdirSync(join(destino, "core"), { recursive: true });
mkdirSync(join(destino, "lang"), { recursive: true });
copyFileSync(origem.worker, join(destino, "worker.min.js"));
// Só as versões "lstm" (o motor usado pelo tesseract.js 7), com o wasm embutido.
for (const nome of readdirSync(origem.core)) {
  if (/lstm\.wasm\.js$/.test(nome)) copyFileSync(join(origem.core, nome), join(destino, "core", nome));
}
copyFileSync(origem.idioma, join(destino, "lang", "por.traineddata.gz"));
console.log("copiar-ocr: motor de OCR copiado para public/ocr.");

import type { Metadata } from "next";
import { IBM_Plex_Sans, Sora } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { FaixaDemo } from "@/features/demo/faixa";

const sora = Sora({ variable: "--font-sora", subsets: ["latin"], weight: ["300", "600", "700"] });
const plex = IBM_Plex_Sans({ variable: "--font-plex", subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: "LicCONT",
  description: "Arquivo morto de licitações e contratos",
};

// Aplica o tema salvo (ou o do sistema) antes da primeira pintura, sem piscar.
const scriptTema = `(function(){try{var t=localStorage.getItem("tema");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Nonce da CSP, gerado no src/proxy.ts. Ler o cabeçalho torna toda página dinâmica.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html
      lang="pt-BR"
      data-theme="light"
      className={`${sora.variable} ${plex.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <FaixaDemo />
        {children}
      </body>
    </html>
  );
}

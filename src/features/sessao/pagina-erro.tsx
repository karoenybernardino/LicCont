import type { ReactNode } from "react";
import { MolduraErro } from "./erro";
import { nomePrefeitura, secretariaAtual, usuarioAtual } from "./dal";
import { PaginaSistema } from "./pagina";

// Com sessão válida, o erro aparece dentro da moldura do sistema (como no canvas);
// sem sessão, no fundo liso com a marca.
export async function PaginaErro({ titulo, children }: { titulo: string; children: ReactNode }) {
  const usuario = await usuarioAtual();
  const secretaria = usuario ? await secretariaAtual(usuario) : null;
  if (usuario && secretaria) {
    return (
      <PaginaSistema usuario={usuario} secretaria={secretaria} titulo={titulo} trilha={await nomePrefeitura(usuario)}>
        <div className="flex flex-1 items-center justify-center pb-10">{children}</div>
      </PaginaSistema>
    );
  }
  return <MolduraErro>{children}</MolduraErro>;
}

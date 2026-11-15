import { secretariasPermitidas, type Secretaria, type Usuario } from "./dal";
import { MenuSecretaria } from "./menu-secretaria";

// Troca de secretaria sem novo login (docs/fases/fase-1.md, Login).
// Visual do quadro InicioFase: caixa de 38 px, raio 10, rótulo pequeno e valor; a lista é um menu próprio.
export async function SeletorSecretaria({ usuario, atual }: { usuario: Usuario; atual: Secretaria }) {
  const opcoes = await secretariasPermitidas(usuario);
  return (
    <MenuSecretaria
      atual={atual.id ?? "todas"}
      opcoes={opcoes.map((s) => ({ id: s.id ?? "todas", nome: s.nome }))}
    />
  );
}

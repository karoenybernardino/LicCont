import { Botao } from "@/ui/botao";
import { Campo } from "@/ui/campo";
import { Cartao } from "@/ui/cartao";
import { Logo } from "@/ui/logo";
import { SeletorTema } from "@/ui/seletor-tema";

export default function Inicio() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10">
      <header className="flex items-center justify-between">
        <Logo className="text-3xl" />
        <SeletorTema />
      </header>

      <section className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Arquivo morto de licitações e contratos</h1>
        <p className="text-texto-suave">
          Em construção. Esta página mostra o tema e os componentes base.
        </p>
      </section>

      <Cartao className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Componentes base</h2>
        <Campo rotulo="Número do processo" name="exemplo" placeholder="Ex.: 012/2026" />
        <div className="flex gap-3">
          <Botao>Ação principal</Botao>
          <Botao variante="secundario">Ação secundária</Botao>
        </div>
      </Cartao>
    </main>
  );
}

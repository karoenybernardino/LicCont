import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Painel, TituloPainel } from "@/features/estrutura/componentes";
import { exigirSessao } from "@/features/sessao/dal";
import { PaginaSistema } from "@/features/sessao/pagina";
import { secretariasParaCadastro } from "@/features/documentos/dados";
import { historico, lerConfig } from "@/features/tce/dados";
import { FormularioConfig } from "@/features/tce/formulario-config";

export const metadata: Metadata = { title: "Integração TCE-CE · LicCONT" };

const SITUACAO = { rodando: "Em andamento", ok: "Concluída", erro: "Com erro" } as const;
const ERRO = { indisponivel: "TCE fora do ar", formato: "Formato inesperado", sem_configuracao: "Sem configuração", interno: "Erro interno" } as const;

export default async function ConfiguracaoTce() {
  const { usuario, secretaria } = await exigirSessao();
  if (!usuario.administrador) redirect("/inicio");
  const [config, lista, secretarias] = await Promise.all([lerConfig(usuario.prefeituraId), historico(), secretariasParaCadastro(usuario)]);
  const ano = new Date().getFullYear();
  const anos = Array.from({ length: 8 }, (_, i) => ano - i);
  return (
    <PaginaSistema usuario={usuario} secretaria={secretaria} titulo="Integração com o TCE-CE" trilha="Configurações › Integração TCE-CE">
      <div className="flex flex-col gap-4">
        <FormularioConfig config={config} secretarias={secretarias.map((s) => ({ id: s.id, nome: s.nome }))} anosDisponiveis={anos} />
        <Painel>
          <TituloPainel>Histórico das importações</TituloPainel>
          <p className="text-sm text-texto-suave">Só números e datas. Erros não mostram o conteúdo dos registros.</p>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left">
                {["Quando", "Anos", "Origem", "Novos", "Duplicados", "Já existiam", "Situação"].map((c) => (
                  <th key={c} className="px-2 py-2 text-[11px] font-semibold uppercase">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.map((i) => (
                <tr key={i.id} className="border-t border-linha">
                  <td className="px-2 py-2">{new Date(i.iniciada_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}</td>
                  <td className="px-2 py-2">{i.anos.join(", ")}</td>
                  <td className="px-2 py-2">{i.origem === "agendada" ? "Automática" : "Manual"}</td>
                  <td className="px-2 py-2">{i.novos}</td>
                  <td className="px-2 py-2">{i.duplicados}</td>
                  <td className="px-2 py-2">{i.ja_existentes}</td>
                  <td className="px-2 py-2">{i.erro_codigo ? (ERRO[i.erro_codigo as keyof typeof ERRO] ?? "Com erro") : SITUACAO[i.situacao]}</td>
                </tr>
              ))}
              {!lista.length && (
                <tr>
                  <td colSpan={7} className="px-2 py-6 text-center text-texto-suave">
                    Nenhuma importação ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Painel>
      </div>
    </PaginaSistema>
  );
}

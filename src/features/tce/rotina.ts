import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ErroTce, lerTce, type Dependencias, type RegistroTce, type TipoTce } from "./cliente";

// Rotina de importação do TCE: uma prefeitura por vez, uma página por vez.
// Roda só no servidor, com a chave de serviço, na região de São Paulo.
// Nunca vai nome, objeto nem CNPJ para log; o resultado é só contagem.

export type Configuracao = { prefeitura_id: string; codigo: string; anos: number[]; tipos: TipoTce[] };
export type Resultado = { prefeitura: string; novos: number; duplicados: number; jaExistentes: number; erro?: "indisponivel" | "formato" | "sem_configuracao" | "interno" };

type Servico = Pick<SupabaseClient, "rpc">;

export async function configuracoes(servico: Servico, prefeitura?: string): Promise<Configuracao[]> {
  const { data } = await servico.rpc("importar_tce_configuracoes", { p_prefeitura: prefeitura ?? null });
  return ((data ?? []) as Configuracao[]).filter((c) => c.tipos.length > 0);
}

export async function importarPrefeitura(
  servico: Servico,
  cfg: Configuracao,
  origem: "agendada" | "manual",
  dep: Dependencias = {},
): Promise<Resultado> {
  const saida: Resultado = { prefeitura: cfg.prefeitura_id, novos: 0, duplicados: 0, jaExistentes: 0 };
  const { data: id, error } = await servico.rpc("importar_tce_abrir", { p_prefeitura: cfg.prefeitura_id, p_origem: origem });
  if (error || !id) return { ...saida, erro: error?.code === "23514" ? "sem_configuracao" : "interno" };

  let erro: Resultado["erro"];
  try {
    for (const ano of cfg.anos) {
      for (const tipo of cfg.tipos) {
        // Cada página é gravada de uma vez pela função do banco (tudo ou nada).
        await lerTce(tipo, cfg.codigo, ano, dep, async (registros: RegistroTce[]) => {
          if (!registros.length) return;
          const { data, error: e } = await servico.rpc("importar_tce_gravar", { p_importacao: id, p_registros: registros });
          if (e || !data) throw new Error("gravar");
          const r = data as { novos: number; duplicados: number; ja_existentes: number };
          saida.novos += r.novos;
          saida.duplicados += r.duplicados;
          saida.jaExistentes += r.ja_existentes;
        });
      }
    }
  } catch (e) {
    erro = e instanceof ErroTce ? e.codigo : "interno";
  }
  await servico.rpc("importar_tce_fechar", { p_importacao: id, p_erro: erro ?? null });
  return erro ? { ...saida, erro } : saida;
}

// Todas as prefeituras com a integração ligada, uma depois da outra.
export async function importarTodas(servico: Servico, dep: Dependencias = {}): Promise<Resultado[]> {
  const saida: Resultado[] = [];
  for (const cfg of await configuracoes(servico)) saida.push(await importarPrefeitura(servico, cfg, "agendada", dep));
  return saida;
}

// Usuários fictícios criados pelo preparar.ts no Supabase local do CI.
// Nada aqui existe em produção.
export const PREFEITURA = "Prefeitura Fictícia de Exemplo";
export const OUTRA_PREFEITURA = "Prefeitura Fictícia de Teste";
export const SENHA = "Senha-Ficticia-de-Teste-2026";

export type UsuarioTeste = {
  email: string;
  prefeitura?: string;
  administrador?: boolean;
  troca?: boolean;
  secretarias?: string[];
  equipe?: boolean;
};

export const USUARIOS = {
  operador: { email: "operador.saude@exemplo.test", prefeitura: PREFEITURA, secretarias: ["Saúde"] },
  admin: { email: "admin@exemplo.test", prefeitura: PREFEITURA, administrador: true },
  novo: { email: "novo@exemplo.test", prefeitura: PREFEITURA, troca: true, secretarias: ["Educação"] },
  bloqueio: { email: "bloqueio@exemplo.test", prefeitura: PREFEITURA, secretarias: ["Saúde"] },
  inatividade: { email: "inativo@exemplo.test", prefeitura: PREFEITURA, secretarias: ["Obras"] },
  outra: { email: "operador.outra@exemplo.test", prefeitura: OUTRA_PREFEITURA, secretarias: ["Saúde"] },
  equipe: { email: "equipe@exemplo.test", equipe: true },
} satisfies Record<string, UsuarioTeste>;

export const temSupabase = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

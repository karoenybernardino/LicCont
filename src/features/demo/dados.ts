// Modo demonstração (LICCONT_DEMO=1): telas com dados fictícios, sem banco.
// Nada aqui é dado real e nada é salvo. Nunca liga em Production na Vercel.

// Falha fechada: só liga em prévia da Vercel ou em desenvolvimento local, e
// nunca onde houver chave de servidor do Supabase.
export function emDemo(ambiente: Record<string, string | undefined> = process.env) {
  const permitido = ambiente.VERCEL_ENV === "preview" || ambiente.NODE_ENV === "development";
  return ambiente.LICCONT_DEMO === "1" && permitido && !ambiente.SUPABASE_SERVICE_ROLE_KEY;
}

export const AVISO_DEMO = "Modo demonstração: nada foi salvo.";
export const COOKIE_PERFIL_DEMO = "liccont_demo_perfil";

export const PERFIS_DEMO = {
  administrador: "Administrador",
  coordenador: "Coordenador",
  operador: "Operador",
  consulta: "Consulta",
  equipe: "Equipe LicCONT",
} as const;
export type PerfilDemo = keyof typeof PERFIS_DEMO;

export const PREFEITURAS_DEMO = [
  { id: "de000000-0000-0000-0000-000000000001", nome: "Prefeitura Fictícia de Exemplo", cnpj: "00000000000809", status: "ativa" },
  { id: "de000000-0000-0000-0000-000000000002", nome: "Prefeitura Fictícia de Teste", cnpj: "00000000000990", status: "ativa" },
  { id: "de000000-0000-0000-0000-000000000003", nome: "Câmara Fictícia (em implantação)", cnpj: "00000000000555", status: "implantacao" },
] as const;

export const PREFEITURA_DEMO = PREFEITURAS_DEMO[0].id;

export const SECRETARIAS_DEMO = [
  { id: "de100000-0000-0000-0000-000000000001", nome: "Administração", ativa: true },
  { id: "de100000-0000-0000-0000-000000000002", nome: "Educação", ativa: true },
  { id: "de100000-0000-0000-0000-000000000003", nome: "Obras", ativa: true },
  { id: "de100000-0000-0000-0000-000000000004", nome: "Saúde", ativa: true },
  { id: "de100000-0000-0000-0000-000000000005", nome: "Cultura", ativa: false },
];

// Quem não é administrador vê estas secretarias na demonstração.
export const VINCULOS_DEMO = [SECRETARIAS_DEMO[2].id, SECRETARIAS_DEMO[3].id];

export const USUARIOS_DEMO = [
  { id: "de200000-0000-0000-0000-000000000001", nome: "Maria Fictícia", email: "maria@exemplo.test", perfil: "administrador", ativo: true, trocaSenha: false, secretarias: [] },
  { id: "de200000-0000-0000-0000-000000000002", nome: "João Fictício", email: "joao@exemplo.test", perfil: "coordenador", ativo: true, trocaSenha: false, secretarias: [SECRETARIAS_DEMO[2].id] },
  { id: "de200000-0000-0000-0000-000000000003", nome: "Paula Fictícia", email: "paula@exemplo.test", perfil: "operador", ativo: true, trocaSenha: true, secretarias: [SECRETARIAS_DEMO[3].id] },
  { id: "de200000-0000-0000-0000-000000000004", nome: "Ana Fictícia", email: "ana@exemplo.test", perfil: "consulta", ativo: false, trocaSenha: false, secretarias: [SECRETARIAS_DEMO[1].id] },
] as const;

// Campos novos das secretarias (Fase 5), fictícios. Quem não aparece aqui usa os padrões.
export const DETALHES_SECRETARIAS_DEMO: Record<string, { sigla: string; telefone: string; email: string; responsavelId: string | null; cargo: string; prazo: number; exigeAprovacao?: boolean }> = {
  [SECRETARIAS_DEMO[0].id]: { sigla: "SEAD", telefone: "(88) 0000-0001", email: "adm@exemplo.test", responsavelId: USUARIOS_DEMO[0].id, cargo: "Secretária de Administração", prazo: 15 },
  [SECRETARIAS_DEMO[1].id]: { sigla: "SEDUC", telefone: "(88) 0000-0002", email: "educacao@exemplo.test", responsavelId: USUARIOS_DEMO[3].id, cargo: "Secretária de Educação", prazo: 30 },
  [SECRETARIAS_DEMO[2].id]: { sigla: "SEINFRA", telefone: "(88) 0000-0003", email: "obras@exemplo.test", responsavelId: USUARIOS_DEMO[1].id, cargo: "Secretário de Obras", prazo: 15, exigeAprovacao: true },
  [SECRETARIAS_DEMO[3].id]: { sigla: "SESAU", telefone: "(88) 0000-0004", email: "saude@exemplo.test", responsavelId: USUARIOS_DEMO[2].id, cargo: "Secretária de Saúde", prazo: 15 },
};

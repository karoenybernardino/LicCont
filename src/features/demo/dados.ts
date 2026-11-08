// Modo demonstração (LICCONT_DEMO=1): telas com dados fictícios, sem banco.
// Nada aqui é dado real e nada é salvo. Nunca liga em Production na Vercel.

export function emDemo(ambiente: Record<string, string | undefined> = process.env) {
  return ambiente.LICCONT_DEMO === "1" && ambiente.VERCEL_ENV !== "production";
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

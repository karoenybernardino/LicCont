import type { ReactNode } from "react";
import { Campo } from "@/ui/campo";
import { Selecao } from "@/ui/selecao";
import { PERFIS, type Perfil } from "./esquemas";

// Campos comuns de cadastrar e editar usuário. Em tela larga, dois por linha; "antes" entra como primeiro campo.
export function CamposUsuario({
  secretarias,
  inicial,
  perfilTravado = false,
  antes,
}: {
  secretarias: { id: string; nome: string }[];
  inicial?: { nome: string; matricula: string | null; perfil: Perfil; secretarias: string[] };
  perfilTravado?: boolean;
  antes?: ReactNode;
}) {
  return (
    <>
      <div className="grid gap-[18px] sm:grid-cols-2">
        {antes}
        <Campo rotulo="Nome" name="nome" defaultValue={inicial?.nome} required maxLength={200} />
        <Campo rotulo="Matrícula (opcional)" name="matricula" defaultValue={inicial?.matricula ?? ""} maxLength={40} />
        {perfilTravado ? (
          <>
            <input type="hidden" name="perfil" value={inicial?.perfil} />
            <p className="text-sm text-texto-suave sm:col-span-2">
              Perfil: {PERFIS[inicial!.perfil]}. Você não pode mudar o seu próprio perfil.
            </p>
          </>
        ) : (
          <Selecao
            rotulo="Perfil"
            name="perfil"
            defaultValue={inicial?.perfil ?? "operador"}
            ajuda="Administrador vê todas as secretarias. Os demais, só as marcadas abaixo."
          >
            {Object.entries(PERFIS).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </Selecao>
        )}
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-xs font-medium uppercase tracking-[0.04em] text-texto-suave">
          Secretarias
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {secretarias.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="secretarias"
                value={s.id}
                defaultChecked={inicial?.secretarias.includes(s.id)}
                className="size-4 accent-[var(--destaque)]"
              />
              {s.nome}
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}

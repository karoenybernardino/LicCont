"use client";

import { useActionState } from "react";
import { Botao } from "@/ui/botao";
import { Campo } from "@/ui/campo";
import { Formulario } from "@/ui/formulario";
import { confirmarCadastro, iniciarCadastro, type EstadoCadastro } from "./acoes";

// Primeiro acesso: gera o QR code do autenticador e confirma com o primeiro código.
export function CadastroAutenticador() {
  const [cadastro, gerar, gerando] = useActionState<EstadoCadastro>(iniciarCadastro, undefined);

  if (!cadastro?.factorId) {
    return (
      <form action={gerar} className="flex flex-col gap-[18px]">
        <p className="text-sm text-texto-suave">
          Instale no celular um aplicativo autenticador (Google Authenticator, Microsoft Authenticator ou
          outro) e gere o QR code.
        </p>
        {cadastro?.erro && (
          <p role="alert" data-testid="erro-formulario" className="text-sm text-erro">
            {cadastro.erro}
          </p>
        )}
        <Botao type="submit" disabled={gerando} className="w-full">
          {gerando ? "Gerando…" : "Mostrar QR code"}
        </Botao>
      </form>
    );
  }

  return (
    <Formulario acao={confirmarCadastro} botao="Confirmar" enviando="Confirmando…">
      <p className="text-sm text-texto-suave">Leia o QR code com o aplicativo e digite o código de 6 números.</p>
      {/* QR do Supabase vem como SVG em data URI; fundo branco para leitura no tema escuro. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cadastro.qr}
        alt="QR code para cadastrar o LicCONT no aplicativo autenticador"
        width={180}
        height={180}
        className="self-center rounded-lg bg-white p-2"
      />
      <p className="text-xs text-texto-suave">
        Sem câmera? Digite esta chave no aplicativo:{" "}
        <code data-testid="segredo-totp" className="break-all font-mono text-texto">
          {cadastro.segredo}
        </code>
      </p>
      <input type="hidden" name="fator" value={cadastro.factorId} />
      <Campo
        rotulo="Código do aplicativo"
        name="codigo"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        required
      />
    </Formulario>
  );
}

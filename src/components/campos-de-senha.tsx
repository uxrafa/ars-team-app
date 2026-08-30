"use client";

import { useState } from "react";
import { CampoSenha } from "./campo-senha";

/**
 * Senha e confirmacao, para quando a pessoa esta CRIANDO uma senha.
 *
 * O olho de mostrar nao resolve isto sozinho: o campo nasce mascarado, e
 * ninguem toca no olho para conferir uma senha que acredita ter digitado
 * certo. Errar aqui custa caro, porque a pessoa so descobre no proximo login,
 * quando ja nao lembra o que digitou.
 *
 * A conferencia aparece quando ela sai do segundo campo, e nao a cada tecla:
 * acusar diferenca no primeiro caractere e acusar todo mundo o tempo todo.
 * Depois de aparecer, some sozinha assim que os dois baterem.
 *
 * Quem recusa de verdade e a server action, que recebe os dois campos.
 */
export function CamposDeSenha({
  rotulo,
  minimo = 6,
}: {
  rotulo: string;
  minimo?: number;
}) {
  const [senha, setSenha] = useState("");
  const [copia, setCopia] = useState("");
  const [saiu, setSaiu] = useState(false);

  const diferentes = saiu && copia.length > 0 && senha !== copia;

  return (
    <>
      <CampoSenha
        name="senha"
        rotulo={rotulo}
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        autoComplete="new-password"
        required
        minLength={minimo}
        placeholder={`Pelo menos ${minimo} caracteres`}
      />

      <div className="flex flex-col gap-2">
        <CampoSenha
          name="confirmacao"
          rotulo="Confirmar senha"
          value={copia}
          onChange={(e) => setCopia(e.target.value)}
          onBlur={() => setSaiu(true)}
          autoComplete="new-password"
          required
          aria-invalid={diferentes || undefined}
          aria-describedby={diferentes ? "erro-confirmacao" : undefined}
        />
        {diferentes && (
          <p id="erro-confirmacao" role="alert" className="text-sm text-raio-forte">
            As duas senhas não estão iguais.
          </p>
        )}
      </div>
    </>
  );
}

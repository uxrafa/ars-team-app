import type { ReactNode } from "react";
import { CLASSE_CAMPO, Rotulo } from "@/components/ui";

/**
 * O "Pago até", igual nos dois lugares onde ele aparece: o registro de
 * pagamento no Financeiro e o cartão de cobrança do aluno (Rafael, 08/10).
 *
 * Desde a migração 0021 é uma data só: o que se escolhe em um lugar é o que
 * o outro mostra. Mesmo campo, mesmo nome, para o Allisson não ter de
 * descobrir que as duas coisas são a mesma.
 */
export function CampoPagoAte({
  valor,
  aoMudar,
  apoio,
  className = "",
}: {
  /** "aaaa-mm-dd", ou "" sem data. */
  valor: string;
  aoMudar: (iso: string) => void;
  /** O que a data não diz sozinha: de onde ela veio. */
  apoio?: ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-2 ${className}`}>
      <Rotulo>Pago até</Rotulo>
      <input
        type="date"
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        className={CLASSE_CAMPO}
      />
      {apoio && <span className="text-sm leading-relaxed text-nevoa">{apoio}</span>}
    </label>
  );
}

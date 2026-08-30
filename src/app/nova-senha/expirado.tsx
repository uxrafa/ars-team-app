import Link from "next/link";
import { BotaoLink } from "@/components/ui";

/**
 * Link velho, ja usado, ou aberto depois da hora.
 *
 * Em arquivo separado porque a previa precisa desenhar este estado sem
 * Supabase, e porque ele nao e um erro: e o caminho normal de quem demorou.
 */
export function LinkExpirado() {
  return (
    <section className="flex flex-col gap-5 text-center">
      <div>
        <h2 className="text-xl font-bold">Este link não vale mais</h2>
        <p className="mt-2.5 text-[15px] leading-relaxed text-nevoa">
          Os links duram uma hora e servem uma vez só. Peça outro e ele chega em instantes.
        </p>
      </div>

      <BotaoLink href="/esqueci" largura="cheia">
        Pedir um link novo
      </BotaoLink>

      <Link
        href="/entrar"
        className="inline-flex min-h-11 items-center justify-center text-[15px] font-semibold text-nevoa transition-colors hover:text-papel"
      >
        Voltar para a entrada
      </Link>
    </section>
  );
}

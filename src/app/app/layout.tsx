import { Logo } from "@/components/logo";
import { Botao } from "@/components/ui";

export default function LayoutApp({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-linha bg-tinta/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-3">
          <Logo className="h-6 w-auto text-papel" />
          <form action="/auth/sair" method="post" className="ml-auto">
            <Botao type="submit" aparencia="fantasma" tamanho="sm">
              Sair
            </Botao>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-8 pb-16">{children}</main>
    </div>
  );
}

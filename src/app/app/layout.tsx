import { Logo } from "@/components/logo";

export default function LayoutApp({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-linha bg-tinta/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-2.5 px-5 py-3.5">
          <Logo className="h-6 w-auto text-papel" />
          <form action="/auth/sair" method="post" className="ml-auto">
            <button
              type="submit"
              className="rounded-lg border border-linha px-3 py-1.5 text-xs font-semibold text-nevoa transition hover:border-raio hover:text-papel"
            >
              Sair
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-8">{children}</main>
    </div>
  );
}

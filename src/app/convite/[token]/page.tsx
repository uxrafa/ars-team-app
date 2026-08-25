import Link from "next/link";
import { Logo } from "@/components/logo";
import { criarClienteServidor } from "@/lib/supabase/server";
import { BotaoLink } from "@/components/ui";
import { primeiroNome } from "@/lib/convite";
import { Formulario } from "./formulario";

export const metadata = {
  title: "Seu acesso · ARS Team",
  // Link de convite nao entra em buscador nem em previa de rede social.
  robots: { index: false, follow: false },
};

type Achado = {
  nome: string;
  email: string;
  tipo: "consultoria" | "planilha";
  situacao: "valido" | "usado" | "cancelado" | "expirado";
};

const RECADO: Record<Exclude<Achado["situacao"], "valido">, string> = {
  usado: "Este convite já virou conta. Entre com seu e-mail e a senha que você escolheu.",
  cancelado: "Este convite foi cancelado. Fale com o Allisson para receber outro link.",
  expirado: "Este link venceu. Peça um novo para o Allisson, leva um minuto.",
};

function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <header className="mb-9 flex flex-col items-center text-center">
          <h1 className="sr-only">ARS Team</h1>
          <Logo className="h-12 w-auto text-papel" />
        </header>
        {children}
        <p className="mt-9 text-center text-sm leading-relaxed text-nevoa">
          Consultoria ARS Team · Allisson Santos
          <br />
          <span className="whitespace-nowrap">CREF 205331-G/SP</span>
        </p>
      </div>
    </main>
  );
}

export default async function PaginaConvite({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await criarClienteServidor();

  // O aluno chega aqui sem conta, entao a RLS nao deixaria ele ler a tabela.
  // Esta funcao e a excecao estreita da migracao 0010: devolve so nome, e-mail
  // e plano, e so para quem tem o token inteiro.
  const { data, error } = await supabase.rpc("convite_por_token", { p_token: token });

  if (error) console.error("[convite] rpc:", error.message);

  const convite = (data ?? [])[0] as Achado | undefined;

  if (!convite) {
    return (
      <Moldura>
        <div className="rounded-2xl border border-linha bg-tinta-2 p-6 text-center">
          <h2 className="text-lg font-semibold">Não encontrei este convite</h2>
          <p className="mt-2.5 text-[15px] leading-relaxed text-nevoa">
            O link pode ter vindo cortado pelo WhatsApp. Abra de novo pela mensagem, ou peça
            outro para o Allisson.
          </p>
          <div className="mt-5">
            <BotaoLink href="/entrar" aparencia="secundario" largura="cheia">
              Ir para a tela de entrada
            </BotaoLink>
          </div>
        </div>
      </Moldura>
    );
  }

  if (convite.situacao !== "valido") {
    return (
      <Moldura>
        <div className="rounded-2xl border border-linha bg-tinta-2 p-6 text-center">
          <h2 className="text-lg font-semibold">
            {convite.situacao === "usado" ? "Sua conta já existe" : "Link fora de validade"}
          </h2>
          <p className="mt-2.5 text-[15px] leading-relaxed text-nevoa">
            {RECADO[convite.situacao]}
          </p>
          <div className="mt-5">
            <BotaoLink href="/entrar" largura="cheia">
              Entrar
            </BotaoLink>
          </div>
        </div>
      </Moldura>
    );
  }

  return (
    <Moldura>
      <div className="mb-7 text-center">
        <p className="text-[15px] text-nevoa">Bem-vindo</p>
        <p className="mt-1 font-display text-3xl uppercase leading-none tracking-wide">
          {primeiroNome(convite.nome)}
        </p>
        <p className="mt-3.5 text-[15px] leading-relaxed text-nevoa">
          {convite.tipo === "planilha"
            ? "O Allisson liberou seu acesso à planilha de treino. Escolha uma senha para entrar."
            : "O Allisson liberou seu acesso à consultoria. Escolha uma senha para entrar."}
        </p>
      </div>

      <Formulario token={token} nome={convite.nome} email={convite.email} tipo={convite.tipo} />

      <p className="mt-6 text-center text-sm leading-relaxed text-nevoa">
        Já tem conta?{" "}
        <Link href="/entrar" className="font-semibold text-raio-forte underline underline-offset-4">
          Entrar
        </Link>
      </p>
    </Moldura>
  );
}

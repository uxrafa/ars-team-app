import { criarClienteServidor } from "@/lib/supabase/server";
import { Botao, BotaoLink, Cartao, Pilula, Rotulo } from "@/components/ui";
import { diasEntre, emReais, hojeSP } from "@/lib/painel";
import { porExtenso } from "@/lib/treino";
import { Titulo } from "../visao";

export const metadata = { title: "Perfil · ARS Team" };

const WHATSAPP_DO_ALLISSON = "https://wa.me/5514997644001";

const NOME_DO_PLANO = {
  consultoria: "Consultoria online",
  planilha: "Planilha de treino",
  admin: "Treinador",
} as const;

/** Ainda não existem. O aluno precisa saber que vêm, e que não sumiram. */
/**
 * Só os nomes. Descrever em detalhe o que ele ainda não pode usar é vender de
 * novo uma coisa que ele já comprou, e o nome basta para dizer que vem aí.
 */
const EM_BREVE = ["Semana", "Orientação alimentar", "Chat"] as const;

function Linha({ nome, valor }: { nome: string; valor: string }) {
  return (
    <div className="flex items-baseline gap-3 border-t border-linha py-3 first:border-t-0">
      <span className="flex-none text-[15px] text-nevoa">{nome}</span>
      <span className="min-w-0 flex-1 break-words text-right text-[15px] text-papel">{valor}</span>
    </div>
  );
}

export default async function Perfil() {
  const supabase = await criarClienteServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = await supabase
    .from("perfis")
    .select("nome, email, whatsapp, tipo, status, mensalidade, acesso_ate")
    .eq("id", user?.id ?? "")
    .maybeSingle<{
      nome: string;
      email: string;
      whatsapp: string | null;
      tipo: "admin" | "consultoria" | "planilha";
      status: "ativo" | "carencia" | "suspenso";
      mensalidade: number | null;
      acesso_ate: string | null;
    }>();

  const { data: anamnese } = await supabase
    .from("anamnese")
    .select("enviada_em")
    .eq("aluno_id", user?.id ?? "")
    .maybeSingle<{ enviada_em: string | null }>();

  const hoje = hojeSP();
  const faltam = perfil?.acesso_ate ? diasEntre(hoje, perfil.acesso_ate) : null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Rotulo>Sua conta</Rotulo>
        <Titulo>{perfil?.nome ?? "Perfil"}</Titulo>
      </header>

      <Cartao>
        <Linha nome="E-mail" valor={perfil?.email ?? user?.email ?? "-"} />
        {perfil?.whatsapp && <Linha nome="WhatsApp" valor={perfil.whatsapp} />}
        <Linha nome="Plano" valor={perfil ? NOME_DO_PLANO[perfil.tipo] : "-"} />
        {perfil?.mensalidade ? (
          <Linha nome="Mensalidade" valor={emReais(Number(perfil.mensalidade))} />
        ) : null}
      </Cartao>

      {perfil?.tipo === "consultoria" && perfil.acesso_ate && (
        <Cartao>
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <Rotulo>Seu acesso vai até</Rotulo>
              <p className="mt-1 text-[17px] font-semibold text-papel">
                {porExtenso(perfil.acesso_ate)}
              </p>
            </div>
            {faltam !== null &&
              (faltam < 0 ? (
                <Pilula tom="urgente">vencido</Pilula>
              ) : faltam <= 7 ? (
                <Pilula tom="aviso">
                  {faltam === 0 ? "vence hoje" : `faltam ${faltam} dias`}
                </Pilula>
              ) : (
                <Pilula tom="ok">em dia</Pilula>
              ))}
          </div>
          {faltam !== null && faltam <= 7 && (
            <p className="mt-3 text-[15px] leading-relaxed text-nevoa">
              Fale com o Allisson para renovar. Nada do que você registrou se perde.
            </p>
          )}
        </Cartao>
      )}

      <Cartao>
        <Rotulo>Sua anamnese</Rotulo>
        <p className="mt-2 text-[15px] leading-relaxed text-nevoa">
          {anamnese?.enviada_em
            ? `Enviada em ${porExtenso(anamnese.enviada_em.slice(0, 10))}. Mudou alguma coisa na sua saúde, lesão ou rotina? Avise o Allisson: ele atualiza a ficha a partir disso.`
            : "Você ainda não enviou sua anamnese. É ela que o Allisson usa para montar seu treino."}
        </p>
        {!anamnese?.enviada_em && (
          <BotaoLink href="/anamnese" largura="cheia" className="mt-4">
            Preencher agora
          </BotaoLink>
        )}
      </Cartao>

      <BotaoLink
        href={WHATSAPP_DO_ALLISSON}
        target="_blank"
        rel="noreferrer"
        aparencia="secundario"
        largura="cheia"
      >
        Falar com o Allisson no WhatsApp
      </BotaoLink>

      <section className="flex flex-col gap-3">
        <Rotulo>Em breve</Rotulo>
        <ul className="overflow-hidden rounded-2xl border border-linha bg-tinta-2">
          {EM_BREVE.map((nome) => (
            <li
              key={nome}
              className="border-t border-linha px-4 py-3.5 font-semibold text-nevoa first:border-t-0"
            >
              {nome}
            </li>
          ))}
        </ul>
      </section>

      <form action="/auth/sair" method="post">
        <Botao type="submit" aparencia="fantasma" largura="cheia">
          Sair da conta
        </Botao>
      </form>
    </div>
  );
}

import { headers } from "next/headers";
import { criarClienteServidor } from "@/lib/supabase/server";
import {
  diasParaVencer,
  linkDoConvite,
  situacaoDoConvite,
  type LinhaConvite,
} from "@/lib/convite";
import { BotaoLink } from "@/components/ui";
import { Formulario } from "./formulario";
import { Lista, type ConviteNaTela } from "./lista";

export const metadata = { title: "Convites · ARS Team" };

/**
 * De onde sai o link que vai no WhatsApp. Vem do cabecalho da propria
 * requisicao, entao funciona igual no `next dev`, na URL da Vercel e no
 * dominio proprio quando ele existir, sem variavel de ambiente para
 * alguem esquecer de trocar.
 */
async function origemDoSite(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protocolo = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocolo}://${host}`;
}

export default async function Convites() {
  const supabase = await criarClienteServidor();
  const origem = await origemDoSite();

  const { data } = await supabase
    .from("convite")
    .select(
      "id, token, nome, email, whatsapp, tipo, mensalidade, acesso_ate, criado_em, expira_em, usado_em, cancelado_em",
    )
    .order("criado_em", { ascending: false });

  const linhas = (data ?? []) as LinhaConvite[];
  const agora = new Date();

  const naTela: ConviteNaTela[] = linhas.map((c) => ({
    id: c.id,
    nome: c.nome,
    email: c.email,
    whatsapp: c.whatsapp,
    tipo: c.tipo,
    mensalidade: c.mensalidade,
    acesso_ate: c.acesso_ate,
    criado_em: c.criado_em,
    usado_em: c.usado_em,
    situacao: situacaoDoConvite(c, agora),
    diasParaVencer: diasParaVencer(c, agora),
    link: linkDoConvite(origem, c.token),
  }));

  const esperando = naTela.filter((c) => c.situacao === "pendente");
  const vencidos = naTela.filter((c) => c.situacao === "expirado");
  const entraram = naTela.filter((c) => c.situacao === "usado");

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <h1 className="font-display text-3xl uppercase leading-none tracking-wide">Convites</h1>
          <p className="mt-2.5 max-w-xl text-[15px] leading-relaxed text-nevoa">
            {naTela.length === 0
              ? "Cadastre o aluno aqui e mande o link pelo WhatsApp. Ele escolhe a senha e a conta já nasce com o plano e o vencimento certos."
              : `${esperando.length} ${esperando.length === 1 ? "esperando o aluno" : "esperando os alunos"} · ${entraram.length} ${entraram.length === 1 ? "já entrou" : "já entraram"}${vencidos.length ? ` · ${vencidos.length} com link vencido` : ""}`}
          </p>
        </div>
        <BotaoLink href="/painel/alunos" aparencia="secundario" className="ml-auto">
          Ver alunos
        </BotaoLink>
      </div>

      <div className="grid gap-7 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start">
        <Formulario origem={origem} />
        <Lista esperando={esperando} vencidos={vencidos} entraram={entraram} />
      </div>
    </div>
  );
}

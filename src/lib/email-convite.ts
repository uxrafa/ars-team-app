/**
 * O e-mail de convite do aluno.
 *
 * Nao usa o template da Supabase de proposito. O template dela so sai por
 * `auth.admin.inviteUserByEmail`, que exige a service role key e cria o
 * usuario direto em `auth.users`, sem passar pela tabela `convite` — e o
 * gatilho da migracao 0010 recusa cadastro sem convite. Aqui o token e nosso,
 * entao o e-mail tambem e.
 *
 * Funcao pura, sem import de execucao, igual ao `convite.ts`: da para conferir
 * o texto e o link no teste, sem rede e sem Supabase.
 */

const VERMELHO = "#db2b22";
const PRETO = "#000000";
const FUNDO = "#f2f2f3";
const NEVOA = "#a9a5a2";
const NEVOA_FRACA = "#807b78";
const LINHA = "#2a2a2e";

export type ConviteParaEnviar = {
  nome: string;
  link: string;
  tipo: "consultoria" | "planilha";
  /** Quantos dias o link ainda vale. */
  diasDeValidade: number;
};

function primeiro(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

/** Cliente de e-mail mostra HTML sem pedir licenca. Escapar e obrigatorio. */
function escapar(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function assuntoDoConvite(nome: string): string {
  return `${primeiro(nome)}, seu acesso à ARS Team está pronto`;
}

/**
 * O que o aluno le na previa da notificacao, antes de abrir.
 *
 * Nao repete o assunto: quem ja leu o assunto perde a linha inteira se ela
 * disser a mesma coisa.
 */
export function previaDoConvite(c: ConviteParaEnviar): string {
  return `Escolha sua senha e o treino já fica no seu celular. O link vale ${c.diasDeValidade} dias.`;
}

/** Versao em texto puro, para quem le e-mail sem HTML e para o filtro de spam. */
export function textoDoConvite(c: ConviteParaEnviar): string {
  return [
    `Oi, ${primeiro(c.nome)}!`,
    "",
    "Aqui é o Allisson. Seu acesso ao app da ARS Team está pronto.",
    "",
    "Abra este link e escolha sua senha:",
    c.link,
    "",
    `O link vale ${c.diasDeValidade} dias e serve uma vez só.`,
    "",
    "Consultoria ARS Team · Allisson Santos",
    "CREF 205331-G/SP",
  ].join("\n");
}

/**
 * O corpo em HTML.
 *
 * Tabela e estilo em linha, pelo mesmo motivo do e-mail de recuperacao: cliente
 * de e-mail nao entende folha de estilo, e o Outlook ignora quase tudo que nao
 * seja tabela.
 */
export function corpoDoConvite(c: ConviteParaEnviar): string {
  const nome = escapar(primeiro(c.nome));
  const link = escapar(c.link);
  const oQueEle =
    c.tipo === "consultoria"
      ? "Lá você abre sua ficha, marca cada série que fez e me conta como foi o treino."
      : "Lá você abre sua planilha e marca cada série que fez.";

  return `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">
  ${escapar(previaDoConvite(c))}
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${FUNDO};margin:0;padding:24px 12px;font-family:Helvetica,Arial,sans-serif;">
  <tr>
    <td align="center">

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background-color:${PRETO};border-radius:16px;overflow:hidden;">

        <tr>
          <td align="center" style="padding:36px 32px 8px 32px;">
            <img src="https://ars-team-app.vercel.app/icone-192.png"
                 width="44" height="44" alt="ARS Team"
                 style="display:block;border:0;width:44px;height:44px;" />
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:0 32px 28px 32px;">
            <span style="font-size:15px;font-weight:bold;letter-spacing:3px;color:#ffffff;text-transform:uppercase;">
              ARS Team
            </span>
          </td>
        </tr>

        <tr>
          <td style="padding:0 32px;">
            <h1 style="margin:0 0 14px 0;font-size:24px;line-height:1.2;color:#ffffff;font-weight:bold;">
              Oi, ${nome}!
            </h1>
            <p style="margin:0 0 26px 0;font-size:16px;line-height:1.55;color:${NEVOA};">
              Aqui é o Allisson. Seu acesso ao app da ARS Team está pronto. ${escapar(oQueEle)}
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:0 32px 26px 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" bgcolor="${VERMELHO}" style="border-radius:12px;">
                  <a href="${link}"
                     style="display:inline-block;padding:15px 30px;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:12px;">
                    Escolher minha senha
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:0 32px 26px 32px;">
            <p style="margin:0;font-size:14px;line-height:1.55;color:${NEVOA};">
              O link vale ${c.diasDeValidade} dias e serve uma vez só. Se venceu antes de você abrir,
              me chama no WhatsApp que eu mando outro.
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:0 32px 32px 32px;border-top:1px solid ${LINHA};padding-top:22px;">
            <p style="margin:0 0 8px 0;font-size:13px;line-height:1.5;color:${NEVOA_FRACA};">
              Se o botão não abrir, copie este endereço e cole no navegador:
            </p>
            <p style="margin:0;font-size:12px;line-height:1.5;color:${NEVOA_FRACA};word-break:break-all;">
              ${link}
            </p>
          </td>
        </tr>
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
        <tr>
          <td align="center" style="padding:22px 24px 8px 24px;">
            <p style="margin:0;font-size:13px;line-height:1.6;color:#6b6866;">
              Consultoria ARS Team · Allisson Santos<br />
              CREF 205331-G/SP
            </p>
          </td>
        </tr>
      </table>

    </td>
  </tr>
</table>`;
}

/**
 * O carteiro. Uma funcao so, para o resto do app nao saber que existe Resend.
 *
 * DESLIGADO ENQUANTO NAO HOUVER DOMINIO PROPRIO. Sem `RESEND_API_KEY` no
 * ambiente, `enviarEmail` devolve `{ enviado: false, motivo: "desligado" }` e
 * nao chama rede nenhuma. E de proposito: o remetente de teste da Resend
 * (`onboarding@resend.dev`) so entrega para o dono da conta e responde 403
 * para qualquer outro destinatario, entao ligar isso antes do
 * `arsteam.com.br` verificado so geraria erro silencioso.
 *
 * Para ligar, depois do dominio verificado na Resend:
 *   RESEND_API_KEY=re_...                        (Vercel, nunca no repositorio)
 *   EMAIL_REMETENTE=ARS Team <contato@arsteam.com.br>
 *   EMAIL_RESPOSTA=arsteamgym@gmail.com
 *
 * O EMAIL_RESPOSTA existe porque comprar o dominio nao cria caixa de entrada:
 * `contato@arsteam.com.br` sabe mandar e nao sabe receber. Sem `Reply-To`, o
 * aluno que apertasse "responder" escreveria para o vazio. Com ele, a resposta
 * cai no Gmail que o Allisson ja le todo dia.
 *
 * A chave da Resend so manda e-mail. Nao e a service role key da Supabase e
 * nao toca no banco.
 */

const RESEND = "https://api.resend.com/emails";

export type ResultadoDoEnvio =
  | { enviado: true }
  | { enviado: false; motivo: "desligado" | "recusado" | "sem rede" };

export type EmailParaEnviar = {
  para: string;
  assunto: string;
  html: string;
  texto: string;
};

/**
 * Manda e nunca explode.
 *
 * Quem chama esta funcao esta no meio de outra coisa que ja deu certo (o
 * convite ja esta gravado). Falha de e-mail nao pode desfazer isso nem virar
 * erro na tela: o link continua na tela, para copiar e mandar no WhatsApp.
 */
export async function enviarEmail(email: EmailParaEnviar): Promise<ResultadoDoEnvio> {
  const chave = process.env.RESEND_API_KEY;
  const remetente = process.env.EMAIL_REMETENTE;
  const resposta = process.env.EMAIL_RESPOSTA;
  if (!chave || !remetente) return { enviado: false, motivo: "desligado" };

  try {
    const r = await fetch(RESEND, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${chave}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: remetente,
        to: [email.para],
        subject: email.assunto,
        html: email.html,
        text: email.texto,
        ...(resposta ? { reply_to: resposta } : {}),
      }),
    });

    if (!r.ok) {
      // O corpo da Resend diz o motivo (dominio nao verificado, destinatario
      // fora da conta, chave errada). Vai para o log da Vercel, nao para a tela.
      console.error("enviarEmail:", r.status, await r.text());
      return { enviado: false, motivo: "recusado" };
    }
    return { enviado: true };
  } catch (erro) {
    console.error("enviarEmail:", erro);
    return { enviado: false, motivo: "sem rede" };
  }
}

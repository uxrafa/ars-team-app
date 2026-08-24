# ARS Team · aplicativo

Área do aluno e painel do treinador da ARS Team. Fase 2 do projeto.
A vitrine pública continua sendo outro projeto: `ars-team-site` → https://arsteam.vercel.app

## O que já existe aqui

- Next.js 16 (App Router) com TypeScript e Tailwind 4.
- Autenticação Supabase por e-mail e senha, com sessão em cookie.
- Middleware que protege tudo que não for `/entrar` e `/auth`.
- Tabela `perfis` com Row Level Security ligada e os três tipos de perfil da Fase 2.
- Gatilho que cria o perfil automaticamente quando alguém se cadastra.
- Tela `/app` de diagnóstico, que prova que o encanamento inteiro funciona. Ela é temporária.

## Ambientes

| Onde | O quê |
|---|---|
| Supabase | projeto `ars-team-app`, ref `orpgpvtuxnmkxykfdzrk`, região `sa-east-1` (São Paulo), plano gratuito |
| Vercel | projeto `ars-team-app`, time `rafael-ferrari` |
| GitHub | `uxrafa/ars-team-app` |

## Rodando na sua máquina

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abra http://localhost:3000. Sem estar logado, qualquer endereço cai em `/entrar`.

As chaves em `.env.example` são a URL pública e a chave publicável do projeto.
Elas podem ficar no repositório: são as mesmas que vão para o navegador, e quem
protege os dados é a Row Level Security, não o segredo da chave. A chave
`service_role` é que nunca pode entrar aqui.

## Subindo pela primeira vez

Estes dois passos precisam ser feitos por você, porque dependem da sua conta:

**1. Criar o repositório no GitHub**

```bash
git init
git add .
git commit -m "Infra da Fase 2: Next.js, Supabase e login"
git branch -M main
git remote add origin https://github.com/uxrafa/ars-team-app.git
git push -u origin main
```

Crie o repositório vazio antes em https://github.com/new, com o nome
`ars-team-app` e sem README, sem .gitignore e sem licença.

**2. Importar na Vercel**

Em https://vercel.com/new, escolha o repositório `ars-team-app`.
A Vercel detecta Next.js sozinha. Antes de clicar em Deploy, abra
**Environment Variables** e cole as duas linhas do `.env.example`:

```
NEXT_PUBLIC_SUPABASE_URL=https://orpgpvtuxnmkxykfdzrk.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_1WNcCYrw0l1bpNpG-4Or5w_yyXhj0xu
```

A partir daí, todo push na `main` republica sozinho, igual à vitrine.

**3. Apontar a Supabase para o endereço do app**

No painel da Supabase, em **Authentication → URL Configuration**, coloque o
endereço da Vercel em *Site URL* e em *Redirect URLs*. Sem isso, o link de
confirmação de e-mail volta para `localhost`.

## Confirmação de e-mail

Por padrão a Supabase exige confirmar o e-mail antes do primeiro login, e o
servidor de e-mail incluso tem limite baixo de envio. Para testar rápido,
desligue em **Authentication → Sign In / Providers → Email → Confirm email**.
Para valer, o certo é ligar um serviço de e-mail próprio antes de abrir para os alunos.

## Criando o primeiro admin

Todo cadastro nasce como `consultoria`. Para promover o Allisson, rode no SQL
Editor da Supabase depois que ele criar a conta:

```sql
update public.perfis set tipo = 'admin' where email = 'email-do-allisson@exemplo.com';
```

## Banco de dados

O histórico fica em `supabase/migrations/`, na ordem em que foi aplicado.
Toda mudança de estrutura daqui para frente entra como um arquivo novo e numerado,
para o banco poder ser reconstruído do zero.

Regras que valem para sempre neste projeto:

- Toda tabela nasce com `alter table ... enable row level security`. Sem exceção.
- Funções auxiliares e de gatilho vivem no schema `privado`, nunca em `public`.
  O `public` é exposto como API REST, e função `security definer` exposta lá vira
  endpoint aberto.
- Fotos de alunos vão para bucket privado, servidas por link temporário.

## Fontes

Títulos usam a **Tanker** de verdade, a fonte oficial da marca. O arquivo fica
em `src/fonts/Tanker-Regular.woff2` e é carregado com `next/font/local` no
`src/app/layout.tsx`. É o mesmo desenho usado no site `arsteam.vercel.app`,
convertido de `.otf` para `.woff2` (metade do peso, mesma cobertura de acentos).

O corpo usa **Hanken Grotesk**, que é o fallback já decidido para a Asterisk
Sans (Typekit), então não precisa de licença nova.

## Logo

`src/components/logo.tsx` tem o logotipo oficial em SVG (raio vermelho mais a
tipografia da marca). O raio fica travado em `#f23026` e as letras seguem
`currentColor`, então o mesmo componente serve em fundo escuro e claro. Use
sempre ele no lugar de escrever "ARS Team" como texto.

`src/components/raio.tsx` tem só o raio, para ícone e favicon. Os PNGs do PWA
em `public/` e `src/app/` são gerados a partir dele.

## Estrutura

```
src/
  app/
    entrar/          login e cadastro
    app/             area logada (hoje so o diagnostico)
    auth/sair/       encerra a sessao
    layout.tsx       fontes e metadados do PWA
  lib/supabase/      clientes de navegador, servidor e middleware
  components/        pecas visuais compartilhadas
  middleware.ts      protecao de rotas
supabase/migrations/ historico do banco
```

# Migracoes

O historico do banco vive aqui. Toda mudanca de estrutura entra como um arquivo
novo e numerado, para o banco poder ser reconstruido do zero.

## Historico

| Arquivo | O que faz |
| --- | --- |
| `0001_perfis_base_com_rls.sql` | Tabela `perfis`, enums de tipo e status, RLS e gatilhos. |
| `0002_mover_funcoes_para_schema_privado.sql` | Tira as funcoes auxiliares do schema `public`. |
| `0003_dominio_treino.sql` | Biblioteca de exercicios e a ficha: `protocolo` > `bloco_treino` > `item_exercicio`. |
| `0004_anamnese.sql` | Ficha inicial do aluno em 3 etapas, com triagem de saude e consentimento LGPD. |
| `0005_execucao_e_evolucao.sql` | `sessao_treino` (que e o check-in), `serie_registrada`, `medida_corporal`, `foto_evolucao`. |
| `0006_storage_evolucao.sql` | Bucket privado `evolucao` e as policies de storage. |
| `0007_acesso_ate_no_perfil.sql` | `perfis.acesso_ate`, para o painel montar a fila de cobranca. |
| `0008_mensalidade_no_perfil.sql` | `perfis.mensalidade`, para o painel somar quanto esta em aberto. |
| `0009_travar_campos_sensiveis_do_perfil.sql` | **Correcao de seguranca.** Impede o aluno de mudar o proprio plano, status, vencimento ou mensalidade. |
| `0010_convite_de_aluno.sql` | Tabela `convite` e **fechamento do cadastro publico**: conta so nasce por convite do treinador. |
| `0011_biblioteca_de_exercicios.sql` | Os 121 exercicios que o Allisson mandou. E dado, nao estrutura, mas entra numerado para o banco poder ser reconstruido do zero. |
| `0012_salvar_ficha.sql` | Funcao que regrava blocos e itens de uma ficha numa transacao so, preservando os ids dos itens. |
| `0013_ultimo_checkin_e_indice.sql` | **Correcao de dado.** View `ultimo_checkin` com uma linha por aluno; antes o aluno sumido nao aparecia na fila. |
| `0014_pagamento.sql` | Tabela `pagamento`, uma linha por dinheiro recebido. O `acesso_ate` vira consequencia do pagamento, por gatilho. |

## Como o modelo se encaixa

```
perfis (aluno)
  |
  +-- anamnese          1:1   respondida pelo aluno, lida pelo Allisson
  |
  +-- protocolo         1:N   a ficha, com vigencia e status
  |     +-- bloco_treino      Treino A, B, C
  |           +-- item_exercicio  --> exercicio (catalogo global)
  |
  +-- sessao_treino     1:N   o treino do dia = o check-in
  |     +-- serie_registrada  carga e reps de cada serie
  |
  +-- medida_corporal   1:N   alimenta o grafico da Evolucao
  +-- foto_evolucao     1:N   ponteiro para o arquivo no bucket privado
  |
  +-- pagamento         1:N   dinheiro recebido; empurra perfis.acesso_ate
```

## Decisoes que valem lembrar

**Rascunho e invisivel.** Um `protocolo` com status `rascunho` nao aparece para o
aluno. O Allisson monta em paz e so publica quando marca como `ativo`. Isso esta
na policy, nao na tela. Indice parcial garante uma ficha ativa por aluno.

**Historico nao quebra quando a ficha muda.** `serie_registrada` aponta para o
`exercicio` (forte, `on delete restrict`) e para o `item_exercicio` (mole,
`on delete set null`). Tirar um exercicio da ficha nao apaga o que ja foi
treinado, e a progressao de carga continua calculavel.

**Exercicio nao se apaga, se desativa.** `item_exercicio.exercicio_id` e
`on delete restrict`. Para tirar de circulacao usa-se `exercicio.ativo = false`.

**Ordem e deferrable.** `bloco_ordem_unica` e `item_ordem_unica` sao constraints
`deferrable initially deferred`, senao reordenar por arrastar quebraria a unicidade
no meio da transacao.

**LGPD no banco, nao so na tela.** A constraint `anamnese_consentimento_obrigatorio`
impede gravar uma anamnese como `enviada` sem `consentimento_saude_em` preenchido.
Nenhuma tela, nem chamada direta na API, consegue burlar. O admin le a anamnese mas
nao tem policy de escrita nela: dado de saude e do aluno.

**Foto de evolucao e dado de saude.** Bucket `evolucao` privado, caminho
`{aluno_id}/{aaaa-mm-dd}/{angulo}.jpg`, e a policy manda na primeira pasta do
caminho. Servir sempre por link temporario, nunca URL publica.

**Video de exercicio e URL generica.** `exercicio.video_url` e so texto. Hoje
aponta para YouTube nao listado. Trocar de provedor nao pede migration.

## A falha que a 0009 corrigiu

RLS decide **quais linhas**, nao **quais colunas**. A policy de UPDATE em `perfis`
deixa o dono atualizar a propria linha, o que e certo para nome e whatsapp, mas
valia para a linha inteira. Na pratica o aluno podia rodar

```sql
update perfis set tipo = 'admin' where id = <o proprio id>;
```

direto na API e virar treinador. Confirmado com teste em 25/08/2026.

Grant por coluna nao resolve, porque aluno e admin sao os dois o mesmo papel do
Postgres (`authenticated`). A saida foi um gatilho `before update` que compara
`old` e `new` e recusa se um nao-admin mexeu em `tipo`, `status`, `acesso_ate`,
`mensalidade`, `email`, `id` ou `criado_em`.

**Regra que fica:** quando a policy diz "o dono pode editar a propria linha",
perguntar sempre quais colunas dessa linha o dono **nao** pode editar. Se houver
alguma, precisa de gatilho.

## A falha que a 0010 fechou

O cadastro estava fechado **so na tela**. O server action de cadastro conferia se
quem pedia era admin, mas `/auth/v1/signup` e endpoint publico do GoTrue: qualquer
pessoa com a chave publicavel (que fica no navegador, por definicao) podia criar
conta chamando a API direto, e o gatilho `ao_criar_usuario` criava o perfil sem
perguntar nada. Nao vazava dado de ninguem, porque a RLS segura, mas enchia o
painel do Allisson de gente estranha.

Agora o gatilho so cria perfil se o metadata do cadastro trouxer um token de
convite valido, nao usado, nao cancelado, dentro da validade **e do mesmo e-mail**
do convite. Sem isso, o insert em `auth.users` e recusado pelo banco.

O convite tambem carrega o cadastro que o Allisson preencheu (nome, whatsapp,
plano, mensalidade e `acesso_ate`), e e o gatilho que copia isso para `perfis`.
A tela nao manda nenhum desses campos: se mandasse, daria para forjar na chamada.

**Regra que fica:** trava de cadastro em server action nao e trava. Enquanto o
endpoint do GoTrue estiver de pe, quem decide quem entra e o banco.

**Escape hatch:** para criar conta na mao (a do proprio Allisson, ou recuperar
alguem), criar antes a linha em `convite` e usar o token no metadata. A excecao
do "banco vazio" no gatilho existe so para o primeiro admin de um banco novo.

**Excecao proposital de schema:** `public.convite_por_token()` e `SECURITY
DEFINER` e mora em `public`, ao contrario da regra da 0002. E de proposito: o
aluno que abre o link ainda nao tem conta, chega como `anon`, e precisa chamar a
funcao por `/rest/v1/rpc`. Ela devolve so nome, e-mail e plano, e so para quem
apresenta o token inteiro (24 bytes aleatorios). Na 0002 o erro era expor; aqui
expor e o objetivo, e quem protege e o segredo do token.

Por causa disso o advisor de seguranca aponta dois WARN novos, os dois sobre
`convite_por_token` ser executavel por `anon` e por `authenticated`. **Sao
esperados. Nao revogar o EXECUTE:** revogar quebra a tela de convite, que e a
unica porta de entrada de aluno novo.

## Teste de RLS

Em 24/08/2026 as sete migracoes foram validadas com as duas contas reais, com
21 verificacoes, todas passando. O que foi provado:

- aluno **nao** enxerga protocolo, bloco nem item em rascunho;
- aluno enxerga tudo isso assim que o admin marca a ficha como ativa;
- aluno **nao** consegue criar exercicio no catalogo nem criar a propria ficha;
- aluno **nao** consegue abrir sessao de treino no nome de outra pessoa;
- anamnese sem consentimento e recusada pelo banco;
- anamnese incompleta e recusada pelo banco;
- anamnese enviada gera sozinha o primeiro ponto do grafico de evolucao;
- admin le anamnese e series de todo mundo, mas **nao** edita anamnese alheia.

Em 25/08/2026 a `0010` foi validada com mais 12 verificacoes, todas passando:

- admin cria convite; aluno **nao** le nem cria convite;
- `anon` le o convite pelo token e **nao** le a tabela;
- token errado devolve zero linhas;
- cadastro **sem** convite e recusado pelo banco;
- convite valido com e-mail trocado e recusado pelo banco;
- convite certo cria o perfil ja com plano, whatsapp, mensalidade e vencimento;
- o convite vira `usado` e aponta para o aluno;
- o mesmo token **nao** serve duas vezes.

Os dados de teste foram apagados depois. As tabelas estao vazias de proposito:
a biblioteca de exercicios espera a lista do Allisson.

## A biblioteca de exercicios (0011)

O Allisson mandou a lista em 27/08/2026, pelo WhatsApp, com 123 linhas. Foram
para o banco **121**, depois de tirar `demada` (palavra incompleta) e
`remada curvada sulinads` (typo de "supinada", que ja estava na lista).
`Rosca direta banco 45` saiu de ombro para biceps. `hit` virou HIIT.

Distribuicao: pernas 36, costas 24, peito 19, triceps 12, ombro 11, biceps 7,
abdomen 7, cardio 5.

`equipamento` foi preenchido so onde o nome do exercicio diz qual e (halter,
barra, polia, maquina, Smith): 88 de 121. Os outros 33 o Allisson completa pela
tela da biblioteca, e ficar nulo nao atrapalha nada.

`video_url` esta nulo em todos, de proposito. A decisao (27/08/2026) e anexar
depois, como link de YouTube nao listado, quando ele terminar de gravar e subir
tudo. O indice parcial `exercicio_sem_video_idx` existe justamente para a tela
mostrar rapido o que ainda falta.

`on conflict do nothing` deixa reaplicar a migracao sem estrago, porque o
indice unico e em `lower(btrim(nome))`.

## Por que `salvar_ficha` existe (0012)

O editor manda a ficha inteira de uma vez. Fazer isso pelo cliente seria uma
sequencia de delete, update e insert **sem transacao**, e um erro no meio
deixaria a ficha pela metade. Numa ficha ATIVA, isso e o aluno abrir o app e
nao achar o treino.

Duas decisoes dentro dela:

**`security invoker`, nao `definer`.** Quem chama e o Allisson logado, e as
policies da 0003 ja dizem que so admin escreve em protocolo, bloco e item. Com
invoker a RLS continua valendo dentro da funcao, entao nao precisa de checagem
de admin no corpo e ela nao entra na lista de `security definer` exposto do
advisor. **E o contrario da `convite_por_token`:** la o chamador nao tem conta
e precisa de definer; aqui o chamador e admin e invoker basta. A pergunta que
decide sempre e "quem precisa chamar isso".

**Os ids dos itens sao preservados.** `serie_registrada.item_id` aponta para o
item com `on delete set null`. Apagar tudo e recriar a cada gravacao cortaria o
vinculo entre o que o aluno treinou e a linha da ficha toda vez que o Allisson
mexesse numa virgula. Por isso a funcao faz upsert por id e so apaga o que
sumiu da tela.

E por isso tambem a action **devolve a ficha relida**: os itens que acabaram de
nascer precisam voltar para a tela com id, senao a gravacao seguinte criaria
tudo de novo. Foi um bug real, pego antes de subir.

Testado em 27/08/2026 com 8 verificacoes: cria blocos e itens, remove bloco que
saiu da tela, preserva id de item que ficou, atualiza series, reordena sem
quebrar o unique deferrable, e **recusa aluno** que tente chamar a funcao.

## Por que a tabela `pagamento` existe (0014)

Ate a 0013 o banco sabia **ate quando** o aluno estava pago (`perfis.acesso_ate`)
e **nao sabia** quanto tinha entrado nem quando. O painel so conseguia somar as
mensalidades de quem estava em dia -- a carteira ativa -- e um aluno que pagou um
trimestre em marco entrava nesse numero em abril, maio e junho sem ter posto um
real nesses meses. Chamar aquilo de faturamento faria o Allisson contar errado.

Uma linha aqui = um dinheiro que entrou.

**Duas datas que nao sao a mesma coisa.** `recebido_em` e o dia em que o dinheiro
caiu, e e por ele que o faturamento do mes soma (regime de caixa, que e o que o
Allisson enxerga na conta). `competencia_de`/`competencia_ate` sao a janela de
acesso que aquele pagamento comprou. Um pix de trimestre entra inteiro em
setembro e cobre ate dezembro.

**O `acesso_ate` deixou de ser digitacao.** O campo saiu do cartao de cobranca na
tela do aluno. Quem o move e o gatilho `ao_avancar_acesso`, no banco. A regra e a
da **emenda**: se o aluno ainda esta em dia, o periodo novo comeca no vencimento
atual, entao quem paga adiantado nao perde dia; se ja venceu, comeca na data do
pagamento, e o buraco nao e cobrado nem devolvido.

**Por que gatilho e nao server action.** A mesma regra tem que valer para o
webhook do gateway, que insere na tabela sem passar por tela nenhuma. Trava em
server action nao e trava, e regra em server action nao e regra.

**O que o webhook vai encontrar pronto**, sem migracao nova: `origem` (`manual` |
`gateway`), `gateway` em texto livre para trocar de provedor sem DDL, `gateway_id`
com indice unico parcial -- que e a chave de idempotencia, entao reentrega do
mesmo evento e recusada pelo banco --, `gateway_evento jsonb` com o corpo cru,
`boleto` ja no enum de forma, e `registrado_por` anulavel, porque webhook nao e
pessoa. O webhook usa a chave `service_role`, que passa por cima da RLS; por isso
ela nunca entra neste repositorio, que e publico.

**Pagamento nao se corrige, se estorna.** O gatilho `ao_corrigir_pagamento` recusa
qualquer update em valor, data, aluno ou periodo, e nao existe policy de DELETE.
Marcar `estornado_em` (com motivo obrigatorio, por constraint) tira a linha das
contas e devolve o vencimento para `acesso_anterior` -- **so se** nenhum pagamento
mais novo ja tiver empurrado o `acesso_ate` para frente, senao o estorno tiraria
acesso pago de verdade. A linha estornada continua na lista: sumir com ela
esconderia que o erro aconteceu.

**Estorno de gateway nao revoga acesso sozinho.** A coluna existe e o webhook pode
escrever nela, mas cortar o acesso de um aluno por causa de um chargeback e
decisao de negocio, e nao de banco. Fica para quando houver gateway.

**So admin le, inclusive o proprio pagamento do aluno.** Foi escolha: `observacao`
e `gateway_evento` sao anotacao interna. No dia em que a tela do aluno pedir
historico, a policy ganha `aluno_id = auth.uid()` e as colunas internas saem por
uma view.

Validada em 05/09/2026 com 10 verificacoes em transacao abortada, no banco de
verdade: emenda no vencimento, buraco nao cobrado, trimestre somando a partir da
base certa, estorno devolvendo o vencimento nos dois niveis, recusa de reescrita
de valor, recusa de desestorno, recusa de data futura, recusa de evento de
gateway repetido e recusa de `origem = gateway` sem `gateway_id`. O banco ficou
com zero pagamentos, que e como estava.

## Nota sobre o banco atual

O projeto na Supabase registra uma migracao a mais do que existe aqui. A
`fechar_execucao_das_funcoes` (24/08/2026) foi um caminho errado: ela revogava o
EXECUTE das funcoes `SECURITY DEFINER` para calar o alerta do linter, e isso
**quebrou a RLS**, porque a politica precisa chamar `eh_admin()` a cada consulta.
O erro que aparece nesse caso e `permission denied for function eh_admin`.

A `0002` desfaz aquilo e resolve de verdade, movendo as funcoes para o schema
`privado`, que nao e exposto pela API REST. Por isso a errada nao esta guardada
aqui: aplicar a sequencia numerada num banco novo chega no mesmo estado final,
sem passar pelo erro.

**Regra que fica:** funcao auxiliar ou de gatilho nunca mora em `public`.

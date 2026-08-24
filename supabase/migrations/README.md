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

Os dados de teste foram apagados depois. As tabelas estao vazias de proposito:
a biblioteca de exercicios espera a lista do Allisson.

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

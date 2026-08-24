# Migracoes

O historico do banco vive aqui. Toda mudanca de estrutura entra como um arquivo
novo e numerado, para o banco poder ser reconstruido do zero.

## Historico

- `0001_perfis_base_com_rls.sql` — tabela `perfis`, enums, RLS e gatilhos.
- `0002_mover_funcoes_para_schema_privado.sql` — tira as funcoes do schema `public`.

## Nota sobre o banco atual

O projeto na Supabase registra **tres** migracoes, nao duas. A do meio
(`fechar_execucao_das_funcoes`, de 24/08/2026) foi um caminho errado: ela revogava
o EXECUTE das funcoes `SECURITY DEFINER` para calar o alerta do linter, e isso
**quebrou a RLS**, porque a politica precisa chamar `eh_admin()` a cada consulta.
O erro que aparece nesse caso e `permission denied for function eh_admin`.

A `0002` desfaz aquilo e resolve de verdade, movendo as funcoes para o schema
`privado`, que nao e exposto pela API REST. Por isso ela nao esta guardada aqui:
aplicar `0001` e `0002` num banco novo chega no mesmo estado final, sem passar
pelo erro.

**Regra que fica:** funcao auxiliar ou de gatilho nunca mora em `public`.

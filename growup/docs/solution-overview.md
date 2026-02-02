# GrowUp - Documentacao da Solucao

## Objetivo
GrowUp e um sistema de gamificacao para rotinas, com tarefas, recompensas e ciclos. O objetivo e ajudar o usuario a manter consistencia ao longo do tempo, oferecendo pontos (XP) e recompensas como incentivo.

## Conceitos Principais
- **Perfil**: contexto ativo do usuario (avatar, nome, preferencia de ciclo).
- **Ciclo**: periodo usado para medir progresso e limitar recompensas (semanal, quinzenal, mensal, anual).
- **Tarefas**: atividades que geram XP quando concluidas.
- **Recompensas**: itens que podem ser resgatados com XP, com limite por ciclo.
- **Resgate (Redeemed)**: recompensa comprada, ainda nao consumida.
- **Consumo (Used)**: recompensa usada; status definitivo.

## Fluxo Geral da Aplicacao
1. O usuario seleciona um perfil ativo.
2. Tarefas concluidas geram XP.
3. O saldo de XP fica disponivel para resgatar recompensas.
4. Recompensas sao controladas por limite por ciclo.
5. Recompensas resgatadas ficam em **Redeemed** ate serem consumidas ou devolvidas.

## Logica de Tarefas
- Cada tarefa tem uma pontuacao.
- Ao concluir, e criada uma **Completion** vinculada a uma data.
- O total de XP acumulado depende das completions do ciclo/periodo exibido.

## Logica de Recompensas (Loja)
A sessao Rewards funciona como uma loja com estoque por ciclo:
- **Available**: produtos disponiveis (estoque restante > 0).
- **Redeemed**: produtos comprados e ainda nao consumidos.
- **Used**: produtos consumidos (nao voltam ao estoque).

### Regras de Resgate
- Cada item possui **limit per cycle**.
- Ao resgatar:
  - gera uma linha individual em **Redeemed**.
  - reduz 1 unidade do estoque no ciclo.
  - se atingir 0, o item fica indisponivel em **Available**.

### Regras de Uso e Devolucao
- **Consume**:
  - marca o item como usado.
  - move para **Used**.
  - definitivo, nao pode ser removido nem devolvido.
- **Return**:
  - remove de **Redeemed**.
  - devolve 1 unidade ao estoque do ciclo.
  - somente permitido se ainda nao consumido.

## Persistencia e Sincronizacao
- Dados principais sao salvos localmente (IndexedDB via Dexie) e sincronizados com o Supabase.
- Entidades sincronizadas: profiles, tasks, rewards, completions, settings, redemptions.
- **Used (rewardUses)** e local apenas (nao sincroniza). Se precisar sincronizar, e necessario criar tabela/coluna no backend.

## Interfaces Principais
- **Home**: resumo do ciclo, tarefas e recompensas.
- **Dialogs**: criacao/edicao de tarefas e recompensas, configuracoes e autenticacao.
- **DevUI**: vitrine do Design System.

## Como Usar
1. Crie ou selecione um perfil.
2. Cadastre tarefas e recompensas.
3. Conclua tarefas para ganhar XP.
4. Resgate recompensas na aba Available.
5. Consuma ou devolva recompensas na aba Redeemed.

## Regras Importantes
- Limite por ciclo e estritamente respeitado.
- Cada resgate gera uma linha individual.
- Itens consumidos sao definitivos.
- Retorno so e permitido antes do consumo.

## Observacoes de Design System
- Componentes seguem o tema visual principal (azul/creme/dourado).
- Campos usam estilo de Material com alturas compactas e fundo branco.
- Tooltips orientam acoes em Rewards.

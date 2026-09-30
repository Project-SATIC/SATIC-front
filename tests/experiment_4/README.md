# SATIC — correção e estabilização

Frontend em HTML, CSS e JavaScript, com dados de demonstração na sessão do navegador.

## Executar

```powershell
node tools/serve.cjs
```

Abra http://127.0.0.1:8040/.

## Testar regras de alocação

```powershell
node --test tests/data.test.cjs
```

Os quatro testes verificam geração com as três prioridades, preservação das alocações válidas e dos encontros semanais, indisponibilidade docente, manutenção, ambiente exigido e proposta parcial quando faltam espaços.

## Diagnóstico e correções

- HTML e CSS usavam nomes diferentes para sidebar, workspace, cabeçalhos, fila, grade, filtros e painéis. Isso deixava elementos sem layout e SVGs com dimensões intrínsecas. Os seletores foram reconciliados e os ícones compartilham uma classe com tamanho explícito.
- A tabela de professores mostrava SIAPE, regime e quantidade de turmas sob cabeçalhos de outras propriedades. Os cabeçalhos correspondem agora aos dados reais, sem criar um campo de área.
- Filtros de espaços/docentes continham opções antigas e o status regular usava um valor diferente do controlador. Os filtros seguem o modelo atual, incluindo novos espaços.
- Wrappers sem layout deixavam drawers abaixo das tabelas. Todos os drawers usam o mesmo componente lateral; professores reservam espaço para a tabela. Fechamento, Escape e seleção continuam disponíveis.
- A grade usa CSS Grid por linha, com seis colunas compartilhadas: horário e cinco dias. Eventos ficam dentro das células, texto quebra naturalmente e as ocorrências semanais selecionam a mesma entidade.
- A fila tem 224px; a instrução contextual aparece apenas durante alocação. Clique, teclado e arrastar/soltar mantêm o número de encontros. A origem do drag não é mais substituída durante o gesto.
- A disponibilidade usa estados curtos, tooltips e detalhe selecionável para horários ocupados. A carga considera o número de encontros, incluindo turmas com um único encontro.
- A validação considera indisponibilidade docente, manutenção, capacidade, ambiente e encontros. Alternativas de resolução são verificadas antes de serem oferecidas.
- A geração anterior aplicava posições fixas e mostrava contadores inventados. A geração atual procura uma proposta local com limite de 10.000 tentativas, mantém alocações válidas e informa resultados completos ou parciais. As prioridades são heurísticas, sem garantia de ótimo global.
- A publicação é bloqueada enquanto houver conflitos ou pendências e perde o estado de publicada após alteração dos dados.
- Percentuais de ocupação usam os 30 horários semanais e contam cada interseção apenas uma vez.
- Estados vazios, foco, atalhos, navegação e proporções são compartilhados. Configurações mostra informações da sessão e permite restaurar a demonstração.
- CSV produz um arquivo real com as 18 turmas. Os comandos PDF/XLSX continuam presentes e informam explicitamente que a exportação ainda não foi implementada.

## Verificação no navegador

Inspeção inicial e testes posteriores realizados no Edge, por fases, incluindo:

- Todas as telas em 1366×768 e 1440×900, sem overflow horizontal inesperado ou rolagem da sidebar.
- Cinco dias e seis slots alinhados; nenhum evento fora da célula; acesso aos últimos slots pela rolagem.
- Filtros individuais e combinados, busca e estados vazios.
- Seleção, edição e fechamento dos drawers de turmas, professores, espaços e grade.
- Alteração de disponibilidade, inspeção de horários ocupados e atualização dos conflitos.
- Alocação por clique e drag, cancelamento por Escape e seleção conjunta dos dois encontros.
- Criação de espaço, atualização do contador e inclusão nos filtros.
- Alternativas de resolução, geração, aplicação, bloqueio de publicação com pendências e invalidação após edição.
- Busca por comandos, navegação por teclado e exportação CSV. O arquivo baixado foi inspecionado: 18 registros.
- Console e sintaxe dos três arquivos JavaScript. Nenhum erro de execução da aplicação foi observado. A aba de testes acumulou mensagens de canal assíncrono do navegador, sem referência aos arquivos da aplicação; uma nova aba iniciou com console vazio.

Medições e screenshots estão em `artifacts/`, incluindo `layout-audit.json`.

## Limites existentes

Não há backend ou persistência: recarregar restaura os dados de demonstração; publicação é um estado local. PDF e XLSX não possuem implementação nesta versão. A geração local respeita as regras presentes no modelo e não representa um motor acadêmico completo. Os conflitos e as três turmas pendentes iniciais são dados de demonstração que podem ser resolvidos pela interface.

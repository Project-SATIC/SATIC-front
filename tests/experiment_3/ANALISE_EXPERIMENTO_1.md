# Análise do experimento 1

## Síntese

O primeiro experimento demonstra boa compreensão do domínio do SATIC e das regras de alocação, mas concentra seis fluxos operacionais complexos em uma única página. O resultado é uma interface rica para demonstração, porém difícil de utilizar com rapidez pela secretaria na rotina de fechamento de uma grade.

## Conexão com o SATIC

Há uma conexão forte com a proposta do projeto. A interface torna visíveis capacidade, tipo de ambiente, ocupação, pendências, conflitos de professor e risco de efeito dominó. Isso está alinhado à necessidade de transformar a oferta acadêmica já consolidada em uma proposta física de salas e horários segura.

O problema é de prioridade, não de conteúdo: a interface apresenta cadastro de espaços, turmas, docentes, matriz, relatórios e publicação ao mesmo tempo. Para a pessoa operadora, a prioridade inicial deveria ser inequívoca: identificar pendências e resolver uma alocação por vez.

## Sobrecarga cognitiva e fluidez

- A primeira visão reúne quatro indicadores, alertas, ocupação, situação por período, registros de movimentação, menu com seis áreas e ações concorrentes. Muitos elementos disputam atenção antes que a próxima ação fique clara.
- A matriz combina fila pendente, diagnóstico, filtros, grade grande e inspetor de detalhes. É adequada como tela avançada, mas não como ponto de partida para todas as tarefas.
- A presença frequente de alertas em vermelho, laranja, selos, ícones e textos longos aumenta a urgência visual mesmo quando apenas uma pendência precisa ser tratada.
- O conteúdo usa termos técnicos e várias fontes de estado em paralelo. Em uma atividade administrativa repetitiva, o fluxo deve reduzir memória de trabalho: mostrar o caso, explicar o motivo do bloqueio e oferecer a próxima decisão segura.
- A página não possui pontos de interrupção responsivos. Painéis com larguras mínimas, matriz com largura mínima e uma estrutura de janela fixa tornam a experiência limitada em telas menores.

## Acessibilidade

- Há um foco visível global, mas grande parte da navegação e dos cartões clicáveis usa `div`, `tr` ou `td` com `onclick`. Esses elementos não recebem foco por teclado nem oferecem a semântica adequada a leitores de tela.
- O uso de `role="menubar"` não é acompanhado pela estrutura e pelos comportamentos de teclado exigidos para um menu ARIA. Links ou botões semânticos seriam mais apropriados.
- Diversos rótulos de formulário não estão associados aos respectivos campos por `for` e `id`, o que enfraquece a experiência com tecnologias assistivas.
- A animação pulsante de conflito não respeita uma preferência por redução de movimento. Alertas não devem depender apenas de cor ou animação.
- Linhas de tabela e células de disponibilidade funcionam como controles, mas não apresentam papel, nome acessível, foco ou acionamento por teclado.

## Qualidades preserváveis

- O vocabulário do domínio está bem representado: sala, laboratório, capacidade, turma, conflito e publicação.
- A matriz de horários e o detalhamento de regras são úteis como recursos de uma etapa avançada.
- Os estados visuais de sucesso, aviso, infraestrutura e conflito formam uma boa base para feedback do sistema.

## Direção adotada no experimento 3

O experimento 3 reduz o ponto de partida a um painel de situação e a uma lista de pendências prioritárias. A ação principal leva a um fluxo de alocação com turma, horário, ambientes compatíveis e verificações de segurança próximas da confirmação. A navegação usa links semânticos, há link para pular conteúdo, foco visível, tabelas com cabeçalhos e um layout que se adapta a telas menores.

## Próximas validações recomendadas

1. Validar o fluxo com Ana ou outra pessoa que realize a alocação para confirmar a ordem real das decisões.
2. Substituir os dados demonstrativos por dados importados ou fornecidos pela Oferta Acadêmica.
3. Definir quais conflitos de docentes continuam obrigatórios na validação pós-oferta e quais são apenas alertas de segurança.
4. Testar por teclado e com leitor de tela antes de transformar o protótipo em interface de produção.

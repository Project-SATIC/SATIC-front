# Experimento 3 - painel operacional do SATIC

Este experimento substitui a página de cursos do experimento 2 por um protótipo voltado à atividade real da secretaria: revisar e concluir a alocação física das turmas após a Oferta Acadêmica.

## Mudanças realizadas

- Criado um painel inicial com uma ação principal: criar uma alocação.
- Adicionado resumo de progresso e indicadores de turmas, pendências, salas e laboratórios.
- Criada uma lista de pendências que mostra a causa de cada bloqueio e oferece uma ação direta para resolvê-lo.
- Criada uma tela de nova alocação, com seleção de turma, horário, ambiente compatível e validações de segurança visíveis.
- Adicionada navegação consistente, layout responsivo, HTML semântico, foco visível e link para pular a navegação.

## Por que isso melhora a experiência

O experimento 2 utilizava conteúdo sem relação com o SATIC, apresentava diversas escolhas de mesmo peso e tinha CSS inválido. A nova versão estabelece uma hierarquia clara: primeiro entender o estado da grade, depois resolver as pendências e, por fim, confirmar uma alocação. Assim, a interface reduz a necessidade de memorizar dados, explicita o que exige atenção e mantém as verificações de capacidade, infraestrutura e conflito de docente próximas à decisão.

Os dados exibidos são demonstrativos. A confirmação ainda não grava dados, pois a integração com o backend não faz parte deste protótipo estático.

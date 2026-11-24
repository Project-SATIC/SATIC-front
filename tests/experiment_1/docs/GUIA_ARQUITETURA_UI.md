# SATIC - Documentação Estrutural de Telas e Fluxos de Interface

> **Projeto:** SATIC – Sistema de Alocação de Turmas do Instituto de Computação (UFAL)  
> **Disciplina:** Programação 3 (2026.2)  
> **Equipe:** Lucas Gabriel (Tech Lead & Front-End), Victor Samyr (Back-End), Gabriel Damião (DBA)  
> **Validador:** Prof. Ranilson  
> **Público Operador:** Secretaria Acadêmica (Ana) e Coordenação do Instituto (Cordeiro)

---

## 1. Visão Geral dos Protótipos Estruturais (6 Telas)

O protótipo em HTML e CSS do **SATIC** contempla **6 telas integradas**, desenhadas em blocos lógicos com foco na visualização de variáveis de alocação e na mitigação de conflitos de grade horária (*Timetabling*):

| Nº | Tela no Protótipo | Objetivo Operacional |
| :-: | :--- | :--- |
| **1** | **Visão Geral do Semestre** (`#tela-painel`) | Painel executivo com indicadores de turmas ofertadas, taxa de ocupação dos laboratórios/salas por turno, progresso por período curricular e lista de alertas prioritários. |
| **2** | **Matriz de Alocação (Grade)** (`#tela-matriz`) | Grade bidimensional de horários (Segunda a Sexta $\times$ Slots M1-M2 a T3-T4) com fila lateral de turmas pendentes, destaque visual de choques de horário/infraestrutura e gaveta inferior de inspeção. |
| **3** | **Espaços Físicos (Salas & Labs)** (`#tela-espacos`) | Cadastro mestre-detalhe de salas e laboratórios do bloco IC, estruturado em blocos de Identificação, Capacidade Física, Equipamentos Instalados e Status Operacional. |
| **4** | **Turmas & Disciplinas** (`#tela-turmas`) | Gestão da oferta semestral de disciplinas (Ciência e Engenharia da Computação) com dimensionamento de matrículas, exigências de ambiente e painel lateral de viabilidade prévia. |
| **5** | **Professores & Disponibilidade** (`#tela-professores`) | Cadastro do corpo docente do IC com limites de carga horária, matriz interativa de janelas de disponibilidade/restrições por horário e listagem de turmas vinculadas. |
| **6** | **Central de Conflitos & Publicação** (`#tela-conflitos`) | Simulador Anti-Efeito Dominó para resolução assistida de choques críticos e central de exportação de quadros oficiais (por curso, espelho de porta de sala e agenda docente). |

---

## 2. Sistema de Validação Visual de Restrições

O SATIC classifica e sinaliza visualmente os problemas da grade em níveis claros de severidade:

1. **Restrições Críticas — Choque de Horário (`.cartao-alocacao-choque` / Vermelho):**
   - Sinaliza quando um mesmo professor ou uma mesma sala física está alocado(a) simultaneamente em duas turmas no mesmo slot de horário.
   - Bloqueia a publicação final da grade.
2. **Restrições de Infraestrutura e Lotação (`.cartao-alocacao-infra` / Laranja):**
   - Sinaliza quando o número de alunos matriculados na turma ultrapassa a capacidade física da sala atribuída, ou quando uma disciplina prática é alocada em sala teórica sem computadores.
3. **Avisos e Pendências de Oferta (`.cartao-alerta-aviso` / Amarelo):**
   - Sinaliza turmas obrigatórias aguardando alocação na fila ou restrições leves de preferência de turno.
4. **Alocação Válida (`.cartao-alocacao-valida` / Verde):**
   - Todas as regras de negócio (docente livre, capacidade compatível e infraestrutura atendida) estão cumpridas.

---

## 3. Organização de Arquivos

- [`index.html`](file:///c:/Users/VictorSilva/Documents/SATIC-UI/index.html): Protótipo navegável contendo as 6 telas do sistema.
- [`css/base-agnostica.css`](file:///c:/Users/VictorSilva/Documents/SATIC-UI/css/base-agnostica.css): Variáveis de cores, tipografia, espaçamentos e tokens de alerta.
- [`css/componentes-agnosticos.css`](file:///c:/Users/VictorSilva/Documents/SATIC-UI/css/componentes-agnosticos.css): Componentes estruturais reutilizáveis (`.barra-ferramentas`, `.painel-divisor`, `.agrupamento-campos`, `.grade-dados-matriz`, `.cartao-alerta`, `.tabela-dados`).
- [`css/telas.css`](file:///c:/Users/VictorSilva/Documents/SATIC-UI/css/telas.css): Regras de layout específicas para cada uma das 6 telas do SATIC.

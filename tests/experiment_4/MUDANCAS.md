# Experimento 4 — Síntese Arquitetural e Design Unificado do SATIC

## 1. Visão do Especialista (UX/UI & Engenharia Web)

O **Experimento 4** nasce da convergência deliberada entre os dois marcos anteriores do projeto **SATIC (Sistema de Alocação de Turmas do Instituto de Computação — UFAL)**:

- **O que herdamos do Experimento 1 (`SATIC-UI`):** A completude de domínio, a precisão das regras de negócio de *Timetabling* (choque de docente, déficit de capacidade, incompatibilidade de laboratório, efeito dominó), a matriz de horários semanal com inspetor de restrições, o simulador de remanejamento assistido e os cadastros estruturados de salas, turmas e disponibilidade docente.
- **O que herdamos do Experimento 3:** A estética SaaS moderna e limpa, o respiro visual, a hierarquia tipográfica clara (`Inter`), o shell com navegação lateral semântica (`.app-shell` + `.sidebar`), a acessibilidade (`skip-link`, `:focus-visible`, `<label for>`, `<fieldset>`, `prefers-reduced-motion`), a responsividade multi-dispositivo e o foco em guiar a decisão operacional sem sobrecarga cognitiva.

---

## 2. Solução de Arquitetura da Informação: Divulgação Progressiva (*Progressive Disclosure*)

O diagnóstico do Experimento 1 revelou que exibir simultaneamente 6 fluxos densos na mesma janela gerava competição visual; por outro lado, o Experimento 3 simplificou a ponto de omitir a grade semanal, o simulador de conflitos e os cadastros de base.

No **Experimento 4**, resolvemos esse dilema estruturando a navegação lateral em **duas camadas cognitivas claras**:

### Camada A — Fluxo de Alocação (Prioridade Diária da Secretaria e Coordenação)
1. **[`components/index.html`](components/index.html) — Visão Geral do Semestre:**
   - Ponto de partida objetivo com indicador de progresso (`83% das turmas alocadas`), 4 KPIs clicáveis, lista filtrável de **Pendências e Conflitos Prioritários** (separando *Conflitos Críticos* de *Fila sem Sala*), barras de ocupação física por turno, prontidão por período curricular (1º ao 5º período CC/EC) e linha do tempo de atividade.
2. **[`components/grade-horaria.html`](components/grade-horaria.html) — Grade Horária Semanal (Matriz de Alocação):**
   - Matriz interativa Segunda a Sexta (`M1-M2` a `T3-T4`) com filtros de perspectiva e turno, **Fila lateral de turmas sem sala** (que destaca automaticamente os melhores encaixes livres na matriz) e **Inspetor Contextual de Restrições** integrado usando botões semânticos acessíveis por teclado.
3. **[`components/nova-alocacao.html`](components/nova-alocacao.html) — Central de Alocação, Simulador Anti-Efeito Dominó & Publicação:**
   - Organizada em 3 modos objetivos por abas:
     - **Modo 1 (Alocação Assistida):** Evolução direta da tela do Experimento 3, agora com recálculo dinâmico em tempo real do painel *"Antes de confirmar"* conforme a turma, o horário e o laboratório são selecionados.
     - **Modo 2 (Simulador Anti-Efeito Dominó):** Permite selecionar qualquer um dos 3 casos ativos e comparar a **Solução Recomendada A (Impacto Dominó: ZERO)** com a **Solução Alternativa B**, aplicando o ajuste com um clique.
     - **Modo 3 (Publicação e Relatórios):** Homologação da proposta 2026.2 e exportação dos 4 quadros oficiais (Grade por Curso/SIGAA, Espelho de Porta de Sala, Agenda Individual Docente e Planilha de Ocupação).

### Camada B — Base Acadêmica e Física (Cadastros Mestre-Detalhe)
4. **[`components/espacos.html`](components/espacos.html) — Salas e Laboratórios:**
   - Inventário filtrável dos 6 espaços do bloco IC (`Lab 01`, `Lab 02`, `Salas 101 a 103`, `Anfiteatro IC`) integrado à ficha técnica em blocos lógicos (identificação, capacidade máxima, PCs operacionais, checkboxes de recursos e status de manutenção).
5. **[`components/turmas.html`](components/turmas.html) — Turmas Ofertadas:**
   - Gestão da oferta 2026.2 com dimensionamento de vagas/matrículas, exigência de laboratório e card de recomendação inteligente do motor SATIC.
6. **[`components/docentes.html`](components/docentes.html) — Docentes e Disponibilidade:**
   - Quadro docente com SIAPE, regime de carga horária e **Matriz Semanal Interativa de Disponibilidade** (`★ Preferencial`, `Disponível`, `Indisponível` e alerta de `⛔ Choque`).

---

## 3. Estrutura de Arquivos do Experimento 4

- [`components/index.html`](components/index.html): Painel operacional e diagnóstico do semestre.
- [`components/grade-horaria.html`](components/grade-horaria.html): Matriz semanal interativa, fila de espera e inspetor de regras.
- [`components/nova-alocacao.html`](components/nova-alocacao.html): Alocação assistida com checklist em tempo real, simulador anti-efeito dominó e exportação oficial.
- [`components/espacos.html`](components/espacos.html): Gestão mestre-detalhe de salas, laboratórios e infraestrutura.
- [`components/turmas.html`](components/turmas.html): Gestão mestre-detalhe de turmas ofertadas e viabilidade.
- [`components/docentes.html`](components/docentes.html): Gestão de professores e matriz interativa de disponibilidade.
- [`style/style.css`](style/style.css): Folha de estilo unificada com tokens semânticos, componentes reutilizáveis e responsividade (`1180px`, `960px`, `620px`).
- [`script/app.js`](script/app.js): Controlador front-end para filtros, inspeção de células, validação em tempo real, simulador de conflitos e navegação parametrizada via URL.

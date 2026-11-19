# Guia de Estilo — SATIC (IC · UFAL)

## 1. Conceito Visual: "Quadro Acadêmico Editorial"
O SATIC é uma ferramenta operacional interna do Instituto de Computação da UFAL, usada pela secretaria e coordenação para alocar turmas, docentes e espaços físicos.
- Visual direto, calmo e legível para longas sessões de trabalho (não é um template genérico de startup SaaS).
- Simplicidade com intenção: menos caixas, menos bordas de 1px e mais hierarquia por tipografia, alinhamento e contraste.
- Continuidade com a identidade do projeto: herda o azul-marinho/índigo institucional dos slides do SATIC sobre um fundo claro quente tipo papel (que cansa menos a vista que branco clínico + cinza frio).

---

## 2. Paleta de Cores (Tokens)
Não use a escala padrão cinza fria do Tailwind (`gray`, `slate`, `zinc`) como estética principal.

### Base e superfícies
- `--bg-canvas`: `#F6F5F1` (fundo geral da página — off-white quente tipo papel)
- `--bg-surface`: `#FFFFFF` (grade horária, tabelas, painéis principais)
- `--bg-subtle`: `#EFECE6` (cabeçalhos de tabela/grade, estados de hover leve, superfícies secundárias)
- `--border-default`: `#E2DFD7` (divisórias finas com temperatura quente)
- `--border-strong`: `#CBC6BA` (inputs, foco neutro, separadores estruturais)

### Tinta (texto)
- `--text-primary`: `#162535` (azul-petróleo profundo — textos principais e títulos)
- `--text-secondary`: `#5A6573` (metadados: professor, sala, lotação)
- `--text-muted`: `#88919C` (placeholders e rótulos auxiliares)

### Marca e ação principal
- `--brand-primary`: `#1B2A6B` (índigo institucional UFAL/IC — botão primário, item ativo, foco)
- `--brand-hover`: `#121E52`
- `--brand-tint`: `#EEF1FA` (realce sutil de item selecionado)

### Estados semânticos (ligados estritamente às Regras de Negócio)
Use cor apenas quando comunicar estado real — nunca cores decorativas aleatórias por disciplina.
- **Conflito crítico** (RN-01 choque docente, RN-02 indisponibilidade, RN-03 superlotação, RN-04 falta de lab):
  - texto `#9F1D22` | fundo `#FDF1F1` | borda `#F1C4C6`
- **Pendente / atenção** (turmas não alocadas ou ajuste manual):
  - texto `#8A5300` | fundo `#FDF6E9` | borda `#EED6A7`
- **Encaixe válido / espaço compatível** (confirmação ou hover de alocação):
  - texto `#1B5E3F` | fundo `#EDF7F1` | borda `#BFE2CE`

---

## 3. Tipografia
Use 3 papéis tipográficos claros (Google Fonts):
- **Títulos e navegação principal:** `Plus Jakarta Sans` (pesos 600 e 700, `letter-spacing: -0.02em`).
- **Interface e texto corrido:** `DM Sans` ou `Instrument Sans` (pesos 400 e 500) — evitar `Inter` padrão.
- **Dados estruturados e códigos (assinatura técnica do IC):** `IBM Plex Mono` (pesos 400 e 500, com `font-variant-numeric: tabular-nums`) aplicada **exclusivamente** a:
  - Códigos de disciplina (`COMP201`, `COMP304`)
  - Blocos e horários (`M1-M2`, `07:30-09:10`, `35T12`)
  - Capacidade e lotação (`45/50 alunos`)
  - Contadores numéricos em tabelas

---

## 4. Navegação e Layout (quebrando o molde de sidebar genérica)
- **Use uma barra superior enxuta (altura 56px) em vez de sidebar fixa de 240px.** Isso libera ~220px horizontais para a grade semanal e elimina a cara de "template Notion/Linear".
- Estrutura da Top Bar:
  - Esquerda: nome tipográfico `SATIC` em `Plus Jakarta Sans 700` (`#162535`) + subtítulo discreto `IC · UFAL` em `IBM Plex Mono` (`#5A6573`) + seletor compacto de semestre (`2026.2`).
  - Centro: navegação direta em texto limpo (sem ícone em cada item): `Grade`, `Conflitos` (badge numérica só se > 0), `Turmas`, `Professores`, `Espaços`. Item ativo marcado por tinta `#1B2A6B` e sublinhado/indicador inferior de 2px.
  - Direita: botão primário `Gerar grade` (sem ícone de engrenagem) e menu discreto para `Publicar` / `Configurações`.

---

## 5. Regras de Componentes e Interações
- **Filtros limpos (sem fila de 4 dropdowns iguais):**
  - Na tela da Grade, use: 1 campo de busca (`Buscar disciplina, docente ou sala...`) + 1 controle segmentado de turno (`Manhã | Tarde | Noite`) + 1 botão `Filtros` (popover para Curso, Período, Espaço e Docente). Só exiba chips de filtro quando houver filtros ativos.
- **Células da grade sem "cardite":**
  - A grade tem fundo `#FFFFFF` e linhas `#E2DFD7`.
  - Cada aula alocada é um bloco limpo (fundo `#FAF9F6`, borda `1px solid #E2DFD7`, `border-radius: 6px`), **sem barra colorida na borda esquerda (`border-l-2`)**.
  - Estrutura interna com contraste real:
    - Topo: código em `IBM Plex Mono` 11px (`COMP203`) + etiqueta pequena `LAB` (apenas se exigir laboratório) ou rótulo explícito de conflito (ex.: `Choque docente`, `Lotação 45/40`, `Exige lab`) em vez de uma bolinha vermelha sem legenda.
    - Meio: nome da disciplina em 13–14px semibold (`#162535`).
    - Base: `Lab 02 · Ranilson` em 12px (`#5A6573`).
- **Alocação manual sem repetição visual:**
  - O painel `Não alocadas` aparece à esquerda da grade apenas quando há pendências (e pode ser recolhido).
  - Ao selecionar uma turma não alocada, **não exiba um banner azul largo no topo nem repita o botão `Alocar · Lab 01` em todas as células**.
  - Em vez disso: destaque a turma selecionada no próprio painel lateral com um resumo compacto (`45 alunos · exige lab` + `Cancelar`), deixe as células compatíveis limpas com leve realce de borda e revele `Alocar em Lab 01` **apenas no hover** da célula sob o cursor.
  - Nas células bloqueadas, mostre o impedimento de forma curta e legível (ex.: `Indisponível: Baldoino` ou `Sem lab livre`) sem empilhar múltiplos cards cinza desbotados.

---

## 6. Proibições Explícitas (Anti-padrões de IA — NUNCA usar)
1. NÃO crie logo como quadrado preto arredondado com a letra "S" dentro.
2. NÃO use cards com faixa colorida vertical na esquerda (`border-l-2` / `border-l-4`).
3. NÃO use a escala cinza fria padrão do Tailwind (`#F9FAFB` / `#F3F4F6` / `#E5E7EB`).
4. NÃO enfileire 4 ou mais `<select>` idênticos ("Todos os X") no topo das telas.
5. NÃO repita o mesmo botão de ação dentro de todas as células da grade.
6. NÃO crie banners largos de tutorial nem coloque atalhos como `(Esc)` dentro do texto de botões.
7. NÃO use ícones decorativos em todos os itens de menu/títulos se o texto sozinho for mais limpo.
8. NÃO use pontinhos coloridos misteriosos sem explicar qual regra de negócio (RN-01 a RN-04) foi violada.
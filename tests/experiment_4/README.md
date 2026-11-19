# SATIC — interface ligada à API

Front-end em HTML, CSS e JavaScript puro. Desde 19/11/2026 os dados vêm da **API do SATIC-back** (branch `ts-back-dev`), e as regras de alocação são **as mesmas do servidor**: o parser SIGAA, o modelo de grade e o validador são carregados da própria API (`/shared/*.js`).

As decisões estão em `SATIC-back/docs/modelo-aulas-e-motor-de-sugestoes.md`, e o contrato da API em `SATIC-back/docs/api-contratos-frontend.md`.

## Executar

Em um terminal, suba o back-end com o banco local (sem Docker):

```powershell
cd SATIC-back\ts
npm install
npm run local
```

Na primeira vez, gere as alocações iniciais (opcional, o "Gerar grade" também funciona):

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3001/api/alocacoes/gerar -ContentType application/json -Body '{}'
```

Em outro terminal, sirva o front:

```powershell
cd SATIC-front\tests\experiment_4
node tools/serve.cjs
```

Abra http://127.0.0.1:8040/. Para usar outra API: http://127.0.0.1:8040/?api=http://endereço:porta (fica lembrado no navegador).

Se a API ou o banco estiverem fora do ar, a tela mostra **"Servidor indisponível"** com **"Tentar de novo"**. Não existe modo de demonstração.

## Testar

```powershell
node --test tests/data.test.cjs
```

Os testes carregam `js/data.js` como o navegador faria e usam os módulos de regra **direto do repositório SATIC-back** (o Node 22.18+ roda `.ts`). Por padrão o caminho é `../../../../SATIC-back/ts`, com os dois repositórios lado a lado; para outro lugar, use `SATIC_BACK_TS`. Os dados são a oferta real 2026.2 alocada pelo motor. São 9 testes:
- grade em aulas de 50 min;
- adaptação das 88 turmas sem conflito;
- mover um bloco;
- bloqueios de dia repetido, turno e espaço;
- RN-01 provocada;
- rascunho;
- sala mantida ou sugerida;
- espaço em manutenção;
- carga docente.

## Como a grade funciona agora

- **Aulas de 50 min.** A grade tem uma linha por aula (M1–M6, T1–T6, N1–N4) e colunas de SEG a SAB. O card completo aparece na primeira aula de cada bloco, e as aulas seguintes mostram uma faixa de continuação. O turno "Noite" mostra as turmas de IA.
- **Horário em blocos.** "TER/QUI M3–M4", "SEX M3–M6" e "SEG T5–T6 · SEX T1–T2" são montados a partir do código SIGAA (`35M34`, `6M3456`, `2T56 6T12`).
- **Mover.**
  - Selecione o card do dia que quer mover, clique em "Mover na grade" (ou arraste) e clique no destino.
  - O bloco daquele dia vai inteiro, com o mesmo número de aulas.
  - Destinos inválidos mostram o motivo: "Já tem aula nesse dia", "Não cabe", "Choque docente", "Turno fora do curso", "Sem sala livre".
  - A sala atual é mantida se continuar livre. Se não, o sistema sugere a melhor sala livre, com o mesmo critério do motor.
- **Rascunho.**
  - Toda mudança vai para o rascunho, mostrado no aviso flutuante "N alterações não salvas" com **Confirmar tudo** e **Descartar**.
  - O servidor valida o estado final do lote, então trocas entre turmas funcionam.
  - As mudanças recusadas continuam no rascunho, marcadas como recusadas. Sair da página com alterações pendentes pede confirmação.
- **Editar.** O painel da turma aceita o horário na notação SIGAA e a sala.
- **Conflitos.**
  - A lista é calculada com o validador do servidor.
  - **Resolver via motor** pede sugestões de horário e sala ao servidor, já levando em conta o rascunho. Cada alternativa mostra o custo (trocas de sala e mudanças de horário).
  - "Aplicar alternativa" coloca a sugestão no rascunho.
- **Gerar grade** consolida: o servidor verifica os conflitos, o motor propõe um plano, e "Colocar no rascunho" aplica o plano para revisão.
- **Exportar:**
  - CSV com os dados reais;
  - **ICS** com eventos semanais por bloco até o fim das aulas (defina início e fim em Configurações);
  - **PDF** pela impressão do navegador ("Salvar como PDF").
  - XLSX continua sem implementação.
- **Cursos:** CC e EC (manhã e tarde) e IA (noite). Turmas conjuntas ("CC, EC") aparecem nos dois filtros. O filtro de período fica vazio, porque o back ainda não tem o período das disciplinas.

## Funções que ficam só no navegador

O back-end ainda não guarda estas informações. Elas funcionam na sessão, e as rotas estão reservadas como comentário nos routers do SATIC-back:
- status "Manutenção" e cadastro ou edição de espaços (equipamentos, PCs);
- disponibilidade "preferencial" e regime ou carga máxima dos docentes;
- edição de turma e troca de docentes;
- publicar a grade;
- prioridades do gerador ("agrupar horários", "preferências"), que o motor ainda não usa;
- as datas do semestre usadas no ICS, guardadas no `localStorage` deste navegador.

## Verificado no navegador (19/11/2026)

Com a API local (`npm run local`) e a base real 2026.2:
- Carga das 88 turmas, todas alocadas e sem conflitos. A grade em aulas de 50 min aparece com sábado e noite, e a co-docência como "Alan Silva +3".
- Mover o bloco de terça da ECOM017 para quarta M1. A sexta ficou bloqueada ("Já tem aula nesse dia"), a sala foi sugerida (Sala 03 IC), e "Confirmar tudo" gravou a mudança como `DEFINITIVA`.
- Choque de sala criado pelo formulário: o servidor recusou (409) e a mudança ficou no rascunho. "Resolver via motor" sugeriu 3 trocas de sala, e a primeira mais "Confirmar tudo" gravou a troca das duas turmas, com zero conflitos no servidor.
- As telas Turmas, Professores e Espaços com os dados reais, e o aviso "Servidor indisponível" com a API desligada.

## Limitações conhecidas

- O arrasto move o bloco de um dia por vez. A seleção em área de várias aulas, combinada com a equipe, ainda não foi feita.
- O Painel Geral e as telas de professores e espaços foram adaptadas, mas não refeitas para o novo modelo, e algumas contagens (ocupação por espaço) ainda usam o total de 96 aulas semanais por sala.
- A aba de testes do Edge citada na versão anterior e os artefatos em `artifacts/` são da versão com dados de demonstração.

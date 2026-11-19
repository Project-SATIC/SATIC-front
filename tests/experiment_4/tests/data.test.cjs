/**
 * Testes do adaptador js/data.js contra as regras REAIS do servidor.
 *
 * Os módulos compartilhados (grade, validador, horario-sigaa) são importados direto do
 * repositório SATIC-back (o Node 22.18+ roda .ts nativamente), em vez de cópias. O caminho padrão
 * supõe os dois repositórios lado a lado; outro caminho: SATIC_BACK_TS=/caminho/para/SATIC-back/ts
 * Os dados são a oferta real 2026.2 alocada pelo motor de salas, no formato que a API devolve.
 */
const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');

const BACK_TS = process.env.SATIC_BACK_TS || path.resolve(__dirname, '../../../../SATIC-back/ts');
const temBack = fs.existsSync(path.join(BACK_TS, 'src/shared/validador.ts'));
const imp = (rel) => import(pathToFileURL(path.join(BACK_TS, rel)).href);

let api; // window.SATIC_DATA
let dadosApi; // { semestre, salas, turmas, professores, alocacoes }

before(async () => {
    if (!temBack) return;
    const [grade, validador, horario, seeder, montar, motor] = await Promise.all([
        imp('src/shared/grade.ts'), imp('src/shared/validador.ts'), imp('src/shared/horario-sigaa.ts'),
        imp('src/seed/seeder.ts'), imp('src/motor/montar-problema.ts'), imp('src/motor/state-space-search.ts')
    ]);
    const context = { window: { location: { search: '' } }, structuredClone, URLSearchParams, localStorage: { getItem: () => null, setItem() {} } };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/data.js'), 'utf8'), context);
    api = context.window.SATIC_DATA;
    api.usarDominio({ grade, validador, horario });

    // Base real como o banco fica depois do seed + /gerar (aulas por semana e IART como IA)
    const base = seeder.carregarBase2026_2();
    for (const t of base.turmas) {
        t.aulasSemanais = grade.contarAulas(t.horarioSigaa);
        if (t.disciplina.codigo.startsWith('IART')) t.cursosOfertados = 'IA';
    }
    const p = montar.montarProblema(base);
    const r = new motor.StateSpaceSearch(p.turmasParaAlocar, p.salasAlocaveis, p.reservasFixasExternas).solve();
    const json = (x) => JSON.parse(JSON.stringify(x));
    dadosApi = json({
        semestre: '2026.2',
        salas: base.salas,
        turmas: base.turmas,
        professores: base.professores,
        alocacoes: [...p.reservasFixasExternas, ...r.alocacoes].map((a, i) => ({ ...a, id: i + 1 }))
    });
});

/** data.js roda em outro contexto (vm): compara pelo conteúdo, não pelo protótipo. */
const J = (x) => JSON.parse(JSON.stringify(x));
const estado = () => api.montarEstado(JSON.parse(JSON.stringify(dadosApi)));
const turma = (st, codigo, cod = '01') => st.turmas.find((t) => t.codigo === codigo && t.turma === cod);
const opts = { skip: !temBack && 'SATIC-back não encontrado ao lado (defina SATIC_BACK_TS)' };

test('grade em aulas de 50 min: 16 aulas (M1–M6, T1–T6, N1–N4) e sábado', opts, () => {
    assert.equal(api.SLOTS_INSTITUCIONAIS.length, 16);
    assert.deepEqual(J(api.SLOTS_INSTITUCIONAIS.filter((s) => s.turno === 'Noite').map((s) => s.horario)),
        ['19:00–19:50', '19:50–20:40', '20:50–21:40', '21:40–22:30']);
    assert.ok(api.DIAS_SEMANA.some((d) => d.id === 'SAB'));
});

test('adapta a oferta real: turmas do IC + reservas externas, sem conflitos', opts, () => {
    const st = estado();
    assert.equal(st.turmas.length, 88, '86 do IC + 2 EXTERNA_FIXA');
    assert.equal(st.turmas.filter((t) => t.sala).length, 88);
    for (const t of st.turmas) assert.deepEqual(J(api.inspecionarTurma(st, t).problemas), [], `${t.codigo}-${t.turma}`);
    const comp382 = turma(st, 'COMP382');
    assert.equal(comp382.professores.length, 4, 'co-docência');
    assert.equal(comp382.aulas.length, 16);
    assert.deepEqual(J(comp382.dias), ['SEG', 'TER', 'QUA', 'QUI']);
    const ia = turma(st, 'IART001');
    assert.equal(ia.curso, 'IA');
    assert.ok(ia.aulas.every((a) => a.includes('-N')));
    assert.ok(api.ocupa(turma(st, 'COMP359'), 'SEX', 'M5'), '6M3456 ocupa SEX M5');
    assert.ok(st.professores.every((p) => p.id && p.nome), 'docentes com id curto e nome');
});

test('mover um bloco: TER/QUI M3-M4 -> bloco da quinta vai para sexta M1-M2', opts, () => {
    const st = estado();
    const t = turma(st, 'COMP360'); // 24M34 (SEG? ver horário real)
    const [diaOrigem] = t.dias;
    st.movimento = { turmaId: t.id, diaOrigem };
    const tamanho = api.blocoDoDia(t, diaOrigem).length;
    const v = api.verificarViabilidadeSlot(st, t, 'SEX', 'T1');
    assert.equal(v.valido, true, JSON.stringify(v));
    assert.equal(api.dominio().horario.expandirParaSlotsAtomicos(v.novoHorario).length, t.aulas.length, 'mantém o nº de aulas');
    assert.ok(api.dominio().horario.expandirParaSlotsAtomicos(v.novoHorario).filter((a) => a.startsWith('SEX-T')).length === tamanho);
    assert.ok(v.salaSugerida);
});

test('mover para um dia que já tem aula da turma, ou que não cabe no turno, é bloqueado', opts, () => {
    const st = estado();
    const t = turma(st, 'COMP360');
    const [d1, d2] = t.dias;
    st.movimento = { turmaId: t.id, diaOrigem: d1 };
    assert.equal(api.verificarViabilidadeSlot(st, t, d2, 'T1').motivo, 'Já tem aula nesse dia');
    assert.match(api.verificarViabilidadeSlot(st, t, 'SEX', 'M6').motivo, /Não cabe/);
    assert.equal(api.verificarViabilidadeSlot(st, t, 'SEX', 'N1').valido, false, 'CC não vai para a noite');
});

test('choque de docente provocado aparece como RN-01 nas duas turmas', opts, () => {
    const st = estado();
    const comp382 = turma(st, 'COMP382');
    const outra = st.turmas.find((t) => t !== comp382 && t.professores.some((p) => comp382.professores.includes(p)));
    assert.ok(outra);
    api.moverTurma(st, outra, { horario: '2M34 3M34' });
    const d = api.inspecionarTurma(st, outra);
    assert.ok(d.problemas.some((p) => p.categoria === 'Professor'), JSON.stringify(d.problemas));
    assert.ok(api.inspecionarTurma(st, comp382).problemas.some((p) => p.categoria === 'Professor'));
    assert.ok(api.obterConflitosConsolidados(st).length >= 1);
});

test('rascunho: registra mudanças, desfaz quando volta ao salvo e marca remoção', opts, () => {
    const st = estado();
    const t = turma(st, 'COMP360');
    const original = { sala: t.sala, horario: t.horario };
    assert.equal(api.contarRascunho(st), 0);
    api.moverTurma(st, t, { horario: '35M12' });
    assert.equal(api.contarRascunho(st), 1);
    assert.deepEqual(J(st.rascunho[t.id]), { turmaId: t.apiId, salaId: Number(t.sala), horario: '35M12' });
    api.moverTurma(st, t, original);
    assert.equal(api.contarRascunho(st), 0, 'voltou ao salvo');
    api.moverTurma(st, t, { sala: null });
    assert.deepEqual(J(st.rascunho[t.id]), { turmaId: t.apiId, acao: 'remover' });
    assert.equal(api.inspecionarTurma(st, t).alocada, false);
});

test('sala ao mover: mantém a atual quando continua livre, senão sugere outra', opts, () => {
    const st = estado();
    const t = turma(st, 'COMP360');
    const r1 = api.resolverSala(st, t, t.horario);
    assert.equal(r1.origem, 'mantida');
    // Ocupa a sala atual no horário-alvo com outra turma do mesmo tamanho de bloco
    const alvo = '35T56';
    const vizinha = st.turmas.find((x) => x !== t && x.aulas.length === 4 && !x.professores.some((p) => t.professores.includes(p)));
    api.moverTurma(st, vizinha, { sala: t.sala, horario: alvo });
    const r2 = api.resolverSala(st, t, alvo);
    assert.notEqual(r2.sala, t.sala);
    assert.equal(r2.origem, 'sugerida');
});

test('espaço em manutenção (status local da sessão) vira problema', opts, () => {
    const st = estado();
    const t = turma(st, 'COMP360');
    st.espacos.find((e) => e.id === t.sala).status = 'Manutenção';
    assert.ok(api.inspecionarTurma(st, t).problemas.some((p) => p.categoria === 'Espaço'));
});

test('carga docente conta aulas de 50 min de todas as turmas (co-docência inclusa)', opts, () => {
    const st = estado();
    const comp382 = turma(st, 'COMP382');
    const id = comp382.professores[0];
    const esperado = st.turmas.filter((t) => t.professores.includes(id)).reduce((s, t) => s + t.aulas.length, 0);
    assert.equal(api.calcularCargaDocente(st, id), esperado);
    assert.ok(esperado >= 16);
});

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
let sugerirResolucoes;

before(async () => {
    if (!temBack) return;
    const [grade, validador, horario, seeder, montar, motor, sugestoes] = await Promise.all([
        imp('src/shared/grade.ts'), imp('src/shared/validador.ts'), imp('src/shared/horario-sigaa.ts'),
        imp('src/seed/seeder.ts'), imp('src/motor/montar-problema.ts'), imp('src/motor/state-space-search.ts'),
        imp('src/motor/sugestoes.ts')
    ]);
    sugerirResolucoes = sugestoes.sugerirResolucoes;
    const context = { window: { location: { origin: 'http://127.0.0.1:8040', search: '' } }, structuredClone, URL, URLSearchParams, localStorage: { getItem: () => null, setItem() {}, removeItem() {} } };
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

test('CON-01: conflito com DEFINITIVA elege representante móvel e preserva alternativas do motor', opts, () => {
    const apiClonada = JSON.parse(JSON.stringify(dadosApi));
    const aComp = apiClonada.alocacoes.find((a) => a.turma.disciplina.codigo === 'COMP360');
    const aEcom = apiClonada.alocacoes.find((a) => a.turma.disciplina.codigo === 'ECOM032');
    assert.ok(aComp && aEcom);
    aComp.status = 'DEFINITIVA';
    aEcom.status = 'RASCUNHO';
    aEcom.sala = aComp.sala;
    aEcom.horarioCodigo = aComp.horarioCodigo;
    aEcom.turma.aulasSemanais = api.dominio().grade.contarAulas(aComp.horarioCodigo);

    const salasPool = apiClonada.salas.filter((s) => s.alocavelIc);
    const sug = sugerirResolucoes(apiClonada.turmas, salasPool, apiClonada.alocacoes);
    assert.ok((sug.alternativasPorTurma[aEcom.turma.id] || []).length > 0);

    const st = api.montarEstado(apiClonada);
    st.sugestoes = sug;
    const conflitos = api.obterConflitosConsolidados(st);
    assert.equal(conflitos.length, 1);
    assert.equal(conflitos[0].codigo, 'ECOM032', 'escolhe a turma móvel em vez da DEFINITIVA');
    assert.ok(conflitos[0].alternativas.length > 0, 'expõe alternativas da turma móvel');
    assert.ok(conflitos[0].afetadasIds.includes(String(aComp.turma.id)));
    assert.ok(conflitos[0].afetadasIds.includes(String(aEcom.turma.id)));
});

test('SEC-02: normalizarBaseApiConfiavel aceita local/intranet IC e rejeita scripts e origens externas', opts, () => {
    assert.equal(api.normalizarBaseApiConfiavel('http://localhost:3001/'), 'http://localhost:3001');
    assert.equal(api.normalizarBaseApiConfiavel('http://127.0.0.1:3101'), 'http://127.0.0.1:3101');
    assert.equal(api.normalizarBaseApiConfiavel('http://192.168.0.15:3001'), 'http://192.168.0.15:3001');
    assert.equal(api.normalizarBaseApiConfiavel('http://10.1.2.3:3001'), 'http://10.1.2.3:3001');
    assert.equal(api.normalizarBaseApiConfiavel('https://satic.ic.ufal.br'), 'https://satic.ic.ufal.br');
    assert.equal(api.normalizarBaseApiConfiavel('javascript:alert(1)'), null);
    assert.equal(api.normalizarBaseApiConfiavel('data:text/javascript,alert(1)'), null);
    assert.equal(api.normalizarBaseApiConfiavel('https://evil.example'), null);
});

test('COR-02: verificarViabilidadeSlot bloqueia diaOrigem inexistente na turma', opts, () => {
    const st = estado();
    const comp360 = turma(st, 'COMP360');
    st.movimento = { turmaId: comp360.id, diaOrigem: 'SAB' };
    const v = api.verificarViabilidadeSlot(st, comp360, 'SEX', 'M1');
    assert.equal(v.valido, false);
    assert.match(v.motivo, /Dia de origem/);
});

test('COR-03: assinatura invalida cache ao mudar ambienteExigido e detecta RN-04 na hora', opts, () => {
    const st = estado();
    const t = st.turmas.find((x) => x.ambienteExigido === 'Sala' && st.espacos.find((e) => e.id === x.sala)?.tipo === 'Sala');
    assert.ok(t);
    assert.deepEqual(J(api.inspecionarTurma(st, t).problemas), []);
    t.ambienteExigido = 'Laboratório';
    t.exigeLaboratorio = true;
    const diagDepois = api.inspecionarTurma(st, t);
    assert.ok(diagDepois.problemas.some((p) => p.regra === 'RN-04'), JSON.stringify(diagDepois.problemas));
});

test('COR-06 (front): montarEstado tolera horário SIGAA ilegível sem quebrar o boot', opts, () => {
    const apiClonada = JSON.parse(JSON.stringify(dadosApi));
    const primeira = apiClonada.turmas.find((t) => t.requerAlocacaoIc);
    primeira.horarioSigaa = '24X99';
    const aloc = apiClonada.alocacoes.find((a) => a.turma.id === primeira.id);
    if (aloc) aloc.horarioCodigo = '24X99';
    const st = api.montarEstado(apiClonada);
    const t = st.turmas.find((x) => x.apiId === primeira.id);
    assert.equal(t.horarioInvalido, true);
    assert.deepEqual(J(t.aulas), []);
});

test('COR-09: dois espaços locais novos não cruzam conflito e confirmarRascunho recusa sala local sem apiId', opts, async () => {
    const st = estado();
    const e1 = { id: 'espaco-1', nome: 'Sala Nova 1', codigo: 'N1', bloco: 'IC', tipo: 'Sala', capacidade: 80, status: 'Disponível', alocavelIc: true };
    const e2 = { id: 'espaco-2', nome: 'Sala Nova 2', codigo: 'N2', bloco: 'IC', tipo: 'Sala', capacidade: 80, status: 'Disponível', alocavelIc: true };
    st.espacos.push(e1, e2);
    const [t1, t2] = st.turmas.filter((t) => t.ambienteExigido === 'Sala' && t.horario === '35M34');
    assert.ok(t1 && t2);
    api.moverTurma(st, t1, { sala: e1.id });
    api.moverTurma(st, t2, { sala: e2.id });
    assert.deepEqual(J(api.inspecionarTurma(st, t1).problemas), []);
    assert.deepEqual(J(api.inspecionarTurma(st, t2).problemas), []);
    await assert.rejects(() => api.confirmarRascunho(st), /espaço criado apenas nesta sessão/i);
});

test('SEC-04 (serve.cjs): URL malformada retorna HTTP 400 sem derrubar o servidor', async () => {
    const { criarServidorEstatico } = require('../tools/serve.cjs');
    const srv = criarServidorEstatico();
    await new Promise((resolve) => srv.listen(0, '127.0.0.1', resolve));
    const { port } = srv.address();
    try {
        const res = await fetch(`http://127.0.0.1:${port}/%E0%A4%A`);
        assert.equal(res.status, 400);
        const ok = await fetch(`http://127.0.0.1:${port}/`);
        assert.equal(ok.status, 200);
    } finally {
        await new Promise((resolve) => srv.close(resolve));
    }
});

test('ARC-01: ordenação e requisito de laboratório no front usam exatamente a regra compartilhada do servidor', opts, () => {
    const st = api.criarDadosIniciais();
    st.semestre = '2026.2';
    st.espacos = [
        { id: '1', apiId: 1, nome: 'Sala Á', codigo: 'IC', bloco: 'IC', tipo: 'Sala', capacidade: 40, status: 'Disponível', alocavelIc: true },
        { id: '2', apiId: 2, nome: 'Sala B', codigo: 'IC', bloco: 'IC', tipo: 'Sala', capacidade: 40, status: 'Disponível', alocavelIc: true },
        { id: '3', apiId: 3, nome: 'Lab Sem Acento', codigo: 'IC', bloco: 'IC', tipo: 'Laboratorio', capacidade: 40, status: 'Disponível', alocavelIc: true },
    ];
    const teorica = {
        id: '10', apiId: 10, codigo: 'T1', disciplina: 'Teorica', turma: '01', curso: 'CC',
        professores: [], alunos: 30, ambienteExigido: 'Sala', exigeLaboratorio: false,
        requerAlocacaoIc: true, aulasSemanais: 2, horario: '2M12', aulas: ['SEG-M1', 'SEG-M2'], dias: ['SEG'], sala: null
    };
    const pratica = {
        ...teorica, id: '11', apiId: 11, codigo: 'P1', disciplina: 'Pratica',
        ambienteExigido: 'Laboratório', exigeLaboratorio: true
    };
    st.turmas = [teorica, pratica];

    const rTeorica = api.resolverSala(st, teorica, '2M12');
    assert.equal(rTeorica.sala, '2', 'compareToIgnoreCase prioriza Sala B antes de Sala Á, e preserva o laboratório');
    const rPratica = api.resolverSala(st, pratica, '2M12');
    assert.equal(rPratica.sala, '3', 'aceita tipo "Laboratorio" sem acento exatamente como o back-end');
});

/**
 * Testes dos helpers puros (js/helpers.js) contra os módulos reais do servidor.
 */
const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');

const BACK_TS = process.env.SATIC_BACK_TS || path.resolve(__dirname, '../../../../SATIC-back/ts');
const temBack = fs.existsSync(path.join(BACK_TS, 'src/shared/grade.ts'));
const opts = { skip: !temBack && 'SATIC-back não encontrado ao lado (defina SATIC_BACK_TS)' };

let H;
let grade;

before(async () => {
    const context = { window: {}, globalThis: {} };
    context.globalThis = context.window;
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/helpers.js'), 'utf8'), context);
    H = context.window.SATIC_HELPERS;
    if (temBack) {
        grade = await import(pathToFileURL(path.join(BACK_TS, 'src/shared/grade.ts')).href);
    }
});

test('SEC-03: escapar neutraliza tags XSS e preserva texto normal', () => {
    assert.equal(H.escapar('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
    assert.equal(H.escapar('IC & "BL12"'), 'IC &amp; &quot;BL12&quot;');
    assert.equal(H.escapar(null), '');
});

test('COR-10: filtrarProfessorPorTermo casa SIAPE com prefixo IC- em qualquer caixa', () => {
    const p = { nome: 'Alan Silva', siape: 'IC-202401' };
    assert.equal(H.filtrarProfessorPorTermo(p, 'ic-2024'), true);
    assert.equal(H.filtrarProfessorPorTermo(p, 'IC-2024'), true);
    assert.equal(H.filtrarProfessorPorTermo(p, 'alan'), true);
    assert.equal(H.filtrarProfessorPorTermo(p, 'outro'), false);
    assert.equal(H.filtrarProfessorPorTermo(p, ''), true);
});

test('COR-10: obterRotuloConflito e rotuloRegraProblema distinguem Turno de Encontros', () => {
    const diag = { problemas: [{ categoria: 'Turno' }] };
    const r = H.obterRotuloConflito({ alunos: 40, sala: '1', ambienteExigido: 'Sala' }, diag, []);
    assert.equal(r.curtoHtml, 'Turno inválido');
    assert.equal(r.resumoTooltip, 'TURNO: Turno fora do curso');
    assert.equal(H.rotuloRegraProblema('Turno'), 'TURNO · Turno fora do curso');
    assert.equal(H.rotuloRegraProblema('Encontros'), 'FORMATO · Formato do horário');
});

test('COR-06: rotuloHorario formata blocos válidos e tolera horário ilegível', opts, () => {
    const dom = { grade };
    assert.equal(H.rotuloHorario({ horario: '35M34' }, dom), 'TER/QUI M3–M4');
    assert.equal(H.rotuloHorario({ horario: '24X99' }, dom), '24X99');
    assert.equal(H.rotuloHorario({ horario: '' }, dom), 'Sem horário');
});

test('COR-04 / COR-10: gerarConteudoICS inclui VTIMEZONE, UNTIL em UTC, pula dia > fim e ignora N5/N6/ilegível', opts, () => {
    const dom = { grade };
    const espacos = [{ id: '1', nome: 'Sala 02 IC' }];
    const turmas = [
        { apiId: 1, codigo: 'COMP360', turma: '01', disciplina: 'Prog 1', sala: '1', horario: '35M34', professores: ['Ana'], curso: 'CC' },
        { apiId: 2, codigo: 'IA1', turma: '01', disciplina: 'Noite', sala: '1', horario: '4N56', professores: ['Bia'], curso: 'IA' },
        { apiId: 3, codigo: 'ERR1', turma: '01', disciplina: 'Ruim', sala: '1', horario: '24X99', professores: ['Caio'], curso: 'CC' },
    ];
    // Intervalo de segunda a quarta: terça (35M34) ocorre na terça; quinta cai fora (> fim)
    const { conteudo, eventos } = H.gerarConteudoICS({
        semestre: '2026.2',
        inicio: '2026-08-03',
        fim: '2026-08-04',
        turmas,
        espacos,
        dominio: dom,
        agora: new Date('2026-08-01T12:00:00Z'),
    });
    assert.equal(eventos, 1, 'apenas terça entra no intervalo 03..04/08; N5/N6 e 24X99 não quebram');
    assert.match(conteudo, /BEGIN:VTIMEZONE[\s\S]*TZID:America\/Maceio[\s\S]*END:VTIMEZONE/);
    assert.match(conteudo, /RRULE:FREQ=WEEKLY;BYDAY=TU;UNTIL=\d{8}T\d{6}Z/);
    assert.doesNotMatch(conteudo, /UID:satic-2026\.2-2-/);
    assert.doesNotMatch(conteudo, /UID:satic-2026\.2-3-/);
});

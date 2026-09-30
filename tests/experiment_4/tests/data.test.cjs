const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = { window: {}, structuredClone };
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname, '../js/data.js'), 'utf8'), context);
const api = context.window.SATIC_DATA;

test('a proposta valida dados atuais e preserva encontros e alocações válidas', () => {
    for (const prioridade of ['valida', 'janelas', 'docentes']) {
        const original = api.criarDadosIniciais();
        const antes = JSON.stringify(original);
        const r = api.gerarPropostaGrade(original, prioridade);
        assert.equal(r.completa, true);
        assert.equal(r.alocadas, 18);
        assert.equal(r.conflitos, 0);
        assert.equal(JSON.stringify(original), antes);
        for (const turma of r.dados.turmas) {
            assert.equal(turma.dias.length, turma.encontrosSemanais);
            assert.equal(api.inspecionarTurma(r.dados, turma).problemas.length, 0);
            const inicial = original.turmas.find(t => t.id === turma.id);
            if (api.inspecionarTurma(original, inicial).alocada && !api.inspecionarTurma(original, inicial).problemas.length) {
                assert.equal(JSON.stringify(turma), JSON.stringify(inicial));
            }
        }
    }
});

test('indisponibilidade, manutenção e ambiente impedem uma falsa grade válida', () => {
    const dados = api.criarDadosIniciais();
    const turma = dados.turmas.find(t => t.id === 'COMP101');
    Object.assign(turma, { sala: 'Sala 101', slot: 'T5-T6', dias: ['SEG', 'QUA'] });
    const problemas = api.inspecionarTurma(dados, turma).problemas;
    assert.ok(problemas.some(p => p.categoria === 'Disponibilidade'));
    assert.ok(problemas.some(p => p.categoria === 'Ambiente'));
    const t308 = dados.turmas.find(t => t.id === 'COMP308');
    assert.ok(api.inspecionarTurma(dados, t308).problemas.some(p => p.categoria === 'Espaço'));
});

test('geração informa proposta parcial quando faltam espaços compatíveis', () => {
    const dados = api.criarDadosIniciais();
    dados.espacos.forEach(e => { e.status = 'Manutenção'; });
    const r = api.gerarPropostaGrade(dados);
    assert.equal(r.completa, false);
    assert.equal(r.alocadas, 0);
});

test('mover para sexta mantém dois encontros, e disciplinas de um encontro continuam únicas', () => {
    const dados = api.criarDadosIniciais();
    const turma = dados.turmas.find(t => t.id === 'COMP201');
    const r = api.verificarViabilidadeSlot(dados, turma, 'SEX', 'M3-M4');
    assert.equal(r.dias.length, 2);
    assert.equal(r.dias.join('/'), 'QUA/SEX');
    const unica = dados.turmas.find(t => t.id === 'COMP401');
    assert.equal(api.verificarViabilidadeSlot(dados, unica, 'TER', 'M1-M2').dias.length, 1);
    assert.equal(api.calcularCargaDocente(dados, 'Glauber'), 6);
});

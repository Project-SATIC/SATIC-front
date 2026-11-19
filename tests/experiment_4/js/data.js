/**
 * SATIC — Sistema de Alocação de Turmas (IC / UFAL)
 * Arquivo: js/data.js
 * Objetivo: ligar a interface à API do SATIC-back (dados reais, validação e rascunho de mudanças).
 *
 * - Os dados vêm da API (salas, turmas, professores, alocações). Sem API, a interface mostra um
 *   aviso com "Tentar de novo" (decisão de 18/11/2026: não há modo demonstração).
 * - A validação usa o MESMO código do servidor: /shared/grade.js, /shared/validador.js e
 *   /shared/horario-sigaa.js são importados da API como módulos ES.
 * - Horários em aulas de 50 min (decisão de 19/11/2026): a turma ocupa um conjunto de aulas
 *   "DIA-TURNO+ÍNDICE" (ex.: "TER-M3"). A grade tem uma linha por aula (M1–M6, T1–T6, N1–N4) e SAB.
 * - Mudanças se acumulam num rascunho; "Confirmar tudo" envia para /api/alocacoes/confirmar-lote.
 *
 * Para não reescrever as telas, cada turma mantém os campos que o app.js já usa
 * (professor, sala, dias, slot, alunos, ambienteExigido) e ganha horario, aulas, professores,
 * aulasSemanais e apiId. `slot` passa a guardar o código SIGAA (verdadeiro quando há horário).
 */

const API_PADRAO = "http://localhost:3001";
const SEMESTRE_PADRAO = "2026.2";

/** Preenchido depois que o relógio é carregado de /shared/grade.js (o app.js guarda a referência). */
const SLOTS_INSTITUCIONAIS = [];

const DIAS_SEMANA = [
    { id: "SEG", rotulo: "SEG", nome: "Segunda" },
    { id: "TER", rotulo: "TER", nome: "Terça" },
    { id: "QUA", rotulo: "QUA", nome: "Quarta" },
    { id: "QUI", rotulo: "QUI", nome: "Quinta" },
    { id: "SEX", rotulo: "SEX", nome: "Sexta" },
    { id: "SAB", rotulo: "SAB", nome: "Sábado" }
];

const NOME_TURNO = { M: "Manhã", T: "Tarde", N: "Noite" };

/** Módulos de domínio do servidor (grade, validador, horario). */
let D = null;

/* ==========================================================================
   API
   ========================================================================== */

function baseApi() {
    try {
        const daUrl = new URLSearchParams(window.location.search).get("api");
        if (daUrl) {
            localStorage.setItem("satic.api", daUrl);
            return daUrl.replace(/\/+$/, "");
        }
        const salvo = localStorage.getItem("satic.api");
        if (salvo) return salvo.replace(/\/+$/, "");
    } catch (_) { /* localStorage bloqueado: usa o padrão */ }
    return API_PADRAO;
}

class ErroApi extends Error {
    constructor(mensagem, status, corpo) {
        super(mensagem);
        this.name = "ErroApi";
        this.status = status;
        this.corpo = corpo;
        /** Servidor fora do ar, rede caída ou banco indisponível (503). */
        this.indisponivel = status === 0 || status === 503;
    }
}

async function requisitar(metodo, caminho, corpo) {
    let res;
    try {
        res = await fetch(baseApi() + caminho, {
            method: metodo,
            headers: corpo === undefined ? {} : { "content-type": "application/json" },
            body: corpo === undefined ? undefined : JSON.stringify(corpo)
        });
    } catch (err) {
        throw new ErroApi(`Não foi possível falar com o servidor (${baseApi()}).`, 0, null);
    }
    let dados = null;
    try { dados = await res.json(); } catch (_) { dados = null; }
    if (res.status >= 400 && res.status !== 409 && res.status !== 207) {
        throw new ErroApi((dados && dados.erro) || `Erro ${res.status}`, res.status, dados);
    }
    return { status: res.status, corpo: dados };
}

async function carregarDominio() {
    if (D) return D;
    const base = baseApi();
    try {
        const [grade, validador, horario] = await Promise.all([
            import(`${base}/shared/grade.js`),
            import(`${base}/shared/validador.js`),
            import(`${base}/shared/horario-sigaa.js`)
        ]);
        D = { grade, validador, horario };
    } catch (err) {
        throw new ErroApi(`Não foi possível carregar as regras do servidor (${base}/shared).`, 0, null);
    }
    if (SLOTS_INSTITUCIONAIS.length === 0) {
        for (const a of D.grade.RELOGIO_AULAS) {
            SLOTS_INSTITUCIONAIS.push({ id: a.id, turno: NOME_TURNO[a.turno], letraTurno: a.turno, horario: `${a.inicio}–${a.fim}` });
        }
    }
    return D;
}

/** Só para os testes: injeta os módulos de domínio sem passar pela API. */
function usarDominio(modulos) {
    D = modulos;
    SLOTS_INSTITUCIONAIS.length = 0;
    for (const a of D.grade.RELOGIO_AULAS) {
        SLOTS_INSTITUCIONAIS.push({ id: a.id, turno: NOME_TURNO[a.turno], letraTurno: a.turno, horario: `${a.inicio}–${a.fim}` });
    }
}

/* ==========================================================================
   Adaptação: dados da API -> estado das telas
   ========================================================================== */

function criarDadosIniciais() {
    return {
        semestre: SEMESTRE_PADRAO,
        publicada: false,
        carregado: false,
        espacos: [],
        professores: [],
        turmas: [],
        rascunho: {},
        recusas: {},
        sugestoes: null,
        movimento: null
    };
}

function nomeProprio(texto) {
    const minusculas = new Set(["de", "da", "do", "das", "dos", "e", "a", "o", "as", "os", "para", "em", "com", "na", "no", "nas", "nos"]);
    return String(texto || "").toLowerCase().split(/\s+/).filter(Boolean)
        .map((p, i) => (i > 0 && minusculas.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1))).join(" ");
}

/** "RANILSON OSCAR ARAUJO PAIVA" -> "Ranilson Paiva". */
function nomeCurto(nome) {
    const partes = nomeProprio(nome).split(" ").filter((p) => p.length > 2);
    return partes.length <= 1 ? (partes[0] || nomeProprio(nome)) : `${partes[0]} ${partes[partes.length - 1]}`;
}

function recalcularAulas(t) {
    t.aulas = t.horario ? D.horario.expandirParaSlotsAtomicos(t.horario) : [];
    const dias = new Set(t.aulas.map((a) => a.slice(0, 3)));
    t.dias = DIAS_SEMANA.map((d) => d.id).filter((d) => dias.has(d));
    t.slot = t.horario || null;
    t.encontrosSemanais = t.aulasSemanais || t.aulas.length;
}

/**
 * Converte as respostas da API no estado das telas.
 * Turmas externas (requerAlocacaoIc = false) só entram se ocupam sala do IC (reserva EXTERNA_FIXA).
 */
function montarEstado({ semestre, salas, turmas, professores, alocacoes }) {
    const estado = criarDadosIniciais();
    estado.semestre = semestre;
    estado.carregado = true;

    estado.espacos = salas.map((s) => ({
        id: String(s.id),
        apiId: s.id,
        nome: s.nome,
        codigo: s.bloco,
        tipo: s.tipoEspaco,
        capacidade: s.capacidade,
        pcs: s.tipoEspaco && s.tipoEspaco.toLowerCase().startsWith("laborat") ? s.capacidade : 0,
        equipamentos: [],
        status: "Disponível",
        pavimento: s.bloco,
        bloco: s.bloco,
        alocavelIc: s.alocavelIc,
        observacao: s.alocavelIc ? "Pool de salas do IC." : "Fora do pool do IC (CTEC/IF)."
    }));

    // Ids curtos e únicos para os docentes (o app usa o id como rótulo nas telas)
    const usados = new Map();
    const profPorSiape = new Map();
    for (const p of professores) {
        let curto = nomeCurto(p.nome);
        if (usados.has(curto)) curto = `${curto} (${p.matriculaSiape})`;
        usados.set(curto, true);
        const disponibilidade = {};
        for (const ind of p.indisponibilidades || []) {
            for (const slot of D.horario.slotsDaIndisponibilidade(ind)) disponibilidade[slot.replace("-", ":")] = "indisponivel";
        }
        const prof = { id: curto, nome: nomeProprio(p.nome), curto, siape: p.matriculaSiape, regime: "—", cargaMax: null, disponibilidade };
        estado.professores.push(prof);
        profPorSiape.set(p.matriculaSiape, prof);
    }

    const alocPorTurma = new Map(alocacoes.map((a) => [a.turma.id, a]));
    for (const t of turmas) {
        const aloc = alocPorTurma.get(t.id);
        if (!t.requerAlocacaoIc && !aloc) continue; // turma externa fora do IC: não aparece na grade
        const ids = t.professores.map((p) => {
            let prof = profPorSiape.get(p.matriculaSiape);
            if (!prof) { // docente que veio só na turma (não listado em /professores)
                prof = { id: nomeCurto(p.nome), nome: nomeProprio(p.nome), curto: nomeCurto(p.nome), siape: p.matriculaSiape, regime: "—", cargaMax: null, disponibilidade: {} };
                estado.professores.push(prof);
                profPorSiape.set(p.matriculaSiape, prof);
            }
            return prof.id;
        });
        const turma = {
            id: String(t.id),
            apiId: t.id,
            codigo: t.disciplina.codigo,
            disciplina: nomeProprio(t.disciplina.nome),
            turma: t.codigoTurma,
            curso: t.cursosOfertados,
            periodo: "—",
            professores: ids,
            professor: ids[0] || "",
            alunos: t.matriculados > 0 ? t.matriculados : t.vagas,
            vagas: t.vagas,
            ambienteExigido: t.disciplina.exigeLaboratorio ? "Laboratório" : "Sala",
            exigeLaboratorio: t.disciplina.exigeLaboratorio,
            cargaHoraria: t.disciplina.cargaHoraria,
            requerAlocacaoIc: t.requerAlocacaoIc,
            aulasSemanais: t.aulasSemanais || null,
            horarioPreGrade: t.horarioSigaa,
            horario: aloc ? aloc.horarioCodigo : t.horarioSigaa,
            sala: aloc ? String(aloc.sala.id) : null,
            status: aloc ? aloc.status : null
        };
        recalcularAulas(turma);
        estado.turmas.push(turma);
    }
    estado.original = Object.fromEntries(estado.turmas.map((t) => [t.id, { sala: t.sala, horario: t.horario }]));
    return estado;
}

async function carregar(semestre = SEMESTRE_PADRAO) {
    await carregarDominio();
    const q = `?semestre=${encodeURIComponent(semestre)}`;
    const [salas, turmas, professores, alocacoes] = await Promise.all([
        requisitar("GET", "/api/salas"),
        requisitar("GET", `/api/turmas${q}`),
        requisitar("GET", "/api/professores"),
        requisitar("GET", `/api/alocacoes${q}`)
    ]);
    return montarEstado({ semestre, salas: salas.corpo, turmas: turmas.corpo, professores: professores.corpo, alocacoes: alocacoes.corpo });
}

/* ==========================================================================
   Conversão para o formato do validador compartilhado
   ========================================================================== */

function profApi(state, id) {
    const p = state.professores.find((x) => x.id === id);
    if (!p) return null;
    const indisponibilidades = Object.entries(p.disponibilidade)
        .filter(([, v]) => v === "indisponivel")
        .map(([chave]) => {
            const [dia, aula] = chave.split(":");
            return { professorMatricula: p.siape, diaSemana: dia, turno: aula[0], indiceHorario: aula.slice(1) };
        });
    return { matriculaSiape: p.siape, nome: p.nome, indisponibilidades };
}

function turmaApi(state, t, horario = t.horario) {
    return {
        id: t.apiId,
        disciplina: { codigo: t.codigo, nome: t.disciplina, cargaHoraria: t.cargaHoraria || 0, exigeLaboratorio: t.ambienteExigido === "Laboratório" },
        professores: (t.professores || []).map((id) => profApi(state, id)).filter(Boolean),
        cargaHorariaPorDocente: {},
        codigoTurma: t.turma,
        semestre: state.semestre,
        cursosOfertados: t.curso,
        horarioSigaa: horario || "",
        vagas: t.alunos,
        matriculados: t.alunos,
        requerAlocacaoIc: t.requerAlocacaoIc !== false,
        aulasSemanais: t.aulasSemanais
    };
}

function salaApi(e) {
    return { id: e.apiId, nome: e.nome, capacidade: e.capacidade, tipoEspaco: e.tipo, bloco: e.bloco, alocavelIc: e.alocavelIc !== false };
}

/** Assinatura dos campos que mudam a validação (memoização por renderização). */
function assinatura(state) {
    return state.turmas.map((t) => `${t.id}|${t.sala}|${t.horario}|${t.professores.join(",")}|${t.alunos}`).join(";")
        + "#" + state.espacos.map((e) => `${e.id}|${e.status}|${e.capacidade}|${e.tipo}`).join(";")
        + "#" + state.professores.map((p) => `${p.id}:${Object.keys(p.disponibilidade).filter((k) => p.disponibilidade[k] === "indisponivel").join(",")}`).join(";");
}

const memo = new WeakMap();
function contexto(state) {
    const sig = assinatura(state);
    let c = memo.get(state);
    if (!c || c.sig !== sig) {
        const alocacoes = [];
        const porApiId = new Map();
        for (const t of state.turmas) {
            if (!t.sala || !t.horario) continue;
            const e = state.espacos.find((x) => x.id === t.sala);
            if (!e) continue;
            const a = { turma: turmaApi(state, t), sala: salaApi(e), horarioCodigo: t.horario, status: t.status || "RASCUNHO" };
            alocacoes.push(a);
            porApiId.set(t.apiId, t);
        }
        c = { sig, alocacoes, porApiId, diag: new Map() };
        memo.set(state, c);
    }
    return c;
}

/* ==========================================================================
   Validação (mesmas regras do servidor) no formato que as telas esperam
   ========================================================================== */

function sobrepoe(h1, h2) {
    return D.horario.haSobreposicao(h1, h2);
}

function problemaDe(state, turma, espaco, v, ctx) {
    const outras = ctx.alocacoes.filter((a) => a.turma.id !== turma.apiId && sobrepoe(turma.horario, a.horarioCodigo));
    const turmaDe = (a) => ctx.porApiId.get(a.turma.id);
    switch (v.regra) {
        case "RN-01": {
            const siapes = new Set(turma.professores.map((id) => state.professores.find((p) => p.id === id)?.siape));
            const afetadas = outras.filter((a) => a.turma.professores.some((p) => siapes.has(p.matriculaSiape))).map(turmaDe).filter(Boolean);
            return { tipo: "docente", categoria: "Professor", regra: v.regra, resumoCurto: "Docente em duas turmas no mesmo horário",
                detalhe: afetadas.length ? `${turma.professor} também está em ${afetadas.map((x) => x.codigo).join(", ")} no mesmo horário.` : v.mensagem,
                afetadas: [turma, ...afetadas] };
        }
        case "RN-02":
            return { tipo: "docente", categoria: "Disponibilidade", regra: v.regra, resumoCurto: "Docente indisponível neste horário", detalhe: v.mensagem, afetadas: [turma] };
        case "RN-03":
            return { tipo: "capacidade", categoria: "Capacidade", regra: v.regra,
                resumoCurto: `Sala comporta ${espaco ? espaco.capacidade : 0} de ${turma.alunos} estudantes`, detalhe: v.mensagem, afetadas: [turma] };
        case "RN-04":
            return { tipo: "sala", categoria: "Ambiente", regra: v.regra, resumoCurto: "Exige laboratório", detalhe: v.mensagem, afetadas: [turma] };
        case "SALA": {
            const afetadas = outras.filter((a) => espaco && a.sala.id === espaco.apiId).map(turmaDe).filter(Boolean);
            return { tipo: "sala", categoria: "Sala", regra: v.regra, resumoCurto: `${espaco ? espaco.nome : "Sala"} ocupada no mesmo horário`,
                detalhe: afetadas.length ? `${espaco.nome} já tem ${afetadas.map((x) => x.codigo).join(", ")} nesse horário.` : v.mensagem,
                afetadas: [turma, ...afetadas] };
        }
        case "ESCOPO":
            return { tipo: "sala", categoria: "Espaço", regra: v.regra, resumoCurto: "Sala fora do pool do IC", detalhe: v.mensagem, afetadas: [turma] };
        case "TURNO":
            return { tipo: "horario", categoria: "Turno", regra: v.regra, resumoCurto: "Turno fora do curso", detalhe: v.mensagem, afetadas: [turma] };
        default:
            return { tipo: "horario", categoria: "Encontros", regra: v.regra, resumoCurto: "Formato do horário", detalhe: v.mensagem, afetadas: [turma] };
    }
}

/** Diagnóstico de uma turma (o mesmo validador do servidor + o status local do espaço). */
function inspecionarTurma(state, turma) {
    if (!turma.sala || !turma.horario || !turma.aulas || turma.aulas.length === 0) {
        const falta = [!turma.horario || !turma.aulas?.length ? "horário" : null, !turma.sala ? "sala" : null,
            !(turma.professores || []).length ? "docente" : null].filter(Boolean);
        return { alocada: false, problemas: [], checks: [{ ok: false, rotulo: `Sem ${falta.join(" e ") || "sala"} definido` }] };
    }
    const ctx = contexto(state);
    if (ctx.diag.has(turma.id)) return ctx.diag.get(turma.id);

    const espaco = state.espacos.find((e) => e.id === turma.sala);
    const problemas = [];
    if (!espaco) {
        problemas.push({ tipo: "sala", categoria: "Espaço", resumoCurto: "Espaço inexistente", detalhe: `O espaço ${turma.sala} não existe.`, afetadas: [turma] });
    } else {
        if (espaco.status !== "Disponível") {
            problemas.push({ tipo: "sala", categoria: "Espaço", resumoCurto: "Espaço indisponível",
                detalhe: `${espaco.nome} está em ${espaco.status.toLowerCase()} (marcado nesta sessão).`, afetadas: [turma] });
        }
        for (const v of D.validador.diagnosticarViolacoes(turmaApi(state, turma), salaApi(espaco), ctx.alocacoes, turma.horario)) {
            problemas.push(problemaDe(state, turma, espaco, v, ctx));
        }
    }
    if (!(turma.professores || []).length) {
        problemas.push({ tipo: "docente", categoria: "Professor", resumoCurto: "Turma sem docente", detalhe: "Defina um docente para a turma.", afetadas: [turma] });
    }

    const profOk = !problemas.some((p) => p.tipo === "docente");
    const ambOk = Boolean(espaco) && !problemas.some((p) => p.categoria === "Ambiente" || p.categoria === "Espaço");
    const capOk = Boolean(espaco) && turma.alunos <= espaco.capacidade;
    const r = {
        alocada: true,
        problemas,
        checks: [
            { ok: profOk, rotulo: profOk ? "docentes disponíveis" : "conflito de horário docente" },
            { ok: ambOk, rotulo: ambOk ? "ambiente compatível" : "ambiente incompatível" },
            { ok: capOk, rotulo: capOk ? "capacidade suficiente" : `capacidade insuficiente (${espaco ? espaco.capacidade : 0}/${turma.alunos})` }
        ]
    };
    ctx.diag.set(turma.id, r);
    return r;
}

/** A turma ocupa a aula (ex.: dia "TER", aula "M3")? */
function ocupa(turma, dia, aula) {
    return Boolean(turma.aulas && turma.aulas.includes(`${dia}-${aula}`));
}

/** Bloco contínuo da turma num dia (aulas em ordem), ex.: ["TER-M3", "TER-M4"]. */
function blocoDoDia(turma, dia) {
    return (turma.aulas || []).filter((a) => a.startsWith(`${dia}-`));
}

/* ==========================================================================
   Escolha de sala e movimentos (mesmo critério do motor do servidor)
   ========================================================================== */

function salasCandidatas(state, turma) {
    const teorica = turma.ambienteExigido !== "Laboratório";
    return state.espacos
        .filter((e) => e.status === "Disponível" && (turma.requerAlocacaoIc === false || e.alocavelIc !== false))
        .filter((e) => e.capacidade >= turma.alunos && (!turma.exigeLaboratorio || e.tipo === "Laboratório"))
        .sort((a, b) => {
            const labA = a.tipo === "Laboratório", labB = b.tipo === "Laboratório";
            if (teorica && labA !== labB) return labA ? 1 : -1; // preserva laboratórios para quem precisa
            return a.capacidade - b.capacidade || a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" });
        });
}

/**
 * Sala para a turma num horário: mantém a atual se continuar válida; senão a melhor livre.
 * Devolve { sala, origem, violacoes } (sala null quando nada serve).
 */
function resolverSala(state, turma, horario) {
    const ctx = contexto(state);
    const tApi = turmaApi(state, turma, horario);
    const diagnosticar = (e) => D.validador.diagnosticarViolacoes(tApi, salaApi(e), ctx.alocacoes, horario);
    const atual = turma.sala ? state.espacos.find((e) => e.id === turma.sala) : null;
    if (atual && atual.status === "Disponível") {
        const v = diagnosticar(atual);
        if (v.length === 0) return { sala: atual.id, origem: "mantida", violacoes: [] };
    }
    // Regras que não dependem da sala: se falham, nenhuma sala resolve
    const referencia = atual || salasCandidatas(state, turma)[0] || state.espacos[0];
    const independentes = referencia ? diagnosticar(referencia).filter((v) => ["RN-01", "RN-02", "FORMATO", "TURNO"].includes(v.regra)) : [];
    if (independentes.length > 0) return { sala: null, origem: null, violacoes: independentes };
    for (const e of salasCandidatas(state, turma)) {
        if (diagnosticar(e).length === 0) return { sala: e.id, origem: "sugerida", violacoes: [] };
    }
    return { sala: null, origem: null, violacoes: [{ regra: "SALA", mensagem: "Nenhuma sala compatível livre nesse horário." }] };
}

const MOTIVO_CURTO = {
    "RN-01": "Choque docente",
    "RN-02": "Docente indisponível",
    "RN-03": "Sem sala que comporte",
    "RN-04": "Sem lab livre",
    SALA: "Sem sala livre",
    ESCOPO: "Fora do IC",
    FORMATO: "Formato inválido",
    TURNO: "Turno fora do curso"
};

/**
 * Viabilidade de soltar a turma na aula (dia, aula):
 *  - movendo um bloco (state.movimento.diaOrigem): o bloco daquele dia vai para o dia/aula alvo,
 *    com o mesmo tamanho; o resto do horário fica igual;
 *  - turma sem sala mas com horário: só as aulas do próprio horário são destino (ganha sala);
 *  - turma sem horário: recebe um bloco com as aulas por semana dela, a partir da aula alvo.
 * Devolve { valido, motivo, dias, salaSugerida, novoHorario, violacoes }.
 */
function verificarViabilidadeSlot(state, turma, diaAlvo, aulaAlvo) {
    const invalido = (motivo, violacoes = []) => ({ valido: false, motivo, dias: [diaAlvo], salaSugerida: null, novoHorario: null, violacoes });
    const turno = aulaAlvo[0];
    const inicio = Number(aulaAlvo.slice(1));
    const maxTurno = D.grade.AULAS_POR_TURNO[turno];
    const mov = state.movimento && state.movimento.turmaId === turma.id ? state.movimento : null;

    let novasAulas;
    if (mov && mov.diaOrigem) {
        const bloco = blocoDoDia(turma, mov.diaOrigem);
        const tamanho = bloco.length;
        if (inicio + tamanho - 1 > maxTurno) return invalido(`Não cabe: bloco de ${tamanho} aula(s)`);
        const resto = turma.aulas.filter((a) => !bloco.includes(a));
        if (resto.some((a) => a.startsWith(`${diaAlvo}-`))) return invalido("Já tem aula nesse dia");
        novasAulas = [...resto];
        for (let i = 0; i < tamanho; i++) novasAulas.push(`${diaAlvo}-${turno}${inicio + i}`);
    } else if (turma.horario && turma.aulas.length > 0) {
        if (!turma.aulas.includes(`${diaAlvo}-${aulaAlvo}`)) return invalido("Fora do horário da turma");
        novasAulas = [...turma.aulas];
    } else {
        const tamanho = turma.aulasSemanais || 2;
        if (inicio + tamanho - 1 > maxTurno) return invalido(`Não cabe: ${tamanho} aula(s) seguidas`);
        novasAulas = [];
        for (let i = 0; i < tamanho; i++) novasAulas.push(`${diaAlvo}-${turno}${inicio + i}`);
    }

    const novoHorario = D.grade.montarHorarioSigaa(novasAulas);
    const r = resolverSala(state, turma, novoHorario);
    if (!r.sala) {
        const primeira = r.violacoes[0];
        return invalido(primeira ? (MOTIVO_CURTO[primeira.regra] || primeira.mensagem) : "Sem sala livre", r.violacoes);
    }
    return { valido: true, motivo: `${state.espacos.find((e) => e.id === r.sala)?.nome} livre`, dias: [diaAlvo], salaSugerida: r.sala, origemSala: r.origem, novoHorario, violacoes: [] };
}

/* ==========================================================================
   Rascunho de mudanças ("Confirmar tudo" / "Descartar")
   ========================================================================== */

function definirHorario(turma, horario) {
    turma.horario = horario || "";
    recalcularAulas(turma);
}

/** Registra (ou desfaz) a mudança da turma no rascunho, comparando com o que está salvo. */
function registrarRascunho(state, turma) {
    const orig = state.original ? state.original[turma.id] : null;
    delete state.recusas[turma.id];
    if (orig && orig.sala === turma.sala && orig.horario === turma.horario) {
        delete state.rascunho[turma.id];
        return;
    }
    state.rascunho[turma.id] = turma.sala && turma.horario
        ? { turmaId: turma.apiId, salaId: Number(turma.sala), horario: turma.horario }
        : { turmaId: turma.apiId, acao: "remover" };
}

function moverTurma(state, turma, { sala, horario }) {
    if (horario !== undefined) definirHorario(turma, horario);
    if (sala !== undefined) turma.sala = sala;
    registrarRascunho(state, turma);
}

function contarRascunho(state) {
    return Object.keys(state.rascunho || {}).length;
}

/**
 * Envia o rascunho para /api/alocacoes/confirmar-lote e recarrega do servidor.
 * As mudanças recusadas voltam para o rascunho, marcadas com o motivo (state.recusas).
 */
async function confirmarRascunho(state) {
    const ids = Object.keys(state.rascunho);
    if (ids.length === 0) return { estado: state, aceitos: 0, recusados: 0, resultados: [] };
    const movimentos = ids.map((id) => state.rascunho[id]);
    const { corpo } = await requisitar("POST", "/api/alocacoes/confirmar-lote", { movimentos });
    const novo = await carregar(state.semestre);
    // Mantém as configurações locais da sessão (status de espaços, disponibilidades, publicação)
    preservarLocais(state, novo);
    for (const r of corpo.resultados) {
        if (r.sucesso) continue;
        const mov = movimentos[r.indice];
        const t = novo.turmas.find((x) => x.apiId === mov.turmaId);
        if (!t) continue;
        if (mov.acao === "remover") moverTurma(novo, t, { sala: null });
        else moverTurma(novo, t, { sala: mov.salaId != null ? String(mov.salaId) : t.sala, horario: mov.horario });
        novo.recusas[t.id] = r.violacoes || [{ regra: "?", mensagem: r.mensagem }];
    }
    return { estado: novo, aceitos: corpo.aceitos, recusados: corpo.recusados, resultados: corpo.resultados };
}

async function descartarRascunho(state) {
    const novo = await carregar(state.semestre);
    preservarLocais(state, novo);
    return novo;
}

/** Configurações que só existem no navegador (sem rota no back ainda). */
function preservarLocais(antigo, novo) {
    for (const e of novo.espacos) {
        const a = antigo.espacos.find((x) => x.id === e.id);
        if (a) Object.assign(e, { status: a.status, equipamentos: a.equipamentos, observacao: a.observacao, pcs: a.pcs });
    }
    for (const e of antigo.espacos) if (!novo.espacos.some((x) => x.id === e.id)) novo.espacos.push(e);
    for (const p of novo.professores) {
        const a = antigo.professores.find((x) => x.siape === p.siape);
        if (a) Object.assign(p, { disponibilidade: a.disponibilidade, regime: a.regime, cargaMax: a.cargaMax });
    }
    novo.publicada = antigo.publicada;
    novo.permitirMudarFormato = antigo.permitirMudarFormato || {};
}

/* ==========================================================================
   Conflitos e motor de sugestões do servidor
   ========================================================================== */

/** Busca as sugestões do motor (horário + sala) no servidor. Não grava nada. */
async function buscarSugestoes(state, opcoes = {}) {
    const permitir = Object.entries(state.permitirMudarFormato || {}).filter(([, v]) => v).map(([id]) => Number(id));
    const movimentos = Object.values(state.rascunho || {});
    const { corpo } = await requisitar("POST", "/api/alocacoes/sugestoes", {
        semestre: state.semestre,
        // O motor enxerga os conflitos criados no rascunho (aplicado só em memória no servidor)
        ...(movimentos.length ? { movimentos } : {}),
        ...(opcoes.alvos ? { alvos: opcoes.alvos } : {}),
        ...(permitir.length ? { permitirMudarFormato: permitir } : {})
    });
    state.sugestoes = corpo;
    return corpo;
}

function aplicarMudancas(state, mudancas) {
    for (const m of mudancas) {
        const t = state.turmas.find((x) => x.apiId === m.turmaId);
        if (t) moverTurma(state, t, { sala: String(m.para.salaId), horario: m.para.horario });
    }
}

function rotuloCusto(custo) {
    const partes = [];
    if (custo.mudancasDeSala) partes.push(`${custo.mudancasDeSala} troca(s) de sala`);
    if (custo.mudancasDeHorario) partes.push(`${custo.mudancasDeHorario} mudança(s) de horário`);
    return `${partes.join(" · ") || "sem mudanças"} · validado pelo servidor`;
}

/** Lista para a Central de Conflitos; alternativas vêm do motor do servidor (buscarSugestoes). */
function obterConflitosConsolidados(state) {
    const lista = [];
    const vistos = new Set();
    const sug = state.sugestoes;
    for (const turma of state.turmas) {
        const diag = inspecionarTurma(state, turma);
        if (!diag.alocada || diag.problemas.length === 0) continue;
        const chaveDupla = diag.problemas.length === 1 && diag.problemas[0].afetadas.length > 1
            ? `${diag.problemas[0].categoria}:${diag.problemas[0].afetadas.map((t) => t.id).sort().join("-")}` : null;
        if (chaveDupla && vistos.has(chaveDupla)) continue;
        if (chaveDupla) vistos.add(chaveDupla);

        const alternativas = [];
        const doMotor = sug && sug.alternativasPorTurma ? sug.alternativasPorTurma[turma.apiId] || [] : [];
        doMotor.forEach((s, i) => alternativas.push({
            id: `motor-${turma.apiId}-${i}`,
            descricao: s.descricao,
            impacto: rotuloCusto(s.custo),
            aplicar: (st) => aplicarMudancas(st, s.mudancas)
        }));
        lista.push({
            id: `conf-${turma.id}`,
            turmaId: turma.id,
            codigo: turma.codigo,
            disciplina: turma.disciplina,
            problemas: diag.problemas,
            resumoPrincipal: diag.problemas[0].resumoCurto,
            tipos: diag.problemas.map((p) => p.tipo),
            alternativas,
            semSugestoes: !sug
        });
    }
    return lista;
}

/* ==========================================================================
   Outros
   ========================================================================== */

/** Aulas de 50 min por semana do docente (todas as turmas em que ele está). */
function calcularCargaDocente(state, id) {
    return state.turmas.filter((t) => (t.professores || []).includes(id))
        .reduce((total, t) => total + (t.aulas ? t.aulas.length : 0), 0);
}

/** Mantido pelo nome antigo: o "Gerar grade" agora consolida via motor do servidor (buscarSugestoes). */
async function gerarPropostaGrade(state) {
    const s = await buscarSugestoes(state);
    return s;
}

window.SATIC_DATA = {
    API_PADRAO,
    SLOTS_INSTITUCIONAIS,
    DIAS_SEMANA,
    NOME_TURNO,
    ErroApi,
    baseApi,
    carregar,
    carregarDominio,
    usarDominio,
    montarEstado,
    criarDadosIniciais,
    inspecionarTurma,
    obterConflitosConsolidados,
    verificarViabilidadeSlot,
    resolverSala,
    ocupa,
    blocoDoDia,
    moverTurma,
    registrarRascunho,
    contarRascunho,
    confirmarRascunho,
    descartarRascunho,
    buscarSugestoes,
    aplicarMudancas,
    gerarPropostaGrade,
    calcularCargaDocente,
    dominio: () => D
};

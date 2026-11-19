/**
 * SATIC — Sistema de Alocação de Turmas (IC / UFAL)
 * Arquivo: js/app.js
 * Objetivo: Controlador central de estado, renderização das 6 telas, drag-and-drop e drawers contextuais
 */

(function () {
    const { SLOTS_INSTITUCIONAIS, DIAS_SEMANA, criarDadosIniciais, inspecionarTurma, obterConflitosConsolidados, verificarViabilidadeSlot,
        ocupa, blocoDoDia, moverTurma, contarRascunho } = window.SATIC_DATA;
    const ICONS = window.SATIC_ICONS;

    const appState = {
        dados: criarDadosIniciais(),
        telaAtiva: "tela-matriz",

        matriz: {
            busca: "",
            turno: "todos",
            curso: "todos",
            periodo: "todos",
            espaco: "todos",
            professor: "todos",
            filtrosAbertos: false,
            painelPendentesRecolhido: false,
            turmaSelecionadaId: null,
            modoEdicaoDrawer: false,
            turmaEmMovimentoId: null
        },

        conflitos: {
            filtro: "todos",
            conflitoSelecionadoId: null
        },

        espacos: {
            busca: "",
            tipo: "todos",
            status: "todos",
            espacoSelecionadoId: null,
            modoEdicao: false,
            criandoNovo: false
        },

        turmas: {
            busca: "",
            curso: "todos",
            periodo: "todos",
            professor: "todos",
            status: "todos",
            ambiente: "todos",
            filtrosAbertos: false,
            turmaSelecionadaId: null,
            modoEdicao: false
        },

        professores: {
            busca: "",
            status: "todos",
            professorSelecionadoId: null,
            slotSelecionado: null
        }
    };

    let toastTimer = null;
    let assinaturaPublicada = null;

    function cursosDe(t) {
        return String(t.curso || "").split(",").map((c) => c.trim()).filter(Boolean);
    }

    /** Docentes da turma: "Ranilson Paiva" ou "Willy Tiengo +3" (co-docência). */
    function rotuloDocentes(t) {
        const ids = t.professores && t.professores.length ? t.professores : (t.professor ? [t.professor] : []);
        if (ids.length === 0) return "Sem docente";
        return ids.length === 1 ? ids[0] : `${ids[0]} +${ids.length - 1}`;
    }

    /** Horário legível em blocos: "TER/QUI M3–M4", "SEX M3–M6", "SEG T5–T6 · SEX T1–T2". */
    function rotuloHorario(t) {
        const D = window.SATIC_DATA.dominio();
        if (!t || !t.horario || !D) return "Sem horário";
        const blocos = D.grade.blocosDoHorario(t.horario);
        const grupos = new Map();
        blocos.forEach((b) => {
            const faixa = b.inicio === b.fim ? `${b.turno}${b.inicio}` : `${b.turno}${b.inicio}–${b.turno}${b.fim}`;
            grupos.set(faixa, [...(grupos.get(faixa) || []), b.dia]);
        });
        return [...grupos.entries()].map(([faixa, dias]) => `${dias.join("/")} ${faixa}`).join(" · ");
    }

    function escapar(valor) {
        return String(valor ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    }

    function nomeEspaco(id) {
        return appState.dados.espacos.find((e) => e.id === id)?.nome || id || 'Sem sala';
    }

    let focoAntesModal = null;
    function focarModal(modal) {
        if (!document.querySelector('.modal-backdrop.is-open') || !focoAntesModal) focoAntesModal = document.activeElement;
        document.querySelector('.app-shell').inert = true;
        modal.querySelector('input, button, select')?.focus();
    }
    function restaurarFocoModal() {
        const aberto = document.querySelector('.modal-backdrop.is-open');
        document.querySelector('.app-shell').inert = Boolean(aberto);
        if (!aberto) { focoAntesModal?.focus(); focoAntesModal = null; }
    }

    function assinaturaDados() {
        return JSON.stringify([appState.dados.turmas, appState.dados.espacos, appState.dados.professores]);
    }

    function atualizarOpcoesFiltro(id, itens, valor) {
        const select = document.getElementById(id);
        if (!select) return;
        const primeira = select.options[0].cloneNode(true);
        select.replaceChildren(primeira);
        itens.forEach((item) => select.add(new Option(item.nome, item.id)));
        select.value = valor;
    }

    function mostrarToast(mensagem) {
        const toast = document.getElementById("status-toast");
        const texto = document.getElementById("status-toast-text");
        if (!toast || !texto) return;

        texto.textContent = mensagem;
        toast.classList.add("is-visible");
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toast.classList.remove("is-visible");
        }, 3200);
    }

    function aplicarLargurasBarras(rootEl) {
        if (!rootEl) return;
        rootEl.querySelectorAll("[data-bar-width]").forEach((el) => {
            el.style.width = `${el.getAttribute("data-bar-width")}%`;
        });
    }

    function navegarPara(idTela, opcoes = {}) {
        if (!document.getElementById(idTela)?.classList.contains("view-screen")) return;
        if (idTela !== appState.telaAtiva) appState.matriz.turmaEmMovimentoId = null;
        appState.matriz.filtrosAbertos = false;
        appState.turmas.filtrosAbertos = false;
        document.querySelectorAll(".dropdown-menu.is-open").forEach((m) => m.classList.remove("is-open"));
        if (opcoes.selecionarTurmaMatriz || opcoes.iniciarAlocacaoTurma) {
            Object.assign(appState.matriz, {
                busca: "",
                turno: "todos",
                curso: "todos",
                periodo: "todos",
                espaco: "todos",
                professor: "todos"
            });
        }
        appState.telaAtiva = idTela;

        document.querySelectorAll(".view-screen").forEach((el) => {
            el.classList.toggle("active", el.id === idTela);
        });

        document.querySelectorAll("[data-nav-target]").forEach((btn) => {
            const alvo = btn.getAttribute("data-nav-target");
            const isPub = btn.hasAttribute("data-nav-pub");
            if (isPub) {
                btn.classList.toggle("active", idTela === "tela-conflitos" && Boolean(opcoes.focoPublicacao));
            } else {
                btn.classList.toggle("active", alvo === idTela && !opcoes.focoPublicacao);
            }
        });

        if (opcoes.selecionarTurmaMatriz) {
            appState.matriz.turmaSelecionadaId = opcoes.selecionarTurmaMatriz;
            appState.matriz.modoEdicaoDrawer = false;
        }

        if (opcoes.iniciarAlocacaoTurma) {
            appState.matriz.painelPendentesRecolhido = false;
            appState.matriz.turmaSelecionadaId = opcoes.iniciarAlocacaoTurma;
            appState.matriz.turmaEmMovimentoId = opcoes.iniciarAlocacaoTurma;
            appState.matriz.modoEdicaoDrawer = false;
        }

        if (opcoes.selecionarConflito) {
            appState.conflitos.conflitoSelecionadoId = opcoes.selecionarConflito;
        }

        renderizarTudo();

        if (opcoes.focoPublicacao) {
            const pubEl = document.getElementById("secao-publicacao-proposta");
            if (pubEl) pubEl.scrollIntoView({ behavior: "smooth" });
        }
    }

    function atualizarBadgesNavegacao() {
        document.querySelectorAll('.app-topnav [data-nav-target]').forEach((btn) => {
            if (btn.classList.contains('active')) btn.setAttribute('aria-current', 'page');
            else btn.removeAttribute('aria-current');
        });
        const conflitos = obterConflitosConsolidados(appState.dados);
        const badgeConflitos = document.getElementById("nav-conflict-count");
        if (badgeConflitos) {
            badgeConflitos.textContent = conflitos.length;
            badgeConflitos.hidden = conflitos.length === 0;
        }
    }

    /* ==========================================================================
       1. VISÃO GERAL DO SEMESTRE (#tela-painel)
       ========================================================================== */
    function renderizarPainelGeral() {
        const container = document.getElementById("overview-content");
        if (!container) return;

        const todasTurmas = appState.dados.turmas;
        const alocadas = todasTurmas.filter((t) => Boolean(t.sala && t.slot));
        const pendentes = todasTurmas.filter((t) => !t.sala || !t.slot);
        const conflitos = obterConflitosConsolidados(appState.dados);
        const percentual = Math.round((alocadas.length / todasTurmas.length) * 100);

        const itensPrioritarios = [
            ...conflitos.map((c) => {
                const turma = todasTurmas.find((t) => t.id === c.turmaId);
                const diag = turma ? inspecionarTurma(appState.dados, turma) : { problemas: c.problemas };
                const info = turma ? obterRotuloConflito(turma, diag) : { curtoHtml: escapar(c.problemas[0].categoria), resumoTooltip: c.resumoPrincipal };
                return {
                    codigo: c.codigo,
                    disciplina: c.disciplina,
                    detalhe: `${rotuloRegraProblema(c.problemas[0].categoria)} · ${escapar(c.problemas[0].detalhe)}`,
                    badgeHtml: `<span class="event-conflict-badge" title="${escapar(info.resumoTooltip)}">${info.curtoHtml}</span>`,
                    acaoTexto: "Resolver",
                    acaoTipo: "resolver-conflito",
                    alvoId: c.id
                };
            }),
            ...pendentes.map((p) => ({
                codigo: p.codigo,
                disciplina: p.disciplina,
                detalhe: `${escapar(rotuloDocentes(p))} · ${p.alunos} alunos`,
                badgeHtml: `<span class="status-pill is-pending">Sem sala</span>`,
                acaoTexto: "Alocar",
                acaoTipo: "alocar-matriz",
                alvoId: p.id
            }))
        ];

        const linhasOcupacao = appState.dados.espacos.map((esp) => {
            const slotsUsados = new Set();
            alocadas.forEach((t) => {
                if (t.sala === esp.id) (t.aulas || []).forEach((a) => slotsUsados.add(a));
            });
            const taxa = Math.min(100, Math.round((slotsUsados.size / (SLOTS_INSTITUCIONAIS.length * DIAS_SEMANA.length)) * 100));
            return {
                id: esp.id,
                nome: esp.nome,
                capacidade: esp.capacidade,
                taxa
            };
        });

        const periodos = ["CC", "EC", "IA"];
        const linhasPeriodo = periodos.map((per) => {
            const doPeriodo = todasTurmas.filter((t) => cursosDe(t).includes(per));
            const alocadasPer = doPeriodo.filter((t) => Boolean(t.sala && t.slot));
            const temConflito = doPeriodo.some((t) => inspecionarTurma(appState.dados, t).problemas.length > 0);
            return {
                periodo: per,
                total: doPeriodo.length,
                alocadas: alocadasPer.length,
                temConflito
            };
        });

        container.innerHTML = `
            <div class="overview-hero">
                <div>
                    <div class="overview-semester-tag">${appState.dados.semestre}</div>
                    <div class="overview-courses-sub">Ciência da Computação · Engenharia da Computação · Inteligência Artificial</div>
                </div>
                <div class="overview-completion">
                    <div class="overview-completion-label"><span class="mono-num">${percentual}%</span> alocado</div>
                    <div class="thin-progress" aria-hidden="true">
                        <div class="thin-progress-bar" data-bar-width="${percentual}"></div>
                    </div>
                </div>
            </div>

            <div class="overview-stats-strip">
                <button type="button" class="stat-inline-item" data-overview-jump="tela-turmas">
                    <strong>${todasTurmas.length}</strong> <span>turmas</span>
                </button>
                <button type="button" class="stat-inline-item" data-overview-jump="tela-matriz">
                    <strong>${alocadas.length}</strong> <span>alocadas</span>
                </button>
                <button type="button" class="stat-inline-item" data-overview-jump="tela-matriz">
                    <strong>${pendentes.length}</strong> <span>pendentes</span>
                </button>
                <button type="button" class="stat-inline-item ${conflitos.length > 0 ? "is-alert" : ""}" data-overview-jump="tela-conflitos">
                    <strong>${conflitos.length}</strong> <span>${conflitos.length === 1 ? "conflito" : "conflitos"}</span>
                </button>
            </div>

            <section class="overview-section" aria-labelledby="sec-pendencias-heading">
                <div class="section-header-row">
                    <h2 class="section-heading" id="sec-pendencias-heading">Pendências prioritárias</h2>
                    <button type="button" class="section-link" data-overview-jump="tela-conflitos">Ver todas</button>
                </div>

                ${
                    itensPrioritarios.length === 0
                        ? `<div class="empty-state-note">Todas as <span class="mono-num">${todasTurmas.length}</span> turmas estão alocadas sem conflitos pendentes. Proposta pronta para publicação.</div>`
                        : `<div class="compact-list">
                            ${itensPrioritarios
                                .map(
                                    (item) => `
                                <div class="compact-list-row">
                                    <span class="cell-mono">${item.codigo}</span>
                                    <span class="cell-primary">${escapar(item.disciplina)}</span>
                                    <span class="cell-muted">${item.detalhe}</span>
                                    <div>${item.badgeHtml}</div>
                                    <button type="button" class="row-action-btn" data-priority-action="${item.acaoTipo}" data-priority-id="${item.alvoId}">
                                        ${item.acaoTexto}
                                    </button>
                                </div>`
                                )
                                .join("")}
                        </div>`
                }
            </section>

            <div class="overview-two-cols">
                <section aria-labelledby="sec-ocupacao-heading">
                    <div class="section-header-row">
                        <h2 class="section-heading" id="sec-ocupacao-heading">Ocupação dos espaços</h2>
                        <button type="button" class="section-link" data-overview-jump="tela-espacos">Espaços</button>
                    </div>
                    <div>
                        ${linhasOcupacao
                            .map(
                                (esp) => `
                            <div class="compact-metric-row">
                                <div>
                                    <span class="cell-primary">${escapar(esp.nome)}</span>
                                    <span class="cell-muted"> · <span class="mono-num">${esp.capacidade}</span> lug.</span>
                                </div>
                                <div class="mini-bar-track" aria-hidden="true">
                                    <div class="mini-bar-fill ${esp.taxa >= 85 ? "is-critical" : esp.taxa >= 70 ? "is-high" : ""}" data-bar-width="${esp.taxa}"></div>
                                </div>
                                <span class="cell-mono tabular-nums text-right">${esp.taxa}%</span>
                            </div>`
                            )
                            .join("")}
                    </div>
                </section>

                <section aria-labelledby="sec-periodos-heading">
                    <div class="section-header-row">
                        <h2 class="section-heading" id="sec-periodos-heading">Progresso por curso</h2>
                        <button type="button" class="section-link" data-overview-jump="tela-matriz">Abrir grade</button>
                    </div>
                    <div>
                        ${linhasPeriodo
                            .map((p) => {
                                let statusHtml = `<span class="status-pill is-valid">Concluído</span>`;
                                if (p.temConflito) {
                                    statusHtml = `<span class="status-pill is-conflict">Conflito</span>`;
                                } else if (p.alocadas < p.total) {
                                    statusHtml = `<span class="status-pill is-pending"><span class="mono-num">${p.total - p.alocadas}</span> pendente</span>`;
                                }
                                return `
                                <div class="compact-metric-row">
                                    <span class="cell-primary">${p.periodo}</span>
                                    <span class="cell-mono tabular-nums">${p.alocadas} / ${p.total} turmas</span>
                                    <div class="text-right">${statusHtml}</div>
                                </div>`;
                            })
                            .join("")}
                    </div>
                </section>
            </div>
        `;

        aplicarLargurasBarras(container);
    }

    /* ==========================================================================
       2. GRADE HORÁRIA (#tela-matriz)
       ========================================================================== */
    function nomeCompletoProfessor(profId) {
        return appState.dados.professores.find((p) => p.id === profId)?.nome || profId || "";
    }

    function contarFiltrosMatrizAtivos() {
        const { curso, periodo, espaco, professor } = appState.matriz;
        return [curso, periodo, espaco, professor].filter((v) => v !== "todos").length;
    }

    function obterRotuloConflito(turma, diag) {
        const prioridades = {
            Professor: 1,
            Disponibilidade: 2,
            Ambiente: 3,
            Capacidade: 4,
            Sala: 5,
            Espaço: 6,
            Encontros: 7
        };
        const itens = diag.problemas.map((p) => {
            if (p.categoria === "Professor") {
                return { prio: prioridades.Professor, rn: "RN-01", curtoHtml: "Choque docente", texto: "Choque docente" };
            }
            if (p.categoria === "Disponibilidade") {
                return { prio: prioridades.Disponibilidade, rn: "RN-02", curtoHtml: "Indisponível", texto: "Indisponível" };
            }
            if (p.categoria === "Ambiente") {
                const rot = turma.ambienteExigido === "Laboratório" ? "Exige lab" : "Exige auditório";
                return { prio: prioridades.Ambiente, rn: "RN-04", curtoHtml: rot, texto: rot };
            }
            if (p.categoria === "Capacidade") {
                const esp = appState.dados.espacos.find((e) => e.id === turma.sala);
                const cap = esp ? esp.capacidade : 0;
                return {
                    prio: prioridades.Capacidade,
                    rn: "RN-03",
                    curtoHtml: `Lotação <span class="mono-num">${turma.alunos}/${cap}</span>`,
                    texto: `Lotação ${turma.alunos}/${cap}`
                };
            }
            if (p.categoria === "Sala") {
                return { prio: prioridades.Sala, rn: "Sala", curtoHtml: "Choque sala", texto: "Choque sala" };
            }
            if (p.categoria === "Espaço") {
                return { prio: prioridades.Espaço, rn: "Espaço", curtoHtml: "Sala indisponível", texto: "Sala indisponível" };
            }
            return { prio: prioridades.Encontros, rn: "Encontros", curtoHtml: "Encontros", texto: "Encontros incompletos" };
        });
        itens.sort((a, b) => a.prio - b.prio);
        const principal = itens[0];
        const extra = itens.length > 1 ? ` <span class="mono-num">+${itens.length - 1}</span>` : "";
        return {
            curtoHtml: `${principal.curtoHtml}${extra}`,
            resumoTooltip: itens.map((i) => `${i.rn}: ${i.texto}`).join(" · ")
        };
    }

    function formatarMotivoBloqueio(viabilidade, turma) {
        const motivo = viabilidade.motivo || "";
        if (motivo.endsWith(" indisponível")) {
            return `Indisponível: ${motivo.replace(/ indisponível$/, "")}`;
        }
        if (motivo.startsWith("Choque docente (")) {
            return `Choque: ${motivo.slice("Choque docente (".length, -1)}`;
        }
        if (motivo === "Sem sala compatível livre") {
            if (turma.ambienteExigido === "Laboratório") return "Sem lab livre";
            if (turma.ambienteExigido === "Auditório") return "Sem auditório livre";
            return "Sem sala livre";
        }
        return motivo;
    }

    function rotuloRegraProblema(categoria) {
        const mapa = {
            Professor: "RN-01 · Choque docente",
            Disponibilidade: "RN-02 · Indisponibilidade docente",
            Capacidade: "RN-03 · Capacidade física",
            Ambiente: "RN-04 · Adequação de ambiente",
            Sala: "Exclusividade de sala",
            Espaço: "Espaço indisponível",
            Encontros: "Encontros semanais"
        };
        return mapa[categoria] || categoria;
    }

    function renderizarChipsFiltrosMatriz() {
        const chipsEl = document.getElementById("matrix-active-chips");
        const filtrosBtn = document.getElementById("matrix-filters-btn");
        const filtrosCount = document.getElementById("matrix-filters-count");
        const popoverEl = document.getElementById("matrix-filters-popover");

        const { curso, periodo, espaco, professor, filtrosAbertos } = appState.matriz;
        const ativos = contarFiltrosMatrizAtivos();

        if (filtrosBtn) {
            filtrosBtn.classList.toggle("has-active", ativos > 0);
            filtrosBtn.setAttribute("aria-expanded", String(Boolean(filtrosAbertos)));
        }
        if (filtrosCount) {
            filtrosCount.textContent = ativos;
            filtrosCount.hidden = ativos === 0;
        }
        if (popoverEl) {
            popoverEl.classList.toggle("is-open", Boolean(filtrosAbertos));
        }

        if (!chipsEl) return;
        const itens = [];
        if (curso !== "todos") itens.push({ chave: "curso", rotulo: "Curso", valor: curso });
        if (periodo !== "todos") itens.push({ chave: "periodo", rotulo: "Período", valor: periodo });
        if (espaco !== "todos") itens.push({ chave: "espaco", rotulo: "Espaço", valor: nomeEspaco(espaco) });
        if (professor !== "todos") itens.push({ chave: "professor", rotulo: "Docente", valor: professor });

        if (itens.length === 0) {
            chipsEl.hidden = true;
            chipsEl.innerHTML = "";
            return;
        }

        chipsEl.hidden = false;
        chipsEl.innerHTML = `
            ${itens
                .map(
                    (it) => `
                <button type="button" class="filter-chip" data-remove-filter="${it.chave}" aria-label="Remover filtro ${it.rotulo}">
                    <span class="filter-chip-label">${it.rotulo}:</span>
                    <span>${escapar(it.valor)}</span>
                    <span class="filter-chip-close" aria-hidden="true">×</span>
                </button>`
                )
                .join("")}
            <button type="button" class="chips-clear-btn" data-clear-matrix-filters="true">Limpar filtros</button>
        `;
    }

    function renderizarMatriz() {
        const searchEl = document.getElementById("matrix-search");
        if (searchEl && searchEl.value !== appState.matriz.busca) {
            searchEl.value = appState.matriz.busca;
        }
        document.getElementById("matrix-filter-curso").value = appState.matriz.curso;
        document.getElementById("matrix-filter-periodo").value = appState.matriz.periodo;
        atualizarOpcoesFiltro("matrix-filter-espaco", appState.dados.espacos, appState.matriz.espaco);
        atualizarOpcoesFiltro("matrix-filter-professor", appState.dados.professores, appState.matriz.professor);

        document.querySelectorAll(".shift-seg-btn[data-shift]").forEach((btn) => {
            const ativo = btn.getAttribute("data-shift") === appState.matriz.turno;
            btn.classList.toggle("is-active", ativo);
            btn.setAttribute("aria-pressed", String(ativo));
        });

        renderizarChipsFiltrosMatriz();

        const panelEl = document.getElementById("matrix-unallocated-panel");
        const expandBtn = document.getElementById("matrix-expand-unallocated");
        const expandCountEl = document.getElementById("matrix-expand-count");
        const filaContainer = document.getElementById("matrix-unallocated-list");
        const countNaoAlocadas = document.getElementById("matrix-unallocated-count");
        const tbodyGrade = document.getElementById("matrix-schedule-tbody");
        const scheduleGridEl = document.getElementById("matrix-schedule-grid");
        const summaryEl = document.getElementById("matrix-summary-count");
        const movingInlineEl = document.getElementById("matrix-moving-inline");
        const movingTextEl = document.getElementById("matrix-moving-text");

        if (!filaContainer || !tbodyGrade) return;

        const termoBusca = appState.matriz.busca.trim().toLowerCase();
        const passaBusca = (t) => {
            if (!termoBusca) return true;
            const campos = [
                t.codigo,
                t.disciplina,
                t.professor,
                nomeCompletoProfessor(t.professor),
                t.sala || "",
                t.sala ? nomeEspaco(t.sala) : "",
                t.curso,
                t.periodo
            ];
            return campos.some((c) => String(c).toLowerCase().includes(termoBusca));
        };

        const passaFiltrosMatriz = (t) =>
            passaBusca(t) &&
            (appState.matriz.curso === "todos" || cursosDe(t).includes(appState.matriz.curso)) &&
            (appState.matriz.periodo === "todos" || t.periodo === appState.matriz.periodo) &&
            (appState.matriz.espaco === "todos" || t.sala === appState.matriz.espaco) &&
            (appState.matriz.professor === "todos" || (t.professores || []).includes(appState.matriz.professor));

        const todasNaoAlocadas = appState.dados.turmas.filter((t) => !t.sala || !t.slot);
        const naoAlocadas = todasNaoAlocadas.filter(
            (t) =>
                passaBusca(t) &&
                (appState.matriz.curso === "todos" || cursosDe(t).includes(appState.matriz.curso)) &&
                (appState.matriz.periodo === "todos" || t.periodo === appState.matriz.periodo) &&
                (appState.matriz.professor === "todos" || (t.professores || []).includes(appState.matriz.professor))
        );

        const semPendencias = todasNaoAlocadas.length === 0;
        const painelOculto = semPendencias || appState.matriz.painelPendentesRecolhido;

        if (panelEl) panelEl.hidden = painelOculto;
        if (expandBtn) expandBtn.hidden = semPendencias || !appState.matriz.painelPendentesRecolhido;
        if (expandCountEl) expandCountEl.textContent = todasNaoAlocadas.length;
        if (countNaoAlocadas) countNaoAlocadas.textContent = naoAlocadas.length;

        if (naoAlocadas.length === 0) {
            filaContainer.innerHTML = `<div class="empty-pane-note">Nenhuma pendência neste filtro.</div>`;
        } else {
            filaContainer.innerHTML = naoAlocadas
                .map((t) => {
                    const isMovingThis = appState.matriz.turmaEmMovimentoId === t.id;
                    const isSelected = isMovingThis || appState.matriz.turmaSelecionadaId === t.id;
                    const reqTexto =
                        t.ambienteExigido === "Laboratório"
                            ? " · exige lab"
                            : t.ambienteExigido === "Auditório"
                            ? " · auditório"
                            : "";
                    const tagAmbiente =
                        t.ambienteExigido === "Laboratório"
                            ? `<span class="unallocated-tag">LAB</span>`
                            : t.ambienteExigido === "Auditório"
                            ? `<span class="unallocated-tag">AUD</span>`
                            : "";

                    return `
                    <div
                        role="button"
                        tabindex="0"
                        class="unallocated-item ${isSelected ? "is-selected" : ""}"
                        draggable="true"
                        data-unallocated-id="${t.id}"
                        aria-pressed="${String(isMovingThis)}"
                    >
                        <div class="unallocated-code">
                            <span class="unallocated-code-left">
                                <span>${t.codigo}</span>
                                ${tagAmbiente}
                            </span>
                            <span>${escapar(t.curso)}</span>
                        </div>
                        <div class="unallocated-name">${escapar(t.disciplina)}</div>
                        <div class="unallocated-meta"><span class="mono-num">${t.alunos}</span> alunos${reqTexto} · ${escapar(rotuloDocentes(t))}</div>
                        ${
                            isMovingThis
                                ? `<div class="unallocated-selected-bar">
                                    <span>Selecione um horário livre</span>
                                    <button type="button" class="unallocated-cancel-btn" data-cancel-move="true">Cancelar</button>
                                </div>`
                                : ""
                        }
                    </div>`;
                })
                .join("");
        }

        const turmaMovimento = appState.matriz.turmaEmMovimentoId
            ? appState.dados.turmas.find((t) => t.id === appState.matriz.turmaEmMovimentoId)
            : null;

        const totalAlocadas = appState.dados.turmas.filter((t) => Boolean(t.sala && t.slot)).length;
        if (summaryEl) {
            summaryEl.innerHTML = `<span class="mono-num">${totalAlocadas}/${appState.dados.turmas.length}</span> alocadas`;
        }
        const mostrarInlineMoving = Boolean(turmaMovimento && (turmaMovimento.sala || painelOculto));
        if (movingInlineEl && movingTextEl) {
            movingInlineEl.hidden = !mostrarInlineMoving;
            if (summaryEl) summaryEl.hidden = mostrarInlineMoving;
            if (mostrarInlineMoving) {
                movingTextEl.innerHTML = `Movendo <span class="mono-num">${turmaMovimento.codigo}</span>`;
            }
        }

        if (scheduleGridEl) {
            scheduleGridEl.classList.toggle("is-moving-mode", Boolean(turmaMovimento));
        }

        const slotsVisiveis = SLOTS_INSTITUCIONAIS.filter(
            (s) => appState.matriz.turno === "todos" || s.turno === appState.matriz.turno
        );

        if (slotsVisiveis.length === 0) {
            tbodyGrade.innerHTML = `
                <tr class="schedule-empty-row">
                    <td colspan="7" class="schedule-empty-cell">
                        <div>Nenhum horário neste turno na oferta <span class="mono-num">${appState.dados.semestre}</span>.</div>
                        <button type="button" class="btn btn-secondary" data-shift="todos">Ver todos os turnos</button>
                    </td>
                </tr>`;
            renderizarDrawerMatriz();
            return;
        }

        tbodyGrade.innerHTML = slotsVisiveis.map((slot) => {
            const celulasDias = DIAS_SEMANA.map((dia) => {
                const turmasCelula = appState.dados.turmas.filter(
                    (t) => t.sala && ocupa(t, dia.id, slot.id) && passaFiltrosMatriz(t)
                );

                let classeDrop = "";
                let hintHtml = "";
                let tituloCelula = "";
                let turmasParaExibir = turmasCelula;

                if (turmaMovimento) {
                    const viabilidade = verificarViabilidadeSlot(appState.dados, turmaMovimento, dia.id, slot.id);
                    if (viabilidade.valido) {
                        classeDrop = "is-drop-valid";
                        const nomeSala = nomeEspaco(viabilidade.salaSugerida);
                        hintHtml = `<div class="slot-alloc-action">Alocar em ${escapar(nomeSala)}</div>`;
                        tituloCelula = `Alocar em ${nomeSala}`;
                    } else {
                        classeDrop = "is-drop-invalid";
                        const motivoCurto = formatarMotivoBloqueio(viabilidade, turmaMovimento);
                        hintHtml = `<div class="slot-blocked-reason">${escapar(motivoCurto)}</div>`;
                        tituloCelula = motivoCurto;
                        turmasParaExibir = turmasCelula.filter((t) => t.id === turmaMovimento.id);
                    }
                }

                const blocosHtml = turmasParaExibir
                    .map((t) => {
                        const diag = inspecionarTurma(appState.dados, t);
                        const temConflito = diag.problemas.length > 0;
                        const isSelected = appState.matriz.turmaSelecionadaId === t.id;
                        const isMovingCard = Boolean(turmaMovimento && turmaMovimento.id === t.id);
                        const conflitoInfo = temConflito ? obterRotuloConflito(t, diag) : null;
                        const inicioBloco = blocoDoDia(t, dia.id)[0] === `${dia.id}-${slot.id}`;
                        const noRascunho = Boolean(appState.dados.rascunho && appState.dados.rascunho[t.id]);

                        return `
                        <button
                            type="button"
                            class="event-block ${temConflito ? "has-conflict" : ""} ${isSelected ? "is-selected" : ""} ${isMovingCard ? "is-moving" : ""} ${inicioBloco ? "" : "is-continuation"} ${noRascunho ? "is-draft" : ""}"
                            draggable="true"
                            data-event-turma="${t.id}"
                            data-event-dia="${dia.id}"
                            title="${escapar(`${t.codigo} · ${rotuloHorario(t)}${inicioBloco ? "" : " (continuação do bloco)"}`)}"
                        >
                            <div class="event-top-row">
                                <span class="event-code">${t.codigo}</span>
                                ${
                                    temConflito
                                        ? `<span class="event-conflict-badge" title="${escapar(conflitoInfo.resumoTooltip)}">${conflitoInfo.curtoHtml}</span>`
                                        : t.ambienteExigido === "Laboratório"
                                        ? `<span class="event-tag-lab">LAB</span>`
                                        : ""
                                }
                            </div>
                            <div class="event-title">${escapar(t.disciplina)}</div>
                            <div class="event-sub">${escapar(nomeEspaco(t.sala))} · ${escapar(rotuloDocentes(t))}</div>
                        </button>`;
                    })
                    .join("");

                return `
                <td
                    class="${classeDrop}"
                    tabindex="${classeDrop === 'is-drop-valid' ? '0' : '-1'}"
                    data-cell-dia="${dia.id}"
                    data-cell-slot="${slot.id}"
                    ${tituloCelula ? `title="${escapar(tituloCelula)}"` : ""}
                >
                    <div class="schedule-cell-inner">
                        ${blocosHtml}
                        ${hintHtml}
                    </div>
                </td>`;
            }).join("");

            return `
            <tr>
                <th scope="row" class="slot-header-cell">
                    <span class="slot-id">${slot.id}</span>
                    <span class="slot-hours">${slot.horario}</span>
                </th>
                ${celulasDias}
            </tr>`;
        }).join("");

        renderizarDrawerMatriz();
    }

    function renderizarDrawerMatriz() {
        const drawer = document.getElementById("drawer-matriz");
        const body = document.getElementById("drawer-matriz-body");
        const titleEl = document.getElementById("drawer-matriz-title");
        const subEl = document.getElementById("drawer-matriz-subtitle");
        const footerEl = document.getElementById("drawer-matriz-footer");

        if (!drawer || !body) return;

        const turma = appState.dados.turmas.find((t) => t.id === appState.matriz.turmaSelecionadaId);
        if (!turma) {
            drawer.classList.remove("is-open");
            return;
        }

        drawer.classList.toggle("is-open", !appState.matriz.turmaEmMovimentoId);
        titleEl.textContent = turma.disciplina;
        subEl.textContent = `${turma.codigo} · Turma ${turma.turma}`;

        const diag = inspecionarTurma(appState.dados, turma);

        if (appState.matriz.modoEdicaoDrawer) {
            const opcoesSala = appState.dados.espacos
                .map(
                    (e) =>
                        `<option value="${e.id}" ${turma.sala === e.id ? "selected" : ""}>${escapar(e.nome)} (${e.capacidade} lug. · ${e.tipo})</option>`
                )
                .join("");


            body.innerHTML = `
                <form id="form-editar-alocacao-matriz" class="form-stack">
                    <div class="form-group">
                        <label class="form-label" for="edit-alloc-horario">Horário (notação SIGAA)</label>
                        <input id="edit-alloc-horario" class="control-input mono-num" value="${escapar(turma.horario || "")}" placeholder="ex.: 35M34 ou 2T56 6T12" autocomplete="off">
                        <span class="cell-muted">Dias 2–7 = SEG–SAB · M/T/N = turno · 1–6 = aulas de 50 min. A turma tem ${turma.aulasSemanais || "?"} aula(s) por semana.</span>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="edit-alloc-sala">Espaço físico</label>
                        <select id="edit-alloc-sala" class="control-select">
                            ${opcoesSala}
                        </select>
                    </div>

                    <div class="divider-line"></div>

                    <div class="detail-section">
                        <span class="detail-section-title">Requisitos</span>
                        <div class="cell-muted"><span class="mono-num">${turma.alunos}</span> alunos · Exige ${turma.ambienteExigido} · ${escapar((turma.professores || []).join(", ") || "sem docente")}</div>
                    </div>
                </form>
            `;

            footerEl.innerHTML = `
                <button type="button" class="btn btn-ghost" data-matrix-drawer-action="cancel-edit">Cancelar</button>
                <div class="flex-row-gap-sm">
                    ${turma.sala ? `<button type="button" class="btn btn-danger" data-matrix-drawer-action="unassign">Desalocar</button>` : ""}
                    <button type="button" class="btn btn-primary" data-matrix-drawer-action="save-edit">Salvar</button>
                </div>
            `;
            return;
        }

        let secaoRestricoesHtml = "";
        if (!diag.alocada) {
            secaoRestricoesHtml = `
                <div class="detail-section">
                    <span class="detail-section-title">Situação</span>
                    <span class="pending-pill">Pendente de alocação</span>
                    <p class="cell-muted">
                        Selecione a turma no painel Não alocadas e clique em um horário livre da grade.
                    </p>
                </div>`;
        } else if (diag.problemas.length > 0) {
            secaoRestricoesHtml = `
                <div class="detail-section">
                    <span class="detail-section-title text-danger">
                        ${diag.problemas.length} ${diag.problemas.length === 1 ? "conflito encontrado" : "conflitos encontrados"}
                    </span>
                    <div class="flex-col-gap-sm">
                        ${diag.problemas
                            .map(
                                (p) => `
                            <div class="problem-callout">
                                <div class="problem-callout-title">${rotuloRegraProblema(p.categoria)}</div>
                                <div class="problem-callout-desc">${escapar(p.detalhe)}</div>
                            </div>`
                            )
                            .join("")}
                    </div>
                </div>`;
        } else {
            secaoRestricoesHtml = `
                <div class="detail-section">
                    <span class="detail-section-title">Restrições</span>
                    <ul class="check-list">
                        ${diag.checks
                            .map(
                                (c) => `
                            <li class="check-list-item">
                                <span class="check-icon-wrap">${ICONS.check}</span>
                                <span>${c.rotulo}</span>
                            </li>`
                            )
                            .join("")}
                    </ul>
                </div>`;
        }

        body.innerHTML = `
            <div class="detail-section">
                <div class="detail-grid">
                    <span class="detail-label">Professor</span>
                    <span class="detail-value">${escapar((turma.professores || []).join(", ") || "Sem docente")}</span>

                    <span class="detail-label">Sala</span>
                    <span class="detail-value">${turma.sala ? escapar(nomeEspaco(turma.sala)) : "Não atribuída"}</span>

                    <span class="detail-label">Horário</span>
                    <span class="detail-value">${turma.slot ? `<span class="mono-num">${rotuloHorario(turma)}</span>` : "Sem horário"}</span>

                    <span class="detail-label">Estudantes</span>
                    <span class="detail-value"><span class="mono-num">${turma.alunos}</span> alunos</span>

                    <span class="detail-label">Ambiente</span>
                    <span class="detail-value">${turma.ambienteExigido}</span>
                </div>
            </div>

            <div class="divider-line"></div>

            ${secaoRestricoesHtml}
        `;

        footerEl.innerHTML = `
            <button type="button" class="btn btn-secondary" data-matrix-drawer-action="move-on-grid">
                ${appState.matriz.turmaEmMovimentoId === turma.id ? "Cancelar movimento" : "Mover na grade"}
            </button>
            <div class="flex-row-gap-sm">
                ${
                    diag.problemas.length > 0
                        ? `<button type="button" class="btn btn-primary" data-matrix-drawer-action="open-conflict">Resolver</button>`
                        : ""
                }
                <button type="button" class="btn ${diag.problemas.length > 0 ? "btn-secondary" : "btn-primary"}" data-matrix-drawer-action="edit">
                    Editar alocação
                </button>
            </div>
        `;
    }

    /* ==========================================================================
       3. CENTRAL DE CONFLITOS & PUBLICAÇÃO (#tela-conflitos)
       ========================================================================== */
    function renderizarConflitosEPublicacao() {
        const listContainer = document.getElementById("triage-list-items");
        const detailContainer = document.getElementById("triage-detail-content");
        const countHeader = document.getElementById("conflitos-header-count");

        if (!listContainer || !detailContainer) return;

        document.querySelectorAll(".shift-seg-btn[data-conflict-filter]").forEach((btn) => {
            const ativo = btn.getAttribute("data-conflict-filter") === appState.conflitos.filtro;
            btn.classList.toggle("is-active", ativo);
            btn.setAttribute("aria-pressed", String(ativo));
        });

        const todosConflitos = obterConflitosConsolidados(appState.dados);
        if (countHeader) {
            countHeader.innerHTML = `<span class="mono-num">${todosConflitos.length}</span> ${todosConflitos.length === 1 ? "conflito ativo" : "conflitos ativos"}`;
        }

        const filtro = appState.conflitos.filtro;
        const filtrados = todosConflitos.filter((c) => {
            if (filtro === "todos") return true;
            return c.tipos.includes(filtro);
        });

        if (filtrados.length > 0 && !filtrados.some((c) => c.id === appState.conflitos.conflitoSelecionadoId)) {
            appState.conflitos.conflitoSelecionadoId = filtrados[0].id;
        } else if (filtrados.length === 0) {
            appState.conflitos.conflitoSelecionadoId = null;
        }

        if (filtrados.length === 0) {
            listContainer.innerHTML = `<div class="empty-pane-note">Nenhum conflito encontrado para este filtro.</div>`;
        } else {
            listContainer.innerHTML = filtrados
                .map((c) => {
                    const isSelected = c.id === appState.conflitos.conflitoSelecionadoId;
                    const turma = appState.dados.turmas.find((t) => t.id === c.turmaId);
                    const diag = turma ? inspecionarTurma(appState.dados, turma) : { problemas: c.problemas };
                    const info = turma ? obterRotuloConflito(turma, diag) : { curtoHtml: escapar(c.problemas[0].categoria), resumoTooltip: c.resumoPrincipal };
                    const horarioMeta = turma && turma.slot ? `${escapar(nomeEspaco(turma.sala))} · ${rotuloHorario(turma)}` : c.resumoPrincipal;
                    return `
                    <button type="button" class="triage-row ${isSelected ? "is-selected" : ""}" data-select-conflict="${c.id}">
                        <div class="triage-row-top">
                            <span class="cell-mono">${c.codigo}</span>
                            <span class="event-conflict-badge" title="${escapar(info.resumoTooltip)}">${info.curtoHtml}</span>
                        </div>
                        <div class="triage-row-title">${escapar(c.disciplina)}</div>
                        <div class="triage-row-desc">${horarioMeta}</div>
                    </button>`;
                })
                .join("");
        }

        const selecionado = filtrados.find((c) => c.id === appState.conflitos.conflitoSelecionadoId);
        const todasTurmas = appState.dados.turmas;
        const alocadasCount = todasTurmas.filter((t) => Boolean(t.sala && t.slot)).length;
        const prontaParaPublicar = todosConflitos.length === 0 && alocadasCount === todasTurmas.length;

        let detalheConflitoHtml = "";
        if (selecionado) {
            const afetadasUnicas = [];
            const mapAfetadas = new Set();
            selecionado.problemas.forEach((p) => {
                p.afetadas.forEach((af) => {
                    if (!mapAfetadas.has(af.id)) {
                        mapAfetadas.add(af.id);
                        afetadasUnicas.push(af);
                    }
                });
            });

            detalheConflitoHtml = `
                <div class="conflict-detail-box">
                    <div>
                        <div class="cell-mono">${selecionado.codigo}</div>
                        <h2 class="view-title">${selecionado.codigo} · ${escapar(selecionado.disciplina)}</h2>
                    </div>

                    <div class="detail-section">
                        <span class="detail-section-title">Regras violadas</span>
                        <div class="flex-col-gap-sm">
                            ${selecionado.problemas
                                .map(
                                    (p) => `
                                <div class="problem-callout">
                                    <div class="problem-callout-title">${rotuloRegraProblema(p.categoria)}</div>
                                    <div class="problem-callout-desc">${escapar(p.detalhe)}</div>
                                </div>`
                                )
                                .join("")}
                        </div>
                    </div>

                    <div class="detail-section">
                        <span class="detail-section-title">Turmas afetadas</span>
                        <div class="flex-col-gap-xs">
                            ${afetadasUnicas
                                .map(
                                    (af) => `
                                <div>
                                    <span class="cell-mono">${af.codigo}</span> ·
                                    <span class="cell-primary">${escapar(af.disciplina)}</span>
                                    <span class="cell-muted">(<span class="mono-num">${rotuloHorario(af)}</span> · ${escapar(nomeEspaco(af.sala))})</span>
                                </div>`
                                )
                                .join("")}
                        </div>
                    </div>

                    <div class="detail-section">
                        <div class="flex-row-between">
                            <span class="detail-section-title">Alternativas do motor</span>
                            <button type="button" class="btn btn-secondary" data-motor-resolver="true">${selecionado.semSugestoes ? "Resolver via motor" : "Recalcular"}</button>
                        </div>
                        ${selecionado.alternativas.length === 0 ? `<p class="cell-muted">${selecionado.semSugestoes ? "Peça sugestões ao motor do servidor (horário + sala). Nada é gravado: a alternativa escolhida vai para o rascunho." : "O motor não encontrou alternativa para esta turma dentro do limite de busca. Ajuste à mão na grade."}</p>` : ""}
                        <div class="alternatives-list">
                            ${selecionado.alternativas
                                .map(
                                    (alt, idx) => `
                                <div class="alternative-row">
                                    <div class="flex-row-gap-sm">
                                        <span class="alt-num">${idx + 1}</span>
                                        <div>
                                            <div class="cell-primary">${escapar(alt.descricao)}</div>
                                            <div class="cell-muted">${escapar(alt.impacto)}</div>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        class="btn ${idx === 0 ? "btn-primary" : "btn-secondary"}"
                                        data-apply-alternative="${selecionado.id}"
                                        data-alt-index="${idx}"
                                    >
                                        Aplicar alternativa <span class="mono-num">${idx + 1}</span>
                                    </button>
                                </div>`
                                )
                                .join("")}
                        </div>
                    </div>
                </div>
            `;
        } else {
            detalheConflitoHtml = `
                <div class="conflict-detail-box">
                    <span class="status-pill is-valid">${todosConflitos.length ? 'Nenhum conflito para este filtro' : 'Sem conflitos ativos'}</span>
                    <p class="cell-muted">
                        ${todosConflitos.length ? 'Consulte as outras categorias para resolver as pendências.' : 'As alocações definidas passaram pela validação de docentes, espaços e capacidade.'}
                    </p>
                </div>
            `;
        }

        const pillEstadoHtml = appState.dados.publicada
            ? `<span class="status-pill is-valid">Publicada na sessão</span>`
            : prontaParaPublicar
            ? `<span class="status-pill is-valid">Pronta para publicação</span>`
            : `<span class="status-pill is-pending">Aguardando resolução de pendências</span>`;

        detailContainer.innerHTML = `
            ${detalheConflitoHtml}

            <div class="publication-bar" id="secao-publicacao-proposta">
                <div class="flex-col-gap-xs">
                    <div class="detail-section-title">Proposta <span class="mono-num">${appState.dados.semestre}</span></div>
                    <div>${pillEstadoHtml}</div>
                    <div class="cell-muted">
                        <span class="mono-num">${alocadasCount}/${todasTurmas.length}</span> turmas alocadas · <span class="mono-num">${todosConflitos.length}</span> ${todosConflitos.length === 1 ? 'conflito ativo' : 'conflitos ativos'}
                    </div>
                </div>
                <div class="flex-row-gap-sm">
                    <button
                        type="button"
                        class="btn ${prontaParaPublicar ? "btn-primary" : "btn-secondary"}"
                        data-action-publish="true" ${!prontaParaPublicar || appState.dados.publicada ? 'disabled' : ''}
                    >
                        ${appState.dados.publicada ? "Grade publicada" : "Publicar grade"}
                    </button>
                </div>
            </div>
        `;
    }

    /* ==========================================================================
       4. ESPAÇOS FÍSICOS (#tela-espacos)
       ========================================================================== */
    function renderizarEspacos() {
        const tbody = document.getElementById("espacos-tbody");
        if (!tbody) return;

        document.querySelectorAll(".shift-seg-btn[data-espacos-tipo]").forEach((btn) => {
            const ativo = btn.getAttribute("data-espacos-tipo") === appState.espacos.tipo;
            btn.classList.toggle("is-active", ativo);
            btn.setAttribute("aria-pressed", String(ativo));
        });

        document.querySelectorAll(".shift-seg-btn[data-espacos-status]").forEach((btn) => {
            const ativo = btn.getAttribute("data-espacos-status") === appState.espacos.status;
            btn.classList.toggle("is-active", ativo);
            btn.setAttribute("aria-pressed", String(ativo));
        });

        const { busca, tipo, status, espacoSelecionadoId } = appState.espacos;
        const termo = busca.trim().toLowerCase();

        const filtrados = appState.dados.espacos.filter((e) => {
            const bateBusca = !termo || e.nome.toLowerCase().includes(termo) || e.codigo.toLowerCase().includes(termo) || e.equipamentos.join(" ").toLowerCase().includes(termo);
            const bateTipo = tipo === "todos" || e.tipo === tipo;
            const bateStatus = status === "todos" || e.status === status;
            return bateBusca && bateTipo && bateStatus;
        });

        tbody.innerHTML = filtrados
            .map((e) => {
                const isSelected = e.id === espacoSelecionadoId;
                const pillClass = e.status === "Disponível" ? "is-valid" : e.status === "Manutenção" ? "is-pending" : "is-conflict";
                return `
                <tr tabindex="0" aria-selected="${isSelected}" class="is-interactive ${isSelected ? "is-selected" : ""}" data-row-espaco="${e.id}">
                    <td>
                        <div class="cell-primary">${escapar(e.nome)}</div>
                        <div class="cell-mono">${escapar(e.codigo)}</div>
                    </td>
                    <td>${e.tipo}</td>
                    <td><span class="mono-num">${e.capacidade}</span> lug.</td>
                    <td class="cell-muted">${escapar(e.equipamentos.join(", "))}</td>
                    <td>
                        <span class="status-pill ${pillClass}">${e.status}</span>
                    </td>
                </tr>`;
            })
            .join("");

        if (!filtrados.length) tbody.innerHTML = '<tr><td colspan="5" class="empty-pane-note">Nenhum espaço encontrado.</td></tr>';
        if (!filtrados.some((e) => e.id === appState.espacos.espacoSelecionadoId)) appState.espacos.espacoSelecionadoId = null;
        renderizarDrawerEspaco();
    }

    function renderizarDrawerEspaco() {
        const drawer = document.getElementById("drawer-espacos");
        const titleEl = document.getElementById("drawer-espacos-title");
        const subEl = document.getElementById("drawer-espacos-subtitle");
        const body = document.getElementById("drawer-espacos-body");
        const footer = document.getElementById("drawer-espacos-footer");

        if (!drawer || !body) return;

        if (appState.espacos.criandoNovo) {
            drawer.classList.add("is-open");
            titleEl.textContent = "Novo espaço físico";
            subEl.textContent = "Cadastro de sala ou laboratório do IC";
            body.innerHTML = montarFormularioEspaco({
                nome: "",
                codigo: "IC-",
                tipo: "Sala",
                capacidade: 40,
                pcs: 0,
                equipamentos: ["Projetor", "Ar-condicionado"],
                status: "Disponível",
                observacao: ""
            });
            footer.innerHTML = `
                <button type="button" class="btn btn-ghost" data-espaco-drawer="cancel">Cancelar</button>
                <button type="button" class="btn btn-primary" data-espaco-drawer="save">Criar espaço</button>
            `;
            return;
        }

        const esp = appState.dados.espacos.find((e) => e.id === appState.espacos.espacoSelecionadoId);
        if (!esp) {
            drawer.classList.remove("is-open");
            return;
        }

        drawer.classList.add("is-open");
        titleEl.textContent = esp.nome;
        subEl.textContent = `${escapar(esp.codigo)} · ${esp.tipo}`;

        if (appState.espacos.modoEdicao) {
            body.innerHTML = montarFormularioEspaco(esp);
            footer.innerHTML = `
                <button type="button" class="btn btn-ghost" data-espaco-drawer="cancel">Cancelar</button>
                <button type="button" class="btn btn-primary" data-espaco-drawer="save">Salvar alterações</button>
            `;
            return;
        }

        const turmasNaSala = appState.dados.turmas.filter((t) => t.sala === esp.id);
        const pillClass = esp.status === "Disponível" ? "is-valid" : esp.status === "Manutenção" ? "is-pending" : "is-conflict";

        body.innerHTML = `
            <div class="detail-section">
                <span class="detail-section-title">Identificação</span>
                <div class="detail-grid">
                    <span class="detail-label">Nome</span>
                    <span class="detail-value">${escapar(esp.nome)}</span>
                    <span class="detail-label">Código</span>
                    <span class="detail-value cell-mono">${escapar(esp.codigo)}</span>
                    <span class="detail-label">Tipo</span>
                    <span class="detail-value">${esp.tipo}</span>
                </div>
            </div>

            <div class="detail-section">
                <span class="detail-section-title">Capacidade</span>
                <div class="detail-grid">
                    <span class="detail-label">Estudantes</span>
                    <span class="detail-value"><span class="mono-num">${esp.capacidade}</span> lugares</span>
                    <span class="detail-label">Computadores</span>
                    <span class="detail-value"><span class="mono-num">${esp.pcs}</span> PCs</span>
                </div>
            </div>

            <div class="detail-section">
                <span class="detail-section-title">Equipamentos</span>
                <div class="cell-muted">${esp.equipamentos.join(" · ") || "Nenhum recurso listado"}</div>
            </div>

            <div class="detail-section">
                <span class="detail-section-title">Status operacional</span>
                <div><span class="status-pill ${pillClass}">${esp.status}</span></div>
                <div class="cell-muted">${escapar(esp.observacao)}</div>
            </div>

            <div class="detail-section">
                <span class="detail-section-title">Turmas alocadas (<span class="mono-num">${turmasNaSala.length}</span>)</span>
                ${
                    turmasNaSala.length === 0
                        ? `<div class="cell-muted">Nenhuma turma posicionada neste espaço.</div>`
                        : `<div class="flex-col-gap-xs">
                            ${turmasNaSala
                                .map(
                                    (t) =>
                                        `<div><span class="cell-mono">${t.codigo}</span> · ${escapar(t.disciplina)} <span class="cell-muted">(<span class="mono-num">${rotuloHorario(t)}</span>)</span></div>`
                                )
                                .join("")}
                        </div>`
                }
            </div>
        `;

        footer.innerHTML = `
            <button type="button" class="btn btn-secondary" data-espaco-drawer="view-grid">Ver na grade</button>
            <button type="button" class="btn btn-primary" data-espaco-drawer="edit">Editar espaço</button>
        `;
    }

    function montarFormularioEspaco(esp) {
        return `
            <form id="form-espaco" class="form-stack">
                <div class="form-group">
                    <label class="form-label" for="inp-esp-nome">Nome do espaço</label>
                    <input type="text" id="inp-esp-nome" class="control-input" value="${escapar(esp.nome)}" required>
                </div>
                <div class="form-group">
                    <label class="form-label" for="inp-esp-codigo">Código</label>
                    <input type="text" id="inp-esp-codigo" class="control-input" value="${escapar(esp.codigo)}" required>
                </div>
                <div class="form-group">
                    <label class="form-label" for="inp-esp-tipo">Tipo</label>
                    <select id="inp-esp-tipo" class="control-select">
                        <option value="Laboratório" ${esp.tipo === "Laboratório" ? "selected" : ""}>Laboratório</option>
                        <option value="Sala" ${esp.tipo === "Sala" ? "selected" : ""}>Sala</option>
                        <option value="Auditório" ${esp.tipo === "Auditório" ? "selected" : ""}>Auditório</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label" for="inp-esp-cap">Capacidade máxima</label>
                    <input type="number" id="inp-esp-cap" class="control-input" value="${esp.capacidade}" min="1" max="300">
                </div>
                <div class="form-group">
                    <label class="form-label" for="inp-esp-pcs">Quantidade de PCs</label>
                    <input type="number" id="inp-esp-pcs" class="control-input" value="${esp.pcs}" min="0" max="200">
                </div>
                <div class="form-group">
                    <label class="form-label" for="inp-esp-equip">Equipamentos (separados por vírgula)</label>
                    <input type="text" id="inp-esp-equip" class="control-input" value="${escapar(esp.equipamentos.join(", "))}">
                </div>
                <div class="form-group">
                    <label class="form-label" for="inp-esp-status">Status operacional</label>
                    <select id="inp-esp-status" class="control-select">
                        <option value="Disponível" ${esp.status === "Disponível" ? "selected" : ""}>Disponível</option>
                        <option value="Manutenção" ${esp.status === "Manutenção" ? "selected" : ""}>Manutenção</option>
                        <option value="Indisponível" ${esp.status === "Indisponível" ? "selected" : ""}>Indisponível</option>
                    </select>
                </div>
            </form>
        `;
    }

    /* ==========================================================================
       5. TURMAS & DISCIPLINAS (#tela-turmas)
       ========================================================================== */
    function renderizarChipsFiltrosTurmas() {
        const chipsEl = document.getElementById("turmas-active-chips");
        const filtrosBtn = document.getElementById("turmas-filters-btn");
        const filtrosCount = document.getElementById("turmas-filters-count");
        const popoverEl = document.getElementById("turmas-filters-popover");

        const { curso, periodo, ambiente, filtrosAbertos } = appState.turmas;
        const ativos = [curso, periodo, ambiente].filter((v) => v !== "todos").length;

        if (filtrosBtn) {
            filtrosBtn.classList.toggle("has-active", ativos > 0);
            filtrosBtn.setAttribute("aria-expanded", String(Boolean(filtrosAbertos)));
        }
        if (filtrosCount) {
            filtrosCount.textContent = ativos;
            filtrosCount.hidden = ativos === 0;
        }
        if (popoverEl) {
            popoverEl.classList.toggle("is-open", Boolean(filtrosAbertos));
        }

        if (!chipsEl) return;
        const itens = [];
        if (curso !== "todos") itens.push({ chave: "curso", rotulo: "Curso", valor: curso });
        if (periodo !== "todos") itens.push({ chave: "periodo", rotulo: "Período", valor: periodo });
        if (ambiente !== "todos") itens.push({ chave: "ambiente", rotulo: "Ambiente", valor: ambiente });

        if (itens.length === 0) {
            chipsEl.hidden = true;
            chipsEl.innerHTML = "";
            return;
        }

        chipsEl.hidden = false;
        chipsEl.innerHTML = `
            ${itens
                .map(
                    (it) => `
                <button type="button" class="filter-chip" data-remove-turmas-filter="${it.chave}" aria-label="Remover filtro ${it.rotulo}">
                    <span class="filter-chip-label">${it.rotulo}:</span>
                    <span>${escapar(it.valor)}</span>
                    <span class="filter-chip-close" aria-hidden="true">×</span>
                </button>`
                )
                .join("")}
            <button type="button" class="chips-clear-btn" data-clear-turmas-filters="true">Limpar filtros</button>
        `;
    }

    function renderizarTurmas() {
        const tbody = document.getElementById("turmas-tbody");
        const countEl = document.getElementById("turmas-total-count");
        if (!tbody) return;

        document.querySelectorAll(".shift-seg-btn[data-turmas-status]").forEach((btn) => {
            const ativo = btn.getAttribute("data-turmas-status") === appState.turmas.status;
            btn.classList.toggle("is-active", ativo);
            btn.setAttribute("aria-pressed", String(ativo));
        });

        const { busca, curso, periodo, professor, status, ambiente, turmaSelecionadaId } = appState.turmas;
        const selCurso = document.getElementById("turmas-filter-curso");
        const selPeriodo = document.getElementById("turmas-filter-periodo");
        const selAmb = document.getElementById("turmas-filter-ambiente");
        if (selCurso) selCurso.value = curso;
        if (selPeriodo) selPeriodo.value = periodo;
        if (selAmb) selAmb.value = ambiente;

        renderizarChipsFiltrosTurmas();

        const termo = busca.trim().toLowerCase();

        const filtradas = appState.dados.turmas.filter((t) => {
            const diag = inspecionarTurma(appState.dados, t);
            const estadoTurma = !diag.alocada ? "pendente" : diag.problemas.length > 0 ? "conflito" : "alocada";

            const bateBusca =
                !termo ||
                t.codigo.toLowerCase().includes(termo) ||
                t.disciplina.toLowerCase().includes(termo) ||
                t.professor.toLowerCase().includes(termo) ||
                nomeCompletoProfessor(t.professor).toLowerCase().includes(termo);
            const bateCurso = curso === "todos" || cursosDe(t).includes(curso);
            const batePeriodo = periodo === "todos" || t.periodo === periodo;
            const bateProf = professor === "todos" || (t.professores || []).includes(professor);
            const bateStatus = status === "todos" || estadoTurma === status;
            const bateAmb = ambiente === "todos" || t.ambienteExigido === ambiente;

            return bateBusca && bateCurso && batePeriodo && bateProf && bateStatus && bateAmb;
        });

        if (countEl) countEl.textContent = filtradas.length;

        tbody.innerHTML = filtradas
            .map((t) => {
                const diag = inspecionarTurma(appState.dados, t);
                const isSelected = t.id === turmaSelecionadaId;

                let statusHtml = `${escapar(nomeEspaco(t.sala))} · <span class="mono-num">${rotuloHorario(t)}</span>`;
                if (!diag.alocada) {
                    statusHtml = `<span class="status-pill is-pending">Sem sala</span>`;
                } else if (diag.problemas.length > 0) {
                    const info = obterRotuloConflito(t, diag);
                    statusHtml = `<span class="event-conflict-badge" title="${escapar(info.resumoTooltip)}">${info.curtoHtml}</span> <span class="cell-muted">${escapar(nomeEspaco(t.sala))}</span>`;
                }

                const ambienteHtml =
                    t.ambienteExigido === "Laboratório"
                        ? `<span class="event-tag-lab">LAB</span>`
                        : t.ambienteExigido === "Auditório"
                        ? `<span class="unallocated-tag">AUD</span>`
                        : `<span class="cell-muted">${t.ambienteExigido}</span>`;

                return `
                <tr tabindex="0" aria-selected="${isSelected}" class="is-interactive ${isSelected ? "is-selected" : ""}" data-row-turma="${t.id}">
                    <td class="cell-mono">${t.codigo}</td>
                    <td class="cell-primary">${escapar(t.disciplina)}</td>
                    <td class="mono-num">${t.turma}</td>
                    <td class="cell-muted">${escapar(t.curso)}</td>
                    <td>${escapar(rotuloDocentes(t))}</td>
                    <td class="mono-num">${t.alunos}</td>
                    <td>${ambienteHtml}</td>
                    <td>${statusHtml}</td>
                </tr>`;
            })
            .join("");

        if (!filtradas.length) tbody.innerHTML = '<tr><td colspan="8" class="empty-pane-note">Nenhuma turma encontrada.</td></tr>';
        if (!filtradas.some((t) => t.id === appState.turmas.turmaSelecionadaId)) appState.turmas.turmaSelecionadaId = null;
        renderizarDrawerTurma();
    }

    function renderizarDrawerTurma() {
        const drawer = document.getElementById("drawer-turmas");
        const titleEl = document.getElementById("drawer-turmas-title");
        const subEl = document.getElementById("drawer-turmas-subtitle");
        const body = document.getElementById("drawer-turmas-body");
        const footer = document.getElementById("drawer-turmas-footer");

        if (!drawer || !body) return;

        const turma = appState.dados.turmas.find((t) => t.id === appState.turmas.turmaSelecionadaId);
        if (!turma) {
            drawer.classList.remove("is-open");
            return;
        }

        drawer.classList.add("is-open");
        titleEl.textContent = turma.disciplina;
        subEl.textContent = `${turma.codigo} · Turma ${turma.turma}`;

        if (appState.turmas.modoEdicao) {
            const profOptions = appState.dados.professores
                .map((p) => `<option value="${p.id}" ${turma.professor === p.id ? "selected" : ""}>${escapar(p.nome)}</option>`)
                .join("");

            body.innerHTML = `
                <form id="form-turma" class="form-stack">
                    <div class="form-group">
                        <label class="form-label" for="inp-turma-disc">Disciplina</label>
                        <input type="text" id="inp-turma-disc" class="control-input" value="${escapar(turma.disciplina)}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="inp-turma-prof">Professor responsável</label>
                        <select id="inp-turma-prof" class="control-select">${profOptions}</select>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="inp-turma-alunos">Quantidade de estudantes</label>
                        <input type="number" id="inp-turma-alunos" class="control-input" value="${turma.alunos}" min="1" max="200">
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="inp-turma-amb">Ambiente exigido</label>
                        <select id="inp-turma-amb" class="control-select">
                            <option value="Laboratório" ${turma.ambienteExigido === "Laboratório" ? "selected" : ""}>Laboratório</option>
                            <option value="Sala" ${turma.ambienteExigido === "Sala" ? "selected" : ""}>Sala</option>
                            <option value="Auditório" ${turma.ambienteExigido === "Auditório" ? "selected" : ""}>Auditório</option>
                        </select>
                    </div>
                </form>
            `;

            footer.innerHTML = `
                <button type="button" class="btn btn-ghost" data-turma-drawer="cancel">Cancelar</button>
                <button type="button" class="btn btn-primary" data-turma-drawer="save">Salvar</button>
            `;
            return;
        }

        const diag = inspecionarTurma(appState.dados, turma);

        body.innerHTML = `
            <div class="detail-section">
                <span class="detail-section-title">Oferta</span>
                <div class="detail-grid">
                    <span class="detail-label">Código</span>
                    <span class="detail-value cell-mono">${turma.codigo}</span>
                    <span class="detail-label">Curso</span>
                    <span class="detail-value">${escapar(turma.curso)}</span>
                    <span class="detail-label">Professor</span>
                    <span class="detail-value">${escapar((turma.professores || []).join(", ") || "Sem docente")}</span>
                    <span class="detail-label">Estudantes</span>
                    <span class="detail-value"><span class="mono-num">${turma.alunos}</span> matriculados</span>
                    <span class="detail-label">Ambiente</span>
                    <span class="detail-value">${turma.ambienteExigido}</span>
                </div>
            </div>

            <div class="detail-section">
                <span class="detail-section-title">Alocação na grade</span>
                <div class="detail-grid">
                    <span class="detail-label">Sala</span>
                    <span class="detail-value">${turma.sala ? escapar(nomeEspaco(turma.sala)) : "Sem sala"}</span>
                    <span class="detail-label">Horário</span>
                    <span class="detail-value">${turma.slot ? `<span class="mono-num">${rotuloHorario(turma)}</span>` : "Pendente"}</span>
                </div>
            </div>

            <div class="detail-section">
                <span class="detail-section-title">Validação</span>
                ${
                    !diag.alocada
                        ? `<span class="status-pill is-pending">Aguardando alocação na grade</span>`
                        : diag.problemas.length > 0
                        ? diag.problemas
                              .map(
                                  (p) => `
                            <div class="problem-callout">
                                <div class="problem-callout-title">${rotuloRegraProblema(p.categoria)}</div>
                                <div class="problem-callout-desc">${escapar(p.detalhe)}</div>
                            </div>`
                              )
                              .join("")
                        : `<span class="status-pill is-valid">Todas as restrições atendidas</span>`
                }
            </div>
        `;

        footer.innerHTML = `
            <button type="button" class="btn btn-secondary" data-turma-drawer="open-in-matrix">
                ${diag.alocada ? "Inspecionar na grade" : "Alocar na grade"}
            </button>
            <button type="button" class="btn btn-primary" data-turma-drawer="edit">Editar turma</button>
        `;
    }

    /* ==========================================================================
       6. PROFESSORES & DISPONIBILIDADE (#tela-professores)
       ========================================================================== */
    function renderizarProfessores() {
        const tbody = document.getElementById("professores-tbody");
        const countEl = document.getElementById("professores-total-count");
        if (!tbody) return;

        document.querySelectorAll(".shift-seg-btn[data-prof-status]").forEach((btn) => {
            const ativo = btn.getAttribute("data-prof-status") === appState.professores.status;
            btn.classList.toggle("is-active", ativo);
            btn.setAttribute("aria-pressed", String(ativo));
        });

        const { busca, status, professorSelecionadoId } = appState.professores;
        const termo = busca.trim().toLowerCase();

        const linhas = appState.dados.professores.filter((p) => {
            const turmasProf = appState.dados.turmas.filter((t) => (t.professores || []).includes(p.id));
            const temConflito = turmasProf.some((t) => inspecionarTurma(appState.dados, t).problemas.some((pr) => pr.tipo === "docente"));
            const estado = temConflito ? "conflito" : "regular";

            const bateBusca = !termo || p.nome.toLowerCase().includes(termo) || p.siape.includes(termo);
            const bateStatus = status === "todos" || estado === status;
            return bateBusca && bateStatus;
        });

        if (countEl) {
            countEl.innerHTML = `<span class="mono-num">${linhas.length}</span> ${linhas.length === 1 ? "docente" : "docentes"}`;
        }

        tbody.innerHTML = linhas
            .map((p) => {
                const turmasProf = appState.dados.turmas.filter((t) => (t.professores || []).includes(p.id));
                const carga = window.SATIC_DATA.calcularCargaDocente(appState.dados, p.id);
                const problemasDocentes = turmasProf.flatMap((t) =>
                    inspecionarTurma(appState.dados, t).problemas.filter((pr) => pr.tipo === "docente")
                );
                const temChoque = problemasDocentes.some((pr) => pr.categoria === "Professor");
                const temIndisp = problemasDocentes.some((pr) => pr.categoria === "Disponibilidade");
                const isSelected = p.id === professorSelecionadoId;

                const statusBadge = temChoque
                    ? `<span class="status-pill is-conflict">Choque docente</span>`
                    : temIndisp
                    ? `<span class="status-pill is-conflict">Indisponível</span>`
                    : `<span class="status-pill is-valid">Regular</span>`;

                return `
                <tr tabindex="0" aria-selected="${isSelected}" class="is-interactive ${isSelected ? "is-selected" : ""}" data-row-professor="${p.id}">
                    <td class="cell-primary">${escapar(p.nome)}</td>
                    <td class="cell-mono">${p.siape}</td>
                    <td class="cell-muted">${p.regime}</td>
                    <td class="mono-num">${carga} aulas/sem</td>
                    <td class="mono-num">${turmasProf.length}</td>
                    <td>${statusBadge}</td>
                </tr>`;
            })
            .join("");

        if (!linhas.length) tbody.innerHTML = '<tr><td colspan="6" class="empty-pane-note">Nenhum professor encontrado.</td></tr>';
        if (!linhas.some((p) => p.id === appState.professores.professorSelecionadoId)) appState.professores.professorSelecionadoId = null;

        renderizarDrawerProfessor();
    }

    function detalheDisponibilidade(prof, turmas) {
        const chave = appState.professores.slotSelecionado;
        if (!chave) return '';
        const [dia, slot] = chave.split(':');
        const aulas = turmas.filter((t) => t.sala && ocupa(t, dia, slot));
        if (!aulas.length) return '';
        return `<div class="detail-section availability-detail">
            <span class="detail-section-title">${dia} · ${slot}</span>
            ${aulas.map((t) => `<div>${escapar(t.disciplina)} · <span class="cell-mono">${t.codigo}</span></div>`).join('')}
            <div class="flex-row-between"><span class="cell-muted">Disponibilidade: ${prof.disponibilidade[chave] || 'disponivel'}</span>
            <button type="button" class="btn btn-secondary" data-toggle-prof-avail="${prof.id}" data-avail-key="${chave}">Alternar</button></div>
            </div>`;
    }

    function renderizarDrawerProfessor() {
        const drawer = document.getElementById("drawer-professores");
        const titleEl = document.getElementById("drawer-professores-title");
        const subEl = document.getElementById("drawer-professores-subtitle");
        const body = document.getElementById("drawer-professores-body");

        if (!drawer || !body) return;

        const prof = appState.dados.professores.find((p) => p.id === appState.professores.professorSelecionadoId);
        if (!prof) {
            drawer.classList.remove("is-open");
            return;
        }

        drawer.classList.add("is-open");
        const turmasProf = appState.dados.turmas.filter((t) => (t.professores || []).includes(prof.id));
        const carga = window.SATIC_DATA.calcularCargaDocente(appState.dados, prof.id);

        titleEl.textContent = prof.nome;
        subEl.innerHTML = `SIAPE <span class="mono-num">${prof.siape}</span> · ${prof.regime} · <span class="mono-num">${carga} aulas/sem</span>`;

        const linhasMatrizHtml = SLOTS_INSTITUCIONAIS.map((slot) => {
            const cols = DIAS_SEMANA.map((dia) => {
                const chave = `${dia.id}:${slot.id}`;
                const estadoDisp = prof.disponibilidade[chave] || "disponivel";

                const aulasSlot = turmasProf.filter((t) => t.sala && ocupa(t, dia.id, slot.id));
                let rotulo = "Disp.";
                let classeEstado = "";

                if (aulasSlot.length > 1) {
                    rotulo = "Ocup.";
                    classeEstado = "is-occupied has-conflict";
                } else if (aulasSlot.length === 1) {
                    rotulo = "Ocup.";
                    classeEstado = estadoDisp === "indisponivel" ? "is-occupied has-conflict" : "is-occupied";
                } else if (estadoDisp === "preferencial") {
                    rotulo = "Pref.";
                    classeEstado = "is-preferred";
                } else if (estadoDisp === "indisponivel") {
                    rotulo = "Indisp.";
                    classeEstado = "is-unavailable";
                }

                return `
                <td>
                    <button
                        type="button"
                        class="avail-cell-btn ${classeEstado}" data-inspect-prof-avail="${aulasSlot.length ? chave : ''}"
                        data-toggle-prof-avail="${prof.id}"
                        data-avail-key="${chave}"
                        title="${aulasSlot.length ? aulasSlot.map((a) => escapar(a.disciplina) + ' · ' + a.codigo).join('; ') : 'Alternar disponibilidade'} · ${dia.nome} ${slot.id}" aria-label="${dia.nome} ${slot.id}: ${rotulo}"
                    >
                        ${rotulo}
                    </button>
                </td>`;
            }).join("");

            return `
            <tr>
                <th scope="row" class="avail-slot-col">${slot.id}</th>
                ${cols}
            </tr>`;
        }).join("");

        body.innerHTML = `
            <div class="detail-section">
                <div class="flex-row-between">
                    <span class="detail-section-title">Disponibilidade semanal</span>
                    <span class="cell-muted">Clique para alternar</span>
                </div>
                ${detalheDisponibilidade(prof, turmasProf)}
                <table class="availability-grid" aria-label="Disponibilidade semanal">
                    <thead>
                        <tr>
                            <th scope="col">Slot</th>
                            <th scope="col">SEG</th>
                            <th scope="col">TER</th>
                            <th scope="col">QUA</th>
                            <th scope="col">QUI</th>
                            <th scope="col">SEX</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${linhasMatrizHtml}
                    </tbody>
                </table>
                <div class="avail-legend-row">
                    <span><strong>Pref.</strong> Preferencial</span>
                    <span><strong>Disp.</strong> Disponível</span>
                    <span><strong>Indisp.</strong> Indisponível</span>
                </div>
            </div>

            <div class="detail-section">
                <span class="detail-section-title">Turmas atribuídas (<span class="mono-num">${turmasProf.length}</span>)</span>
                <div class="flex-col-gap-xs">
                    ${turmasProf
                        .map(
                            (t) => `
                        <div class="assigned-class-pill">
                            <span><strong class="cell-mono">${t.codigo}</strong> · ${escapar(t.disciplina)}</span>
                            <span class="cell-muted">${t.slot ? `<span class="mono-num">${rotuloHorario(t)}</span>` : "Sem horário"}</span>
                        </div>`
                        )
                        .join("")}
                </div>
            </div>
        `;
    }

    /* ==========================================================================
       7. MODAL DE GERAÇÃO AUTOMÁTICA DA GRADE (Seção 14)
       ========================================================================== */
    let resultadoGerador = null;
    let prioridadeGerador = "janelas";

    function abrirModalGerarGrade() {
        resultadoGerador = null;
        document.getElementById("modal-gerar-grade").classList.add("is-open");
        renderizarEtapaGerador("config");
        focarModal(document.getElementById("modal-gerar-grade"));
    }

    function fecharModalGerarGrade() {
        document.getElementById("modal-gerar-grade").classList.remove("is-open");
        resultadoGerador = null;
        restaurarFocoModal();
    }

    function renderizarEtapaGerador(etapa) {
        const body = document.getElementById("modal-gerar-body");
        const footer = document.getElementById("modal-gerar-footer");
        const title = document.getElementById("modal-gerar-title");
        const total = appState.dados.turmas.length;
        if (etapa === "config") {
            title.textContent = "Gerar proposta de grade";
            body.innerHTML = `
                <div class="gen-stats-grid">
                    <div class="gen-stat-cell"><strong class="mono-num">${total}</strong><span>turmas</span></div>
                    <div class="gen-stat-cell"><strong class="mono-num">${appState.dados.professores.length}</strong><span>professores</span></div>
                    <div class="gen-stat-cell"><strong class="mono-num">${appState.dados.espacos.length}</strong><span>espaços</span></div>
                    <div class="gen-stat-cell"><strong class="mono-num">${obterConflitosConsolidados(appState.dados).length}</strong><span>conflitos</span></div>
                </div>
                <div class="detail-section">
                    <p class="cell-muted">Consolida a grade: o servidor verifica os conflitos e o motor sugere horário e sala para resolvê-los (prefere trocar sala a mudar horário). Nada é gravado: o plano vai para o rascunho até você clicar em Confirmar tudo.</p>
                    <span class="detail-section-title">Prioridade <span class="cell-muted">(ainda não usada pelo motor do servidor)</span></span>
                    <div class="radio-stack">
                        <label class="radio-option"><input type="radio" name="opt-prio" value="valida" ${prioridadeGerador === 'valida' ? 'checked' : ''}><span>Encontrar uma solução válida</span></label>
                        <label class="radio-option"><input type="radio" name="opt-prio" value="janelas" ${prioridadeGerador === 'janelas' ? 'checked' : ''}><span>Agrupar horários docentes</span></label>
                        <label class="radio-option"><input type="radio" name="opt-prio" value="docentes" ${prioridadeGerador === 'docentes' ? 'checked' : ''}><span>Priorizar preferências docentes</span></label>
                    </div>
                </div>`;
            footer.innerHTML = `<button type="button" class="btn btn-ghost" data-gen-action="close">Cancelar</button><button type="button" class="btn btn-primary" data-gen-action="start">Gerar grade</button>`;
        } else if (etapa === "running") {
            prioridadeGerador = document.querySelector('input[name="opt-prio"]:checked')?.value || prioridadeGerador;
            body.innerHTML = `<p class="cell-muted">Consultando o motor do servidor…</p>`;
            footer.innerHTML = "";
            window.SATIC_DATA.gerarPropostaGrade(appState.dados).then((r) => {
                resultadoGerador = r;
                renderizarEtapaGerador("done");
            }).catch((err) => {
                body.innerHTML = `<p class="text-danger">${escapar(err.message)}</p>`;
                footer.innerHTML = `<button type="button" class="btn btn-ghost" data-gen-action="close">Fechar</button>`;
            });
        } else if (etapa === "done" && resultadoGerador) {
            const r = resultadoGerador;
            const n = r.plano ? r.plano.mudancas.length : 0;
            title.textContent = r.conflitos.length === 0 && r.pendentes.length === 0 ? "Grade consolidada" : n > 0 ? "Plano do motor" : "Conflitos sem solução automática";
            body.innerHTML = `<div class="detail-grid">
                <span class="detail-label">Conflitos</span><span class="detail-value mono-num">${r.conflitos.length}</span>
                <span class="detail-label">Pendentes</span><span class="detail-value mono-num">${r.pendentes.length}</span>
                <span class="detail-label">Mudanças sugeridas</span><span class="detail-value mono-num">${n}</span>
                <span class="detail-label">Sem solução</span><span class="detail-value mono-num">${r.naoResolvidos.length}</span>
                <span class="detail-label">Busca</span><span class="detail-value"><span class="mono-num">${r.nosVisitados}</span> nós · <span class="mono-num">${r.tempoMs}</span> ms</span>
                </div>
                ${n ? `<ul class="check-list">${r.plano.mudancas.map((m) => `<li class="check-list-item"><span class="cell-mono">${escapar(m.turma)}</span> ${escapar(m.de.horario)}${m.de.sala ? " · " + escapar(m.de.sala) : ""} → ${escapar(m.para.horario)} · ${escapar(m.para.sala)}</li>`).join("")}</ul>` : ""}
                ${r.naoResolvidos.length ? `<p class="cell-muted">${r.naoResolvidos.map((x) => escapar(x.turma + ": " + x.motivo)).join("<br>")}</p>` : ""}
                ${r.conflitos.length === 0 && r.pendentes.length === 0 ? `<p class="cell-muted">Sem conflitos nem pendências. Exporte a grade em ICS, PDF ou CSV pela Central de Conflitos.</p>` : ""}`;
            footer.innerHTML = `<button type="button" class="btn btn-secondary" data-gen-action="close">Fechar</button>${n ? `<button type="button" class="btn btn-primary" data-gen-action="apply">Colocar no rascunho</button>` : ""}`;
        }
    }

    function aplicarGradeOtimizada() {
        if (!resultadoGerador) return;
        if (resultadoGerador.plano) window.SATIC_DATA.aplicarMudancas(appState.dados, resultadoGerador.plano.mudancas);
        appState.dados.sugestoes = null;
        appState.matriz.turmaEmMovimentoId = null;
        appState.matriz.turmaSelecionadaId = null;
        fecharModalGerarGrade();
        navegarPara("tela-matriz");
        mostrarToast("Plano do motor no rascunho. Revise e clique em Confirmar tudo para gravar.");
    }
    function abrirCommandMenu() {
        const modal = document.getElementById("modal-command");
        const input = document.getElementById("cmd-search-input");
        if (!modal) return;
        modal.classList.add("is-open");
        focarModal(modal);
        renderizarListaComandos("");
        if (input) {
            input.value = "";
            setTimeout(() => input.focus(), 20);
        }
    }

    function fecharCommandMenu() {
        const modal = document.getElementById("modal-command");
        if (modal) modal.classList.remove("is-open");
        restaurarFocoModal();
    }

    function renderizarListaComandos(termo) {
        const list = document.getElementById("cmd-results-list");
        if (!list) return;

        const q = termo.trim().toLowerCase();
        const comandos = [
            { id: "nav:tela-matriz", titulo: "Ir para Grade Horária", tituloHtml: "Ir para Grade Horária", meta: "Tela" },
            { id: "nav:tela-painel", titulo: "Ir para Visão Geral do Semestre", tituloHtml: "Ir para Visão Geral do Semestre", meta: "Tela" },
            { id: "nav:tela-conflitos", titulo: "Abrir Central de Conflitos e Publicação", tituloHtml: "Abrir Central de Conflitos e Publicação", meta: "Tela" },
            { id: "action:gerar-grade", titulo: "Gerar grade automaticamente", tituloHtml: "Gerar grade automaticamente", meta: "Automação" },
            { id: "action:reset-demo", titulo: "Restaurar estado inicial de demonstração", tituloHtml: "Restaurar estado inicial de demonstração", meta: "Sistema" },
            ...appState.dados.turmas.map((t) => ({
                id: `turma:${t.id}`,
                titulo: `${t.codigo} · ${t.disciplina} (${t.professor})`,
                tituloHtml: `<span class="mono-num">${t.codigo}</span> · ${escapar(t.disciplina)} (${escapar(rotuloDocentes(t))})`,
                meta: t.sala ? `${escapar(nomeEspaco(t.sala))} · ${rotuloHorario(t)}` : "Não alocada"
            }))
        ];

        const filtrados = comandos.filter(
            (c) => !q || c.titulo.toLowerCase().includes(q) || c.meta.toLowerCase().includes(q)
        );

        list.innerHTML = filtrados
            .slice(0, 10)
            .map(
                (c) => `
            <button type="button" class="cmd-item" data-cmd-exec="${c.id}">
                <span class="cmd-item-left">
                    <span>${c.tituloHtml}</span>
                </span>
                <span class="cmd-shortcut">${c.meta}</span>
            </button>`
            )
            .join("");
    }

    /* ==========================================================================
       RENDERIZAÇÃO UNIFICADA E EVENTOS
       ========================================================================== */
    function renderizarTudo() {
        atualizarBarraRascunho();
        if (appState.dados.publicada && assinaturaPublicada !== assinaturaDados()) appState.dados.publicada = false;
        atualizarBadgesNavegacao();
        renderizarPainelGeral();
        renderizarMatriz();
        renderizarConflitosEPublicacao();
        renderizarEspacos();
        renderizarTurmas();
        renderizarProfessores();
    }

    function cancelarMovimentoMatriz() {
        const idMov = appState.matriz.turmaEmMovimentoId;
        const turma = idMov ? appState.dados.turmas.find((t) => t.id === idMov) : null;
        appState.matriz.turmaEmMovimentoId = null;
        if (turma && (!turma.sala || !turma.slot)) {
            appState.matriz.turmaSelecionadaId = null;
        }
    }

    function atualizarDestinosMovimento() {
        const turma = appState.dados.turmas.find((t) => t.id === appState.matriz.turmaEmMovimentoId);
        if (!turma) return;
        document.getElementById('drawer-matriz')?.classList.remove('is-open');
        const scheduleGridEl = document.getElementById('matrix-schedule-grid');
        if (scheduleGridEl) scheduleGridEl.classList.add('is-moving-mode');

        document.querySelectorAll('[data-unallocated-id]').forEach((el) => {
            el.classList.toggle('is-selected', el.getAttribute('data-unallocated-id') === turma.id);
        });
        document.querySelectorAll('[data-event-turma]').forEach((el) => {
            el.classList.toggle('is-moving', el.getAttribute('data-event-turma') === turma.id);
        });

        const summaryEl = document.getElementById('matrix-summary-count');
        const movingInlineEl = document.getElementById('matrix-moving-inline');
        const movingTextEl = document.getElementById('matrix-moving-text');
        const panelEl = document.getElementById('matrix-unallocated-panel');
        const mostrarInlineMoving = Boolean(turma.sala || panelEl?.hidden);
        if (movingInlineEl && movingTextEl) {
            movingInlineEl.hidden = !mostrarInlineMoving;
            if (summaryEl) summaryEl.hidden = mostrarInlineMoving;
            if (mostrarInlineMoving) {
                movingTextEl.innerHTML = `Movendo <span class="mono-num">${turma.codigo}</span>`;
            }
        }

        document.querySelectorAll('[data-cell-dia]').forEach((cell) => {
            const v = verificarViabilidadeSlot(appState.dados, turma, cell.dataset.cellDia, cell.dataset.cellSlot);
            cell.classList.toggle('is-drop-valid', v.valido);
            cell.classList.toggle('is-drop-invalid', !v.valido);
            cell.classList.remove('is-drag-over');
            cell.tabIndex = v.valido ? 0 : -1;

            const inner = cell.querySelector('.schedule-cell-inner');
            if (!inner) return;
            inner.querySelectorAll('.slot-alloc-action, .slot-blocked-reason').forEach((n) => n.remove());

            const hint = document.createElement('div');
            if (v.valido) {
                const nomeSala = nomeEspaco(v.salaSugerida);
                hint.className = 'slot-alloc-action';
                hint.textContent = `Alocar em ${nomeSala}`;
                cell.title = `Alocar em ${nomeSala}`;
            } else {
                const motivoCurto = formatarMotivoBloqueio(v, turma);
                hint.className = 'slot-blocked-reason';
                hint.textContent = motivoCurto;
                cell.title = motivoCurto;
            }
            inner.appendChild(hint);
        });
    }

    function exportarCSV() {
        const linhas = [['Código', 'Disciplina', 'Turma', 'Curso', 'Docentes', 'Alunos', 'Espaço', 'Horário', 'Código SIGAA']];
        appState.dados.turmas.forEach((t) => linhas.push([t.codigo, t.disciplina, t.turma, t.curso, (t.professores || []).join(', '),
            t.alunos, appState.dados.espacos.find((e) => e.id === t.sala)?.nome || '', rotuloHorario(t), t.horario || '']));
        const csv = '\ufeff' + linhas.map((linha) => linha.map((valor) => {
            let texto = String(valor);
            if (/^[=+@-]/.test(texto)) texto = "'" + texto;
            return '"' + texto.replace(/"/g, '""') + '"';
        }).join(';')).join('\r\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `satic-${appState.dados.semestre}.csv`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        mostrarToast('Grade exportada em CSV.');
    }

    function configurarEventos() {
        document.addEventListener("click", (e) => {
            if (!e.target.closest(".dropdown-wrapper")) {
                document.querySelectorAll(".dropdown-menu.is-open").forEach((m) => m.classList.remove("is-open"));
            }

            if (appState.matriz.filtrosAbertos && !e.target.closest("#tela-matriz .filters-popover-wrap")) {
                appState.matriz.filtrosAbertos = false;
                renderizarChipsFiltrosMatriz();
            }

            if (appState.turmas.filtrosAbertos && !e.target.closest("[data-turmas-popover-wrap]")) {
                appState.turmas.filtrosAbertos = false;
                renderizarChipsFiltrosTurmas();
            }

            const navBtn = e.target.closest("[data-nav-target]");
            if (navBtn) {
                const target = navBtn.getAttribute("data-nav-target");
                const focoPub = navBtn.hasAttribute("data-nav-pub");
                navegarPara(target, { focoPublicacao: focoPub });
                return;
            }

            const jumpBtn = e.target.closest("[data-overview-jump]");
            if (jumpBtn) {
                navegarPara(jumpBtn.getAttribute("data-overview-jump"));
                return;
            }

            const prioBtn = e.target.closest("[data-priority-action]");
            if (prioBtn) {
                const tipo = prioBtn.getAttribute("data-priority-action");
                const id = prioBtn.getAttribute("data-priority-id");
                if (tipo === "resolver-conflito") {
                    navegarPara("tela-conflitos", { selecionarConflito: id });
                } else if (tipo === "alocar-matriz") {
                    navegarPara("tela-matriz", { iniciarAlocacaoTurma: id });
                }
                return;
            }

            if (e.target.closest("[data-toggle-filters]")) {
                appState.matriz.filtrosAbertos = !appState.matriz.filtrosAbertos;
                renderizarChipsFiltrosMatriz();
                return;
            }

            if (e.target.closest("[data-close-filters]")) {
                appState.matriz.filtrosAbertos = false;
                renderizarChipsFiltrosMatriz();
                return;
            }

            if (e.target.closest("[data-clear-matrix-filters]")) {
                Object.assign(appState.matriz, {
                    curso: "todos",
                    periodo: "todos",
                    espaco: "todos",
                    professor: "todos"
                });
                renderizarMatriz();
                return;
            }

            const removeFilterBtn = e.target.closest("[data-remove-filter]");
            if (removeFilterBtn) {
                const chave = removeFilterBtn.getAttribute("data-remove-filter");
                if (chave in appState.matriz) {
                    appState.matriz[chave] = "todos";
                    renderizarMatriz();
                }
                return;
            }

            const shiftBtn = e.target.closest("[data-shift]");
            if (shiftBtn) {
                appState.matriz.turno = shiftBtn.getAttribute("data-shift");
                renderizarMatriz();
                return;
            }

            if (e.target.closest("[data-toggle-unallocated]")) {
                appState.matriz.painelPendentesRecolhido = !appState.matriz.painelPendentesRecolhido;
                renderizarMatriz();
                return;
            }

            if (e.target.closest("[data-cancel-move]")) {
                cancelarMovimentoMatriz();
                renderizarMatriz();
                return;
            }

            const unallocBtn = e.target.closest("[data-unallocated-id]");
            if (unallocBtn) {
                const id = unallocBtn.getAttribute("data-unallocated-id");
                const estavaEmMovimento = appState.matriz.turmaEmMovimentoId === id;
                appState.matriz.modoEdicaoDrawer = false;
                if (estavaEmMovimento) {
                    appState.matriz.turmaEmMovimentoId = null;
                    appState.matriz.turmaSelecionadaId = null;
                } else {
                    appState.matriz.turmaEmMovimentoId = id;
                    appState.matriz.turmaSelecionadaId = id;
                    appState.dados.movimento = { turmaId: id, diaOrigem: null };
                }
                renderizarMatriz();
                return;
            }

            const validCell = e.target.closest("td.is-drop-valid");
            if (validCell && appState.matriz.turmaEmMovimentoId) {
                const dia = validCell.getAttribute("data-cell-dia");
                const slot = validCell.getAttribute("data-cell-slot");
                alocarTurmaEmSlot(appState.matriz.turmaEmMovimentoId, dia, slot);
                return;
            }

            const eventBlock = e.target.closest("[data-event-turma]");
            if (eventBlock) {
                const id = eventBlock.getAttribute("data-event-turma");
                appState.matriz.turmaEmMovimentoId = null;
                appState.matriz.turmaSelecionadaId = id;
                appState.matriz.diaSelecionado = eventBlock.getAttribute("data-event-dia");
                appState.matriz.modoEdicaoDrawer = false;
                renderizarMatriz();
                return;
            }

            const matrixDrawerBtn = e.target.closest("[data-matrix-drawer-action]");
            if (matrixDrawerBtn) {
                const action = matrixDrawerBtn.getAttribute("data-matrix-drawer-action");
                const turma = appState.dados.turmas.find((t) => t.id === appState.matriz.turmaSelecionadaId);
                if (action === "close") {
                    appState.matriz.turmaSelecionadaId = null;
                    appState.matriz.turmaEmMovimentoId = null;
                    renderizarMatriz();
                } else if (action === "edit") {
                    appState.matriz.modoEdicaoDrawer = true;
                    renderizarDrawerMatriz();
                } else if (action === "cancel-edit") {
                    appState.matriz.modoEdicaoDrawer = false;
                    renderizarDrawerMatriz();
                } else if (action === "save-edit" && turma) {
                    const horarioVal = document.getElementById("edit-alloc-horario").value.trim().toUpperCase().replace(/\s+/g, " ");
                    const salaVal = document.getElementById("edit-alloc-sala").value;
                    try {
                        window.SATIC_DATA.dominio().horario.obterConjuntoSlots(horarioVal);
                    } catch (err) {
                        mostrarToast(`Horário inválido: ${err.message}`);
                        return;
                    }
                    moverTurma(appState.dados, turma, { sala: salaVal, horario: horarioVal });
                    appState.matriz.modoEdicaoDrawer = false;
                    appState.matriz.turmaEmMovimentoId = null;
                    renderizarTudo();
                    mostrarToast(`${turma.codigo}: ${rotuloHorario(turma)} · ${nomeEspaco(salaVal)} (no rascunho).`);
                } else if (action === "unassign" && turma) {
                    moverTurma(appState.dados, turma, { sala: null });
                    appState.matriz.modoEdicaoDrawer = false;
                    renderizarTudo();
                    mostrarToast(`${turma.codigo} movida para a fila de não alocadas.`);
                } else if (action === "move-on-grid" && turma) {
                    appState.matriz.turmaEmMovimentoId = appState.matriz.turmaEmMovimentoId === turma.id ? null : turma.id;
                    appState.dados.movimento = { turmaId: turma.id, diaOrigem: appState.matriz.diaSelecionado || turma.dias[0] || null };
                    renderizarMatriz();
                } else if (action === "open-conflict" && turma) {
                    navegarPara("tela-conflitos", { selecionarConflito: `conf-${turma.id}` });
                }
                return;
            }

            const filterConflictBtn = e.target.closest("[data-conflict-filter]");
            if (filterConflictBtn) {
                appState.conflitos.filtro = filterConflictBtn.getAttribute("data-conflict-filter");
                renderizarConflitosEPublicacao();
                return;
            }

            if (e.target.closest("[data-toggle-turmas-filters]")) {
                appState.turmas.filtrosAbertos = !appState.turmas.filtrosAbertos;
                renderizarChipsFiltrosTurmas();
                return;
            }

            if (e.target.closest("[data-close-turmas-filters]")) {
                appState.turmas.filtrosAbertos = false;
                renderizarChipsFiltrosTurmas();
                return;
            }

            if (e.target.closest("[data-clear-turmas-filters]")) {
                Object.assign(appState.turmas, {
                    curso: "todos",
                    periodo: "todos",
                    ambiente: "todos"
                });
                renderizarTurmas();
                return;
            }

            const removeTurmaFilterBtn = e.target.closest("[data-remove-turmas-filter]");
            if (removeTurmaFilterBtn) {
                const chave = removeTurmaFilterBtn.getAttribute("data-remove-turmas-filter");
                if (chave in appState.turmas) {
                    appState.turmas[chave] = "todos";
                    renderizarTurmas();
                }
                return;
            }

            const turmasStatusBtn = e.target.closest("[data-turmas-status]");
            if (turmasStatusBtn) {
                appState.turmas.status = turmasStatusBtn.getAttribute("data-turmas-status");
                renderizarTurmas();
                return;
            }

            const profStatusBtn = e.target.closest("[data-prof-status]");
            if (profStatusBtn) {
                appState.professores.status = profStatusBtn.getAttribute("data-prof-status");
                renderizarProfessores();
                return;
            }

            const espTipoBtn = e.target.closest("[data-espacos-tipo]");
            if (espTipoBtn) {
                appState.espacos.tipo = espTipoBtn.getAttribute("data-espacos-tipo");
                renderizarEspacos();
                return;
            }

            const espStatusBtn = e.target.closest("[data-espacos-status]");
            if (espStatusBtn) {
                appState.espacos.status = espStatusBtn.getAttribute("data-espacos-status");
                renderizarEspacos();
                return;
            }

            const selectConflictBtn = e.target.closest("[data-select-conflict]");
            if (selectConflictBtn) {
                appState.conflitos.conflitoSelecionadoId = selectConflictBtn.getAttribute("data-select-conflict");
                renderizarConflitosEPublicacao();
                return;
            }

            const applyAltBtn = e.target.closest("[data-apply-alternative]");
            if (applyAltBtn) {
                const confId = applyAltBtn.getAttribute("data-apply-alternative");
                const altIdx = parseInt(applyAltBtn.getAttribute("data-alt-index"), 10);
                const conflitos = obterConflitosConsolidados(appState.dados);
                const conf = conflitos.find((c) => c.id === confId);
                if (conf && conf.alternativas[altIdx]) {
                    conf.alternativas[altIdx].aplicar(appState.dados);
                    appState.dados.sugestoes = null; // as demais sugestões podem ter ficado velhas
                    renderizarTudo();
                    mostrarToast(`No rascunho: ${conf.alternativas[altIdx].descricao}. Clique em Confirmar tudo para gravar.`);
                }
                return;
            }

            const pubBtn = e.target.closest("[data-action-publish]");
            if (pubBtn) {
                const conflitos = obterConflitosConsolidados(appState.dados);
                const pendentes = appState.dados.turmas.some((t) => !inspecionarTurma(appState.dados, t).alocada);
                if (contarRascunho(appState.dados) > 0) {
                    mostrarToast("Confirme ou descarte as alterações do rascunho antes de publicar.");
                } else if (conflitos.length > 0 || pendentes) {
                    mostrarToast(`Resolva os ${conflitos.length} conflitos críticos antes de publicar a grade.`);
                } else {
                    appState.dados.publicada = true;
                    assinaturaPublicada = assinaturaDados();
                    renderizarConflitosEPublicacao();
                    mostrarToast("Proposta marcada como publicada nesta sessão.");
                }
                return;
            }

            const rowEspaco = e.target.closest("[data-row-espaco]");
            if (rowEspaco) {
                appState.espacos.espacoSelecionadoId = rowEspaco.getAttribute("data-row-espaco");
                appState.espacos.modoEdicao = false;
                appState.espacos.criandoNovo = false;
                renderizarEspacos();
                return;
            }

            const espDrawerBtn = e.target.closest("[data-espaco-drawer]");
            if (espDrawerBtn) {
                const act = espDrawerBtn.getAttribute("data-espaco-drawer");
                if (act === "close") {
                    appState.espacos.espacoSelecionadoId = null;
                    appState.espacos.modoEdicao = false;
                    appState.espacos.criandoNovo = false;
                    renderizarEspacos();
                } else if (act === "new") {
                    appState.espacos.espacoSelecionadoId = null;
                    appState.espacos.criandoNovo = true;
                    appState.espacos.modoEdicao = true;
                    renderizarEspacos();
                } else if (act === "edit") {
                    appState.espacos.modoEdicao = true;
                    renderizarDrawerEspaco();
                } else if (act === "cancel") {
                    appState.espacos.modoEdicao = false;
                    appState.espacos.criandoNovo = false;
                    renderizarEspacos();
                } else if (act === "save") {
                    salvarFormularioEspaco();
                } else if (act === "view-grid") {
                    appState.matriz.espaco = appState.espacos.espacoSelecionadoId;
                    const sel = document.getElementById("matrix-filter-espaco");
                    if (sel) sel.value = appState.matriz.espaco;
                    navegarPara("tela-matriz");
                }
                return;
            }

            const rowTurma = e.target.closest("[data-row-turma]");
            if (rowTurma) {
                appState.turmas.turmaSelecionadaId = rowTurma.getAttribute("data-row-turma");
                appState.turmas.modoEdicao = false;
                renderizarTurmas();
                return;
            }

            const turmaDrawerBtn = e.target.closest("[data-turma-drawer]");
            if (turmaDrawerBtn) {
                const act = turmaDrawerBtn.getAttribute("data-turma-drawer");
                const turma = appState.dados.turmas.find((t) => t.id === appState.turmas.turmaSelecionadaId);
                if (act === "close") {
                    appState.turmas.turmaSelecionadaId = null;
                    renderizarTurmas();
                } else if (act === "edit") {
                    appState.turmas.modoEdicao = true;
                    renderizarDrawerTurma();
                } else if (act === "cancel") {
                    appState.turmas.modoEdicao = false;
                    renderizarDrawerTurma();
                } else if (act === "save" && turma) {
                    const disciplina = document.getElementById("inp-turma-disc").value.trim();
                    const alunos = Number(document.getElementById("inp-turma-alunos").value);
                    if (!disciplina || !Number.isInteger(alunos) || alunos <= 0) {
                        mostrarToast('Informe uma disciplina e uma quantidade positiva de estudantes.');
                        return;
                    }
                    turma.disciplina = disciplina;
                    turma.professor = document.getElementById("inp-turma-prof").value;
                    turma.alunos = alunos;
                    turma.ambienteExigido = document.getElementById("inp-turma-amb").value;
                    appState.turmas.modoEdicao = false;
                    renderizarTudo();
                    mostrarToast(`Dados de ${turma.codigo} atualizados.`);
                } else if (act === "open-in-matrix" && turma) {
                    if (turma.sala) {
                        navegarPara("tela-matriz", { selecionarTurmaMatriz: turma.id });
                    } else {
                        navegarPara("tela-matriz", { iniciarAlocacaoTurma: turma.id });
                    }
                }
                return;
            }

            const rowProf = e.target.closest("[data-row-professor]");
            if (rowProf) {
                appState.professores.professorSelecionadoId = rowProf.getAttribute("data-row-professor");
                appState.professores.slotSelecionado = null;
                renderizarProfessores();
                return;
            }

            const inspecionarDisp = e.target.closest('[data-inspect-prof-avail]');
            if (inspecionarDisp?.dataset.inspectProfAvail) {
                appState.professores.slotSelecionado = inspecionarDisp.dataset.inspectProfAvail;
                renderizarDrawerProfessor();
                return;
            }
            const toggleAvailBtn = e.target.closest("[data-toggle-prof-avail]");
            if (toggleAvailBtn) {
                const profId = toggleAvailBtn.getAttribute("data-toggle-prof-avail");
                const key = toggleAvailBtn.getAttribute("data-avail-key");
                const prof = appState.dados.professores.find((p) => p.id === profId);
                if (prof) {
                    const atual = prof.disponibilidade[key] || "disponivel";
                    const proximo = atual === "disponivel" ? "preferencial" : atual === "preferencial" ? "indisponivel" : "disponivel";
                    prof.disponibilidade[key] = proximo;
                    renderizarTudo();
                    mostrarToast(`Horário ${key.replace(":", " ")} alterado para ${proximo}.`);
                }
                return;
            }

            const closeProfDrawer = e.target.closest("[data-prof-drawer-close]");
            if (closeProfDrawer) {
                appState.professores.professorSelecionadoId = null;
                renderizarProfessores();
                return;
            }

            if (e.target.closest("[data-open-generator]")) {
                abrirModalGerarGrade();
                return;
            }

            const genBtn = e.target.closest("[data-gen-action]");
            if (genBtn) {
                const act = genBtn.getAttribute("data-gen-action");
                if (act === "close") fecharModalGerarGrade();
                else if (act === "start") renderizarEtapaGerador("running");
                else if (act === "apply") aplicarGradeOtimizada();
                else if (act === "config") renderizarEtapaGerador("config");
                return;
            }

            if (e.target.closest("[data-open-cmd]")) {
                document.querySelectorAll(".dropdown-menu.is-open").forEach((m) => m.classList.remove("is-open"));
                abrirCommandMenu();
                return;
            }

            const cmdExec = e.target.closest("[data-cmd-exec]");
            if (cmdExec) {
                const cmd = cmdExec.getAttribute("data-cmd-exec");
                fecharCommandMenu();
                if (cmd.startsWith("nav:")) {
                    navegarPara(cmd.replace("nav:", ""));
                } else if (cmd === "action:gerar-grade") {
                    abrirModalGerarGrade();
                } else if (cmd === "action:reset-demo") {
                    recarregarDoServidor();
                } else if (cmd.startsWith("turma:")) {
                    const tId = cmd.replace("turma:", "");
                    navegarPara("tela-matriz", { selecionarTurmaMatriz: tId });
                }
                return;
            }

            const dropTrigger = e.target.closest("[data-dropdown-toggle]");
            if (dropTrigger) {
                const menuId = dropTrigger.getAttribute("data-dropdown-toggle");
                const menu = document.getElementById(menuId);
                if (menu) menu.classList.toggle("is-open");
                return;
            }

            const exportItem = e.target.closest("[data-export-type]");
            if (exportItem) {
                const tipoExp = exportItem.getAttribute("data-export-type");
                document.querySelectorAll(".dropdown-menu.is-open").forEach((m) => m.classList.remove("is-open"));
                if (tipoExp.includes('CSV')) exportarCSV();
                else if (tipoExp.includes('ICS')) exportarICS();
                else if (tipoExp.includes('PDF')) imprimirGrade(tipoExp.includes('professor'));
                else mostrarToast(`Exportação ${tipoExp}: ainda não implementada nesta versão.`);
                return;
            }

            if (e.target.closest("[data-cmd-close]")) {
                fecharCommandMenu();
                return;
            }

            if (e.target.classList.contains("modal-backdrop")) {
                fecharCommandMenu();
                fecharModalGerarGrade();
                return;
            }

            if (e.target.closest("[data-reset-demo]")) {
                document.querySelectorAll(".dropdown-menu.is-open").forEach((m) => m.classList.remove("is-open"));
                recarregarDoServidor();
            }
        });

        document.addEventListener("dragstart", (e) => {
            const unalloc = e.target.closest("[data-unallocated-id]");
            const block = e.target.closest("[data-event-turma]");
            if (unalloc) {
                const id = unalloc.getAttribute("data-unallocated-id");
                appState.dados.movimento = { turmaId: id, diaOrigem: null };
                appState.matriz.turmaEmMovimentoId = id;
                appState.matriz.turmaSelecionadaId = id;
                e.dataTransfer.setData("text/plain", id);
                atualizarDestinosMovimento();
            } else if (block) {
                const id = block.getAttribute("data-event-turma");
                appState.dados.movimento = { turmaId: id, diaOrigem: block.getAttribute("data-event-dia") || null };
                appState.matriz.turmaEmMovimentoId = id;
                appState.matriz.turmaSelecionadaId = id;
                e.dataTransfer.setData("text/plain", id);
                atualizarDestinosMovimento();
            }
        });

        document.addEventListener("dragover", (e) => {
            const cell = e.target.closest("td[data-cell-dia]");
            if (cell) {
                e.preventDefault();
                if (cell.classList.contains("is-drop-valid")) {
                    cell.classList.add("is-drag-over");
                }
            }
        });

        document.addEventListener("dragleave", (e) => {
            const cell = e.target.closest("td.is-drag-over");
            if (cell && (!e.relatedTarget || !cell.contains(e.relatedTarget))) {
                cell.classList.remove("is-drag-over");
            }
        });

        document.addEventListener("dragend", () => {
            document.querySelectorAll("td.is-drag-over").forEach((c) => c.classList.remove("is-drag-over"));
            if (appState.matriz.turmaEmMovimentoId) {
                cancelarMovimentoMatriz();
                renderizarMatriz();
            }
        });

        document.addEventListener("drop", (e) => {
            const cell = e.target.closest("td[data-cell-dia]");
            if (!cell) return;
            e.preventDefault();
            document.querySelectorAll("td.is-drag-over").forEach((c) => c.classList.remove("is-drag-over"));
            const turmaId = e.dataTransfer.getData("text/plain") || appState.matriz.turmaEmMovimentoId;
            const dia = cell.getAttribute("data-cell-dia");
            const slot = cell.getAttribute("data-cell-slot");
            if (turmaId && dia && slot) {
                alocarTurmaEmSlot(turmaId, dia, slot);
            }
        });

        document.addEventListener("input", (e) => {
            if (e.target.id === "matrix-search") {
                appState.matriz.busca = e.target.value;
                renderizarMatriz();
            } else if (e.target.id === "espacos-search") {
                appState.espacos.busca = e.target.value;
                renderizarEspacos();
            } else if (e.target.id === "turmas-search") {
                appState.turmas.busca = e.target.value;
                renderizarTurmas();
            } else if (e.target.id === "professores-search") {
                appState.professores.busca = e.target.value;
                renderizarProfessores();
            } else if (e.target.id === "cmd-search-input") {
                renderizarListaComandos(e.target.value);
            }
        });

        document.addEventListener("change", (e) => {
            if (e.target.id === "matrix-filter-curso") {
                appState.matriz.curso = e.target.value;
                renderizarMatriz();
            } else if (e.target.id === "matrix-filter-periodo") {
                appState.matriz.periodo = e.target.value;
                renderizarMatriz();
            } else if (e.target.id === "matrix-filter-espaco") {
                appState.matriz.espaco = e.target.value;
                renderizarMatriz();
            } else if (e.target.id === "matrix-filter-professor") {
                appState.matriz.professor = e.target.value;
                renderizarMatriz();
            } else if (e.target.id === "espacos-filter-tipo") {
                appState.espacos.tipo = e.target.value;
                renderizarEspacos();
            } else if (e.target.id === "espacos-filter-status") {
                appState.espacos.status = e.target.value;
                renderizarEspacos();
            } else if (e.target.id === "turmas-filter-curso") {
                appState.turmas.curso = e.target.value;
                renderizarTurmas();
            } else if (e.target.id === "turmas-filter-periodo") {
                appState.turmas.periodo = e.target.value;
                renderizarTurmas();
            } else if (e.target.id === "turmas-filter-status") {
                appState.turmas.status = e.target.value;
                renderizarTurmas();
            } else if (e.target.id === "turmas-filter-ambiente") {
                appState.turmas.ambiente = e.target.value;
                renderizarTurmas();
            } else if (e.target.id === "professores-filter-status") {
                appState.professores.status = e.target.value;
                renderizarProfessores();
            }
        });

        document.addEventListener("keydown", (e) => {
            const modalAberto = document.querySelector('.modal-backdrop.is-open');
            if (e.key === 'Tab' && modalAberto) {
                const campos = [...modalAberto.querySelectorAll('button:not(:disabled), input, select, [tabindex="0"]')].filter((el) => el.getClientRects().length);
                const primeiro = campos[0], ultimo = campos[campos.length - 1];
                if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo?.focus(); }
                else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro?.focus(); }
            }
            if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-row-professor], [data-row-turma], [data-row-espaco], td.is-drop-valid, [data-unallocated-id]')) {
                e.preventDefault();
                e.target.click();
                return;
            }
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                abrirCommandMenu();
            } else if (e.key === "Escape") {
                fecharCommandMenu();
                fecharModalGerarGrade();
                document.querySelectorAll(".dropdown-menu.is-open").forEach((m) => m.classList.remove("is-open"));
                if (modalAberto) return;
                if (appState.matriz.filtrosAbertos) {
                    appState.matriz.filtrosAbertos = false;
                    renderizarChipsFiltrosMatriz();
                    return;
                }
                if (appState.turmas.filtrosAbertos) {
                    appState.turmas.filtrosAbertos = false;
                    renderizarChipsFiltrosTurmas();
                    return;
                }
                if (appState.matriz.turmaEmMovimentoId) {
                    cancelarMovimentoMatriz();
                    renderizarMatriz();
                } else {
                    appState.matriz.turmaSelecionadaId = null;
                    appState.turmas.turmaSelecionadaId = null;
                    appState.espacos.espacoSelecionadoId = null;
                    appState.espacos.criandoNovo = false;
                    appState.professores.professorSelecionadoId = null;
                    renderizarTudo();
                }
            }
        });
    }

    function alocarTurmaEmSlot(turmaId, dia, slotId) {
        const turma = appState.dados.turmas.find((t) => t.id === turmaId);
        if (!turma) return;

        const viabilidade = verificarViabilidadeSlot(appState.dados, turma, dia, slotId);
        if (!viabilidade.valido) {
            mostrarToast(`Slot indisponível: ${viabilidade.motivo}`);
            appState.matriz.turmaEmMovimentoId = null;
            renderizarMatriz();
            return;
        }

        moverTurma(appState.dados, turma, { sala: viabilidade.salaSugerida, horario: viabilidade.novoHorario });
        appState.dados.movimento = null;

        appState.matriz.turmaEmMovimentoId = null;
        appState.matriz.turmaSelecionadaId = turma.id;
        renderizarTudo();
        mostrarToast(`${turma.codigo}: ${rotuloHorario(turma)} · ${nomeEspaco(viabilidade.salaSugerida)}${viabilidade.origemSala === "sugerida" ? " (sala sugerida)" : ""} — no rascunho.`);
    }

    function salvarFormularioEspaco() {
        const nome = document.getElementById("inp-esp-nome").value.trim();
        const codigo = document.getElementById("inp-esp-codigo").value.trim();
        const tipo = document.getElementById("inp-esp-tipo").value;
        const capacidade = Number(document.getElementById("inp-esp-cap").value);
        const pcs = Number(document.getElementById("inp-esp-pcs").value);
        const equipamentos = document
            .getElementById("inp-esp-equip")
            .value.split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        const status = document.getElementById("inp-esp-status").value;

        if (!nome || !Number.isInteger(capacidade) || capacidade <= 0 || !Number.isInteger(pcs) || pcs < 0) {
            mostrarToast('Informe nome, capacidade positiva e uma quantidade válida de PCs.');
            return;
        }
        if (appState.dados.espacos.some((e) => e.id !== appState.espacos.espacoSelecionadoId && e.nome.toLowerCase() === nome.toLowerCase())) {
            mostrarToast('Já existe um espaço com esse nome.');
            return;
        }

        if (appState.espacos.criandoNovo) {
            const novo = {
                id: `espaco-${Date.now()}`,
                nome,
                codigo,
                tipo,
                capacidade,
                pcs,
                equipamentos,
                status,
                pavimento: "Térreo",
                observacao: "Cadastrado na sessão atual."
            };
            appState.dados.espacos.push(novo);
            appState.espacos.espacoSelecionadoId = novo.id;
            mostrarToast(`Espaço ${nome} adicionado ao inventário.`);
        } else {
            const esp = appState.dados.espacos.find((e) => e.id === appState.espacos.espacoSelecionadoId);
            if (esp) {
                esp.nome = nome;
                esp.codigo = codigo;
                esp.tipo = tipo;
                esp.capacidade = capacidade;
                esp.pcs = pcs;
                esp.equipamentos = equipamentos;
                esp.status = status;
                mostrarToast(`Espaço ${nome} atualizado.`);
            }
        }

        appState.espacos.modoEdicao = false;
        appState.espacos.criandoNovo = false;
        renderizarTudo();
    }

    /* ==========================================================================
       Servidor: carga inicial, rascunho e aviso de indisponibilidade
       ========================================================================== */
    function mostrarStatusApi(estado, mensagem) {
        const box = document.getElementById("api-status");
        if (!box) return;
        box.hidden = estado === "ok";
        const titulo = document.getElementById("api-status-title");
        const msg = document.getElementById("api-status-msg");
        const retry = box.querySelector("[data-api-retry]");
        if (estado === "carregando") {
            titulo.textContent = "Conectando ao servidor…";
            msg.textContent = "Carregando turmas, salas, docentes e regras do SATIC.";
            retry.hidden = true;
        } else if (estado === "erro") {
            titulo.textContent = "Servidor indisponível";
            msg.textContent = `${mensagem} Verifique se a API está no ar (no SATIC-back/ts: npm run local) e tente de novo.`;
            retry.hidden = false;
        }
    }

    async function carregarDoServidor() {
        mostrarStatusApi("carregando");
        try {
            const novo = await window.SATIC_DATA.carregar(appState.dados.semestre || "2026.2");
            if (appState.dados.carregado) novo.publicada = appState.dados.publicada;
            appState.dados = novo;
            appState.matriz.turmaEmMovimentoId = null;
            mostrarStatusApi("ok");
            renderizarTudo();
            const apiEl = document.getElementById("cfg-api-url");
            if (apiEl) apiEl.textContent = window.SATIC_DATA.baseApi();
            return true;
        } catch (err) {
            mostrarStatusApi("erro", err.message || String(err));
            return false;
        }
    }

    async function recarregarDoServidor() {
        document.querySelectorAll(".dropdown-menu.is-open").forEach((m) => m.classList.remove("is-open"));
        if (contarRascunho(appState.dados) > 0 && !window.confirm("Descartar as alterações não salvas e recarregar do servidor?")) return;
        try {
            appState.dados = await window.SATIC_DATA.descartarRascunho(appState.dados);
            appState.matriz.turmaEmMovimentoId = null;
            renderizarTudo();
            mostrarToast("Dados recarregados do servidor.");
        } catch (err) {
            tratarErroApi(err);
        }
    }

    function tratarErroApi(err) {
        if (err && err.indisponivel) mostrarStatusApi("erro", err.message);
        else mostrarToast(`Erro do servidor: ${err && err.message ? err.message : err}`);
    }

    function atualizarBarraRascunho() {
        const barra = document.getElementById("draft-bar");
        if (!barra) return;
        const n = contarRascunho(appState.dados);
        const recusas = Object.keys(appState.dados.recusas || {}).length;
        barra.hidden = n === 0;
        const contador = document.getElementById("draft-count");
        if (contador) {
            contador.innerHTML = `<span class="mono-num">${n}</span> ${n === 1 ? "alteração não salva" : "alterações não salvas"}${recusas ? ` · <span class="text-danger"><span class="mono-num">${recusas}</span> recusada(s)</span>` : ""}`;
        }
    }

    async function confirmarTudo() {
        const n = contarRascunho(appState.dados);
        if (n === 0) return;
        try {
            const r = await window.SATIC_DATA.confirmarRascunho(appState.dados);
            appState.dados = r.estado;
            appState.matriz.turmaEmMovimentoId = null;
            renderizarTudo();
            if (r.recusados === 0) mostrarToast(`${r.aceitos} alteração(ões) gravada(s) no servidor.`);
            else {
                const motivos = r.resultados.filter((x) => !x.sucesso).flatMap((x) => (x.violacoes || []).map((v) => v.regra));
                mostrarToast(`${r.aceitos} gravada(s), ${r.recusados} recusada(s) pelo servidor (${[...new Set(motivos)].join(", ")}). As recusadas continuam no rascunho.`);
            }
        } catch (err) {
            tratarErroApi(err);
        }
    }

    async function resolverViaMotor() {
        mostrarToast("Consultando o motor do servidor…");
        try {
            const r = await window.SATIC_DATA.buscarSugestoes(appState.dados);
            renderizarTudo();
            const n = r.plano ? r.plano.mudancas.length : 0;
            mostrarToast(n ? `Motor: ${Object.keys(r.alternativasPorTurma).length} turma(s) com alternativas · plano com ${n} mudança(s).` : "O motor não encontrou alternativas dentro do limite de busca.");
        } catch (err) {
            tratarErroApi(err);
        }
    }

    /* ==========================================================================
       Exportações: ICS (Google Agenda) e PDF (impressão do navegador)
       ========================================================================== */
    function lerDatasSemestre() {
        try {
            return { inicio: localStorage.getItem("satic.semestre.inicio") || "", fim: localStorage.getItem("satic.semestre.fim") || "" };
        } catch (_) {
            return { inicio: "", fim: "" };
        }
    }

    function exportarICS() {
        const { inicio, fim } = lerDatasSemestre();
        if (!inicio || !fim || fim < inicio) {
            mostrarToast("Defina o início e o fim das aulas em Configurações para exportar o ICS.");
            navegarPara("tela-configuracoes");
            return;
        }
        const D = window.SATIC_DATA.dominio();
        const relogio = Object.fromEntries(D.grade.RELOGIO_AULAS.map((a) => [a.id, a]));
        const diaIcs = { SEG: "MO", TER: "TU", QUA: "WE", QUI: "TH", SEX: "FR", SAB: "SA" };
        const offset = { SEG: 0, TER: 1, QUA: 2, QUI: 3, SEX: 4, SAB: 5 };
        const base = new Date(`${inicio}T00:00:00`);
        const segunda = new Date(base);
        segunda.setDate(base.getDate() - ((base.getDay() + 6) % 7)); // segunda da 1ª semana
        const fmtData = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
        const esc = (s) => String(s).replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
        const ate = `${fim.replace(/-/g, "")}T235959`;
        const linhas = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//SATIC IC UFAL//Grade//PT-BR", "CALSCALE:GREGORIAN",
            `X-WR-CALNAME:SATIC ${appState.dados.semestre}`, "X-WR-TIMEZONE:America/Maceio"];
        let eventos = 0;
        for (const t of appState.dados.turmas) {
            if (!t.sala || !t.horario) continue;
            for (const b of D.grade.blocosDoHorario(t.horario)) {
                const dia = new Date(segunda);
                dia.setDate(segunda.getDate() + offset[b.dia]);
                if (dia < base) dia.setDate(dia.getDate() + 7); // primeira ocorrência a partir do início
                const ini = relogio[`${b.turno}${b.inicio}`].inicio.replace(":", "");
                const fimAula = relogio[`${b.turno}${b.fim}`].fim.replace(":", "");
                linhas.push("BEGIN:VEVENT",
                    `UID:satic-${appState.dados.semestre}-${t.apiId}-${b.dia}-${b.turno}${b.inicio}@ic.ufal`,
                    `DTSTAMP:${fmtData(new Date())}T000000Z`,
                    `DTSTART;TZID=America/Maceio:${fmtData(dia)}T${ini}00`,
                    `DTEND;TZID=America/Maceio:${fmtData(dia)}T${fimAula}00`,
                    `RRULE:FREQ=WEEKLY;BYDAY=${diaIcs[b.dia]};UNTIL=${ate}`,
                    `SUMMARY:${esc(`${t.codigo}-${t.turma} ${t.disciplina}`)}`,
                    `LOCATION:${esc(nomeEspaco(t.sala))}`,
                    `DESCRIPTION:${esc(`Docentes: ${(t.professores || []).join(", ")}\nCurso: ${t.curso}\nHorário SIGAA: ${t.horario}`)}`,
                    "END:VEVENT");
                eventos++;
            }
        }
        linhas.push("END:VCALENDAR");
        const url = URL.createObjectURL(new Blob([linhas.join("\r\n")], { type: "text/calendar;charset=utf-8" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = `satic-${appState.dados.semestre}.ics`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        mostrarToast(`Agenda exportada (${eventos} eventos semanais). Importe no Google Agenda.`);
    }

    /** PDF pela impressão do navegador ("Salvar como PDF"): imprime a grade como está filtrada. */
    function imprimirGrade() {
        navegarPara("tela-matriz");
        const tela = document.getElementById("tela-matriz");
        tela.classList.add("print-target");
        const limpar = () => { tela.classList.remove("print-target"); window.removeEventListener("afterprint", limpar); };
        window.addEventListener("afterprint", limpar);
        setTimeout(() => window.print(), 50);
    }

    function configurarEventosIntegracao() {
        document.addEventListener("click", (e) => {
            const draftBtn = e.target.closest("[data-draft-action]");
            if (draftBtn) {
                if (draftBtn.getAttribute("data-draft-action") === "confirm") confirmarTudo();
                else recarregarDoServidor();
                return;
            }
            if (e.target.closest("[data-api-retry]")) {
                carregarDoServidor();
                return;
            }
            if (e.target.closest("[data-motor-resolver]")) {
                resolverViaMotor();
            }
        });

        const { inicio, fim } = lerDatasSemestre();
        const inpInicio = document.getElementById("cfg-inicio-semestre");
        const inpFim = document.getElementById("cfg-fim-semestre");
        if (inpInicio) inpInicio.value = inicio;
        if (inpFim) inpFim.value = fim;
        document.addEventListener("change", (e) => {
            const chave = e.target.id === "cfg-inicio-semestre" ? "satic.semestre.inicio" : e.target.id === "cfg-fim-semestre" ? "satic.semestre.fim" : null;
            if (!chave) return;
            try { localStorage.setItem(chave, e.target.value); } catch (_) { /* sem armazenamento: só nesta página */ }
        });

        window.addEventListener("beforeunload", (e) => {
            if (contarRascunho(appState.dados) > 0) {
                e.preventDefault();
                e.returnValue = "";
            }
        });
    }

    document.addEventListener("DOMContentLoaded", () => {
        configurarEventos();
        configurarEventosIntegracao();
        renderizarTudo();
        carregarDoServidor();
    });
})();

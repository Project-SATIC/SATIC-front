/**
 * SATIC — Sistema de Alocação de Turmas (IC / UFAL)
 * Arquivo: js/app.js
 * Objetivo: Controlador central de estado, renderização das 6 telas, drag-and-drop e drawers contextuais
 */

(function () {
    const { SLOTS_INSTITUCIONAIS, DIAS_SEMANA, criarDadosIniciais, inspecionarTurma, obterConflitosConsolidados, verificarViabilidadeSlot } = window.SATIC_DATA;
    const ICONS = window.SATIC_ICONS;

    const appState = {
        dados: criarDadosIniciais(),
        telaAtiva: "tela-painel",

        matriz: {
            curso: "todos",
            periodo: "todos",
            espaco: "todos",
            professor: "todos",
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
        if (opcoes.selecionarTurmaMatriz || opcoes.iniciarAlocacaoTurma) {
            Object.assign(appState.matriz, { curso: "todos", periodo: "todos", espaco: "todos", professor: "todos" });
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

    function atualizarBadgesSidebar() {
        document.querySelectorAll('.sidebar [data-nav-target]').forEach((btn) => {
            if (btn.classList.contains('active')) btn.setAttribute('aria-current', 'page');
            else btn.removeAttribute('aria-current');
        });
        const badgeTurmas = document.querySelector('.sidebar [data-nav-target="tela-turmas"] .nav-count');
        const badgeEspacos = document.querySelector('.sidebar [data-nav-target="tela-espacos"] .nav-count');
        if (badgeTurmas) badgeTurmas.textContent = appState.dados.turmas.length;
        if (badgeEspacos) badgeEspacos.textContent = appState.dados.espacos.length;
        const conflitos = obterConflitosConsolidados(appState.dados);
        const badgeConflitos = document.getElementById("sidebar-conflict-count");
        if (badgeConflitos) {
            badgeConflitos.textContent = conflitos.length;
            badgeConflitos.classList.toggle("is-critical", conflitos.length > 0);
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
            ...conflitos.map((c) => ({
                codigo: c.codigo,
                disciplina: c.disciplina,
                detalhe: `${c.problemas[0].categoria} · ${escapar(c.resumoPrincipal)}`,
                statusRotulo: c.problemas[0].tipo === "docente" ? "conflito docente" : c.problemas[0].tipo === "capacidade" ? "capacidade insuf." : "conflito de espaço",
                corDot: "dot-danger",
                acaoTexto: "Resolver",
                acaoTipo: "resolver-conflito",
                alvoId: c.id
            })),
            ...pendentes.map((p) => ({
                codigo: p.codigo,
                disciplina: p.disciplina,
                detalhe: `${p.professor} · ${p.alunos} alunos`,
                statusRotulo: "sem sala",
                corDot: "dot-warning",
                acaoTexto: "Alocar",
                acaoTipo: "alocar-matriz",
                alvoId: p.id
            }))
        ];

        const linhasOcupacao = appState.dados.espacos.map((esp) => {
            const slotsUsados = new Set();
            alocadas.forEach((t) => {
                if (t.sala === esp.id) {
                    t.dias.forEach((dia) => slotsUsados.add(dia + ':' + t.slot));
                }
            });
            const taxa = Math.min(100, Math.round((slotsUsados.size / (SLOTS_INSTITUCIONAIS.length * DIAS_SEMANA.length)) * 100));
            return {
                id: esp.id,
                nome: esp.nome,
                capacidade: esp.capacidade,
                taxa
            };
        });

        const periodos = ["1º Período", "2º Período", "3º Período", "4º Período", "5º Período"];
        const linhasPeriodo = periodos.map((per) => {
            const doPeriodo = todasTurmas.filter((t) => t.periodo === per);
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
                    <div class="overview-courses-sub">Ciência da Computação · Engenharia da Computação</div>
                </div>
                <div class="overview-completion">
                    <div class="overview-completion-label">${percentual}% alocado</div>
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
                    <button type="button" class="section-link" data-overview-jump="tela-conflitos">
                        Ver todas ${ICONS.arrowRight}
                    </button>
                </div>

                ${
                    itensPrioritarios.length === 0
                        ? `<div class="empty-state-note">Todas as 18 turmas estão alocadas sem conflitos pendentes. Proposta pronta para publicação.</div>`
                        : `<div class="compact-list">
                            ${itensPrioritarios
                                .map(
                                    (item) => `
                                <div class="compact-list-row">
                                    <span class="cell-mono">${item.codigo}</span>
                                    <span class="cell-primary">${item.disciplina}</span>
                                    <span class="cell-muted">${item.detalhe}</span>
                                    <span class="status-inline">
                                        <span class="dot ${item.corDot}"></span>
                                        ${item.statusRotulo}
                                    </span>
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
                        <button type="button" class="section-link" data-overview-jump="tela-espacos">
                            Espaços ${ICONS.arrowRight}
                        </button>
                    </div>
                    <div>
                        ${linhasOcupacao
                            .map(
                                (esp) => `
                            <div class="compact-metric-row">
                                <div>
                                    <span class="cell-primary">${escapar(esp.nome)}</span>
                                    <span class="cell-muted"> · ${esp.capacidade} lug.</span>
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
                        <h2 class="section-heading" id="sec-periodos-heading">Progresso por período</h2>
                        <button type="button" class="section-link" data-overview-jump="tela-matriz">
                            Abrir grade ${ICONS.arrowRight}
                        </button>
                    </div>
                    <div>
                        ${linhasPeriodo
                            .map((p) => {
                                let statusHtml = `<span class="status-inline"><span class="dot dot-success"></span>Concluído</span>`;
                                if (p.temConflito) {
                                    statusHtml = `<span class="status-inline"><span class="dot dot-danger"></span>Conflito</span>`;
                                } else if (p.alocadas < p.total) {
                                    statusHtml = `<span class="status-inline"><span class="dot dot-warning"></span>${p.total - p.alocadas} pendente</span>`;
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
       2. MATRIZ DE ALOCAÇÃO (#tela-matriz)
       ========================================================================== */
    function renderizarMatriz() {
        document.getElementById("matrix-filter-curso").value = appState.matriz.curso;
        document.getElementById("matrix-filter-periodo").value = appState.matriz.periodo;
        atualizarOpcoesFiltro("matrix-filter-espaco", appState.dados.espacos, appState.matriz.espaco);
        atualizarOpcoesFiltro("matrix-filter-professor", appState.dados.professores, appState.matriz.professor);
        const filaContainer = document.getElementById("matrix-unallocated-list");
        const countNaoAlocadas = document.getElementById("matrix-unallocated-count");
        const tbodyGrade = document.getElementById("matrix-schedule-tbody");
        const guideBar = document.getElementById("matrix-guide-bar");
        const guideText = document.getElementById("matrix-guide-text");

        if (!filaContainer || !tbodyGrade) return;

        const passaFiltrosMatriz = (t) =>
            (appState.matriz.curso === "todos" || t.curso === appState.matriz.curso) &&
            (appState.matriz.periodo === "todos" || t.periodo === appState.matriz.periodo) &&
            (appState.matriz.espaco === "todos" || t.sala === appState.matriz.espaco) &&
            (appState.matriz.professor === "todos" || t.professor === appState.matriz.professor);
        const naoAlocadas = appState.dados.turmas.filter((t) => (!t.sala || !t.slot) &&
            (appState.matriz.curso === "todos" || t.curso === appState.matriz.curso) &&
            (appState.matriz.periodo === "todos" || t.periodo === appState.matriz.periodo) &&
            (appState.matriz.professor === "todos" || t.professor === appState.matriz.professor));
        if (countNaoAlocadas) countNaoAlocadas.textContent = naoAlocadas.length;

        if (naoAlocadas.length === 0) {
            filaContainer.innerHTML = `<div class="empty-pane-note">Nenhuma turma pendente na fila.</div>`;
        } else {
            filaContainer.innerHTML = naoAlocadas
                .map((t) => {
                    const isSelected = appState.matriz.turmaSelecionadaId === t.id || appState.matriz.turmaEmMovimentoId === t.id;
                    const reqTexto = t.ambienteExigido === "Laboratório" ? " · exige laboratório" : t.ambienteExigido === "Auditório" ? " · auditório" : "";
                    return `
                    <button
                        type="button"
                        class="unallocated-item ${isSelected ? "is-selected" : ""}"
                        draggable="true"
                        data-unallocated-id="${t.id}"
                    >
                        <div class="unallocated-code">
                            <span>${t.codigo}</span>
                            <span>${t.periodo.replace(" Período", "")}</span>
                        </div>
                        <div class="unallocated-name">${escapar(t.disciplina)}</div>
                        <div class="unallocated-meta">${t.alunos} alunos${reqTexto}</div>
                    </button>`;
                })
                .join("");
        }

        const turmaMovimento = appState.matriz.turmaEmMovimentoId
            ? appState.dados.turmas.find((t) => t.id === appState.matriz.turmaEmMovimentoId)
            : null;

        if (guideBar && guideText) {
            if (turmaMovimento) {
                guideBar.classList.add("is-active");
                guideText.textContent = `${turmaMovimento.codigo} selecionada. Selecione um horário disponível.`;
            } else {
                guideBar.classList.remove("is-active");
            }
        }

        const { curso, periodo, espaco, professor } = appState.matriz;

        tbodyGrade.innerHTML = SLOTS_INSTITUCIONAIS.map((slot) => {
            const celulasDias = DIAS_SEMANA.map((dia) => {
                const turmasCelula = appState.dados.turmas.filter(
                    (t) => t.sala && t.slot === slot.id && t.dias.includes(dia.id) && passaFiltrosMatriz(t)
                );

                let classeDrop = "";
                let hintHtml = "";
                if (turmaMovimento) {
                    const viabilidade = verificarViabilidadeSlot(appState.dados, turmaMovimento, dia.id, slot.id);
                    if (viabilidade.valido) {
                        classeDrop = "is-drop-valid";
                        hintHtml = `<div class="slot-drop-hint">Alocar · ${viabilidade.salaSugerida}</div>`;
                    } else {
                        classeDrop = "is-drop-invalid";
                        hintHtml = `<div class="slot-drop-hint is-blocked">${viabilidade.motivo}</div>`;
                    }
                }

                const blocosHtml = turmasCelula
                    .map((t) => {
                        const diag = inspecionarTurma(appState.dados, t);
                        const temConflito = diag.problemas.length > 0;
                        const isSelected = appState.matriz.turmaSelecionadaId === t.id;

                        const passaCurso = curso === "todos" || t.curso === curso;
                        const passaPeriodo = periodo === "todos" || t.periodo === periodo;
                        const passaEspaco = espaco === "todos" || t.sala === espaco;
                        const passaProf = professor === "todos" || t.professor === professor;
                        const passaFiltros = passaCurso && passaPeriodo && passaEspaco && passaProf;

                        return `
                        <button
                            type="button"
                            class="event-block ${temConflito ? "has-conflict" : ""} ${isSelected ? "is-selected" : ""} ${!passaFiltros ? "is-dimmed" : ""}"
                            draggable="true"
                            data-event-turma="${t.id}"
                        >
                            <div class="event-top-row">
                                <span class="event-code">${t.codigo}</span>
                                ${
                                    temConflito
                                        ? `<span class="event-conflict-flag"><span class="dot dot-danger"></span><span class="sr-only">Conflito</span></span>`
                                        : ""
                                }
                            </div>
                            <div class="event-title">${escapar(t.disciplina)}</div>
                            <div class="event-sub">${escapar(nomeEspaco(t.sala))} · ${escapar(t.professor)}</div>
                        </button>`;
                    })
                    .join("");

                return `
                <td
                    class="${classeDrop}"
                    tabindex="${classeDrop === 'is-drop-valid' ? '0' : '-1'}" data-cell-dia="${dia.id}"
                    data-cell-slot="${slot.id}"
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

            const opcoesSlot = SLOTS_INSTITUCIONAIS.map(
                (s) => `<option value="${s.id}" ${turma.slot === s.id ? "selected" : ""}>${s.id} (${s.horario})</option>`
            ).join("");

            const parAtual = turma.dias && turma.dias.length ? turma.dias.join("/") : "SEG/QUA";

            body.innerHTML = `
                <form id="form-editar-alocacao-matriz" class="form-stack">
                    <div class="form-group">
                        <label class="form-label" for="edit-alloc-dias">Dias da semana</label>
                        <select id="edit-alloc-dias" class="control-select">
                            <option value="SEG,QUA" ${parAtual === "SEG/QUA" ? "selected" : ""}>Segunda e Quarta (SEG/QUA)</option>
                            <option value="TER,QUI" ${parAtual === "TER/QUI" ? "selected" : ""}>Terça e Quinta (TER/QUI)</option>
                            <option value="QUA,SEX" ${parAtual === "QUA/SEX" ? "selected" : ""}>Quarta e Sexta (QUA/SEX)</option>
                            <option value="SEX" ${parAtual === "SEX" ? "selected" : ""}>Sexta-feira (SEX)</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="edit-alloc-slot">Horário institucional</label>
                        <select id="edit-alloc-slot" class="control-select">
                            ${opcoesSlot}
                        </select>
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
                        <div class="cell-muted">${turma.alunos} alunos · Exige ${turma.ambienteExigido} · Prof. ${escapar(turma.professor)}</div>
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
                    <div class="status-inline">
                        <span class="dot dot-warning"></span>
                        Aguardando posicionamento na grade
                    </div>
                    <p class="cell-muted">
                        Selecione um dos slots destacados em verde na matriz ao lado para alocar automaticamente em sala compatível.
                    </p>
                </div>`;
        } else if (diag.problemas.length > 0) {
            secaoRestricoesHtml = `
                <div class="detail-section">
                    <span class="detail-section-title text-danger">
                        ${diag.problemas.length} ${diag.problemas.length === 1 ? "problema encontrado" : "problemas encontrados"}
                    </span>
                    <div class="flex-col-gap-sm">
                        ${diag.problemas
                            .map(
                                (p) => `
                            <div class="problem-callout">
                                <div class="problem-callout-title">${p.categoria}</div>
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
                    <span class="detail-value">${escapar(turma.professor)}</span>

                    <span class="detail-label">Sala</span>
                    <span class="detail-value">${turma.sala || "Não atribuída"}</span>

                    <span class="detail-label">Horário</span>
                    <span class="detail-value">${turma.slot ? `${turma.dias.join("/")} · ${turma.slot}` : "Sem horário"}</span>

                    <span class="detail-label">Estudantes</span>
                    <span class="detail-value">${turma.alunos} alunos</span>

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

        const todosConflitos = obterConflitosConsolidados(appState.dados);
        if (countHeader) {
            countHeader.textContent = `${todosConflitos.length} ${todosConflitos.length === 1 ? "crítico" : "críticos"}`;
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
                    return `
                    <button type="button" class="triage-row ${isSelected ? "is-selected" : ""}" data-select-conflict="${c.id}">
                        <div class="triage-row-main">
                            <span class="dot dot-danger"></span>
                            <div>
                                <div class="triage-row-title">${c.codigo} · ${escapar(c.disciplina)}</div>
                                <div class="triage-row-desc">${escapar(c.resumoPrincipal)}</div>
                            </div>
                        </div>
                        <span class="triage-severity">Crítico</span>
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
                        <h2 class="view-title">${selecionado.codigo} · ${selecionado.disciplina}</h2>
                    </div>

                    <div class="detail-section">
                        <span class="detail-section-title">Problema</span>
                        <div class="flex-col-gap-xs">
                            ${selecionado.problemas.map((p) => `<p>${escapar(p.detalhe)}</p>`).join("")}
                        </div>
                    </div>

                    <div class="detail-section">
                        <span class="detail-section-title">Afeta</span>
                        <div class="flex-col-gap-xs">
                            ${afetadasUnicas
                                .map(
                                    (af) => `
                                <div>
                                    <span class="cell-mono">${af.codigo}</span> ·
                                    <span class="cell-primary">${escapar(af.disciplina)}</span>
                                    <span class="cell-muted">(${af.dias.join("/")} ${af.slot} · ${af.sala})</span>
                                </div>`
                                )
                                .join("")}
                        </div>
                    </div>

                    <div class="detail-section">
                        <span class="detail-section-title">Alternativas encontradas</span>
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
                                        Aplicar alternativa ${idx + 1}
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
                    <div class="status-inline">
                        <span class="dot dot-success"></span>
                        <span class="cell-primary">${todosConflitos.length ? 'Nenhum conflito para este filtro' : 'Nenhum conflito crítico ativo'}</span>
                    </div>
                    <p class="cell-muted">
                        ${todosConflitos.length ? 'Consulte as outras categorias para resolver as pendências.' : 'As alocações definidas passaram pela validação de docentes, espaços e capacidade.'}
                    </p>
                </div>
            `;
        }

        detailContainer.innerHTML = `
            ${detalheConflitoHtml}

            <div class="publication-bar" id="secao-publicacao-proposta">
                <div>
                    <div class="detail-section-title">Proposta ${appState.dados.semestre}</div>
                    <div class="cell-primary">
                        Estado: ${
                            appState.dados.publicada
                                ? "Publicada na sessão"
                                : prontaParaPublicar
                                ? "Pronta para revisão"
                                : "Aguardando resolução de pendências"
                        }
                    </div>
                    <div class="cell-muted">
                        ${alocadasCount} / ${todasTurmas.length} turmas alocadas · ${todosConflitos.length} ${todosConflitos.length === 1 ? 'conflito crítico' : 'conflitos críticos'}
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

        const { busca, tipo, status, espacoSelecionadoId } = appState.espacos;
        const termo = busca.trim().toLowerCase();

        const filtrados = appState.dados.espacos.filter((e) => {
            const bateBusca = !termo || e.nome.toLowerCase().includes(termo) || e.equipamentos.join(" ").toLowerCase().includes(termo);
            const bateTipo = tipo === "todos" || e.tipo === tipo;
            const bateStatus = status === "todos" || e.status === status;
            return bateBusca && bateTipo && bateStatus;
        });

        tbody.innerHTML = filtrados
            .map((e) => {
                const isSelected = e.id === espacoSelecionadoId;
                const dotClass = e.status === "Disponível" ? "dot-success" : e.status === "Manutenção" ? "dot-warning" : "dot-danger";
                return `
                <tr tabindex="0" aria-selected="${isSelected}" class="is-interactive ${isSelected ? "is-selected" : ""}" data-row-espaco="${e.id}">
                    <td class="cell-primary">${escapar(e.nome)}</td>
                    <td>${e.tipo}</td>
                    <td class="tabular-nums">${e.capacidade}</td>
                    <td class="cell-muted">${escapar(e.equipamentos.join(", "))}</td>
                    <td>
                        <span class="status-inline">
                            <span class="dot ${dotClass}"></span>
                            ${e.status}
                        </span>
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
                    <span class="detail-value tabular-nums">${esp.capacidade} lugares</span>
                    <span class="detail-label">Computadores</span>
                    <span class="detail-value tabular-nums">${esp.pcs} PCs</span>
                </div>
            </div>

            <div class="detail-section">
                <span class="detail-section-title">Equipamentos</span>
                <div class="cell-muted">${esp.equipamentos.join(" · ") || "Nenhum recurso listado"}</div>
            </div>

            <div class="detail-section">
                <span class="detail-section-title">Status operacional</span>
                <div class="status-inline">
                    <span class="dot ${esp.status === "Disponível" ? "dot-success" : "dot-warning"}"></span>
                    <span class="cell-primary">${esp.status}</span>
                </div>
                <div class="cell-muted">${escapar(esp.observacao)}</div>
            </div>

            <div class="detail-section">
                <span class="detail-section-title">Turmas alocadas (${turmasNaSala.length})</span>
                ${
                    turmasNaSala.length === 0
                        ? `<div class="cell-muted">Nenhuma turma posicionada neste espaço.</div>`
                        : `<div class="flex-col-gap-xs">
                            ${turmasNaSala
                                .map(
                                    (t) =>
                                        `<div><span class="cell-mono">${t.codigo}</span> · ${escapar(t.disciplina)} <span class="cell-muted">(${t.dias.join("/")} ${t.slot})</span></div>`
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
    function renderizarTurmas() {
        const tbody = document.getElementById("turmas-tbody");
        const countEl = document.getElementById("turmas-total-count");
        if (!tbody) return;

        const { busca, curso, periodo, professor, status, ambiente, turmaSelecionadaId } = appState.turmas;
        const termo = busca.trim().toLowerCase();

        const filtradas = appState.dados.turmas.filter((t) => {
            const diag = inspecionarTurma(appState.dados, t);
            const estadoTurma = !diag.alocada ? "pendente" : diag.problemas.length > 0 ? "conflito" : "alocada";

            const bateBusca = !termo || t.codigo.toLowerCase().includes(termo) || t.disciplina.toLowerCase().includes(termo);
            const bateCurso = curso === "todos" || t.curso === curso;
            const batePeriodo = periodo === "todos" || t.periodo === periodo;
            const bateProf = professor === "todos" || t.professor === professor;
            const bateStatus = status === "todos" || estadoTurma === status;
            const bateAmb = ambiente === "todos" || t.ambienteExigido === ambiente;

            return bateBusca && bateCurso && batePeriodo && bateProf && bateStatus && bateAmb;
        });

        if (countEl) countEl.textContent = filtradas.length;

        tbody.innerHTML = filtradas
            .map((t) => {
                const diag = inspecionarTurma(appState.dados, t);
                const isSelected = t.id === turmaSelecionadaId;

                let statusHtml = `<span class="status-inline"><span class="dot dot-success"></span>${escapar(nomeEspaco(t.sala))} · ${t.dias.join("/")} ${t.slot}</span>`;
                if (!diag.alocada) {
                    statusHtml = `<span class="status-inline"><span class="dot dot-warning"></span>Sem sala</span>`;
                } else if (diag.problemas.length > 0) {
                    statusHtml = `<span class="status-inline text-danger"><span class="dot dot-danger"></span>Conflito (${escapar(nomeEspaco(t.sala))})</span>`;
                }

                return `
                <tr tabindex="0" aria-selected="${isSelected}" class="is-interactive ${isSelected ? "is-selected" : ""}" data-row-turma="${t.id}">
                    <td class="cell-mono">${t.codigo}</td>
                    <td class="cell-primary">${escapar(t.disciplina)}</td>
                    <td>${t.turma}</td>
                    <td class="cell-muted">${t.curso} · ${t.periodo.replace(" Período", "")}</td>
                    <td>${escapar(t.professor)}</td>
                    <td class="tabular-nums">${t.alunos}</td>
                    <td class="cell-muted">${t.ambienteExigido}</td>
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
                    <span class="detail-value">${turma.curso} · ${turma.periodo}</span>
                    <span class="detail-label">Professor</span>
                    <span class="detail-value">${escapar(turma.professor)}</span>
                    <span class="detail-label">Estudantes</span>
                    <span class="detail-value tabular-nums">${turma.alunos} matriculados</span>
                    <span class="detail-label">Ambiente</span>
                    <span class="detail-value">${turma.ambienteExigido}</span>
                </div>
            </div>

            <div class="detail-section">
                <span class="detail-section-title">Alocação na grade</span>
                <div class="detail-grid">
                    <span class="detail-label">Sala</span>
                    <span class="detail-value">${turma.sala || "Sem sala"}</span>
                    <span class="detail-label">Horário</span>
                    <span class="detail-value">${turma.slot ? `${turma.dias.join("/")} · ${turma.slot}` : "Pendente"}</span>
                </div>
            </div>

            <div class="detail-section">
                <span class="detail-section-title">Validação</span>
                ${
                    !diag.alocada
                        ? `<div class="status-inline"><span class="dot dot-warning"></span>Turma aguardando alocação na matriz</div>`
                        : diag.problemas.length > 0
                        ? diag.problemas
                              .map(
                                  (p) => `
                            <div class="problem-callout">
                                <div class="problem-callout-title">${p.categoria}</div>
                                <div class="problem-callout-desc">${escapar(p.detalhe)}</div>
                            </div>`
                              )
                              .join("")
                        : `<div class="status-inline"><span class="dot dot-success"></span>Todas as restrições atendidas</div>`
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
        if (!tbody) return;

        const { busca, status, professorSelecionadoId } = appState.professores;
        const termo = busca.trim().toLowerCase();

        const linhas = appState.dados.professores.filter((p) => {
            const turmasProf = appState.dados.turmas.filter((t) => t.professor === p.id);
            const temConflito = turmasProf.some((t) => inspecionarTurma(appState.dados, t).problemas.some((pr) => pr.tipo === "docente"));
            const estado = temConflito ? "conflito" : "regular";

            const bateBusca = !termo || p.nome.toLowerCase().includes(termo) || p.siape.includes(termo);
            const bateStatus = status === "todos" || estado === status;
            return bateBusca && bateStatus;
        });

        tbody.innerHTML = linhas
            .map((p) => {
                const turmasProf = appState.dados.turmas.filter((t) => t.professor === p.id);
                const carga = window.SATIC_DATA.calcularCargaDocente(appState.dados, p.id);
                const temConflito = turmasProf.some((t) => inspecionarTurma(appState.dados, t).problemas.some((pr) => pr.tipo === "docente"));
                const isSelected = p.id === professorSelecionadoId;

                return `
                <tr tabindex="0" aria-selected="${isSelected}" class="is-interactive ${isSelected ? "is-selected" : ""}" data-row-professor="${p.id}">
                    <td class="cell-primary">${escapar(p.nome)}</td>
                    <td class="cell-mono">${p.siape}</td>
                    <td class="cell-muted">${p.regime}</td>
                    <td class="tabular-nums">${carga}h / ${p.cargaMax}h</td>
                    <td class="tabular-nums">${turmasProf.length}</td>
                    <td>
                        <span class="status-inline">
                            <span class="dot ${temConflito ? "dot-danger" : "dot-success"}"></span>
                            ${temConflito ? "Conflito" : "Regular"}
                        </span>
                    </td>
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
        const aulas = turmas.filter((t) => t.sala && t.slot === slot && t.dias.includes(dia));
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
        const turmasProf = appState.dados.turmas.filter((t) => t.professor === prof.id);
        const carga = window.SATIC_DATA.calcularCargaDocente(appState.dados, prof.id);

        titleEl.textContent = prof.nome;
        subEl.textContent = `SIAPE ${prof.siape} · ${prof.regime} · ${carga}h / ${prof.cargaMax}h`;

        const linhasMatrizHtml = SLOTS_INSTITUCIONAIS.map((slot) => {
            const cols = DIAS_SEMANA.map((dia) => {
                const chave = `${dia.id}:${slot.id}`;
                const estadoDisp = prof.disponibilidade[chave] || "disponivel";

                const aulasSlot = turmasProf.filter((t) => t.sala && t.slot === slot.id && t.dias.includes(dia.id));
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
                <span class="detail-section-title">Turmas atribuídas (${turmasProf.length})</span>
                <div class="flex-col-gap-xs">
                    ${turmasProf
                        .map(
                            (t) => `
                        <div class="assigned-class-pill">
                            <span><strong class="cell-mono">${t.codigo}</strong> · ${escapar(t.disciplina)}</span>
                            <span class="cell-muted">${t.slot ? `${t.dias.join("/")} ${t.slot}` : "Sem horário"}</span>
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
                    <div class="gen-stat-cell"><strong>${total}</strong><span>turmas</span></div>
                    <div class="gen-stat-cell"><strong>${appState.dados.professores.length}</strong><span>professores</span></div>
                    <div class="gen-stat-cell"><strong>${appState.dados.espacos.length}</strong><span>espaços</span></div>
                    <div class="gen-stat-cell"><strong>${obterConflitosConsolidados(appState.dados).length}</strong><span>conflitos</span></div>
                </div>
                <div class="detail-section">
                    <p class="cell-muted">Preenche pendências e corrige alocações inválidas. Revise a proposta antes de aplicar.</p>
                    <span class="detail-section-title">Prioridade</span>
                    <div class="radio-stack">
                        <label class="radio-option"><input type="radio" name="opt-prio" value="valida" ${prioridadeGerador === 'valida' ? 'checked' : ''}><span>Encontrar uma solução válida</span></label>
                        <label class="radio-option"><input type="radio" name="opt-prio" value="janelas" ${prioridadeGerador === 'janelas' ? 'checked' : ''}><span>Agrupar horários docentes</span></label>
                        <label class="radio-option"><input type="radio" name="opt-prio" value="docentes" ${prioridadeGerador === 'docentes' ? 'checked' : ''}><span>Priorizar preferências docentes</span></label>
                    </div>
                </div>`;
            footer.innerHTML = `<button type="button" class="btn btn-ghost" data-gen-action="close">Cancelar</button><button type="button" class="btn btn-primary" data-gen-action="start">Gerar grade</button>`;
        } else if (etapa === "running") {
            prioridadeGerador = document.querySelector('input[name="opt-prio"]:checked')?.value || prioridadeGerador;
            resultadoGerador = window.SATIC_DATA.gerarPropostaGrade(appState.dados, prioridadeGerador);
            renderizarEtapaGerador("done");
        } else if (etapa === "done" && resultadoGerador) {
            const r = resultadoGerador;
            title.textContent = r.completa && r.conflitos === 0 ? "Proposta pronta para revisão" : "Proposta parcial";
            body.innerHTML = `<div class="detail-grid">
                <span class="detail-label">Alocadas</span><span class="detail-value">${r.alocadas} / ${total} turmas</span>
                <span class="detail-label">Pendentes</span><span class="detail-value">${total - r.alocadas} turmas</span>
                <span class="detail-label">Conflitos</span><span class="detail-value">${r.conflitos}</span>
                <span class="detail-label">Tentativas</span><span class="detail-value">${r.tentativas}</span>
                </div>
                ${!r.completa ? '<p class="cell-muted">Não foi encontrada uma solução completa com os espaços e disponibilidades atuais.</p>' : ''}`;
            footer.innerHTML = `<button type="button" class="btn btn-secondary" data-gen-action="config">Revisar prioridade</button><button type="button" class="btn btn-primary" data-gen-action="apply">Aplicar proposta</button>`;
        }
    }

    function aplicarGradeOtimizada() {
        if (!resultadoGerador) return;
        appState.dados = resultadoGerador.dados;
        appState.matriz.turmaEmMovimentoId = null;
        appState.matriz.turmaSelecionadaId = null;
        fecharModalGerarGrade();
        navegarPara("tela-matriz");
        mostrarToast("Proposta aplicada. Revise a grade antes de publicar.");
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
            { id: "nav:tela-matriz", titulo: "Ir para Matriz de Alocação (Grade)", meta: "Tela", icone: ICONS.calendar },
            { id: "nav:tela-painel", titulo: "Ir para Visão Geral do Semestre", meta: "Tela", icone: ICONS.overview },
            { id: "nav:tela-conflitos", titulo: "Abrir Central de Conflitos e Publicação", meta: "Tela", icone: ICONS.alert },
            { id: "action:gerar-grade", titulo: "Gerar grade automaticamente", meta: "Automação", icone: ICONS.cpu },
            { id: "action:reset-demo", titulo: "Restaurar estado inicial de demonstração (com conflitos)", meta: "Sistema", icone: ICONS.rotateCcw },
            ...appState.dados.turmas.map((t) => ({
                id: `turma:${t.id}`,
                titulo: `${t.codigo} · ${escapar(t.disciplina)} (${escapar(t.professor)})`,
                meta: t.sala ? `${escapar(nomeEspaco(t.sala))} · ${t.slot}` : "Não alocada",
                icone: ICONS.book
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
                    ${c.icone}
                    <span>${c.titulo}</span>
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
        if (appState.dados.publicada && assinaturaPublicada !== assinaturaDados()) appState.dados.publicada = false;
        atualizarBadgesSidebar();
        renderizarPainelGeral();
        renderizarMatriz();
        renderizarConflitosEPublicacao();
        renderizarEspacos();
        renderizarTurmas();
        renderizarProfessores();
    }

    function atualizarDestinosMovimento() {
        const turma = appState.dados.turmas.find((t) => t.id === appState.matriz.turmaEmMovimentoId);
        if (!turma) return;
        document.getElementById('drawer-matriz').classList.remove('is-open');
        document.getElementById('matrix-guide-bar').classList.add('is-active');
        document.getElementById('matrix-guide-text').textContent = `${turma.codigo} selecionada. Selecione um horário disponível.`;
        document.querySelectorAll('[data-cell-dia]').forEach((cell) => {
            const v = verificarViabilidadeSlot(appState.dados, turma, cell.dataset.cellDia, cell.dataset.cellSlot);
            cell.classList.toggle('is-drop-valid', v.valido);
            cell.classList.toggle('is-drop-invalid', !v.valido);
            cell.tabIndex = v.valido ? 0 : -1;
            cell.title = v.motivo;
        });
    }

    function exportarCSV() {
        const linhas = [['Código', 'Disciplina', 'Turma', 'Curso', 'Professor', 'Alunos', 'Espaço', 'Dias', 'Slot']];
        appState.dados.turmas.forEach((t) => linhas.push([t.codigo, t.disciplina, t.turma, t.curso, t.professor,
            t.alunos, appState.dados.espacos.find((e) => e.id === t.sala)?.nome || '', t.dias.join('/'), t.slot || '']));
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

            const unallocBtn = e.target.closest("[data-unallocated-id]");
            if (unallocBtn) {
                const id = unallocBtn.getAttribute("data-unallocated-id");
                appState.matriz.turmaSelecionadaId = id;
                appState.matriz.modoEdicaoDrawer = false;
                appState.matriz.turmaEmMovimentoId = appState.matriz.turmaEmMovimentoId === id ? null : id;
                renderizarMatriz();
                return;
            }

            const eventBlock = e.target.closest("[data-event-turma]");
            if (eventBlock) {
                const id = eventBlock.getAttribute("data-event-turma");
                appState.matriz.turmaSelecionadaId = id;
                appState.matriz.modoEdicaoDrawer = false;
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
                    const diasVal = document.getElementById("edit-alloc-dias").value.split(",");
                    const slotVal = document.getElementById("edit-alloc-slot").value;
                    const salaVal = document.getElementById("edit-alloc-sala").value;
                    turma.dias = diasVal;
                    turma.slot = slotVal;
                    turma.sala = salaVal;
                    appState.matriz.modoEdicaoDrawer = false;
                    appState.matriz.turmaEmMovimentoId = null;
                    renderizarTudo();
                    mostrarToast(`${turma.codigo} atualizada para ${diasVal.join("/")} ${slotVal} · ${salaVal}.`);
                } else if (action === "unassign" && turma) {
                    turma.sala = null;
                    turma.slot = null;
                    turma.dias = [];
                    appState.matriz.modoEdicaoDrawer = false;
                    renderizarTudo();
                    mostrarToast(`${turma.codigo} movida para a fila de não alocadas.`);
                } else if (action === "move-on-grid" && turma) {
                    appState.matriz.turmaEmMovimentoId = appState.matriz.turmaEmMovimentoId === turma.id ? null : turma.id;
                    renderizarMatriz();
                } else if (action === "open-conflict" && turma) {
                    navegarPara("tela-conflitos", { selecionarConflito: `conf-${turma.id}` });
                }
                return;
            }

            const filterConflictBtn = e.target.closest("[data-conflict-filter]");
            if (filterConflictBtn) {
                appState.conflitos.filtro = filterConflictBtn.getAttribute("data-conflict-filter");
                document.querySelectorAll("[data-conflict-filter]").forEach((b) => b.classList.remove("active"));
                filterConflictBtn.classList.add("active");
                renderizarConflitosEPublicacao();
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
                    renderizarTudo();
                    mostrarToast(`Alternativa aplicada: ${conf.alternativas[altIdx].descricao}`);
                }
                return;
            }

            const pubBtn = e.target.closest("[data-action-publish]");
            if (pubBtn) {
                const conflitos = obterConflitosConsolidados(appState.dados);
                const pendentes = appState.dados.turmas.some((t) => !inspecionarTurma(appState.dados, t).alocada);
                if (conflitos.length > 0 || pendentes) {
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
                    appState.dados = criarDadosIniciais();
                    renderizarTudo();
                    mostrarToast("Dados de demonstração restaurados.");
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
                else mostrarToast(`Exportação ${tipoExp}: ainda não implementada nesta versão.`);
                return;
            }

            if (e.target.closest("[data-cancel-move]")) {
                appState.matriz.turmaEmMovimentoId = null;
                renderizarMatriz();
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
                appState.dados = criarDadosIniciais();
                renderizarTudo();
                mostrarToast("Estado inicial restaurado.");
            }
        });

        document.addEventListener("dragstart", (e) => {
            const unalloc = e.target.closest("[data-unallocated-id]");
            const block = e.target.closest("[data-event-turma]");
            if (unalloc) {
                const id = unalloc.getAttribute("data-unallocated-id");
                appState.matriz.turmaEmMovimentoId = id;
                appState.matriz.turmaSelecionadaId = id;
                e.dataTransfer.setData("text/plain", id);
                atualizarDestinosMovimento();
            } else if (block) {
                const id = block.getAttribute("data-event-turma");
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
            }
        });

        document.addEventListener("drop", (e) => {
            const cell = e.target.closest("td[data-cell-dia]");
            if (!cell) return;
            e.preventDefault();
            const turmaId = e.dataTransfer.getData("text/plain") || appState.matriz.turmaEmMovimentoId;
            const dia = cell.getAttribute("data-cell-dia");
            const slot = cell.getAttribute("data-cell-slot");
            if (turmaId && dia && slot) {
                alocarTurmaEmSlot(turmaId, dia, slot);
            }
        });

        document.addEventListener("input", (e) => {
            if (e.target.id === "espacos-search") {
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
            if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-row-professor], [data-row-turma], [data-row-espaco], td.is-drop-valid')) {
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
                if (modalAberto) return;
                if (appState.matriz.turmaEmMovimentoId) {
                    appState.matriz.turmaEmMovimentoId = null;
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

        turma.dias = viabilidade.dias;
        turma.slot = slotId;
        turma.sala = viabilidade.salaSugerida;

        appState.matriz.turmaEmMovimentoId = null;
        appState.matriz.turmaSelecionadaId = turma.id;
        renderizarTudo();
        mostrarToast(`${turma.codigo} alocada em ${viabilidade.dias.join("/")} ${slotId} · ${viabilidade.salaSugerida}.`);
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

    document.addEventListener("DOMContentLoaded", () => {
        configurarEventos();
        renderizarTudo();
    });
})();

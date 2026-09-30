/**
 * SATIC — Sistema de Alocação de Turmas do Instituto de Computação (UFAL)
 * Experimento 4: Camada de Interatividade e Validação de Regras Front-End
 */

document.addEventListener("DOMContentLoaded", () => {
    inicializarFiltrosVisaoGeral();
    inicializarGradeHoraria();
    inicializarFluxoAlocacaoESimulador();
    inicializarGestaoEspacos();
    inicializarGestaoTurmas();
    inicializarGestaoDocentes();
});

/* ==========================================================================
   UTILITÁRIO GLOBAL DE NOTIFICAÇÃO (TOAST BANNER)
   ========================================================================== */
function exibirFeedback(mensagem) {
    const toast = document.getElementById("toast-feedback");
    const texto = document.getElementById("toast-feedback-texto");
    if (!toast || !texto) return;

    texto.textContent = mensagem;
    toast.classList.add("visible");
    toast.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/* ==========================================================================
   1. VISÃO GERAL (index.html) — Filtro de Pendências e Conflitos
   ========================================================================== */
function inicializarFiltrosVisaoGeral() {
    const botoesFiltro = document.querySelectorAll("[data-filter-pendencias]");
    const linhasPendencias = document.querySelectorAll("[data-pendencia-tipo]");

    if (!botoesFiltro.length || !linhasPendencias.length) return;

    botoesFiltro.forEach((botao) => {
        botao.addEventListener("click", () => {
            const filtro = botao.getAttribute("data-filter-pendencias");

            botoesFiltro.forEach((b) => {
                b.classList.remove("active");
                b.setAttribute("aria-pressed", "false");
            });
            botao.classList.add("active");
            botao.setAttribute("aria-pressed", "true");

            linhasPendencias.forEach((linha) => {
                const tipo = linha.getAttribute("data-pendencia-tipo");
                if (filtro === "todos" || tipo === filtro) {
                    linha.style.display = "";
                } else {
                    linha.style.display = "none";
                }
            });
        });
    });
}

/* ==========================================================================
   2. MATRIZ DE ALOCAÇÃO SEMANAL (grade-horaria.html)
   ========================================================================== */
const DADOS_INSPETOR_GRADE = {
    "choque-ranilson": {
        titulo: "COMP203 · Programação 3 (Turma A) vs COMP402 · Eng. de Software",
        statusClasse: "danger",
        statusTexto: "Choque Crítico Detectado",
        docente: "Prof. Ranilson (SIAPE: 2024389)",
        horario: "Terça e Quinta · M3-M4 (09:20 às 11:00)",
        ambiente: "Lab 02 (30 lugares) e Sala 102 (40 lugares) — Simultâneo",
        matriculados: "42 estudantes matriculados em COMP203 (Déficit de 12 computadores)",
        linkAcao: "nova-alocacao.html?modo=simulador&conflito=conflito-1",
        textoAcao: "Abrir Simulador Anti-Efeito Dominó",
        regras: [
            {
                nivel: "danger",
                icone: "⛔",
                titulo: "Regra Hard R1 — Choque Simultâneo de Docente",
                detalhe: "O Prof. Ranilson está alocado simultaneamente em COMP203 (Lab 02) e COMP402 (Sala 102) no slot Ter/Qui M3-M4."
            },
            {
                nivel: "infra",
                icone: "⚠️",
                titulo: "Regra Hard R2 — Superlotação de Laboratório",
                detalhe: "COMP203 possui 42 estudantes matriculados, mas o Lab 02 dispõe de apenas 30 computadores."
            }
        ]
    },
    "infra-so": {
        titulo: "COMP308 · Sistemas Operacionais (Turma A — Prática)",
        statusClasse: "infra",
        statusTexto: "Déficit de Infraestrutura e Lotação",
        docente: "Prof. Patrick (SIAPE: 2104938)",
        horario: "Quarta e Sexta · T1-T2 (13:30 às 15:10)",
        ambiente: "Sala 103 (Sala Teórica · 30 lugares · Sem PCs)",
        matriculados: "45 estudantes matriculados (+15 acima da capacidade)",
        linkAcao: "nova-alocacao.html?modo=simulador&conflito=conflito-2",
        textoAcao: "Migrar para Lab 01 no Simulador",
        regras: [
            {
                nivel: "infra",
                icone: "💻",
                titulo: "Regra Hard R3 — Incompatibilidade de Ambiente",
                detalhe: "A disciplina exige laboratório de informática com computadores, mas está alocada em sala puramente teórica."
            },
            {
                nivel: "infra",
                icone: "⚠️",
                titulo: "Regra Hard R2 — Capacidade Física Insuficiente",
                detalhe: "A Sala 103 comporta 30 estudantes e está com ar-condicionado em manutenção; a turma tem 45 matriculados."
            }
        ]
    },
    "valida-bd": {
        titulo: "COMP204 · Banco de Dados (Turma A)",
        statusClasse: "success",
        statusTexto: "Alocação Válida e Consolidada",
        docente: "Prof. Baldoino (SIAPE: 1849201)",
        horario: "Segunda e Quarta · M1-M2 (07:30 às 09:10)",
        ambiente: "Sala 101 (45 lugares · Projetor + AC)",
        matriculados: "38 estudantes matriculados (Folga de 7 lugares)",
        linkAcao: "nova-alocacao.html?turma=COMP204",
        textoAcao: "Editar Alocação",
        regras: [
            {
                nivel: "success",
                icone: "✓",
                titulo: "Todas as Restrições Atendidas",
                detalhe: "Docente livre no horário, sem colisão no 4º período e capacidade da Sala 101 compatível com os 38 estudantes."
            }
        ]
    },
    "valida-logica": {
        titulo: "COMP105 · Lógica para Computação (Turma A)",
        statusClasse: "success",
        statusTexto: "Alocação Válida e Consolidada",
        docente: "Prof. Willy (SIAPE: 1930412)",
        horario: "Terça e Quinta · M1-M2 (07:30 às 09:10)",
        ambiente: "Sala 102 (40 lugares · Projetor + AC)",
        matriculados: "36 estudantes matriculados (Folga de 4 lugares)",
        linkAcao: "nova-alocacao.html?turma=COMP105",
        textoAcao: "Editar Alocação",
        regras: [
            {
                nivel: "success",
                icone: "✓",
                titulo: "Todas as Restrições Atendidas",
                detalhe: "Horário dentro da janela preferencial do docente e ambiente teórico compatível."
            }
        ]
    },
    "valida-calculo": {
        titulo: "COMP102 · Cálculo Diferencial e Integral I (Turma B)",
        statusClasse: "success",
        statusTexto: "Alocação Válida e Consolidada",
        docente: "Profª. Maria Helena (SIAPE: 1748290)",
        horario: "Segunda-feira · T1-T2 (13:30 às 15:10)",
        ambiente: "Anfiteatro IC (70 lugares · Sistema de Som + Rampa PNE)",
        matriculados: "55 estudantes matriculados (Folga de 15 lugares)",
        linkAcao: "nova-alocacao.html?turma=COMP102",
        textoAcao: "Editar Alocação",
        regras: [
            {
                nivel: "success",
                icone: "✓",
                titulo: "Capacidade de Grande Porte Atendida",
                detalhe: "Turma de 1º período alocada no Anfiteatro IC com acessibilidade plena e folga segura."
            }
        ]
    },
    "valida-compiladores": {
        titulo: "COMP302 · Compiladores (Turma A)",
        statusClasse: "success",
        statusTexto: "Alocação Válida e Consolidada",
        docente: "Prof. Márcio (SIAPE: 1659302)",
        horario: "Terça e Quinta · T3-T4 (15:20 às 17:00)",
        ambiente: "Lab 01 (45 lugares · 45 PCs i7)",
        matriculados: "28 estudantes matriculados (Folga de 17 PCs)",
        linkAcao: "nova-alocacao.html?turma=COMP302",
        textoAcao: "Editar Alocação",
        regras: [
            {
                nivel: "success",
                icone: "✓",
                titulo: "Ambiente Prático Validado",
                detalhe: "Laboratório de informática com 1 computador por estudante e sem conflito de agenda docente."
            }
        ]
    }
};

function inicializarGradeHoraria() {
    const botoesCelula = document.querySelectorAll("[data-inspect-id]");
    const botoesBacklog = document.querySelectorAll("[data-backlog-turma]");
    const seletorTurno = document.getElementById("filtro-turno-grade");
    const seletorPerspectiva = document.getElementById("filtro-perspectiva-grade");

    if (!botoesCelula.length) return;

    botoesCelula.forEach((botao) => {
        botao.addEventListener("click", () => {
            botoesCelula.forEach((b) => b.classList.remove("selected"));
            botao.classList.add("selected");
            const id = botao.getAttribute("data-inspect-id");
            renderizarInspetorGrade(id);
        });
    });

    botoesBacklog.forEach((card) => {
        card.addEventListener("click", () => {
            botoesBacklog.forEach((c) => c.classList.remove("active"));
            card.classList.add("active");

            const codigo = card.getAttribute("data-backlog-turma");
            const nome = card.getAttribute("data-backlog-nome");
            const slotSugerido = card.getAttribute("data-backlog-slot");

            document.querySelectorAll(".free-slot-btn").forEach((slotBtn) => {
                slotBtn.classList.remove("recommended-slot");
                slotBtn.textContent = "+ Slot livre";
            });

            const alvo = document.querySelector(`[data-free-slot="${slotSugerido}"]`);
            if (alvo) {
                alvo.classList.add("recommended-slot");
                alvo.textContent = `★ Encaixe ideal: ${codigo}`;
            }

            exibirFeedback(`Turma ${codigo} (${nome}) selecionada na fila. O slot recomendado (${slotSugerido}) foi destacado na grade.`);
        });
    });

    if (seletorTurno) {
        seletorTurno.addEventListener("change", () => {
            const turno = seletorTurno.value;
            document.querySelectorAll("[data-row-turno]").forEach((linha) => {
                const linhaTurno = linha.getAttribute("data-row-turno");
                linha.style.display = (turno === "todos" || linhaTurno === turno) ? "" : "none";
            });
        });
    }

    if (seletorPerspectiva) {
        seletorPerspectiva.addEventListener("change", () => {
            const filtro = seletorPerspectiva.value;
            document.querySelectorAll(".alloc-card").forEach((card) => {
                const cat = card.getAttribute("data-card-cat") || "";
                if (filtro === "todos" || cat.includes(filtro)) {
                    card.style.opacity = "1";
                } else {
                    card.style.opacity = "0.28";
                }
            });
        });
    }
}

function renderizarInspetorGrade(id) {
    const dados = DADOS_INSPETOR_GRADE[id];
    if (!dados) return;

    const tituloEl = document.getElementById("inspetor-titulo");
    const statusEl = document.getElementById("inspetor-status");
    const docenteEl = document.getElementById("inspetor-docente");
    const horarioEl = document.getElementById("inspetor-horario");
    const ambienteEl = document.getElementById("inspetor-ambiente");
    const matriculadosEl = document.getElementById("inspetor-matriculados");
    const acaoEl = document.getElementById("inspetor-acao");
    const listaRegrasEl = document.getElementById("inspetor-regras");

    if (!tituloEl || !listaRegrasEl) return;

    tituloEl.textContent = dados.titulo;
    statusEl.className = `status ${dados.statusClasse}`;
    statusEl.textContent = dados.statusTexto;
    docenteEl.textContent = dados.docente;
    horarioEl.textContent = dados.horario;
    ambienteEl.textContent = dados.ambiente;
    matriculadosEl.textContent = dados.matriculados;
    acaoEl.href = dados.linkAcao;
    acaoEl.textContent = dados.textoAcao;

    listaRegrasEl.innerHTML = dados.regras
        .map(
            (r) => `
        <li class="rule-check-item ${r.nivel}">
            <span aria-hidden="true">${r.icone}</span>
            <div>
                <strong>${r.titulo}:</strong> ${r.detalhe}
            </div>
        </li>`
        )
        .join("");
}

/* ==========================================================================
   3. NOVA ALOCAÇÃO, SIMULADOR ANTI-EFEITO DOMINÓ E PUBLICAÇÃO (nova-alocacao.html)
   ========================================================================== */
const DADOS_CONFLITOS_SIMULADOR = {
    "conflito-1": {
        titulo: "Choque Simultâneo: Prof. Ranilson (COMP203 vs COMP402) + Superlotação no Lab 02",
        resumo: "Terça e Quinta · M3-M4 (09:20 - 11:00) · Afeta 3º e 6º Períodos",
        propostaA: {
            titulo: "Solução Recomendada A — Impacto Dominó: ZERO novos conflitos",
            badge: "100% Compatível",
            passos: [
                "Mover <strong>COMP203 (Programação 3 · 42 estudantes)</strong> do <em>Lab 02 (Ter/Qui M3-M4)</em> para o <strong>Lab 01 (45 lugares) na Segunda e Quarta (M3-M4)</strong>.",
                "Manter <strong>COMP402 (Eng. de Software · 35 estudantes)</strong> na <strong>Sala 102 na Terça e Quinta (M3-M4)</strong>."
            ],
            beneficios: "✓ Elimina o choque do Prof. Ranilson · ✓ Atende aos 42 estudantes com PCs individuais · ✓ Zero choque no 3º Período"
        },
        propostaB: {
            titulo: "Solução Alternativa B — Deslocamento para Turno Vespertino",
            badge: "Impacto Dominó: Zero",
            passos: [
                "Manter <strong>COMP203</strong> na Terça e Quinta (M3-M4), migrando apenas da Sala Lab 02 para o <strong>Lab 01 (45 lugares)</strong>.",
                "Deslocar <strong>COMP402 (Eng. de Software)</strong> para <strong>Terça e Quinta (T1-T2: 13:30 - 15:10)</strong> na <strong>Sala 102</strong> (janela preferencial do docente livre)."
            ]
        }
    },
    "conflito-2": {
        titulo: "Déficit de Infraestrutura e Capacidade: COMP308 (Sistemas Operacionais · 45 estudantes)",
        resumo: "Quarta e Sexta · T1-T2 (13:30 - 15:10) · Sala 103 (30 lugares, sem PCs)",
        propostaA: {
            titulo: "Solução Recomendada A — Migração Direta para o Lab 01",
            badge: "Encaixe Direto",
            passos: [
                "Transferir <strong>COMP308 (45 estudantes)</strong> da <em>Sala 103</em> para o <strong>Lab 01 (Capacidade: 45 PCs)</strong> mantendo o mesmo horário de <strong>Quarta e Sexta (T1-T2)</strong>, que se encontra livre.",
                "Liberar a <strong>Sala 103</strong> para manutenção preventiva do aparelho de ar-condicionado."
            ],
            beneficios: "✓ Cumpre exigência de laboratório prático · ✓ Comporta 100% dos 45 matriculados sem alterar horário"
        },
        propostaB: {
            titulo: "Solução Alternativa B — Divisão de Turma Prática em 2 Subturmas (Lab 02)",
            badge: "Requer 2 Slots",
            passos: [
                "Alocar Subturma Prática G1 (23 estudantes) no <strong>Lab 02 (30 PCs)</strong> na Quarta-feira (T1-T2).",
                "Alocar Subturma Prática G2 (22 estudantes) no <strong>Lab 02 (30 PCs)</strong> na Sexta-feira (T1-T2)."
            ]
        }
    },
    "conflito-3": {
        titulo: "Alocação Assistida em Lote das 3 Turmas da Fila Pendente",
        resumo: "COMP201 (45 est.), COMP304 (35 est.) e COMP101 (60 est.)",
        propostaA: {
            titulo: "Solução Recomendada A — Encaixe Ótimo Combinatório (Zero Colisões)",
            badge: "3 Turmas Resolvidas",
            passos: [
                "Alocar <strong>COMP201 (Algoritmos · 45 est.)</strong> no <strong>Lab 01 (45 PCs)</strong> em <strong>Terça e Quinta (T1-T2)</strong>.",
                "Alocar <strong>COMP304 (Redes · 35 est.)</strong> no <strong>Lab 01 (45 PCs)</strong> em <strong>Segunda e Quarta (T3-T4)</strong>.",
                "Alocar <strong>COMP101 (Intro. à Computação · 60 est.)</strong> no <strong>Anfiteatro IC (70 lugares)</strong> em <strong>Terça e Quinta (M1-M2)</strong>."
            ],
            beneficios: "✓ 100% da fila pendente concluída · ✓ Respeita janelas de todos os docentes (Baldoino, Willy e Márcio)"
        },
        propostaB: {
            titulo: "Solução Alternativa B — Priorização no Turno Matutino (M5-M6)",
            badge: "Impacto Dominó: Zero",
            passos: [
                "Posicionar <strong>COMP201</strong> e <strong>COMP304</strong> nas janelas livres de <strong>M5-M6 (11:10 às 12:50)</strong> no Lab 01.",
                "Posicionar <strong>COMP101</strong> no Anfiteatro IC na Segunda e Quarta (M3-M4)."
            ]
        }
    }
};

function inicializarFluxoAlocacaoESimulador() {
    const abasModo = document.querySelectorAll("[data-mode-tab]");
    const paineisModo = document.querySelectorAll("[data-mode-panel]");

    if (!abasModo.length) return;

    function ativarModo(nomeModo) {
        abasModo.forEach((aba) => {
            const ativo = aba.getAttribute("data-mode-tab") === nomeModo;
            aba.classList.toggle("active", ativo);
            aba.setAttribute("aria-selected", ativo ? "true" : "false");
        });
        paineisModo.forEach((painel) => {
            painel.style.display = painel.getAttribute("data-mode-panel") === nomeModo ? "" : "none";
        });
    }

    abasModo.forEach((aba) => {
        aba.addEventListener("click", () => {
            ativarModo(aba.getAttribute("data-mode-tab"));
        });
    });

    // Validação em tempo real no formulário "Nova alocação"
    const selectTurma = document.getElementById("turma");
    const selectHorario = document.getElementById("horario");
    const radiosSala = document.querySelectorAll('input[name="sala"]');

    function atualizarChecklistValidacao() {
        if (!selectTurma || !selectHorario) return;
        const optTurma = selectTurma.options[selectTurma.selectedIndex];
        const alunos = parseInt(optTurma.getAttribute("data-alunos") || "42", 10);
        const exigeLab = optTurma.getAttribute("data-exige-lab") === "true";

        const optHorario = selectHorario.options[selectHorario.selectedIndex];
        const horarioConflito = optHorario.getAttribute("data-conflito-docente") === "true";

        let capSala = 45;
        let salaTemPc = true;
        let nomeSala = "Lab 01 (LCC 1)";

        radiosSala.forEach((r) => {
            if (r.checked) {
                capSala = parseInt(r.getAttribute("data-capacidade") || "45", 10);
                salaTemPc = r.getAttribute("data-tem-pc") === "true";
                nomeSala = r.value;
            }
        });

        const checkCap = document.getElementById("check-capacidade");
        const checkInfra = document.getElementById("check-infra");
        const checkDocente = document.getElementById("check-docente");

        if (checkCap) {
            if (capSala >= alunos) {
                checkCap.innerHTML = `<span class="check-icon ok" aria-hidden="true">✓</span><span>Capacidade validada: <strong>${nomeSala}</strong> comporta os ${alunos} estudantes (${capSala} lugares).</span>`;
            } else {
                checkCap.innerHTML = `<span class="check-icon fail" aria-hidden="true">⛔</span><span><strong>Déficit de lotação:</strong> ${nomeSala} possui ${capSala} lugares para ${alunos} estudantes.</span>`;
            }
        }

        if (checkInfra) {
            if (!exigeLab || salaTemPc) {
                checkInfra.innerHTML = `<span class="check-icon ok" aria-hidden="true">✓</span><span>Infraestrutura compatível com a natureza da disciplina.</span>`;
            } else {
                checkInfra.innerHTML = `<span class="check-icon fail" aria-hidden="true">⚠️</span><span><strong>Incompatível:</strong> A turma exige computadores, mas o ambiente selecionado é teórico.</span>`;
            }
        }

        if (checkDocente) {
            if (!horarioConflito) {
                checkDocente.innerHTML = `<span class="check-icon ok" aria-hidden="true">✓</span><span>Sem choque de agenda para o docente responsável e sem efeito dominó no período.</span>`;
            } else {
                checkDocente.innerHTML = `<span class="check-icon fail" aria-hidden="true">⛔</span><span><strong>Choque de docente:</strong> Professor já possui outra turma alocada neste horário.</span>`;
            }
        }
    }

    if (selectTurma) selectTurma.addEventListener("change", atualizarChecklistValidacao);
    if (selectHorario) selectHorario.addEventListener("change", atualizarChecklistValidacao);
    radiosSala.forEach((r) => r.addEventListener("change", atualizarChecklistValidacao));

    // Simulador Anti-Efeito Dominó
    const botoesConflito = document.querySelectorAll("[data-sim-conflict]");
    botoesConflito.forEach((btn) => {
        btn.addEventListener("click", () => {
            botoesConflito.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            renderizarSimuladorConflito(btn.getAttribute("data-sim-conflict"));
        });
    });

    // Leitura de parâmetros da URL (ex: ?modo=simulador&conflito=conflito-2)
    const params = new URLSearchParams(window.location.search);
    const modoParam = params.get("modo");
    const conflitoParam = params.get("conflito");
    const turmaParam = params.get("turma");

    if (modoParam) {
        ativarModo(modoParam);
    }
    if (conflitoParam && DADOS_CONFLITOS_SIMULADOR[conflitoParam]) {
        const btnAlvo = document.querySelector(`[data-sim-conflict="${conflitoParam}"]`);
        if (btnAlvo) {
            botoesConflito.forEach((b) => b.classList.remove("active"));
            btnAlvo.classList.add("active");
        }
        renderizarSimuladorConflito(conflitoParam);
    }
    if (turmaParam && selectTurma) {
        Array.from(selectTurma.options).forEach((opt, idx) => {
            if (opt.value.includes(turmaParam)) {
                selectTurma.selectedIndex = idx;
                atualizarChecklistValidacao();
            }
        });
    }
}

function renderizarSimuladorConflito(idConflito) {
    const dados = DADOS_CONFLITOS_SIMULADOR[idConflito];
    if (!dados) return;

    const container = document.getElementById("simulador-propostas-container");
    if (!container) return;

    container.innerHTML = `
        <div style="margin-bottom: 1rem; padding: 0.85rem 1rem; background: #f8fafc; border: 1px solid var(--line); border-radius: var(--radius-xs);">
            <span class="eyebrow">Caso em análise no motor SATIC</span>
            <h3 style="margin: 0.15rem 0;">${dados.titulo}</h3>
            <small style="color: var(--muted);">${dados.resumo}</small>
        </div>

        <article class="proposal-card recommended">
            <div class="proposal-header">
                <strong style="color: var(--green); font-size: 0.95rem;">✅ ${dados.propostaA.titulo}</strong>
                <span class="status success">${dados.propostaA.badge}</span>
            </div>
            <ol class="proposal-steps">
                ${dados.propostaA.passos.map((p) => `<li>${p}</li>`).join("")}
            </ol>
            <div class="proposal-footer">
                <small style="color: var(--green); font-weight: 600;">${dados.propostaA.beneficios}</small>
                <button type="button" class="button button-success button-sm" onclick="exibirFeedback('Solução Recomendada A aplicada com sucesso! Conflito resolvido sem gerar efeito dominó na grade.')">
                    Aplicar Solução A
                </button>
            </div>
        </article>

        <article class="proposal-card">
            <div class="proposal-header">
                <strong style="font-size: 0.92rem;">🔀 ${dados.propostaB.titulo}</strong>
                <span class="status neutral">${dados.propostaB.badge}</span>
            </div>
            <ol class="proposal-steps">
                ${dados.propostaB.passos.map((p) => `<li>${p}</li>`).join("")}
            </ol>
            <div style="display: flex; justify-content: flex-end;">
                <button type="button" class="button button-secondary button-sm" onclick="exibirFeedback('Solução Alternativa B aplicada com sucesso na proposta 2026.2.')">
                    Aplicar Solução B
                </button>
            </div>
        </article>
    `;
}

/* ==========================================================================
   4. GESTÃO DE ESPAÇOS FÍSICOS (espacos.html)
   ========================================================================== */
const DADOS_ESPACOS = {
    "Lab 01": {
        codigo: "Lab 01 (LCC 1)",
        tipo: "Laboratório de Informática (Prático)",
        capacidade: 45,
        pcs: 45,
        pavimento: "Térreo (Acesso Direto / Sem Escadas)",
        status: "Disponível para Alocação de Graduação",
        badgeClasse: "success",
        badgeTexto: "Apto para Alocação",
        notas: "Laboratório principal recém-atualizado com 45 bancadas completas. Recomendado para turmas práticas grandes.",
        recursos: { pc: true, proj: true, ac: true, rede: true, pne: true, quadro: true, som: false, bancada: false }
    },
    "Lab 02": {
        codigo: "Lab 02 (LCC 2)",
        tipo: "Laboratório de Informática (Prático)",
        capacidade: 30,
        pcs: 30,
        pavimento: "Térreo (Acesso Direto / Sem Escadas)",
        status: "Disponível para Alocação de Graduação",
        badgeClasse: "success",
        badgeTexto: "Apto para Alocação",
        notas: "Laboratório com 30 máquinas i7. Turmas acima de 30 estudantes devem ser direcionadas ao Lab 01.",
        recursos: { pc: true, proj: true, ac: true, rede: true, pne: true, quadro: true, som: false, bancada: false }
    },
    "Sala 101": {
        codigo: "Sala 101",
        tipo: "Sala de Aula Convencional (Teórica)",
        capacidade: 45,
        pcs: 0,
        pavimento: "Térreo (Acesso Direto / Sem Escadas)",
        status: "Disponível para Alocação de Graduação",
        badgeClasse: "success",
        badgeTexto: "Apto para Alocação",
        notas: "Sala teórica ampla com projetor HDMI e ar-condicionado revisado.",
        recursos: { pc: false, proj: true, ac: true, rede: true, pne: true, quadro: true, som: false, bancada: false }
    },
    "Sala 102": {
        codigo: "Sala 102",
        tipo: "Sala de Aula Convencional (Teórica)",
        capacidade: 40,
        pcs: 0,
        pavimento: "1º Pavimento Superior",
        status: "Disponível para Alocação de Graduação",
        badgeClasse: "success",
        badgeTexto: "Apto para Alocação",
        notas: "Sala teórica padrão para turmas de até 40 estudantes.",
        recursos: { pc: false, proj: true, ac: true, rede: true, pne: false, quadro: true, som: false, bancada: false }
    },
    "Sala 103": {
        codigo: "Sala 103",
        tipo: "Sala de Aula Convencional (Teórica)",
        capacidade: 30,
        pcs: 0,
        pavimento: "1º Pavimento Superior",
        status: "Com Restrição Parcial (Equipamento em Manutenção)",
        badgeClasse: "warning",
        badgeTexto: "Restrição de AC",
        notas: "Atenção: Aparelho de ar-condicionado em manutenção corretiva. Evitar alocar turmas no turno vespertino.",
        recursos: { pc: false, proj: true, ac: false, rede: true, pne: false, quadro: true, som: false, bancada: false }
    },
    "Anfiteatro IC": {
        codigo: "Anfiteatro IC",
        tipo: "Anfiteatro / Auditório",
        capacidade: 70,
        pcs: 0,
        pavimento: "Térreo (Acesso Direto / Sem Escadas)",
        status: "Disponível para Alocação de Graduação",
        badgeClasse: "success",
        badgeTexto: "Apto para Alocação",
        notas: "Auditório principal do bloco IC com 70 lugares, sistema de som e rampa PNE. Ideal para turmas de 1º período.",
        recursos: { pc: false, proj: true, ac: true, rede: true, pne: true, quadro: true, som: true, bancada: false }
    }
};

function inicializarGestaoEspacos() {
    const linhasEspaco = document.querySelectorAll("[data-espaco-id]");
    const inputBusca = document.getElementById("busca-espacos");
    const selectCat = document.getElementById("filtro-categoria-espacos");

    if (!linhasEspaco.length) return;

    linhasEspaco.forEach((linha) => {
        linha.addEventListener("click", () => {
            linhasEspaco.forEach((l) => l.classList.remove("selected"));
            linha.classList.add("selected");
            const id = linha.getAttribute("data-espaco-id");
            preencherFichaEspaco(id);
        });
    });

    function filtrarTabelaEspacos() {
        const termo = (inputBusca ? inputBusca.value : "").toLowerCase();
        const cat = selectCat ? selectCat.value : "todos";

        linhasEspaco.forEach((linha) => {
            const texto = linha.textContent.toLowerCase();
            const linhaCat = linha.getAttribute("data-espaco-cat");
            const bateTexto = !termo || texto.includes(termo);
            const bateCat = cat === "todos" || linhaCat === cat;
            linha.style.display = bateTexto && bateCat ? "" : "none";
        });
    }

    if (inputBusca) inputBusca.addEventListener("input", filtrarTabelaEspacos);
    if (selectCat) selectCat.addEventListener("change", filtrarTabelaEspacos);
}

function preencherFichaEspaco(id) {
    const d = DADOS_ESPACOS[id];
    if (!d) return;

    const titulo = document.getElementById("espaco-ficha-titulo");
    const badge = document.getElementById("espaco-ficha-badge");
    const inputCodigo = document.getElementById("espaco-codigo");
    const selectTipo = document.getElementById("espaco-tipo");
    const inputCap = document.getElementById("espaco-capacidade");
    const inputPcs = document.getElementById("espaco-pcs");
    const selectStatus = document.getElementById("espaco-status");
    const inputNotas = document.getElementById("espaco-notas");

    if (titulo) titulo.textContent = `Ficha de Infraestrutura: ${d.codigo}`;
    if (badge) {
        badge.className = `status ${d.badgeClasse}`;
        badge.textContent = d.badgeTexto;
    }
    if (inputCodigo) inputCodigo.value = d.codigo;
    if (selectTipo) selectTipo.value = d.tipo;
    if (inputCap) inputCap.value = d.capacidade;
    if (inputPcs) inputPcs.value = d.pcs;
    if (selectStatus) selectStatus.value = d.status;
    if (inputNotas) inputNotas.value = d.notas;

    Object.entries(d.recursos).forEach(([chave, ativo]) => {
        const chk = document.getElementById(`rec-${chave}`);
        if (chk) chk.checked = ativo;
    });
}

/* ==========================================================================
   5. GESTÃO DE TURMAS E OFERTA (turmas.html)
   ========================================================================== */
const DADOS_TURMAS = {
    "COMP203-A": {
        codigo: "COMP203",
        disciplina: "Programação 3",
        turma: "Turma A",
        curso: "Ciência da Computação",
        periodo: "3º Período (Obrigatória)",
        vagas: 45,
        matriculados: 42,
        natureza: "Obrigatório Laboratório de Informática (PCs)",
        salaAtual: "Lab 02 (Cap: 30 — Insuficiente)",
        docente: "Prof. Ranilson",
        horario: "Terça e Quinta · M3-M4 (09:20 - 11:00)",
        statusClasse: "danger",
        statusTexto: "2 Violações Ativas",
        recomendacao: "Transferir para o Lab 01 (45 lugares) nos horários Segunda e Quarta (M3-M4). Atende aos 42 estudantes com PCs e elimina o choque do docente."
    },
    "COMP308-A": {
        codigo: "COMP308",
        disciplina: "Sistemas Operacionais",
        turma: "Turma A",
        curso: "Oferta Compartilhada (CC + EC)",
        periodo: "5º Período (Obrigatória)",
        vagas: 45,
        matriculados: 45,
        natureza: "Obrigatório Laboratório de Informática (PCs)",
        salaAtual: "Sala 103 (Cap: 30 — Sem PCs)",
        docente: "Prof. Patrick",
        horario: "Quarta e Sexta · T1-T2 (13:30 - 15:10)",
        statusClasse: "infra",
        statusTexto: "Déficit de Infraestrutura",
        recomendacao: "Migrar da Sala 103 para o Lab 01 (45 PCs) mantendo Quarta e Sexta (T1-T2), que está livre na matriz."
    },
    "COMP204-A": {
        codigo: "COMP204",
        disciplina: "Banco de Dados",
        turma: "Turma A",
        curso: "Ciência da Computação",
        periodo: "4º Período (Obrigatória)",
        vagas: 45,
        matriculados: 38,
        natureza: "Sala de Aula Teórica Convencional",
        salaAtual: "Sala 101 (Cap: 45 — Compatível)",
        docente: "Prof. Baldoino",
        horario: "Segunda e Quarta · M1-M2 (07:30 - 09:10)",
        statusClasse: "success",
        statusTexto: "Alocação Validada",
        recomendacao: "Nenhuma alteração necessária. Turma validada com folga de 7 assentos e docente sem conflitos."
    },
    "COMP201-A": {
        codigo: "COMP201",
        disciplina: "Algoritmos e Estruturas de Dados",
        turma: "Turma A",
        curso: "Oferta Compartilhada (CC + EC)",
        periodo: "2º Período (Obrigatória)",
        vagas: 45,
        matriculados: 45,
        natureza: "Obrigatório Laboratório de Informática (PCs)",
        salaAtual: "Aguardando Alocação (Na Fila)",
        docente: "Prof. Baldoino",
        horario: "Terça e Quinta · T1-T2 (13:30 - 15:10)",
        statusClasse: "warning",
        statusTexto: "Pendente de Sala",
        recomendacao: "Encaixar no Lab 01 (45 lugares) no slot Terça e Quinta (T1-T2), onde o docente tem disponibilidade preferencial."
    }
};

function inicializarGestaoTurmas() {
    const linhasTurma = document.querySelectorAll("[data-turma-id]");
    if (!linhasTurma.length) return;

    linhasTurma.forEach((linha) => {
        linha.addEventListener("click", () => {
            linhasTurma.forEach((l) => l.classList.remove("selected"));
            linha.classList.add("selected");
            const id = linha.getAttribute("data-turma-id");
            const d = DADOS_TURMAS[id];
            if (!d) return;

            document.getElementById("turma-ficha-titulo").textContent = `Turma: ${d.codigo} · ${d.disciplina} (${d.turma})`;
            const badge = document.getElementById("turma-ficha-badge");
            badge.className = `status ${d.statusClasse}`;
            badge.textContent = d.statusTexto;

            document.getElementById("campo-turma-codigo").value = d.codigo;
            document.getElementById("campo-turma-nome").value = d.disciplina;
            document.getElementById("campo-turma-id").value = d.turma;
            document.getElementById("campo-turma-vagas").value = d.vagas;
            document.getElementById("campo-turma-matriculados").value = d.matriculados;
            document.getElementById("turma-recomendacao-texto").textContent = d.recomendacao;
        });
    });
}

/* ==========================================================================
   6. GESTÃO DE DOCENTES E MATRIZ DE DISPONIBILIDADE (docentes.html)
   ========================================================================== */
function inicializarGestaoDocentes() {
    const botoesDisp = document.querySelectorAll(".avail-btn[data-toggle-avail]");
    const linhasDocente = document.querySelectorAll("[data-docente-nome]");

    botoesDisp.forEach((btn) => {
        btn.addEventListener("click", () => {
            if (btn.classList.contains("preferencial")) {
                btn.classList.remove("preferencial");
                btn.classList.add("disponivel");
                btn.textContent = "Disponível";
            } else if (btn.classList.contains("disponivel")) {
                btn.classList.remove("disponivel");
                btn.classList.add("indisponivel");
                btn.textContent = "Indisponível";
            } else if (btn.classList.contains("indisponivel")) {
                btn.classList.remove("indisponivel");
                btn.classList.add("preferencial");
                btn.textContent = "★ Preferencial";
            }
        });
    });

    linhasDocente.forEach((linha) => {
        linha.addEventListener("click", () => {
            linhasDocente.forEach((l) => l.classList.remove("selected"));
            linha.classList.add("selected");

            const nome = linha.getAttribute("data-docente-nome");
            const siape = linha.getAttribute("data-docente-siape");
            const status = linha.getAttribute("data-docente-status");

            const tituloEl = document.getElementById("docente-ficha-titulo");
            const nomeInput = document.getElementById("docente-input-nome");
            const siapeInput = document.getElementById("docente-input-siape");
            const badgeEl = document.getElementById("docente-ficha-badge");

            if (tituloEl) tituloEl.textContent = `Perfil e Disponibilidade: ${nome}`;
            if (nomeInput) nomeInput.value = nome;
            if (siapeInput) siapeInput.value = siape;
            if (badgeEl) {
                if (status === "choque") {
                    badgeEl.className = "status danger";
                    badgeEl.textContent = "1 Choque de Horário (M3-M4)";
                } else {
                    badgeEl.className = "status success";
                    badgeEl.textContent = "Agenda Validada";
                }
            }
        });
    });
}

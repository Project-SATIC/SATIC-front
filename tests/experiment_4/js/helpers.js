/**
 * SATIC — Helpers puros de apresentação, busca e exportação da interface
 * Arquivo: js/helpers.js
 * Objetivo: centralizar lógica pura testável em Node e compartilhada com js/app.js.
 */
(function (root) {
    function escapar(valor) {
        return String(valor ?? "").replace(/[&<>"']/g, (c) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "\"": "&quot;",
            "'": "&#39;"
        })[c]);
    }

    /** Horário legível em blocos: "TER/QUI M3–M4", "SEX M3–M6", "SEG T5–T6 · SEX T1–T2". */
    function rotuloHorario(t, dominio) {
        if (!t || !t.horario || !dominio) return "Sem horário";
        let blocos;
        try {
            blocos = dominio.grade.blocosDoHorario(t.horario);
        } catch (_) {
            return t.horario;
        }
        const grupos = new Map();
        blocos.forEach((b) => {
            const faixa = b.inicio === b.fim ? `${b.turno}${b.inicio}` : `${b.turno}${b.inicio}–${b.turno}${b.fim}`;
            grupos.set(faixa, [...(grupos.get(faixa) || []), b.dia]);
        });
        return [...grupos.entries()].map(([faixa, dias]) => `${dias.join("/")} ${faixa}`).join(" · ");
    }

    function obterRotuloConflito(turma, diag, espacos = []) {
        const prioridades = {
            Professor: 1,
            Disponibilidade: 2,
            Ambiente: 3,
            Capacidade: 4,
            Sala: 5,
            Espaço: 6,
            Turno: 7,
            Encontros: 8
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
                const esp = espacos.find((e) => e.id === turma.sala);
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
            if (p.categoria === "Turno") {
                return { prio: prioridades.Turno, rn: "TURNO", curtoHtml: "Turno inválido", texto: "Turno fora do curso" };
            }
            return { prio: prioridades.Encontros, rn: "FORMATO", curtoHtml: "Formato", texto: "Formato do horário" };
        });
        itens.sort((a, b) => a.prio - b.prio);
        const principal = itens[0];
        const extra = itens.length > 1 ? ` <span class="mono-num">+${itens.length - 1}</span>` : "";
        return {
            curtoHtml: `${principal.curtoHtml}${extra}`,
            resumoTooltip: itens.map((i) => `${i.rn}: ${i.texto}`).join(" · ")
        };
    }

    function rotuloRegraProblema(categoria) {
        const mapa = {
            Professor: "RN-01 · Choque docente",
            Disponibilidade: "RN-02 · Indisponibilidade docente",
            Capacidade: "RN-03 · Capacidade física",
            Ambiente: "RN-04 · Adequação de ambiente",
            Sala: "Exclusividade de sala",
            Espaço: "Espaço indisponível",
            Turno: "TURNO · Turno fora do curso",
            Encontros: "FORMATO · Formato do horário"
        };
        return mapa[categoria] || categoria;
    }

    function filtrarProfessorPorTermo(prof, termo) {
        const q = String(termo || "").trim().toLowerCase();
        if (!q) return true;
        return String(prof.nome || "").toLowerCase().includes(q)
            || String(prof.siape || "").toLowerCase().includes(q);
    }

    function gerarConteudoICS({ semestre, inicio, fim, turmas, espacos, dominio, agora = new Date() }) {
        const relogio = Object.fromEntries(dominio.grade.RELOGIO_AULAS.map((a) => [a.id, a]));
        const nomeEspaco = (id) => espacos.find((e) => e.id === id)?.nome || id || "Sem sala";
        const diaIcs = { SEG: "MO", TER: "TU", QUA: "WE", QUI: "TH", SEX: "FR", SAB: "SA" };
        const offset = { SEG: 0, TER: 1, QUA: 2, QUI: 3, SEX: 4, SAB: 5 };
        const base = new Date(`${inicio}T00:00:00`);
        const fimDate = new Date(`${fim}T23:59:59`);
        const fimUtc = new Date(`${fim}T23:59:59-03:00`);
        const segunda = new Date(base);
        segunda.setDate(base.getDate() - ((base.getDay() + 6) % 7)); // segunda da 1ª semana
        const fmtData = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
        const fmtUtc = (d) => `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}T${String(d.getUTCHours()).padStart(2, "0")}${String(d.getUTCMinutes()).padStart(2, "0")}${String(d.getUTCSeconds()).padStart(2, "0")}Z`;
        const esc = (s) => String(s).replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
        const ate = fmtUtc(fimUtc);
        const dtstamp = fmtUtc(agora);
        const linhas = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//SATIC IC UFAL//Grade//PT-BR",
            "CALSCALE:GREGORIAN",
            `X-WR-CALNAME:SATIC ${semestre}`,
            "X-WR-TIMEZONE:America/Maceio",
            "BEGIN:VTIMEZONE",
            "TZID:America/Maceio",
            "BEGIN:STANDARD",
            "DTSTART:19700101T000000",
            "TZOFFSETFROM:-0300",
            "TZOFFSETTO:-0300",
            "TZNAME:-03",
            "END:STANDARD",
            "END:VTIMEZONE",
        ];
        let eventos = 0;
        for (const t of turmas) {
            if (!t.sala || !t.horario) continue;
            let blocos;
            try {
                blocos = dominio.grade.blocosDoHorario(t.horario);
            } catch (_) {
                continue;
            }
            for (const b of blocos) {
                const rIni = relogio[`${b.turno}${b.inicio}`];
                const rFim = relogio[`${b.turno}${b.fim}`];
                if (!rIni || !rFim) continue;
                const dia = new Date(segunda);
                dia.setDate(segunda.getDate() + offset[b.dia]);
                if (dia < base) dia.setDate(dia.getDate() + 7);
                if (dia > fimDate) continue;
                const ini = rIni.inicio.replace(":", "");
                const fimAula = rFim.fim.replace(":", "");
                linhas.push(
                    "BEGIN:VEVENT",
                    `UID:satic-${semestre}-${t.apiId}-${b.dia}-${b.turno}${b.inicio}@ic.ufal`,
                    `DTSTAMP:${dtstamp}`,
                    `DTSTART;TZID=America/Maceio:${fmtData(dia)}T${ini}00`,
                    `DTEND;TZID=America/Maceio:${fmtData(dia)}T${fimAula}00`,
                    `RRULE:FREQ=WEEKLY;BYDAY=${diaIcs[b.dia]};UNTIL=${ate}`,
                    `SUMMARY:${esc(`${t.codigo}-${t.turma} ${t.disciplina}`)}`,
                    `LOCATION:${esc(nomeEspaco(t.sala))}`,
                    `DESCRIPTION:${esc(`Docentes: ${(t.professores || []).join(", ")}\nCurso: ${t.curso}\nHorário SIGAA: ${t.horario}`)}`,
                    "END:VEVENT"
                );
                eventos++;
            }
        }
        linhas.push("END:VCALENDAR");
        return { conteudo: linhas.join("\r\n"), eventos };
    }

    root.SATIC_HELPERS = {
        escapar,
        rotuloHorario,
        obterRotuloConflito,
        rotuloRegraProblema,
        filtrarProfessorPorTermo,
        gerarConteudoICS,
    };
})(typeof window !== "undefined" ? window : globalThis);

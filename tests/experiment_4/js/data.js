/**
 * SATIC — Sistema de Alocação de Turmas (IC / UFAL)
 * Arquivo: js/data.js
 * Objetivo: Repositório central de dados simulados do domínio e motor de validação de regras
 */

const SLOTS_INSTITUCIONAIS = [
    { id: "M1-M2", turno: "Manhã", horario: "07:30–09:10" },
    { id: "M3-M4", turno: "Manhã", horario: "09:20–11:00" },
    { id: "M5-M6", turno: "Manhã", horario: "11:10–12:50" },
    { id: "T1-T2", turno: "Tarde", horario: "13:30–15:10" },
    { id: "T3-T4", turno: "Tarde", horario: "15:20–17:00" },
    { id: "T5-T6", turno: "Tarde", horario: "17:10–18:50" }
];

const DIAS_SEMANA = [
    { id: "SEG", rotulo: "SEG", nome: "Segunda" },
    { id: "TER", rotulo: "TER", nome: "Terça" },
    { id: "QUA", rotulo: "QUA", nome: "Quarta" },
    { id: "QUI", rotulo: "QUI", nome: "Quinta" },
    { id: "SEX", rotulo: "SEX", nome: "Sexta" }
];

function criarDadosIniciais() {
    const dados = {
        semestre: "2026.2",
        publicada: false,

        espacos: [
            {
                id: "Lab 01",
                nome: "Lab 01",
                codigo: "IC-L01",
                tipo: "Laboratório",
                capacidade: 45,
                pcs: 45,
                equipamentos: ["45 PCs", "Projetor", "Ar-condicionado", "Rede cabeada"],
                status: "Disponível",
                pavimento: "Térreo",
                observacao: "Laboratório principal de ensino prático."
            },
            {
                id: "Lab 02",
                nome: "Lab 02",
                codigo: "IC-L02",
                tipo: "Laboratório",
                capacidade: 30,
                pcs: 30,
                equipamentos: ["30 PCs", "Projetor", "Ar-condicionado"],
                status: "Disponível",
                pavimento: "Térreo",
                observacao: "Capacidade máxima limitada a 30 bancadas."
            },
            {
                id: "Sala 101",
                nome: "Sala 101",
                codigo: "IC-S101",
                tipo: "Sala",
                capacidade: 45,
                pcs: 0,
                equipamentos: ["Projetor", "Ar-condicionado", "Quadro branco"],
                status: "Disponível",
                pavimento: "Térreo",
                observacao: "Sala teórica ampla."
            },
            {
                id: "Sala 102",
                nome: "Sala 102",
                codigo: "IC-S102",
                tipo: "Sala",
                capacidade: 40,
                pcs: 0,
                equipamentos: ["Projetor", "Ar-condicionado", "Quadro branco"],
                status: "Disponível",
                pavimento: "1º Andar",
                observacao: "Sala teórica padrão."
            },
            {
                id: "Sala 103",
                nome: "Sala 103",
                codigo: "IC-S103",
                tipo: "Sala",
                capacidade: 30,
                pcs: 0,
                equipamentos: ["Projetor", "Quadro branco"],
                status: "Manutenção",
                pavimento: "1º Andar",
                observacao: "Ar-condicionado em manutenção corretiva."
            },
            {
                id: "Anfiteatro IC",
                nome: "Anfiteatro IC",
                codigo: "IC-AUD",
                tipo: "Auditório",
                capacidade: 70,
                pcs: 0,
                equipamentos: ["Sistema de som", "Projetor", "Ar-condicionado", "Acessibilidade PNE"],
                status: "Disponível",
                pavimento: "Térreo",
                observacao: "Indicado para turmas de 1º período."
            }
        ],

        professores: [
            {
                id: "Ranilson",
                nome: "Ranilson Paiva",
                curto: "Ranilson",
                siape: "2024389",
                regime: "40h DE",
                cargaMax: 12,
                disponibilidade: {
                    "SEG:M1-M2": "disponivel", "TER:M1-M2": "disponivel", "QUA:M1-M2": "disponivel", "QUI:M1-M2": "disponivel", "SEX:M1-M2": "indisponivel",
                    "SEG:M3-M4": "preferencial", "TER:M3-M4": "preferencial", "QUA:M3-M4": "preferencial", "QUI:M3-M4": "preferencial", "SEX:M3-M4": "indisponivel",
                    "SEG:M5-M6": "disponivel", "TER:M5-M6": "disponivel", "QUA:M5-M6": "disponivel", "QUI:M5-M6": "disponivel", "SEX:M5-M6": "indisponivel",
                    "SEG:T1-T2": "preferencial", "TER:T1-T2": "preferencial", "QUA:T1-T2": "preferencial", "QUI:T1-T2": "preferencial", "SEX:T1-T2": "disponivel",
                    "SEG:T3-T4": "disponivel", "TER:T3-T4": "indisponivel", "QUA:T3-T4": "disponivel", "QUI:T3-T4": "indisponivel", "SEX:T3-T4": "indisponivel",
                    "SEG:T5-T6": "indisponivel", "TER:T5-T6": "indisponivel", "QUA:T5-T6": "indisponivel", "QUI:T5-T6": "indisponivel", "SEX:T5-T6": "indisponivel"
                }
            },
            {
                id: "Baldoino",
                nome: "Baldoino Fonseca",
                curto: "Baldoino",
                siape: "1849201",
                regime: "40h DE",
                cargaMax: 12,
                disponibilidade: {
                    "SEG:M1-M2": "preferencial", "TER:M1-M2": "disponivel", "QUA:M1-M2": "preferencial", "QUI:M1-M2": "disponivel", "SEX:M1-M2": "disponivel",
                    "SEG:M3-M4": "preferencial", "TER:M3-M4": "preferencial", "QUA:M3-M4": "preferencial", "QUI:M3-M4": "preferencial", "SEX:M3-M4": "disponivel",
                    "SEG:M5-M6": "disponivel", "TER:M5-M6": "disponivel", "QUA:M5-M6": "disponivel", "QUI:M5-M6": "disponivel", "SEX:M5-M6": "indisponivel",
                    "SEG:T1-T2": "disponivel", "TER:T1-T2": "preferencial", "QUA:T1-T2": "disponivel", "QUI:T1-T2": "preferencial", "SEX:T1-T2": "disponivel",
                    "SEG:T3-T4": "disponivel", "TER:T3-T4": "disponivel", "QUA:T3-T4": "disponivel", "QUI:T3-T4": "disponivel", "SEX:T3-T4": "indisponivel",
                    "SEG:T5-T6": "indisponivel", "TER:T5-T6": "indisponivel", "QUA:T5-T6": "indisponivel", "QUI:T5-T6": "indisponivel", "SEX:T5-T6": "indisponivel"
                }
            },
            {
                id: "Willy",
                nome: "Willy Tiengo",
                curto: "Willy",
                siape: "1930412",
                regime: "40h DE",
                cargaMax: 12,
                disponibilidade: {
                    "SEG:M1-M2": "disponivel", "TER:M1-M2": "preferencial", "QUA:M1-M2": "disponivel", "QUI:M1-M2": "preferencial", "SEX:M1-M2": "disponivel",
                    "SEG:M3-M4": "disponivel", "TER:M3-M4": "preferencial", "QUA:M3-M4": "disponivel", "QUI:M3-M4": "preferencial", "SEX:M3-M4": "disponivel",
                    "SEG:M5-M6": "disponivel", "TER:M5-M6": "disponivel", "QUA:M5-M6": "disponivel", "QUI:M5-M6": "disponivel", "SEX:M5-M6": "disponivel",
                    "SEG:T1-T2": "preferencial", "TER:T1-T2": "disponivel", "QUA:T1-T2": "preferencial", "QUI:T1-T2": "disponivel", "SEX:T1-T2": "disponivel",
                    "SEG:T3-T4": "preferencial", "TER:T3-T4": "disponivel", "QUA:T3-T4": "preferencial", "QUI:T3-T4": "disponivel", "SEX:T3-T4": "indisponivel",
                    "SEG:T5-T6": "indisponivel", "TER:T5-T6": "indisponivel", "QUA:T5-T6": "indisponivel", "QUI:T5-T6": "indisponivel", "SEX:T5-T6": "indisponivel"
                }
            },
            {
                id: "Patrick",
                nome: "Patrick Brito",
                curto: "Patrick",
                siape: "2104938",
                regime: "40h DE",
                cargaMax: 12,
                disponibilidade: {
                    "SEG:M1-M2": "indisponivel", "TER:M1-M2": "disponivel", "QUA:M1-M2": "indisponivel", "QUI:M1-M2": "disponivel", "SEX:M1-M2": "disponivel",
                    "SEG:M3-M4": "disponivel", "TER:M3-M4": "disponivel", "QUA:M3-M4": "disponivel", "QUI:M3-M4": "disponivel", "SEX:M3-M4": "disponivel",
                    "SEG:M5-M6": "disponivel", "TER:M5-M6": "disponivel", "QUA:M5-M6": "disponivel", "QUI:M5-M6": "disponivel", "SEX:M5-M6": "disponivel",
                    "SEG:T1-T2": "preferencial", "TER:T1-T2": "disponivel", "QUA:T1-T2": "preferencial", "QUI:T1-T2": "disponivel", "SEX:T1-T2": "preferencial",
                    "SEG:T3-T4": "preferencial", "TER:T3-T4": "disponivel", "QUA:T3-T4": "preferencial", "QUI:T3-T4": "disponivel", "SEX:T3-T4": "disponivel",
                    "SEG:T5-T6": "disponivel", "TER:T5-T6": "indisponivel", "QUA:T5-T6": "disponivel", "QUI:T5-T6": "indisponivel", "SEX:T5-T6": "indisponivel"
                }
            },
            {
                id: "Maria Helena",
                nome: "Maria Helena Andrade",
                curto: "Maria Helena",
                siape: "1748290",
                regime: "40h DE",
                cargaMax: 12,
                disponibilidade: {
                    "SEG:M1-M2": "preferencial", "TER:M1-M2": "preferencial", "QUA:M1-M2": "preferencial", "QUI:M1-M2": "preferencial", "SEX:M1-M2": "disponivel",
                    "SEG:M3-M4": "preferencial", "TER:M3-M4": "preferencial", "QUA:M3-M4": "preferencial", "QUI:M3-M4": "preferencial", "SEX:M3-M4": "disponivel",
                    "SEG:M5-M6": "disponivel", "TER:M5-M6": "disponivel", "QUA:M5-M6": "disponivel", "QUI:M5-M6": "disponivel", "SEX:M5-M6": "disponivel",
                    "SEG:T1-T2": "preferencial", "TER:T1-T2": "disponivel", "QUA:T1-T2": "preferencial", "QUI:T1-T2": "disponivel", "SEX:T1-T2": "indisponivel",
                    "SEG:T3-T4": "indisponivel", "TER:T3-T4": "indisponivel", "QUA:T3-T4": "indisponivel", "QUI:T3-T4": "indisponivel", "SEX:T3-T4": "indisponivel",
                    "SEG:T5-T6": "indisponivel", "TER:T5-T6": "indisponivel", "QUA:T5-T6": "indisponivel", "QUI:T5-T6": "indisponivel", "SEX:T5-T6": "indisponivel"
                }
            },
            {
                id: "Marcio",
                nome: "Márcio Ribeiro",
                curto: "Márcio",
                siape: "1659302",
                regime: "40h DE",
                cargaMax: 12,
                disponibilidade: {
                    "SEG:M1-M2": "disponivel", "TER:M1-M2": "preferencial", "QUA:M1-M2": "disponivel", "QUI:M1-M2": "preferencial", "SEX:M1-M2": "preferencial",
                    "SEG:M3-M4": "disponivel", "TER:M3-M4": "disponivel", "QUA:M3-M4": "disponivel", "QUI:M3-M4": "disponivel", "SEX:M3-M4": "preferencial",
                    "SEG:M5-M6": "disponivel", "TER:M5-M6": "disponivel", "QUA:M5-M6": "disponivel", "QUI:M5-M6": "disponivel", "SEX:M5-M6": "disponivel",
                    "SEG:T1-T2": "disponivel", "TER:T1-T2": "preferencial", "QUA:T1-T2": "disponivel", "QUI:T1-T2": "preferencial", "SEX:T1-T2": "disponivel",
                    "SEG:T3-T4": "disponivel", "TER:T3-T4": "preferencial", "QUA:T3-T4": "disponivel", "QUI:T3-T4": "preferencial", "SEX:T3-T4": "indisponivel",
                    "SEG:T5-T6": "indisponivel", "TER:T5-T6": "indisponivel", "QUA:T5-T6": "indisponivel", "QUI:T5-T6": "indisponivel", "SEX:T5-T6": "indisponivel"
                }
            },
            {
                id: "Evandro",
                nome: "Evandro Costa",
                curto: "Evandro",
                siape: "1520394",
                regime: "40h DE",
                cargaMax: 12,
                disponibilidade: {
                    "SEG:M1-M2": "disponivel", "TER:M1-M2": "disponivel", "QUA:M1-M2": "disponivel", "QUI:M1-M2": "disponivel", "SEX:M1-M2": "preferencial",
                    "SEG:M3-M4": "preferencial", "TER:M3-M4": "disponivel", "QUA:M3-M4": "preferencial", "QUI:M3-M4": "disponivel", "SEX:M3-M4": "preferencial",
                    "SEG:M5-M6": "preferencial", "TER:M5-M6": "preferencial", "QUA:M5-M6": "preferencial", "QUI:M5-M6": "preferencial", "SEX:M5-M6": "disponivel",
                    "SEG:T1-T2": "disponivel", "TER:T1-T2": "disponivel", "QUA:T1-T2": "disponivel", "QUI:T1-T2": "disponivel", "SEX:T1-T2": "indisponivel",
                    "SEG:T3-T4": "disponivel", "TER:T3-T4": "disponivel", "QUA:T3-T4": "disponivel", "QUI:T3-T4": "disponivel", "SEX:T3-T4": "indisponivel",
                    "SEG:T5-T6": "indisponivel", "TER:T5-T6": "indisponivel", "QUA:T5-T6": "indisponivel", "QUI:T5-T6": "indisponivel", "SEX:T5-T6": "indisponivel"
                }
            },
            {
                id: "Glauber",
                nome: "Glauber Cabral",
                curto: "Glauber",
                siape: "2291043",
                regime: "40h DE",
                cargaMax: 12,
                disponibilidade: {
                    "SEG:M1-M2": "disponivel", "TER:M1-M2": "disponivel", "QUA:M1-M2": "disponivel", "QUI:M1-M2": "disponivel", "SEX:M1-M2": "disponivel",
                    "SEG:M3-M4": "disponivel", "TER:M3-M4": "disponivel", "QUA:M3-M4": "disponivel", "QUI:M3-M4": "disponivel", "SEX:M3-M4": "disponivel",
                    "SEG:M5-M6": "preferencial", "TER:M5-M6": "preferencial", "QUA:M5-M6": "preferencial", "QUI:M5-M6": "preferencial", "SEX:M5-M6": "preferencial",
                    "SEG:T1-T2": "preferencial", "TER:T1-T2": "preferencial", "QUA:T1-T2": "preferencial", "QUI:T1-T2": "preferencial", "SEX:T1-T2": "disponivel",
                    "SEG:T3-T4": "preferencial", "TER:T3-T4": "preferencial", "QUA:T3-T4": "preferencial", "QUI:T3-T4": "preferencial", "SEX:T3-T4": "preferencial",
                    "SEG:T5-T6": "disponivel", "TER:T5-T6": "disponivel", "QUA:T5-T6": "disponivel", "QUI:T5-T6": "disponivel", "SEX:T5-T6": "indisponivel"
                }
            }
        ],

        turmas: [
            // Turmas com Conflito Inicial (2 casos críticos)
            {
                id: "COMP203",
                codigo: "COMP203",
                disciplina: "Programação 3",
                turma: "A",
                curso: "CC",
                periodo: "3º Período",
                professor: "Ranilson",
                alunos: 42,
                ambienteExigido: "Laboratório",
                sala: "Lab 02",
                dias: ["TER", "QUI"],
                slot: "M3-M4"
            },
            {
                id: "COMP402",
                codigo: "COMP402",
                disciplina: "Engenharia de Software",
                turma: "B",
                curso: "CC",
                periodo: "4º Período",
                professor: "Ranilson",
                alunos: 35,
                ambienteExigido: "Sala",
                sala: "Sala 102",
                dias: ["TER", "QUI"],
                slot: "M3-M4"
            },
            {
                id: "COMP308",
                codigo: "COMP308",
                disciplina: "Sistemas Operacionais",
                turma: "A",
                curso: "CC",
                periodo: "5º Período",
                professor: "Patrick",
                alunos: 45,
                ambienteExigido: "Laboratório",
                sala: "Sala 103",
                dias: ["QUA", "SEX"],
                slot: "T1-T2"
            },

            // Turmas Regulares Alocadas (12 turmas)
            {
                id: "COMP204",
                codigo: "COMP204",
                disciplina: "Banco de Dados",
                turma: "A",
                curso: "CC",
                periodo: "4º Período",
                professor: "Baldoino",
                alunos: 38,
                ambienteExigido: "Sala",
                sala: "Sala 101",
                dias: ["SEG", "QUA"],
                slot: "M1-M2"
            },
            {
                id: "COMP105",
                codigo: "COMP105",
                disciplina: "Lógica para Computação",
                turma: "A",
                curso: "CC",
                periodo: "1º Período",
                professor: "Willy",
                alunos: 36,
                ambienteExigido: "Sala",
                sala: "Sala 102",
                dias: ["TER", "QUI"],
                slot: "M1-M2"
            },
            {
                id: "COMP102",
                codigo: "COMP102",
                disciplina: "Cálculo Diferencial I",
                turma: "B",
                curso: "CC",
                periodo: "1º Período",
                professor: "Maria Helena",
                alunos: 55,
                ambienteExigido: "Auditório",
                sala: "Anfiteatro IC",
                dias: ["SEG", "QUA"],
                slot: "T1-T2"
            },
            {
                id: "COMP302",
                codigo: "COMP302",
                disciplina: "Compiladores",
                turma: "A",
                curso: "CC",
                periodo: "5º Período",
                professor: "Marcio",
                alunos: 28,
                ambienteExigido: "Laboratório",
                sala: "Lab 01",
                dias: ["TER", "QUI"],
                slot: "T3-T4"
            },
            {
                id: "COMP103",
                codigo: "COMP103",
                disciplina: "Programação 1",
                turma: "A",
                curso: "CC",
                periodo: "1º Período",
                professor: "Marcio",
                alunos: 44,
                ambienteExigido: "Laboratório",
                sala: "Lab 01",
                dias: ["SEG", "QUA"],
                slot: "M1-M2"
            },
            {
                id: "COMP202",
                codigo: "COMP202",
                disciplina: "Programação 2",
                turma: "A",
                curso: "EC",
                periodo: "2º Período",
                professor: "Willy",
                alunos: 30,
                ambienteExigido: "Laboratório",
                sala: "Lab 02",
                dias: ["SEG", "QUA"],
                slot: "M3-M4"
            },
            {
                id: "COMP205",
                codigo: "COMP205",
                disciplina: "Matemática Discreta",
                turma: "A",
                curso: "CC",
                periodo: "2º Período",
                professor: "Maria Helena",
                alunos: 40,
                ambienteExigido: "Sala",
                sala: "Sala 101",
                dias: ["TER", "QUI"],
                slot: "M3-M4"
            },
            {
                id: "COMP206",
                codigo: "COMP206",
                disciplina: "Organização de Computadores",
                turma: "A",
                curso: "EC",
                periodo: "2º Período",
                professor: "Patrick",
                alunos: 34,
                ambienteExigido: "Sala",
                sala: "Sala 102",
                dias: ["SEG", "QUA"],
                slot: "T3-T4"
            },
            {
                id: "COMP301",
                codigo: "COMP301",
                disciplina: "Teoria da Computação",
                turma: "A",
                curso: "CC",
                periodo: "3º Período",
                professor: "Evandro",
                alunos: 35,
                ambienteExigido: "Sala",
                sala: "Sala 101",
                dias: ["SEG", "QUA"],
                slot: "M5-M6"
            },
            {
                id: "COMP303",
                codigo: "COMP303",
                disciplina: "Inteligência Artificial",
                turma: "A",
                curso: "CC",
                periodo: "3º Período",
                professor: "Evandro",
                alunos: 40,
                ambienteExigido: "Sala",
                sala: "Sala 101",
                dias: ["TER", "QUI"],
                slot: "M5-M6"
            },
            {
                id: "COMP305",
                codigo: "COMP305",
                disciplina: "Computação Gráfica",
                turma: "A",
                curso: "EC",
                periodo: "3º Período",
                professor: "Glauber",
                alunos: 26,
                ambienteExigido: "Laboratório",
                sala: "Lab 02",
                dias: ["SEG", "QUA"],
                slot: "T5-T6"
            },
            {
                id: "COMP401",
                codigo: "COMP401",
                disciplina: "Sistemas Distribuídos",
                turma: "A",
                curso: "EC",
                periodo: "4º Período",
                professor: "Glauber",
                alunos: 32,
                ambienteExigido: "Laboratório",
                sala: "Lab 01",
                dias: ["SEX"],
                slot: "M3-M4"
            },

            // Fila de Turmas Não Alocadas (3 turmas pendentes)
            {
                id: "COMP201",
                codigo: "COMP201",
                disciplina: "Algoritmos e ED",
                turma: "A",
                curso: "CC",
                periodo: "2º Período",
                professor: "Baldoino",
                alunos: 45,
                ambienteExigido: "Laboratório",
                sala: null,
                dias: [],
                slot: null
            },
            {
                id: "COMP304",
                codigo: "COMP304",
                disciplina: "Redes de Computadores",
                turma: "B",
                curso: "EC",
                periodo: "5º Período",
                professor: "Willy",
                alunos: 35,
                ambienteExigido: "Laboratório",
                sala: null,
                dias: [],
                slot: null
            },
            {
                id: "COMP101",
                codigo: "COMP101",
                disciplina: "Introdução à Computação",
                turma: "Única",
                curso: "CC",
                periodo: "1º Período",
                professor: "Marcio",
                alunos: 60,
                ambienteExigido: "Auditório",
                sala: null,
                dias: [],
                slot: null
            }
        ]
    };
    dados.turmas.forEach((turma) => {
        turma.encontrosSemanais = turma.dias.length || 2;
    });
    return dados;
}

/**
 * Motor de validação de restrições em tempo real
 * Retorna os problemas de uma turma específica e a lista consolidada de conflitos do semestre.
 */
function inspecionarTurma(state, turma) {
    if (!turma.sala || !turma.slot || !turma.dias || turma.dias.length === 0) {
        return {
            alocada: false,
            problemas: [],
            checks: [
                { ok: false, rotulo: "Sem sala e horário definidos" }
            ]
        };
    }

    const problemas = [];
    const espaco = state.espacos.find((e) => e.id === turma.sala);
    const prof = state.professores.find((p) => p.id === turma.professor);

    if (!prof || turma.dias.some((dia) => prof.disponibilidade[`${dia}:${turma.slot}`] === "indisponivel")) {
        problemas.push({ tipo: "docente", categoria: "Disponibilidade", resumoCurto: "Docente indisponível neste horário",
            detalhe: `${turma.professor} não está disponível em todos os encontros da turma.`, afetadas: [turma] });
    }
    if (!espaco || espaco.status !== "Disponível") {
        problemas.push({ tipo: "sala", categoria: "Espaço", resumoCurto: "Espaço indisponível",
            detalhe: `${turma.sala} está indisponível para alocação.`, afetadas: [turma] });
    }
    if (turma.encontrosSemanais && turma.dias.length !== turma.encontrosSemanais) {
        problemas.push({ tipo: "sala", categoria: "Encontros", resumoCurto: "Número de encontros incompleto",
            detalhe: `A turma exige ${turma.encontrosSemanais} encontros semanais.`, afetadas: [turma] });
    }

    // 1. Verificar choque de docente no mesmo dia/slot
    const choquesDocente = state.turmas.filter(
        (outra) =>
            outra.id !== turma.id &&
            outra.sala &&
            outra.slot === turma.slot &&
            outra.professor === turma.professor &&
            outra.dias.some((d) => turma.dias.includes(d))
    );

    if (choquesDocente.length > 0) {
        const codigos = choquesDocente.map((c) => `${c.codigo} (${c.disciplina})`).join(", ");
        problemas.push({
            tipo: "docente",
            categoria: "Professor",
            resumoCurto: `Professor duplicado em ${turma.dias.join("/")} ${turma.slot}`,
            detalhe: `${prof ? prof.curto : turma.professor} possui ${choquesDocente[0].codigo} no mesmo horário.`,
            afetadas: [turma, ...choquesDocente]
        });
    }

    // 2. Verificar choque de sala no mesmo dia/slot
    const choquesSala = state.turmas.filter(
        (outra) =>
            outra.id !== turma.id &&
            outra.sala === turma.sala &&
            outra.slot === turma.slot &&
            outra.dias.some((d) => turma.dias.includes(d))
    );

    if (choquesSala.length > 0) {
        problemas.push({
            tipo: "sala",
            categoria: "Sala",
            resumoCurto: `${turma.sala} ocupada por duas turmas em ${turma.slot}`,
            detalhe: `${turma.sala} já está atribuída a ${choquesSala[0].codigo} neste horário.`,
            afetadas: [turma, ...choquesSala]
        });
    }

    // 3. Verificar capacidade física
    if (espaco && turma.alunos > espaco.capacidade) {
        problemas.push({
            tipo: "capacidade",
            categoria: "Capacidade",
            resumoCurto: `Sala comporta ${espaco.capacidade} de ${turma.alunos} estudantes`,
            detalhe: `${espaco.nome}: ${espaco.capacidade} lugares · Turma: ${turma.alunos} estudantes.`,
            afetadas: [turma]
        });
    }

    // 4. Verificar tipo de ambiente (Laboratório exigido em sala sem PCs)
    if (espaco && turma.ambienteExigido === "Laboratório" && espaco.tipo !== "Laboratório") {
        problemas.push({
            tipo: "sala",
            categoria: "Ambiente",
            resumoCurto: `Exige laboratório, alocada em ${espaco.nome}`,
            detalhe: `A disciplina exige computadores, mas ${espaco.nome} é uma sala teórica sem PCs.`,
            afetadas: [turma]
        });
    }

    if (espaco && turma.ambienteExigido === "Auditório" && espaco.tipo !== "Auditório") {
        problemas.push({ tipo: "sala", categoria: "Ambiente", resumoCurto: "Exige auditório",
            detalhe: `${turma.codigo} exige auditório e está alocada em ${espaco.nome}.`, afetadas: [turma] });
    }

    const profOk = !problemas.some((p) => p.tipo === "docente");
    const ambOk = espaco && !problemas.some((p) => p.categoria === "Ambiente");
    const capOk = espaco && turma.alunos <= espaco.capacidade;

    return {
        alocada: true,
        problemas,
        checks: [
            { ok: profOk, rotulo: profOk ? "professor disponível" : "conflito de horário docente" },
            { ok: ambOk, rotulo: ambOk ? "ambiente compatível" : "ambiente incompatível" },
            { ok: capOk, rotulo: capOk ? "capacidade suficiente" : `capacidade insuficiente (${espaco ? espaco.capacidade : 0}/${turma.alunos})` }
        ]
    };
}

/**
 * Calcula a lista consolidada de conflitos para a Central de Conflitos (#tela-conflitos)
 */
function obterConflitosConsolidados(state) {
    const lista = [];
    const paresDocenteRegistrados = new Set();

    state.turmas.forEach((turma) => {
        const diag = inspecionarTurma(state, turma);
        if (!diag.alocada || diag.problemas.length === 0) return;

        // Evita duplicar o mesmo choque de professor para COMP203 e COMP402 na inbox
        const temChoqueDocente = diag.problemas.find((p) => p.tipo === "docente");
        if (temChoqueDocente) {
            const idsOrdenados = temChoqueDocente.afetadas.map((t) => t.id).sort().join("-");
            if (paresDocenteRegistrados.has(idsOrdenados) && diag.problemas.length === 1) {
                return;
            }
            paresDocenteRegistrados.add(idsOrdenados);
        }

        let alternativas = [];
        if (turma.id === "COMP203" || turma.id === "COMP402") {
            alternativas = [
                {
                    id: "alt-comp203-1",
                    descricao: "Mover COMP203 → Seg/Qua M3-M4 · Lab 01",
                    impacto: "Nenhum novo conflito · Atende 42 estudantes em laboratório de 45 lugares",
                    aplicar: (st) => {
                        const t = st.turmas.find((x) => x.id === "COMP203");
                        if (t) {
                            t.dias = ["SEG", "QUA"];
                            t.slot = "M3-M4";
                            t.sala = "Lab 01";
                        }
                    }
                },
                {
                    id: "alt-comp203-2",
                    descricao: "Mover COMP402 → Ter/Qui T1-T2 · Sala 102 e COMP203 → Lab 01",
                    impacto: "Nenhum novo conflito · Usa janela vespertina de Ranilson",
                    aplicar: (st) => {
                        const t203 = st.turmas.find((x) => x.id === "COMP203");
                        const t402 = st.turmas.find((x) => x.id === "COMP402");
                        if (t203) t203.sala = "Lab 01";
                        if (t402) {
                            t402.dias = ["TER", "QUI"];
                            t402.slot = "T1-T2";
                            t402.sala = "Sala 102";
                        }
                    }
                }
            ];
        } else if (turma.id === "COMP308") {
            alternativas = [
                {
                    id: "alt-comp308-1",
                    descricao: "Mover COMP308 → Qua/Sex T1-T2 · Lab 01",
                    impacto: "Nenhum novo conflito · Mantém horário e aloca em laboratório de 45 PCs",
                    aplicar: (st) => {
                        const t = st.turmas.find((x) => x.id === "COMP308");
                        if (t) {
                            t.sala = "Lab 01";
                        }
                    }
                },
                {
                    id: "alt-comp308-2",
                    descricao: "Mover COMP308 → Seg/Qua T3-T4 · Lab 01",
                    impacto: "Nenhum novo conflito · Libera T1-T2 vespertino",
                    aplicar: (st) => {
                        const t = st.turmas.find((x) => x.id === "COMP308");
                        if (t) {
                            t.dias = ["SEG", "QUA"];
                            t.slot = "T3-T4";
                            t.sala = "Lab 01";
                        }
                    }
                }
            ];
        } else {
            // Alternativa genérica caso o usuário crie um conflito manual movendo blocos
            alternativas = [
                {
                    id: `alt-gen-${turma.id}`,
                    descricao: `Mover ${turma.codigo} → Seg/Qua M5-M6 · ${turma.ambienteExigido === "Laboratório" ? "Lab 01" : "Sala 101"}`,
                    impacto: "Nenhum novo conflito",
                    aplicar: (st) => {
                        const t = st.turmas.find((x) => x.id === turma.id);
                        if (t) {
                            t.dias = ["SEG", "QUA"];
                            t.slot = "M5-M6";
                            t.sala = turma.ambienteExigido === "Laboratório" ? "Lab 01" : "Sala 101";
                        }
                    }
                }
            ];
        }

        alternativas = alternativas.filter((alt) => {
            const proposta = structuredClone(state);
            alt.aplicar(proposta);
            const alvo = proposta.turmas.find((t) => t.id === turma.id);
            return inspecionarTurma(proposta, alvo).problemas.length === 0;
        });
        if (alternativas.length === 0) {
            for (const slot of SLOTS_INSTITUCIONAIS) {
                for (const dia of DIAS_SEMANA) {
                    const teste = verificarViabilidadeSlot(state, turma, dia.id, slot.id);
                    if (!teste.valido || alternativas.length >= 3) continue;
                    if (alternativas.some((a) => a.id === `${slot.id}-${teste.dias.join('-')}`)) continue;
                    alternativas.push({
                        id: `${slot.id}-${teste.dias.join('-')}`,
                        descricao: `Mover ${turma.codigo} → ${teste.dias.join('/')} ${slot.id} · ${teste.salaSugerida}`,
                        impacto: "Docente, espaço e capacidade verificados",
                        aplicar: (st) => Object.assign(st.turmas.find((t) => t.id === turma.id), {
                            dias: [...teste.dias], slot: slot.id, sala: teste.salaSugerida
                        })
                    });
                }
            }
        }

        lista.push({
            id: `conf-${turma.id}`,
            turmaId: turma.id,
            codigo: turma.codigo,
            disciplina: turma.disciplina,
            problemas: diag.problemas,
            resumoPrincipal: diag.problemas[0].resumoCurto,
            tipos: diag.problemas.map((p) => p.tipo),
            alternativas
        });
    });

    return lista;
}

/**
 * Encontra uma sala compatível e livre para uma turma em determinado par de dias e slot
 */
function verificarViabilidadeSlot(state, turma, diaAlvo, slotId) {
    const encontros = turma.encontrosSemanais || turma.dias.length || 2;
    const parDias = encontros === 1 ? [diaAlvo] : (diaAlvo === "TER" || diaAlvo === "QUI")
        ? ["TER", "QUI"]
        : (diaAlvo === "SEX" ? ["QUA", "SEX"] : ["SEG", "QUA"]);

    const prof = state.professores.find((p) => p.id === turma.professor);
    for (const d of parDias) {
        if (prof && prof.disponibilidade[`${d}:${slotId}`] === "indisponivel") {
            return { valido: false, motivo: `${prof.curto} indisponível`, dias: parDias, salaSugerida: null };
        }
        const choqueProf = state.turmas.find(
            (t) => t.id !== turma.id && t.sala && t.professor === turma.professor && t.slot === slotId && t.dias.includes(d)
        );
        if (choqueProf) {
            return { valido: false, motivo: `Choque docente (${choqueProf.codigo})`, dias: parDias, salaSugerida: null };
        }
    }

    // Buscar espaço físico disponível e compatível
    const candidatos = state.espacos.filter((esp) => {
        if (esp.status !== "Disponível") return false;
        if (esp.capacidade < turma.alunos) return false;
        if (turma.ambienteExigido === "Laboratório" && esp.tipo !== "Laboratório") return false;
        if (turma.ambienteExigido === "Auditório" && esp.tipo !== "Auditório") return false;

        const ocupada = state.turmas.some(
            (t) => t.id !== turma.id && t.sala === esp.id && t.slot === slotId && t.dias.some((d) => parDias.includes(d))
        );
        return !ocupada;
    });

    if (candidatos.length === 0) {
        return { valido: false, motivo: "Sem sala compatível livre", dias: parDias, salaSugerida: null };
    }

    return {
        valido: true,
        motivo: `${candidatos[0].nome} livre`,
        dias: parDias,
        salaSugerida: candidatos[0].id
    };
}

/* Resolve somente pendências e alocações inválidas, preservando as demais. */
function gerarPropostaGrade(state, prioridade = "valida") {
    const proposta = structuredClone(state);
    proposta.publicada = false;
    const pendentes = proposta.turmas.filter((t) => {
        const diag = inspecionarTurma(proposta, t);
        return !diag.alocada || diag.problemas.length > 0;
    });
    pendentes.forEach((t) => Object.assign(t, { sala: null, slot: null, dias: [] }));
    pendentes.sort((a, b) => b.alunos - a.alunos);
    let tentativas = 0;
    let melhor = structuredClone(proposta);
    let maxAlocadas = proposta.turmas.filter((t) => t.sala).length;
    const limite = 10000;

    function candidatos(turma) {
        const prof = proposta.professores.find((p) => p.id === turma.professor);
        const pares = turma.encontrosSemanais === 1 ? DIAS_SEMANA.map((d) => [d.id]) :
            [["SEG", "QUA"], ["TER", "QUI"], ["QUA", "SEX"]];
        const lista = [];
        for (const dias of pares) for (const slot of SLOTS_INSTITUCIONAIS) for (const espaco of proposta.espacos) {
            if (espaco.status !== "Disponível") continue;
            const teste = { ...turma, dias, slot: slot.id, sala: espaco.id };
            if (inspecionarTurma(proposta, teste).problemas.length) continue;
            let peso = espaco.capacidade - turma.alunos;
            if (prioridade === "docentes") peso -= dias.filter((d) => prof?.disponibilidade[`${d}:${slot.id}`] === "preferencial").length * 100;
            if (prioridade === "janelas") {
                const pos = SLOTS_INSTITUCIONAIS.indexOf(slot);
                peso -= proposta.turmas.filter((t) => t.sala && t.professor === turma.professor &&
                    t.dias.some((d) => dias.includes(d)) &&
                    Math.abs(SLOTS_INSTITUCIONAIS.findIndex((s) => s.id === t.slot) - pos) === 1).length * 100;
            }
            lista.push({ dias, slot: slot.id, sala: espaco.id, peso });
        }
        return lista.sort((a, b) => a.peso - b.peso);
    }

    function buscar(indice) {
        const alocadas = proposta.turmas.filter((t) => t.sala).length;
        if (alocadas > maxAlocadas) { maxAlocadas = alocadas; melhor = structuredClone(proposta); }
        if (indice === pendentes.length) return true;
        if (tentativas >= limite) return false;
        const turma = pendentes[indice];
        for (const candidato of candidatos(turma)) {
            tentativas++;
            Object.assign(turma, { dias: [...candidato.dias], slot: candidato.slot, sala: candidato.sala });
            if (buscar(indice + 1)) return true;
            Object.assign(turma, { dias: [], slot: null, sala: null });
            if (tentativas >= limite) break;
        }
        return false;
    }
    const completa = buscar(0);
    const dados = completa ? proposta : melhor;
    return { dados, completa, tentativas, alocadas: dados.turmas.filter((t) => t.sala).length,
        conflitos: obterConflitosConsolidados(dados).length };
}

function calcularCargaDocente(state, id) {
    return state.turmas.filter((t) => t.professor === id)
        .reduce((total, t) => total + (t.encontrosSemanais || t.dias.length || 2) * 2, 0);
}

window.SATIC_DATA = {
    gerarPropostaGrade,
    calcularCargaDocente,
    SLOTS_INSTITUCIONAIS,
    DIAS_SEMANA,
    criarDadosIniciais,
    inspecionarTurma,
    obterConflitosConsolidados,
    verificarViabilidadeSlot
};

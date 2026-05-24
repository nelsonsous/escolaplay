// EscolaPlay — Modo Curso para a disciplina 'english_pm'.
// Define 14 lições agrupadas em 4 unidades, cada lição mapeia para IDs
// de exercícios existentes no pack english-pm (content_secret.js).
// Não interfere com nada no resto da app (anos 2/3/5/6/11).
// Só é usado quando a disciplina ativa é english_pm.

window.COURSE_ENGLISH_PM = {
    subjectKey: 'english_pm',
    title: 'English for PMs',
    units: [
        { id: 'U1', title: 'Foundations',           color: '#0891b2', icon: 'fa-seedling',    lessonIds: ['L1','L2','L3'] },
        { id: 'U2', title: 'Meeting English',       color: '#2563eb', icon: 'fa-users',       lessonIds: ['L4','L5','L6','L7'] },
        { id: 'U3', title: 'SAP / PM Vocabulary',   color: '#7c3aed', icon: 'fa-database',    lessonIds: ['L8','L9','L10','L11'] },
        { id: 'U4', title: 'Executive Communication', color: '#dc2626', icon: 'fa-crown',     lessonIds: ['L12','L13','L14'] },
        { id: 'U5', title: 'Conversação (roleplay)', color: '#0d9488', icon: 'fa-comments',  lessonIds: ['L15','L16','L17'] }
    ],
    lessons: [
        { id: 'L1',  title: 'Tempos verbais para status',
          subtitle: 'Past · Present continuous · Future',
          exerciseIds: ['epm_001','eng-pm-speak-001','epm_002','eng-pm-speak-002'] },
        { id: 'L2',  title: 'Condicionais e reported speech',
          subtitle: 'If… will · Said that…',
          exerciseIds: ['epm_003','eng-pm-speak-003','epm_004','eng-pm-speak-004'] },
        { id: 'L3',  title: 'Números, datas e dinheiro',
          subtitle: 'Speaking large numbers naturally',
          exerciseIds: ['epm_005','eng-pm-speak-005'] },

        { id: 'L4',  title: 'Abrir reuniões e interromper',
          subtitle: 'Agenda · Polite interruption',
          exerciseIds: ['epm_006','eng-pm-speak-006','epm_007','eng-pm-speak-007'] },
        { id: 'L5',  title: 'Esclarecer e resumir',
          subtitle: 'Ask for clarity · Summarize',
          exerciseIds: ['epm_008','eng-pm-speak-008','epm_009','eng-pm-speak-009'] },
        { id: 'L6',  title: 'Imprevistos e pushback',
          subtitle: 'Buy time · Diplomatic disagreement',
          exerciseIds: ['epm_010','eng-pm-speak-010','epm_011','eng-pm-speak-011'] },
        { id: 'L7',  title: 'Fechar reuniões e follow-up',
          subtitle: '3-asks pattern · Email tone',
          exerciseIds: ['epm_012','eng-pm-speak-012','epm_013','eng-pm-speak-013'] },

        { id: 'L8',  title: 'SAP lifecycle e carve-in',
          subtitle: 'Sandbox → PRD · M&A vocab',
          exerciseIds: ['epm_014','eng-pm-speak-014','epm_015','eng-pm-speak-015'] },
        { id: 'L9',  title: 'Cut-over e FICO',
          subtitle: 'Freeze period · GL/CO',
          exerciseIds: ['epm_016','eng-pm-speak-016','epm_017','eng-pm-speak-017'] },
        { id: 'L10', title: 'Governance e riscos',
          subtitle: 'Steering · RACI · Risk vs issue',
          exerciseIds: ['epm_018','eng-pm-speak-018','epm_019','eng-pm-speak-019'] },
        { id: 'L11', title: 'Status RAG e audit',
          subtitle: 'Amber/green · Audit trail',
          exerciseIds: ['epm_020','eng-pm-speak-020','epm_021','eng-pm-speak-021'] },

        { id: 'L12', title: 'Concise e call-outs',
          subtitle: 'Cut filler · Assign + deadline',
          exerciseIds: ['epm_022','eng-pm-speak-022','epm_023','eng-pm-speak-023'] },
        { id: 'L13', title: 'Pushback firme e más notícias',
          subtitle: 'Client · Slippage announcements',
          exerciseIds: ['epm_024','eng-pm-speak-024','epm_025','eng-pm-speak-025'] },
        { id: 'L14', title: 'Fechar forte · Storytelling · Cultura',
          subtitle: '3 asks · Narrative · DE/UK/PT styles',
          exerciseIds: ['epm_026','eng-pm-speak-026','epm_027','eng-pm-speak-027','epm_028','eng-pm-speak-028'] },

        { id: 'L15', title: 'Roleplay: pushback com a Karen',
          subtitle: 'Ela fala, tu respondes',
          exerciseIds: ['eng-pm-rp-001'] },
        { id: 'L16', title: 'Roleplay: status com o Ricardo',
          subtitle: 'Conversa de steering',
          exerciseIds: ['eng-pm-rp-002'] },
        { id: 'L17', title: 'Roleplay: más notícias à Irina',
          subtitle: 'Anunciar um atraso',
          exerciseIds: ['eng-pm-rp-003'] }
    ]
};

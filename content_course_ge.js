// EscolaPlay — Modo Curso para a disciplina 'english_ge'.
// Curso "Gold Experience A2" (Pearson, 2nd edition) — foco em TODA a gramática.
// Equivale ao 7.º/8.º ano, disponibilizado no perfil de ano 6 (Carolina).
// 12 lições em 4 unidades. Cada lição mapeia IDs de exercícios do pack
// english-ge (content_secret.js). Não interfere com 'ingles' nem 'english_pm'.

window.COURSE_ENGLISH_GE = {
    subjectKey: 'english_ge',
    title: 'Gold Experience A2',
    units: [
        { id: 'U1', title: 'Present tenses',        color: '#0891b2', icon: 'fa-seedling',   lessonIds: ['L1','L2','L3','L4'] },
        { id: 'U2', title: 'Describing & Past',     color: '#2563eb', icon: 'fa-clock-rotate-left', lessonIds: ['L5','L6'] },
        { id: 'U3', title: 'Future & Perfect',      color: '#7c3aed', icon: 'fa-rocket',      lessonIds: ['L7','L8'] },
        { id: 'U4', title: 'Modals & Revision',     color: '#dc2626', icon: 'fa-crown',       lessonIds: ['L9','L10','L11','L12'] }
    ],
    lessons: [
        { id: 'L1',  title: 'Starter — have got & possessives',
          subtitle: "have got · possessive 's · this/that/these/those",
          exerciseIds: ['ege_001','ege_002','ege_003','ege_004','ege_005'] },
        { id: 'L2',  title: 'Unit 1 — Present simple',
          subtitle: 'present simple · adverbs of frequency',
          exerciseIds: ['ege_006','ege_007','ege_008','ege_009','ege_010'] },
        { id: 'L3',  title: 'Unit 2 — Present continuous',
          subtitle: 'present continuous · simple vs continuous',
          exerciseIds: ['ege_011','ege_012','ege_013','ege_014','ege_015'] },
        { id: 'L4',  title: 'Unit 3 — Quantifiers',
          subtitle: 'countable/uncountable · some/any/much/many',
          exerciseIds: ['ege_016','ege_017','ege_018','ege_019','ege_020'] },

        { id: 'L5',  title: 'Unit 4 — Comparatives & superlatives',
          subtitle: 'bigger · the biggest · more/most',
          exerciseIds: ['ege_021','ege_022','ege_023','ege_024','ege_025'] },
        { id: 'L6',  title: 'Unit 5 — Past simple & continuous',
          subtitle: 'past simple · past continuous + simple',
          exerciseIds: ['ege_026','ege_027','ege_028','ege_029','ege_030'] },

        { id: 'L7',  title: 'Unit 6 — The future',
          subtitle: 'be going to · will · present continuous',
          exerciseIds: ['ege_031','ege_032','ege_033','ege_034','ege_035'] },
        { id: 'L8',  title: 'Unit 7 — Present perfect',
          subtitle: 'have/has + p.p. · ever/never · just/already/yet',
          exerciseIds: ['ege_036','ege_037','ege_038','ege_039','ege_040'] },

        { id: 'L9',  title: 'Unit 8 — Modal verbs',
          subtitle: 'can/could · must/mustn’t · have to',
          exerciseIds: ['ege_041','ege_042','ege_043','ege_044'] },
        { id: 'L10', title: 'Unit 9 — First conditional & should',
          subtitle: 'if + present, will… · advice: should',
          exerciseIds: ['ege_045','ege_046','ege_047','ege_048'] },
        { id: 'L11', title: 'Unit 10 — Perfect vs past',
          subtitle: 'present perfect vs past simple · since/for',
          exerciseIds: ['ege_049','ege_050','ege_051','ege_052'] },
        { id: 'L12', title: '⭐ Teste final do ano',
          subtitle: 'Revisão de toda a gramática (8 perguntas)',
          exerciseIds: ['ege_t01','ege_t02','ege_t03','ege_t04','ege_t05','ege_t06','ege_t07','ege_t08'] }
    ]
};

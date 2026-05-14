// ========== EscolaPlay ==========
// State + gamificação + exercícios + testes + prémios

const STORAGE_KEY = 'escolaplay_v2';
const AVATARS = ['\u{1F98A}','\u{1F43B}','\u{1F981}','\u{1F436}','\u{1F43C}','\u{1F42F}','\u{1F43A}','\u{1F42D}','\u{1F427}','\u{1F989}','\u{1F984}','\u{1F409}'];
const LEVELS = [
    { min:    0, name: 'Aprendiz' },
    { min:  500, name: 'Aventureiro' },
    { min: 1500, name: 'Explorador' },
    { min: 3000, name: 'Cavaleiro' },
    { min: 5000, name: 'Mestre' },
    { min: 8000, name: 'Sábio' },
    { min:12000, name: 'Lenda' }
];
const XP_BY_DIFF = { 1: 10, 2: 20, 3: 30 };
const DAILY_QUESTIONS = 5;      // 1 por disciplina (temos 5)
const PRACTICE_QUESTIONS = 6;

const DEFAULT_REWARDS = [
    { id: 'r1', name: 'Escolher a sobremesa', cost: 2000, claimed: false },
    { id: 'r2', name: '30 min extra de ecrã', cost: 5000, claimed: false },
    { id: 'r3', name: 'Ir comer um gelado', cost: 10000, claimed: false },
    { id: 'r4', name: 'Passeio ao parque com os pais', cost: 16000, claimed: false },
    { id: 'r5', name: 'Ver um filme em família', cost: 24000, claimed: false },
    { id: 'r6', name: 'Escolher o próximo passeio de fim de semana', cost: 35000, claimed: false }
];
const REWARD_PRESETS = {
    facil:   [1000,  2500,  5000,  8000,  12000, 18000],
    normal:  [2000,  5000,  10000, 16000, 24000, 35000],
    dificil: [4000,  10000, 20000, 32000, 48000, 70000]
};

const BADGES = [
    { id:'first',       icon:'\u{1F331}', name:'Primeiros Passos',  desc:'1 resposta certa',      check:(s)=> totalCorrect(s) >= 1 },
    { id:'daily_first', icon:'\u26A1',    name:'Primeiro Desafio',  desc:'1 desafio diário feito',check:(s)=> s.totalDailies >= 1 },
    { id:'streak3',     icon:'\u{1F525}', name:'Em Chamas',         desc:'3 dias seguidos',       check:(s)=> s.streak.days >= 3 },
    { id:'streak7',     icon:'\u{1F3C6}', name:'Semana Perfeita',   desc:'7 dias seguidos',       check:(s)=> s.streak.days >= 7 },
    { id:'correct50',   icon:'\u{1F3AF}', name:'Bom de Mira',       desc:'50 respostas certas',   check:(s)=> totalCorrect(s) >= 50 },
    { id:'correct200',  icon:'\u{1F31F}', name:'Super Estrela',     desc:'200 respostas certas',  check:(s)=> totalCorrect(s) >= 200 },
    { id:'xp1000',      icon:'\u26A1',    name:'1000 XP',           desc:'1000 XP acumulados',    check:(s)=> s.xp >= 1000 },
    { id:'xp5000',      icon:'\u{1F4AB}', name:'5000 XP',           desc:'5000 XP acumulados',    check:(s)=> s.xp >= 5000 },
    { id:'allsubjects', icon:'\u{1F393}', name:'Versátil',          desc:'1+ em todas as disciplinas', check:(s)=> Object.keys(SUBJECTS).every(k => (s.subjects[k]?.correct||0) >= 1) },
    { id:'perfect',     icon:'\u{1F4AF}', name:'Perfeitinho',       desc:'Desafio diário 5/5',    check:(s)=> s.perfectDailies >= 1 },
    { id:'sub_por',     icon:'\u{1F4D6}', name:'Letrado',           desc:'20 certas em Português',check:(s)=> (s.subjects.portugues?.correct||0) >= 20 },
    { id:'sub_mat',     icon:'\u{1F9EE}', name:'Calculista',        desc:'20 certas em Matemática',check:(s)=> (s.subjects.matematica?.correct||0) >= 20 }
];

// ========== STATE ==========
// Inicializado no DOMContentLoaded (depois de PROFILE_FIELDS, AVATARS, etc. estarem prontos).
let state;
let currentSession = null;
let selectedAnswer = null;
let matchSelection = { left: null };
let pendingTestId = null;      // teste a editar
let pendingRewardId = null;    // prémio desbloqueado a mostrar
let currentSubjectView = null; // disciplina visível no modal de detalhes

// ----- Perfis multi-aluno -----
// Estrutura nova:
// state = { profiles: [profile,...], activeProfileId, max:{apiKey,enabled,...} }
// Cada profile tem o seu xp, streak, subjects, badges, etc.
// Para minimizar mudanças, instalamos um Proxy: state.xp, state.subjects... lê/escreve do perfil activo.
const PROFILE_FIELDS = ['profile','xp','streak','daily','subjects','badges','history','totalDailies','perfectDailies','recentIds','exerciseSeen','tests','rewards','progress','maxExercises','maxLessons','lastGuiltDate','notifEnabled'];

function newProfile({ name = 'Aluno(a)', avatar = AVATARS[0], year } = {}) {
    if (!year || !SUBJECTS_BY_YEAR[year]) {
        year = parseInt(Object.keys(SUBJECTS_BY_YEAR)[0]);
    }
    const subs = SUBJECTS_BY_YEAR[year];
    const curr = CURRICULUM_BY_YEAR[year];
    const subStats = {};
    Object.keys(subs).forEach(k => { subStats[k] = { answered: 0, correct: 0, xp: 0 }; });
    const prog = {};
    Object.keys(curr).forEach(k => { prog[k] = { toIndex: curr[k].length }; });
    return {
        id: 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2,5),
        name, avatar, year, currentPeriod: 1,
        xp: 0,
        streak: { days: 0, lastDate: null, best: 0 },
        daily: { date: null, completed: false, correct: 0 },
        subjects: subStats,
        badges: [],
        history: [],
        totalDailies: 0,
        perfectDailies: 0,
        recentIds: [],
        exerciseSeen: {},
        tests: [],
        rewards: JSON.parse(JSON.stringify(DEFAULT_REWARDS)),
        progress: prog,
        maxExercises: [],
        maxLessons: {}
    };
}

function defaultState() {
    return {
        profiles: [],
        activeProfileId: null,
        max: { enabled: true, apiKey: '', mistralKey: '', preferredProvider: 'mistral', totalGenerated: 0, totalRequests: 0 }
    };
}

// v94: Mistral passou a ser o default (gera exercícios mais coerentes que o
// Groq). Quem tinha 'groq' guardado por causa do default antigo é migrado
// para 'mistral' uma única vez. Marca _prefMigratedV94 para não repetir —
// se o utilizador escolher groq de propósito após a migração, fica.
function _migrateMaxPreferred(max) {
    if (max._prefMigratedV94) return;
    if (max.preferredProvider === 'groq') max.preferredProvider = 'mistral';
    max._prefMigratedV94 = true;
}

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return installStateProxy(defaultState());
        const parsed = JSON.parse(raw);

        // Migração: estado antigo (single-profile) → embrulhar como perfil único.
        // O ano antes rotulado como 6.º era, na verdade, conteúdo de 5.º ano.
        if (!Array.isArray(parsed.profiles)) {
            const oldP = newProfile({
                name: parsed.profile?.name || 'Carolina',
                avatar: parsed.profile?.avatar || AVATARS[0],
                year: 5
            });
            // copiar campos do estado antigo
            ['xp','totalDailies','perfectDailies'].forEach(k => { if (parsed[k] != null) oldP[k] = parsed[k]; });
            if (parsed.streak)   oldP.streak   = { ...oldP.streak, ...parsed.streak };
            if (parsed.daily)    oldP.daily    = { ...oldP.daily, ...parsed.daily };
            if (parsed.subjects) oldP.subjects = { ...oldP.subjects, ...parsed.subjects };
            if (parsed.progress) oldP.progress = { ...oldP.progress, ...parsed.progress };
            if (Array.isArray(parsed.badges))       oldP.badges = parsed.badges;
            if (Array.isArray(parsed.history))      oldP.history = parsed.history;
            if (Array.isArray(parsed.recentIds))    oldP.recentIds = parsed.recentIds;
            if (Array.isArray(parsed.tests))        oldP.tests = parsed.tests;
            if (Array.isArray(parsed.rewards) && parsed.rewards.length) oldP.rewards = parsed.rewards;
            if (Array.isArray(parsed.maxExercises)) oldP.maxExercises = parsed.maxExercises;
            if (parsed.maxLessons && typeof parsed.maxLessons === 'object') oldP.maxLessons = parsed.maxLessons;
            const s = {
                profiles: [oldP],
                activeProfileId: oldP.id,
                max: { enabled: true, apiKey: '', mistralKey: '', preferredProvider: 'mistral', totalGenerated: 0, totalRequests: 0, ...(parsed.max || {}) }
            };
            if (!s.max.enabled) s.max.enabled = true;
            _migrateMaxPreferred(s.max);
            return installStateProxy(s);
        }

        // Estado novo já tem profiles[] (pode estar vazio até o utilizador criar o primeiro perfil)
        const s = {
            profiles: parsed.profiles.map(p => {
                const yr = SUBJECTS_BY_YEAR[p.year] ? p.year : (parseInt(Object.keys(SUBJECTS_BY_YEAR)[0]) || 2);
                return { ...newProfile({ year: yr }), ...p, year: yr };
            }),
            activeProfileId: parsed.activeProfileId,
            max: { enabled: true, apiKey: '', mistralKey: '', preferredProvider: 'mistral', totalGenerated: 0, totalRequests: 0, ...(parsed.max || {}) }
        };
        if (!s.max.enabled) s.max.enabled = true;
        _migrateMaxPreferred(s.max);
        // Garantir que cada perfil tem toIndex para todas as disciplinas do seu ano
        s.profiles.forEach(p => {
            const curr = CURRICULUM_BY_YEAR[p.year];
            if (curr) Object.keys(curr).forEach(k => {
                if (!p.progress[k]) p.progress[k] = { toIndex: curr[k].length };
            });
            const subs = SUBJECTS_BY_YEAR[p.year];
            if (subs) Object.keys(subs).forEach(k => {
                if (!p.subjects[k]) p.subjects[k] = { answered: 0, correct: 0, xp: 0 };
            });
            if (p.currentPeriod == null) p.currentPeriod = 1;
            // Migração: limpar BR-PT e SVGs triviais nos exercícios MAX já guardados
            if (Array.isArray(p.maxExercises)) {
                p.maxExercises.forEach(migrateMaxExercise);
            }
            // Migração: garantir exerciseSeen e popular a partir do history (uma vez)
            if (!p.exerciseSeen || typeof p.exerciseSeen !== 'object') {
                p.exerciseSeen = {};
            }
            if (Object.keys(p.exerciseSeen).length === 0 && Array.isArray(p.history) && p.history.length > 0) {
                // Reconstrói timestamps a partir do histórico (data → ms)
                p.history.forEach((h, idx) => {
                    if (h && h.id && h.d) {
                        const ts = new Date(h.d).getTime();
                        if (Number.isFinite(ts)) {
                            // Spread fictício de timestamps para preservar ordem dentro do mesmo dia
                            const t = ts + idx;
                            p.exerciseSeen[h.id] = Math.max(p.exerciseSeen[h.id] || 0, t);
                        }
                    }
                });
            }
        });
        if (s.profiles.length === 0) {
            s.activeProfileId = null;
        } else if (!s.profiles.find(p => p.id === s.activeProfileId)) {
            s.activeProfileId = s.profiles[0].id;
        }
        return installStateProxy(s);
    } catch(e) {
        console.error('loadState', e);
        return installStateProxy(defaultState());
    }
}

function installStateProxy(s) {
    PROFILE_FIELDS.forEach(prop => {
        Object.defineProperty(s, prop, {
            configurable: true,
            enumerable: false,
            get() {
                const p = s.profiles.find(x => x.id === s.activeProfileId);
                if (!p) return undefined;
                return prop === 'profile' ? p : p[prop];
            },
            set(v) {
                const p = s.profiles.find(x => x.id === s.activeProfileId);
                if (!p) return;
                if (prop === 'profile') Object.assign(p, v);
                else p[prop] = v;
            }
        });
    });
    return s;
}

function activeProfile() {
    return state.profiles.find(p => p.id === state.activeProfileId) || state.profiles[0];
}

// ========== Normalização BR-PT → PT-PT ==========
// Aplica-se a strings em q/exp/opts/passage de exercícios MAX gerados pela IA
// (Groq llama às vezes introduz palavras brasileiras apesar da instrução).
const _BR_TO_PT_MAP = [
    [/\bgols\b/g, 'golos'], [/\bgol\b/g, 'golo'],
    [/\bUm time\b/g, 'Uma equipa'], [/\bum time\b/g, 'uma equipa'],
    [/\bO time\b/g, 'A equipa'], [/\bo time\b/g, 'a equipa'],
    [/\btime de futebol\b/g, 'equipa de futebol'], [/\btimes de futebol\b/g, 'equipas de futebol'],
    [/\beconomizando\b/g, 'a poupar'], [/\beconomizar\b/g, 'poupar'],
    [/\beconomiza\b/g, 'poupa'], [/\beconomizou\b/g, 'poupou'],
    [/\bestá ([a-záéíóúâêôãõç]+)ndo\b/g, (m, v) => `está a ${v}r`],
    [/\bestão ([a-záéíóúâêôãõç]+)ndo\b/g, (m, v) => `estão a ${v}r`],
    [/\bestava ([a-záéíóúâêôãõç]+)ndo\b/g, (m, v) => `estava a ${v}r`],
    [/\btrem\b/g, 'comboio'], [/\bônibus\b/g, 'autocarro'],
    [/\bcelular\b/g, 'telemóvel'], [/\bgeladeira\b/g, 'frigorífico'],
    [/\babacaxi\b/g, 'ananás'], [/\bsorvete\b/g, 'gelado'],
    [/\besporte\b/g, 'desporto'], [/\besportiv/g, 'desportiv'],
    [/\bgaroto\b/g, 'rapaz'], [/\bgarota\b/g, 'rapariga'], [/\bmamãe\b/g, 'mãe'], [/\bpapai\b/g, 'pai'],
    [/\bcafé da manhã\b/g, 'pequeno-almoço']
];
function brToPt(s) {
    if (typeof s !== 'string') return s;
    let out = s;
    _BR_TO_PT_MAP.forEach(([re, rep]) => { out = out.replace(re, rep); });
    return out;
}
function _isTrivialSvg(svg) {
    if (typeof svg !== 'string' || svg.length < 30) return true;
    const tags = (svg.match(/<(rect|circle|line|polygon|polyline|path|text|g)\b/gi) || []).length;
    return tags < 2;
}
// SVG com muito texto longo cabe mal no viewBox 220x160 (o texto não quebra
// linha e é cortado à direita). Para análise gramatical/sintáctica, a IA
// devia usar <table> ou texto simples — não SVG. Descartamos estes.
function _isTextHeavySvg(svg) {
    if (typeof svg !== 'string') return false;
    const texts = svg.match(/<text\b[^>]*>([\s\S]*?)<\/text>/gi) || [];
    if (texts.length === 0) return false;
    const shapes = (svg.match(/<(rect|circle|line|polygon|polyline|path|ellipse)\b/gi) || []).length;
    // Se há mais texts do que formas E pelo menos um texto longo (>30 chars)
    const longText = texts.some(t => {
        const inner = t.replace(/<[^>]+>/g, '').trim();
        return inner.length > 30;
    });
    return texts.length > shapes && longText;
}
function migrateMaxExercise(e) {
    if (!e) return e;
    if (typeof e.q === 'string') e.q = brToPt(e.q);
    if (typeof e.exp === 'string') e.exp = brToPt(e.exp);
    if (typeof e.passage === 'string') e.passage = brToPt(e.passage);
    if (typeof e.material === 'string') e.material = brToPt(e.material);
    if (typeof e.solution === 'string') e.solution = brToPt(e.solution);
    if (Array.isArray(e.opts)) e.opts = e.opts.map(o => typeof o === 'string' ? brToPt(o) : o);
    if (Array.isArray(e.ans)) e.ans = e.ans.map(a => typeof a === 'string' ? brToPt(a) : a);
    if (e.svg && (_isTrivialSvg(e.svg) || _isTextHeavySvg(e.svg))) delete e.svg;
    return e;
}

// ========== Lazy-load do banco extra por ano ==========
// Os ficheiros content_<year>_*.js só são descarregados quando o utilizador
// activa um perfil desse ano. Cada ano tem múltiplos ficheiros (um por
// disciplina) carregados em paralelo. Cache por ano: cada conjunto carrega
// no máximo uma vez por sessão.
const YEAR_EXTRA_FILES = {
    2: [
        { src: 'content_2_extra.js',    varName: 'EXERCISES_2_EXTRA' },
        { src: 'content_2_p_extra2.js', varName: 'EXERCISES_2_P_EXTRA2' },
        { src: 'content_2_p_extra3.js', varName: 'EXERCISES_2_P_EXTRA3' },
        { src: 'content_2_m_extra2.js', varName: 'EXERCISES_2_M_EXTRA2' },
        { src: 'content_2_m_extra3.js', varName: 'EXERCISES_2_M_EXTRA3' },
        { src: 'content_2_e_extra2.js', varName: 'EXERCISES_2_E_EXTRA2' },
        { src: 'content_2_e_extra3.js', varName: 'EXERCISES_2_E_EXTRA3' },
        { src: 'content_2_e_extra4.js', varName: 'EXERCISES_2_E_EXTRA4' },
        { src: 'content_2_i_extra2.js', varName: 'EXERCISES_2_I_EXTRA2' },
        { src: 'content_2_i_extra3.js', varName: 'EXERCISES_2_I_EXTRA3' }
    ],
    3: [
        { src: 'content_3_p_extra.js', varName: 'EXERCISES_3_P_EXTRA' },
        { src: 'content_3_m_extra.js', varName: 'EXERCISES_3_M_EXTRA' },
        { src: 'content_3_e_extra.js', varName: 'EXERCISES_3_E_EXTRA' },
        { src: 'content_3_i_extra.js', varName: 'EXERCISES_3_I_EXTRA' }
    ],
    5: [
        { src: 'content_5_p_extra.js', varName: 'EXERCISES_5_P_EXTRA' },
        { src: 'content_5_m_extra.js', varName: 'EXERCISES_5_M_EXTRA' },
        { src: 'content_5_i_extra.js', varName: 'EXERCISES_5_I_EXTRA' },
        { src: 'content_5_c_extra.js', varName: 'EXERCISES_5_C_EXTRA' },
        { src: 'content_5_h_extra.js', varName: 'EXERCISES_5_H_EXTRA' }
    ],
    6: [
        { src: 'content_6_p_extra.js',  varName: 'EXERCISES_6_P_EXTRA' },
        { src: 'content_6_p_extra2.js', varName: 'EXERCISES_6_P_EXTRA2' },
        { src: 'content_6_m_extra.js',  varName: 'EXERCISES_6_M_EXTRA' },
        { src: 'content_6_m_extra2.js', varName: 'EXERCISES_6_M_EXTRA2' },
        { src: 'content_6_i_extra.js',  varName: 'EXERCISES_6_I_EXTRA' },
        { src: 'content_6_c_extra.js',  varName: 'EXERCISES_6_C_EXTRA' },
        { src: 'content_6_c_extra2.js', varName: 'EXERCISES_6_C_EXTRA2' },
        { src: 'content_6_h_extra.js',  varName: 'EXERCISES_6_H_EXTRA' },
        { src: 'content_6_h_extra2.js', varName: 'EXERCISES_6_H_EXTRA2' }
    ],
    11: [
        { src: 'content_11_q_extra.js', varName: 'EXERCISES_11_Q_EXTRA' }
    ]
};

const _yearExtrasLoaded = {};
const APP_VERSION = 'v193';
// NOTA: a partir da v148, todos os ficheiros _extra*.js são carregados
// SÍNCRONAMENTE via <script> no index.html. Eliminada a função
// _loadExtraScript e toda a categoria de bugs "tópicos com 0 exs"
// causada por race conditions / falhas silenciosas no lazy-load.

// Normaliza exercícios para garantir que o schema é consistente, mesmo
// quando os ficheiros gerados têm pequenos desvios (ans:string em problem,
// order sem items, etc.). Sem isto, submitAnswer/renderQuestion crasham.
function _sanitizeExercise(e) {
    if (!e || !e.type) return null;
    // Alguns geradores marcaram exercícios mc como 'problem' (têm opts + ans numérico).
    // Converter para mc, senão submitAnswer trata o índice como texto e falha sempre.
    if (e.type === 'problem' && Array.isArray(e.opts) && typeof e.ans === 'number'
        && e.ans >= 0 && e.ans < e.opts.length) {
        e.type = 'mc';
    }
    if (e.type === 'fill' || e.type === 'problem' || e.type === 'passage') {
        if (typeof e.ans === 'string' || typeof e.ans === 'number') e.ans = [String(e.ans)];
        else if (!Array.isArray(e.ans)) e.ans = [];
    }
    if (e.type === 'order') {
        if (!Array.isArray(e.items)) {
            if (Array.isArray(e.opts)) e.items = e.opts.slice();
            else return null;
        }
    }
    if (e.type === 'match' && !Array.isArray(e.pairs)) return null;
    if (e.type === 'mc') {
        if (!Array.isArray(e.opts) || e.opts.length < 2) return null;
        if (typeof e.ans !== 'number' || e.ans < 0 || e.ans >= e.opts.length) return null;
    }
    if (e.type === 'tf' && typeof e.ans !== 'boolean') return null;
    return e;
}

// loadYearExtras: agora SÍNCRONO. Concatena os arrays globais já
// carregados pelo index.html no EXERCISES_BY_YEAR. Devolve uma Promise
// resolvida para manter compatibilidade com chamadas existentes que
// fazem `.then()` ou `.finally()`.
function loadYearExtras(year) {
    if (!year) return Promise.resolve(0);
    if (_yearExtrasLoaded[year]) return _yearExtrasLoaded[year];
    const files = YEAR_EXTRA_FILES[year] || [];
    const base = window.EXERCISES_BY_YEAR && window.EXERCISES_BY_YEAR[year];
    if (!Array.isArray(base) || files.length === 0) {
        _yearExtrasLoaded[year] = Promise.resolve(0);
        return _yearExtrasLoaded[year];
    }
    const existing = new Set(base.map(e => e && e.id));
    let added = 0;
    const empties = [];
    for (const f of files) {
        const arr = window[f.varName];
        if (!Array.isArray(arr) || arr.length === 0) {
            empties.push(f.src);
            continue;
        }
        for (const raw of arr) {
            const e = _sanitizeExercise(raw);
            if (e && e.id && !existing.has(e.id)) {
                base.push(e);
                existing.add(e.id);
                added++;
            }
        }
    }
    if (window.activeYear === year) window.EXERCISES = base;
    console.log('[escolaplay] ano ' + year + ': +' + added + ' exs (de ' +
        (files.length - empties.length) + '/' + files.length + ' bancos)' +
        (empties.length ? ' — em falta: ' + empties.join(', ') : ''));
    _yearExtrasLoaded[year] = Promise.resolve(added);
    return _yearExtrasLoaded[year];
}

function saveState() {
    // Serializar apenas { profiles, activeProfileId, max } — os getters não são enumeráveis
    const payload = { profiles: state.profiles, activeProfileId: state.activeProfileId, max: state.max };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function switchProfile(id) {
    const p = state.profiles.find(x => x.id === id);
    if (!p) return;
    state.activeProfileId = id;
    setActiveYear(p.year);
    loadYearExtras(p.year); // síncrono desde v148
    selectedTopicsForMax.clear();
    saveState();
    closeProfileSwitcher();
    updateAll();
    switchTab('home');
}

function addProfileFromForm() {
    const nameEl = document.getElementById('new-profile-name');
    const yearEl = document.querySelector('input[name="new-profile-year"]:checked');
    const avEl   = document.querySelector('#new-profile-avatars .avatar-option.selected');
    const name = (nameEl?.value || '').trim();
    if (!name) { showToast('Escreve um nome'); return; }
    const fallbackYear = (window.YEARS_AVAILABLE && window.YEARS_AVAILABLE[0]?.year) || 2;
    const year = parseInt(yearEl?.value || String(fallbackYear));
    const avatar = avEl?.dataset.avatar || AVATARS[Math.floor(Math.random()*AVATARS.length)];
    const p = newProfile({ name, avatar, year });
    state.profiles.push(p);
    state.activeProfileId = p.id;
    setActiveYear(p.year);
    loadYearExtras(p.year); // síncrono desde v148
    selectedTopicsForMax.clear();
    saveState();
    closeAddProfileModal();
    updateAll();
    switchTab('home');
    showToast(`Perfil ${name} criado!`);
}

function removeProfile(id) {
    const p = state.profiles.find(x => x.id === id);
    if (!p) return;
    if (!confirm(`Apagar o perfil de ${p.name}? Todo o progresso será perdido.`)) return;
    state.profiles = state.profiles.filter(x => x.id !== id);
    if (state.profiles.length === 0) {
        state.activeProfileId = null;
    } else if (state.activeProfileId === id) {
        state.activeProfileId = state.profiles[0].id;
        setActiveYear(state.profiles[0].year);
        loadYearExtras(state.profiles[0].year);
    }
    saveState();
    renderProfile();
    updateAll();
}

function totalCorrect(s) { return Object.values(s.subjects).reduce((a,b)=>a+(b.correct||0),0); }

// ========== UTILIDADES ==========
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function daysBetween(a, b) {
    if (!a || !b) return 999;
    const da = new Date(a + 'T00:00:00');
    const db = new Date(b + 'T00:00:00');
    return Math.round((db - da) / 86400000);
}
function formatDatePT(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
}
function normalize(s) {
    return String(s).trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ');
}
function activeTopicsFor(subjectKey) {
    const topics = CURRICULUM[subjectKey] || [];
    const to = state.progress[subjectKey]?.toIndex ?? topics.length;
    return new Set(topics.slice(0, to));
}

// ========== LEVEL/XP ==========
function levelInfo(xp) {
    let idx = 0;
    for (let i = LEVELS.length - 1; i >= 0; i--) { if (xp >= LEVELS[i].min) { idx = i; break; } }
    const current = LEVELS[idx];
    const next = LEVELS[idx+1];
    const base = current.min;
    const nextMin = next ? next.min : base + 5000;
    return { idx, name: current.name, number: idx+1, into: xp - base, span: nextMin - base, next: next?.name || null };
}

// ========== HEADER ==========
function updateHeader() {
    const lvl = levelInfo(state.xp);
    const p = activeProfile();
    document.getElementById('avatar').textContent = state.profile.avatar;
    document.getElementById('user-name').textContent = state.profile.name;
    document.getElementById('level-name').textContent = lvl.name;
    document.getElementById('streak-days').textContent = state.streak.days;
    _updateStreakChipVisuals();
    document.getElementById('xp-total').textContent = state.xp;
    document.getElementById('xp-into-level').textContent = lvl.into;
    document.getElementById('xp-next-level').textContent = lvl.span;
    const pct = Math.min(100, Math.round(lvl.into / lvl.span * 100));
    document.getElementById('xp-bar-fill').style.width = pct + '%';
    // Ano + indicador de troca
    const yearEl = document.getElementById('header-year');
    if (yearEl && p) {
        const cnt = state.profiles.length;
        yearEl.innerHTML = `${p.year}.º ano${cnt > 1 ? ' <i class="fas fa-chevron-down" style="font-size:0.6rem;opacity:0.6"></i>' : ''}`;
    }
}

// Tier visual + emoji do streak conforme dias seguidos
function _streakEmojiFor(days) {
    if (days >= 30) return '👑';
    if (days >= 14) return '⭐';
    if (days >= 7)  return '🏆';
    return '🔥'; // sempre chama, mesmo a 0 (vai aparecer cinzenta via CSS .zero)
}
function _streakTier(days) {
    if (days >= 30) return { tier: 4, emoji: '👑' };
    if (days >= 14) return { tier: 4, emoji: '⭐' };
    if (days >= 7)  return { tier: 3, emoji: '🏆' };
    if (days >= 3)  return { tier: 2, emoji: '🔥' };
    if (days >= 1)  return { tier: 1, emoji: '🔥' };
    return { tier: 0, emoji: '🔥' };
}
function _updateStreakChipVisuals() {
    const days = state.streak.days || 0;
    const { tier, emoji } = _streakTier(days);
    document.querySelectorAll('.chip-streak').forEach(chip => {
        chip.classList.remove('tier-1','tier-2','tier-3','tier-4','active','zero');
        if (tier > 0) chip.classList.add('tier-' + tier);
        else chip.classList.add('zero');
        if (days >= 3) chip.classList.add('active');
        const em = chip.querySelector('.streak-emoji');
        if (em) em.textContent = emoji;
        // tooltip dinâmico
        const next = days < 3 ? 3 : days < 7 ? 7 : days < 14 ? 14 : days < 30 ? 30 : null;
        const tip = next ? `${days} dias seguidos! Faltam ${next-days} para ${_streakTier(next).emoji}` : `${days} dias seguidos! 👑 Lendário!`;
        chip.title = tip;
    });
}

// Anima o chip quando o streak acabou de aumentar
function _flashStreakChip() {
    document.querySelectorAll('.chip-streak').forEach(chip => {
        chip.classList.remove('just-up');
        // Force reflow para reiniciar animação
        void chip.offsetWidth;
        chip.classList.add('just-up');
        setTimeout(() => chip.classList.remove('just-up'), 900);
    });
}

// ========== HOME ==========
function renderHome() {
    const days = state.streak.days || 0;
    const { tier, emoji } = _streakTier(days);
    // Mini-card antigo (já não está no HTML, mas mantemos null-safe caso reapareça)
    const miniStreak = document.getElementById('mini-streak');
    if (miniStreak) miniStreak.textContent = days;
    const miniEmoji = document.getElementById('mini-streak-emoji');
    if (miniEmoji) miniEmoji.textContent = emoji;
    const miniCard = document.getElementById('mini-card-streak');
    if (miniCard) {
        miniCard.classList.remove('tier-1','tier-2','tier-3','tier-4');
        if (tier > 0) miniCard.classList.add('tier-' + tier);
    }
    const miniLabel = document.getElementById('mini-streak-label');
    if (miniLabel) {
        if (days === 0) miniLabel.textContent = 'começa hoje!';
        else if (days === 1) miniLabel.textContent = 'dia (continua amanhã!)';
        else miniLabel.textContent = 'dias seguidos';
    }
    // === Streak HERO (estilo Duolingo) ===
    const hero = document.getElementById('streak-hero');
    if (hero) {
        hero.classList.remove('tier-1','tier-2','tier-3','tier-4','zero');
        if (tier > 0) hero.classList.add('tier-' + tier);
        if (days === 0) hero.classList.add('zero');
        const heroEmoji = document.getElementById('streak-hero-emoji');
        const heroNum = document.getElementById('streak-hero-number');
        const heroTitle = document.getElementById('streak-hero-title');
        const heroSub = document.getElementById('streak-hero-sub');
        if (heroEmoji) heroEmoji.textContent = emoji;
        if (heroNum) heroNum.textContent = days;
        if (heroTitle) heroTitle.textContent = days === 1 ? 'dia de ofensiva' : 'dias de ofensiva';
        if (heroSub) {
            if (days === 0) heroSub.textContent = 'Faz um teste hoje! 💪';
            else if (days < 3) heroSub.textContent = 'Volta amanhã para manter a chama 🔥';
            else if (days < 7) heroSub.textContent = `Faltam ${7-days} para o troféu 🏆`;
            else if (days < 14) heroSub.textContent = `Faltam ${14-days} para a estrela ⭐`;
            else if (days < 30) heroSub.textContent = `Faltam ${30-days} para a coroa 👑`;
            else heroSub.textContent = 'LENDÁRIA! 👑';
        }
    }

    document.getElementById('mini-xp').textContent = state.xp;
    document.getElementById('mini-correct').textContent = totalCorrect(state);
    document.getElementById('mini-badges').textContent = state.badges.length;

    const dailyDone = state.daily.date === todayStr() && state.daily.completed;
    document.getElementById('daily-status').textContent = dailyDone
        ? `Concluído hoje (${state.daily.correct}/${DAILY_QUESTIONS})`
        : `${DAILY_QUESTIONS} perguntas, 1 de cada disciplina`;
    document.getElementById('btn-start-daily-label').textContent = dailyDone ? 'Repetir desafio' : 'Começar desafio';
    // Brilho pulsante no botão quando o desafio diário ainda não foi feito
    const dailyBtn = document.getElementById('btn-start-daily');
    if (dailyBtn) dailyBtn.classList.toggle('shimmer-pulse', !dailyDone);
    // Chama do streak fica activa quando ≥ 3 dias
    document.querySelectorAll('.chip-streak').forEach(el => el.classList.toggle('active', state.streak.days >= 3));

    // Próximo teste
    renderNextTestCard();
    // Próximo prémio
    renderNextRewardCard();

    // Sugestões contextuais no "Tens uma dúvida?" — últimos erros
    renderAskSuggestions();
    // Banner "Instalar app" — só aparece se aplicável
    try { refreshInstallUI(); } catch {}

    // Treino rápido — cards modernizados com ícone circular
    const container = document.getElementById('quick-subjects');
    container.innerHTML = Object.entries(SUBJECTS).map(([key, sub]) => {
        const bg = (sub.color || '#7c3aed') + '1a'; // 10% opacidade
        return `
        <div class="quick-subject" onclick="openSubjectDetail('${key}')" style="--qs-color:${sub.color};--qs-bg:${bg}">
            <div class="qs-icon-wrap"><i class="fas ${sub.icon}"></i></div>
            <div class="qs-name">${sub.name}</div>
        </div>
        `;
    }).join('');

    // Number Talk do dia — prompt rotativo determinístico por data
    renderNumberTalk();
    // Rotina Heggerty do dia (consciência fonológica)
    renderHeggerty();
    // Journal semanal (segunda-feira ou se já aberto esta semana)
    renderMathJournal();
}

// ============================================================
// NUMBER TALKS — rotina diária de matemática mental (Parrish / Humphreys)
// Não pontua, não pede resposta — é prompt de conversa em família.
// Roda 14 prompts diferentes ao longo de 2 semanas para variar.
// ============================================================
const NUMBER_TALKS = [
    { n: 10, q: 'De quantas formas consegues fazer <span class="nt-number">10</span>?',
      strats: ['5 + 5', '6 + 4', '9 + 1', '8 + 2', '7 + 3', '3 + 3 + 4'] },
    { n: 12, q: 'Como podes fazer <span class="nt-number">12</span> usando somas?',
      strats: ['10 + 2', '6 + 6 (dobro do 6)', '8 + 4', '3 × 4', '7 + 5'] },
    { n: 15, q: 'Quantas maneiras encontras de fazer <span class="nt-number">15</span>?',
      strats: ['10 + 5', '7 + 8 (quase-dobro)', '9 + 6', '5 × 3', '20 − 5'] },
    { n: 18, q: 'Como decompor <span class="nt-number">18</span>?',
      strats: ['10 + 8', '9 + 9 (dobro do 9)', '20 − 2', '6 × 3', '15 + 3'] },
    { n: 20, q: 'De quantas formas chegas a <span class="nt-number">20</span>?',
      strats: ['10 + 10', '15 + 5', '4 × 5', '25 − 5', '8 + 8 + 4'] },
    { n: 24, q: '<span class="nt-number">24</span> — decompõe à tua maneira',
      strats: ['20 + 4', '12 + 12 (dobro)', '25 − 1', '6 × 4', '3 × 8', '10 + 10 + 4'] },
    { n: 25, q: 'Como podes pensar em <span class="nt-number">25</span>?',
      strats: ['20 + 5', '5 × 5', '10 + 10 + 5', '30 − 5', '15 + 10'] },
    { n: 30, q: 'Decompõe <span class="nt-number">30</span> de várias formas',
      strats: ['15 + 15 (dobro)', '10 + 10 + 10', '3 × 10', '6 × 5', '25 + 5'] },
    { n: 36, q: 'Como pensas em <span class="nt-number">36</span>?',
      strats: ['30 + 6', '18 + 18 (dobro)', '40 − 4', '6 × 6', '4 × 9', '12 × 3'] },
    { n: 50, q: 'De quantas formas fazes <span class="nt-number">50</span>?',
      strats: ['25 + 25 (dobro)', '10 × 5', '40 + 10', '100 ÷ 2', '20 + 20 + 10'] },
    { n: 99, q: '<span class="nt-number">99</span> — pensa rápido (dica: 100−1!)',
      strats: ['100 − 1', '90 + 9', '50 + 49', '33 × 3', '9 × 11'] },
    { n: 100, q: 'Como podes formar <span class="nt-number">100</span>?',
      strats: ['50 + 50', '99 + 1', '4 × 25', '10 × 10', '60 + 40', '75 + 25'] },
    { n: 48, q: 'Decompõe <span class="nt-number">48</span>',
      strats: ['40 + 8', '50 − 2', '24 + 24 (dobro)', '6 × 8', '4 × 12'] },
    { n: 72, q: '<span class="nt-number">72</span> — várias formas',
      strats: ['70 + 2', '36 + 36 (dobro)', '8 × 9', '70 + 2', '80 − 8'] },
];
function _todayNumberTalkIndex() {
    const t = new Date();
    const dayOfYear = Math.floor((t - new Date(t.getFullYear(),0,0)) / 86400000);
    return dayOfYear % NUMBER_TALKS.length;
}
function renderNumberTalk() {
    const card  = document.getElementById('number-talk-card');
    const titleEl = document.getElementById('nt-title');
    const promptEl  = document.getElementById('nt-prompt');
    const stratsEl  = document.getElementById('nt-strategies');
    if (!card || !promptEl) return;
    const nt = NUMBER_TALKS[_todayNumberTalkIndex()];
    if (titleEl) titleEl.textContent = `Number Talk de hoje · ${nt.n}`;
    promptEl.innerHTML = nt.q;
    stratsEl.innerHTML = '<strong>Algumas estratégias possíveis</strong><br>' +
        nt.strats.map(s => `<div class="nt-strat-row">• ${s}</div>`).join('');
}
function toggleNumberTalk() {
    const card = document.getElementById('number-talk-card');
    const body = document.getElementById('nt-body');
    if (!card || !body) return;
    const open = body.style.display !== 'none';
    body.style.display = open ? 'none' : 'block';
    card.classList.toggle('open', !open);
}
window.toggleNumberTalk = toggleNumberTalk;

// ============================================================
// HEGGERTY-INSPIRED PHONOLOGICAL ROUTINE — 7 dias por semana
// Cada dia foca componentes diferentes (rima/sílaba/fonema)
// Fonte: Heggerty Phonemic Awareness Curriculum (adaptado PT)
// ============================================================
const HEGGERTY_DAYS = [
    // Domingo (0)
    [
        { tag: 'Rima', text: 'Adulto diz <strong>BOLA</strong> · GATO · MOLA · FOLA · OLHO. Repete só as que rimam com BOLA.' },
        { tag: 'Sílaba', text: '<strong>BORBOLETA</strong> — bate palmas em cada sílaba (4: BOR-BO-LE-TA).' },
        { tag: 'Primeiro som', text: 'Qual é o primeiro som de <strong>SAPO</strong>? (resposta: /s/)' },
        { tag: 'Juntar', text: 'Junta: /m/ + /a/ + /r/ — que palavra é? (MAR)' },
    ],
    // Segunda (1)
    [
        { tag: 'Rima', text: 'Diz 3 palavras que rimem com <strong>PATO</strong>. (ex.: gato, rato, mato)' },
        { tag: 'Sílaba', text: 'Tira a primeira sílaba de <strong>CAMISA</strong>. (MISA)' },
        { tag: 'Último som', text: 'Qual é o último som de <strong>FLOR</strong>? (/r/)' },
        { tag: 'Trocar', text: 'Em <strong>MALA</strong>, troca /m/ por /b/. Que palavra fica? (BALA)' },
    ],
    // Terça (2)
    [
        { tag: 'Rima', text: 'Diz uma palavra que rime com <strong>CHÃO</strong>. (mão, pão, são, não)' },
        { tag: 'Sílaba', text: 'Junta as sílabas <strong>CA-VA-LO</strong>. (CAVALO)' },
        { tag: 'Sons', text: 'Quantos sons tem <strong>SOL</strong>? (3: /s/ /o/ /l/)' },
        { tag: 'Tirar', text: 'Em <strong>BARCO</strong>, tira o som /b/. Que palavra fica? (ARCO)' },
    ],
    // Quarta (3)
    [
        { tag: 'Onset-rime', text: '<strong>PORTA</strong> começa com /p/ e o resto é /orta/. E <strong>CASA</strong>? (/c/ + /asa/)' },
        { tag: 'Sílaba', text: 'Acrescenta <strong>BA</strong> antes de <strong>NANA</strong>. (BANANA)' },
        { tag: 'Som médio', text: 'Qual é o som do meio em <strong>MAR</strong>? (/a/)' },
        { tag: 'Substituir', text: 'Em <strong>SOPA</strong>, troca /s/ por /c/. Que palavra fica? (COPA)' },
    ],
    // Quinta (4)
    [
        { tag: 'Rima', text: 'Estas palavras rimam? <strong>FOLHA · BOLHA</strong>. (sim) E <strong>FOLHA · MESA</strong>? (não)' },
        { tag: 'Sílaba', text: 'Quantas sílabas tem <strong>CARACOL</strong>? (3: CA-RA-COL)' },
        { tag: 'Segmentar', text: 'Diz os sons de <strong>PÉ</strong>. (/p/ /é/ — 2 sons)' },
        { tag: 'Famílias', text: 'BO, RO, MO, FO, JO — qual é o som comum? (/o/)' },
    ],
    // Sexta (5)
    [
        { tag: 'Rima', text: 'Inventa uma palavra que rime com <strong>SOL</strong>. (pode ser palavra-fingida!)' },
        { tag: 'Sílaba', text: 'Tira a sílaba do fim em <strong>MENINO</strong>. (MENI)' },
        { tag: 'Juntar sons', text: 'Junta /p/ + /é/. (PÉ) Junta /m/ + /ã/ + /o/. (MÃO)' },
        { tag: 'Inversão', text: 'Diz <strong>OPA</strong> ao contrário. (APO)' },
    ],
    // Sábado (6)
    [
        { tag: 'Mistura', text: 'Estas rimam? <strong>VACA · FACA</strong>. (sim) · <strong>RATO · CASA</strong>. (não)' },
        { tag: 'Sílaba', text: 'Bate palmas em <strong>HIPOPÓTAMO</strong>. (5: HI-PO-PÓ-TA-MO)' },
        { tag: 'Pares mínimos', text: 'BOLA e MOLA — que som mudou? (/b/ → /m/)' },
        { tag: 'Trava-línguas', text: 'Diz devagar: <strong>"O rato roeu a rolha da garrafa do rei da Rússia"</strong>.' },
    ],
];
function _todayHeggertyDay() { return new Date().getDay(); }
function renderHeggerty() {
    const promptsEl = document.getElementById('hg-prompts');
    const titleEl = document.getElementById('hg-title');
    if (!promptsEl) return;
    const dayNames = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
    const day = _todayHeggertyDay();
    if (titleEl) titleEl.textContent = `Sons de ${dayNames[day]}`;
    const items = HEGGERTY_DAYS[day] || HEGGERTY_DAYS[0];
    promptsEl.innerHTML = items.map(p =>
        `<div class="hg-step"><span class="hg-step-label">${p.tag}</span>${p.text}</div>`
    ).join('');
}
function toggleHeggerty() {
    const card = document.getElementById('heggerty-card');
    const body = document.getElementById('hg-body');
    if (!card || !body) return;
    const open = body.style.display !== 'none';
    body.style.display = open ? 'none' : 'block';
    card.classList.toggle('open', !open);
}
window.toggleHeggerty = toggleHeggerty;

// ============================================================
// MATH JOURNAL — prompt semanal (segunda-feira)
// Convida a criança a refletir/desenhar matemática num caderno
// ============================================================
const MATH_JOURNAL_PROMPTS = [
    'Desenha o número <strong>15</strong> de 3 formas diferentes (ex.: dedos, dezenas+unidades, dinheiro).',
    'Onde viste matemática esta semana? Conta uma história curta.',
    'Inventa um problema com <strong>"comprei 3 e ganhei 2"</strong> e desenha-o.',
    'Qual é o teu número favorito? Porquê? Desenha-o em 3 formas.',
    'Faz um quadro de marcas (||| ||) para contar uma coleção (legos, cromos).',
    'Desenha duas formas geométricas que vês na cozinha.',
    'Conta passos de casa até à porta. Estima primeiro, depois conta!',
    'Quantos olhos há na tua família? E pés? E dedos das mãos?',
    'Que horas são quando acordas? E quando vais dormir? Quantas horas dormes?',
    'Desenha uma <strong>linha numérica</strong> de 0 a 20 e marca o teu número da sorte.',
];
function _thisWeekJournalIndex() {
    const t = new Date();
    const yearStart = new Date(t.getFullYear(), 0, 1);
    const weeks = Math.floor((t - yearStart) / (7 * 86400000));
    return weeks % MATH_JOURNAL_PROMPTS.length;
}
function renderMathJournal() {
    const card = document.getElementById('math-journal-card');
    const promptEl = document.getElementById('mj-prompt');
    if (!card || !promptEl) return;
    // Só mostra à segunda-feira (dia 1) ou se já foi aberto esta semana
    const day = new Date().getDay();
    const isMonday = day === 1;
    const weekKey = 'mj-week-' + _thisWeekJournalIndex();
    const wasOpened = state.mathJournalOpened === weekKey;
    if (!isMonday && !wasOpened) { card.style.display = 'none'; return; }
    card.style.display = 'block';
    promptEl.innerHTML = MATH_JOURNAL_PROMPTS[_thisWeekJournalIndex()];
}
function toggleMathJournal() {
    const card = document.getElementById('math-journal-card');
    const body = document.getElementById('mj-body');
    if (!card || !body) return;
    const open = body.style.display !== 'none';
    body.style.display = open ? 'none' : 'block';
    card.classList.toggle('open', !open);
    if (!open) {
        state.mathJournalOpened = 'mj-week-' + _thisWeekJournalIndex();
        saveState();
    }
}
window.toggleMathJournal = toggleMathJournal;

function renderNextTestCard() {
    const card = document.getElementById('next-test-card');
    const today = todayStr();
    const upcoming = state.tests
        .filter(t => !t.done && t.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date));
    if (upcoming.length === 0) { card.style.display = 'none'; return; }
    const t = upcoming[0];
    const days = daysBetween(today, t.date);
    const sub = SUBJECTS[t.subject];
    document.getElementById('next-test-title').textContent = `Teste de ${sub?.name || t.subject}`;
    document.getElementById('next-test-sub').textContent = days === 0 ? 'É hoje!' : days === 1 ? 'É amanhã' : `Faltam ${days} dias`;
    document.getElementById('next-test-days').textContent = days;
    card.classList.remove('urgent', 'soon');
    if (days <= 2) card.classList.add('urgent');
    else if (days <= 5) card.classList.add('soon');
    card.style.display = 'flex';
}

function renderNextRewardCard() {
    const card = document.getElementById('next-reward-card');
    const next = (state.rewards || []).filter(r => !r.claimed).sort((a, b) => a.cost - b.cost).find(r => r.cost > state.xp);
    if (!next) { card.style.display = 'none'; return; }
    const pct = Math.min(100, Math.round(state.xp / next.cost * 100));
    document.getElementById('next-reward-name').textContent = `Próximo prémio: ${next.name}`;
    document.getElementById('next-reward-fill').style.width = pct + '%';
    document.getElementById('next-reward-meta').textContent = `${state.xp} / ${next.cost} XP (faltam ${next.cost - state.xp})`;
    card.style.display = 'flex';
}

// ========== SUBJECTS TAB ==========
function renderSubjects() {
    const grid = document.getElementById('subjects-grid');
    const seen = state.exerciseSeen || {};
    grid.innerHTML = Object.entries(SUBJECTS).map(([key, sub]) => {
        const stats = state.subjects[key] || { answered: 0, correct: 0, xp: 0 };
        const accPct = stats.answered > 0 ? Math.round(stats.correct / stats.answered * 100) : 0;
        const active = activeTopicsFor(key);
        const maxEx = state.maxExercises || [];
        // Pool activo (apenas tópicos activos)
        const activePool = [
            ...EXERCISES.filter(e => e.s === key && active.has(e.t)),
            ...maxEx.filter(e => e.s === key && active.has(e.t))
        ];
        const totalActive = activePool.length;
        // Quantos do pool activo já foram respondidos
        const answeredInPool = activePool.filter(e => seen[e.id]).length;
        // Barra: % do banco activo já respondido (= "evolução" verdadeira)
        const barPct = totalActive > 0 ? Math.round((answeredInPool / totalActive) * 100) : 0;
        const shadow = (sub.color || '#7c3aed') + '40'; // 25% opacidade
        return `
            <div class="subject-card" onclick="openSubjectDetail('${key}')" style="--sub-color:${sub.color};--sub-shadow:${shadow}">
                <div class="subject-card-icon" style="background:linear-gradient(135deg, ${sub.color}, ${sub.color}dd)"><i class="fas ${sub.icon}"></i></div>
                <h3>${sub.name}</h3>
                <div class="subject-card-meta">
                    <div>${answeredInPool}/${totalActive} respondidas</div>
                    ${stats.answered > 0 ? `<div style="font-size:0.7rem;color:var(--text-light);margin-top:2px">${accPct}% acerto · ${stats.xp} XP</div>` : ''}
                </div>
                <div class="subject-card-bar" title="${barPct}% do banco">
                    <div class="subject-card-bar-fill" style="width:${barPct}%;background:linear-gradient(90deg, ${sub.color}, ${sub.color}cc)"></div>
                </div>
            </div>
        `;
    }).join('');
}

// ========== SUBJECT DETAIL (modal fullscreen) ==========
function openSubjectDetail(key) {
    // Primeira vez em Mat+? Oferece o diagnóstico inicial
    if (key === 'mat_plus' && !state.matPlusDiag && !state.matPlusDiagSkipped) {
        showMatPlusDiagnosticIntro();
        return;
    }
    currentSubjectView = key;
    const sub = SUBJECTS[key];
    const topics = CURRICULUM[key] || [];
    const toIndex = state.progress[key]?.toIndex ?? topics.length;
    const stats = state.subjects[key] || { answered: 0, correct: 0, xp: 0 };
    // Cálculo do banco total e perguntas respondidas/restantes nesta disciplina
    const seen = state.exerciseSeen || {};
    const allSubjectEx = [
        ...EXERCISES.filter(e => e.s === key),
        ...(state.maxExercises || []).filter(e => e.s === key)
    ];
    const totalEx = allSubjectEx.length;
    const seenEx = allSubjectEx.filter(e => seen[e.id]).length;
    const remainingEx = totalEx - seenEx;
    const seenPct = totalEx > 0 ? Math.round((seenEx / totalEx) * 100) : 0;
    const accPct = stats.answered > 0 ? Math.round((stats.correct / stats.answered) * 100) : 0;

    const html = `
        <div class="fullscreen" id="subject-detail-screen">
            <div class="exercise-header">
                <button class="icon-btn" onclick="closeSubjectDetail()"><i class="fas fa-arrow-left"></i></button>
                <div style="flex:1;font-weight:700;display:flex;align-items:center;gap:8px">
                    <span style="width:32px;height:32px;border-radius:8px;background:${sub.color};color:#fff;display:inline-flex;align-items:center;justify-content:center"><i class="fas ${sub.icon}"></i></span>
                    ${sub.fullName || sub.name}
                </div>
            </div>
            <div class="exercise-body">
                <div style="background:#fff;padding:14px;border-radius:14px;box-shadow:var(--shadow);margin-bottom:12px">
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
                        <div>
                            <div style="font-size:0.72rem;color:var(--text-light);font-weight:600">RESPOSTAS CERTAS</div>
                            <div style="font-size:1.3rem;font-weight:800;color:${sub.color}">${stats.correct}/${stats.answered}${stats.answered > 0 ? ` <span style="font-size:0.85rem;color:var(--text-light);font-weight:700">(${accPct}%)</span>` : ''}</div>
                            <div style="font-size:0.78rem;color:#f59e0b;font-weight:700;margin-top:2px">⭐ ${stats.xp} XP</div>
                        </div>
                        <div>
                            <div style="font-size:0.72rem;color:var(--text-light);font-weight:600">EXERCÍCIOS DO BANCO</div>
                            <div style="font-size:1.3rem;font-weight:800;color:${sub.color}">${seenEx}/${totalEx}</div>
                            <div style="font-size:0.78rem;color:var(--text-light);font-weight:600;margin-top:2px">${remainingEx > 0 ? `🆕 ${remainingEx} por responder` : '🎉 Banco completo!'}</div>
                        </div>
                    </div>
                    <div style="height:6px;background:#f3f4f6;border-radius:999px;overflow:hidden">
                        <div style="height:100%;width:${seenPct}%;background:linear-gradient(90deg,${sub.color},${sub.color}cc);border-radius:999px;transition:width 0.4s"></div>
                    </div>
                    <div style="font-size:0.7rem;color:var(--text-light);text-align:right;margin-top:3px">${seenPct}% do banco visto</div>
                </div>

                <div style="background:#fff;padding:14px;border-radius:14px;box-shadow:var(--shadow);margin-bottom:12px">
                    <label style="display:block;font-weight:700;margin-bottom:6px">Até onde já estudaste?</label>
                    <p class="muted" style="margin-bottom:10px">Selecciona o último tópico que deste. Só aparecem exercícios até esse ponto.</p>
                    <input type="range" id="progress-slider" min="0" max="${topics.length}" value="${toIndex}" style="width:100%" oninput="onProgressSlider(this.value)">
                    <div style="display:flex;justify-content:space-between;font-size:0.72rem;color:var(--text-light);margin-top:4px">
                        <span>0</span><span id="progress-current">${toIndex}</span><span>${topics.length}</span>
                    </div>
                </div>

                <div class="section-title" style="margin-top:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                    <i class="fas fa-list-ol"></i> <span style="flex:1">Tópicos</span>
                    <button class="btn btn-secondary" style="font-size:0.72rem;padding:6px 10px" onclick="selectAllTopics()"><i class="fas fa-check-double"></i> Todos</button>
                    <button class="btn btn-secondary" style="font-size:0.72rem;padding:6px 10px" onclick="clearTopicSelection()"><i class="fas fa-xmark"></i> Limpar</button>
                </div>
                <div id="topic-list"></div>

                <div id="topic-sel-actions" style="display:none;margin-top:12px;background:#f5f3ff;border:2px solid #c4b5fd;border-radius:12px;padding:12px">
                    <div style="font-size:0.78rem;font-weight:700;color:#5b21b6;margin-bottom:8px"><i class="fas fa-check-square"></i> <span id="sel-count">0</span> tópico(s) selecionado(s)</div>
                    <button class="btn btn-primary-solid btn-block" onclick="startSubjectSession('${key}', { useSelection: true })">
                        <i class="fas fa-play"></i> Treinar tópicos selecionados
                    </button>
                </div>

                <button class="btn btn-primary-solid btn-block" style="margin-top:14px" onclick="startSubjectSession('${key}')">
                    <i class="fas fa-play"></i> Começar treino (todos os tópicos activos)
                </button>

                <!-- ===== BLOCO MAX ===== -->
                <div style="margin-top:16px;background:linear-gradient(135deg,#4c1d95,#6d28d9);border-radius:16px;padding:14px;box-shadow:0 4px 16px rgba(109,40,217,0.35)">
                    <div style="color:#fff;font-weight:800;font-size:1rem;margin-bottom:4px"><i class="fas fa-wand-magic-sparkles"></i> MAX — Exercícios com IA</div>
                    <div style="color:#ddd6fe;font-size:0.78rem;margin-bottom:12px">Selecciona tópicos acima ou gera para todos</div>

                    <div id="max-topic-sel-bar" style="display:none;background:rgba(255,255,255,0.12);border-radius:10px;padding:10px;margin-bottom:10px">
                        <div style="color:#e9d5ff;font-size:0.78rem;font-weight:700;margin-bottom:8px"><i class="fas fa-check-square"></i> <span id="max-sel-count">0</span> tópico(s) selecionado(s)</div>
                        <button class="btn btn-block" style="margin-bottom:6px;background:#fff;color:#6d28d9;border-radius:10px;padding:10px;font-weight:700;font-size:0.88rem" onclick="startMaxForSelected('${key}', false)">
                            <i class="fas fa-wand-magic-sparkles"></i> Gerar exercícios MAX
                        </button>
                        <button class="btn btn-block" style="margin-bottom:6px;background:#fbbf24;color:#78350f;border-radius:10px;padding:10px;font-weight:700;font-size:0.88rem" onclick="startMaxForSelected('${key}', true)">
                            <i class="fas fa-graduation-cap"></i> Preparação para teste
                        </button>
                    </div>

                    <button class="btn btn-block" style="background:rgba(255,255,255,0.18);color:#fff;border-radius:10px;padding:10px;font-weight:600;font-size:0.88rem;margin-bottom:6px" onclick="startMaxSession('${key}')">
                        <i class="fas fa-shuffle"></i> Treino MAX (todos os tópicos activos)
                    </button>
                    <button class="btn btn-block" style="background:rgba(255,255,255,0.1);color:#ddd6fe;border-radius:10px;padding:8px;font-size:0.78rem" onclick="startMaxSession('${key}', {forceNew:true})">
                        <i class="fas fa-rotate"></i> Forçar novos exercícios (consome API)
                    </button>
                </div>
            </div>
        </div>
    `;
    const container = document.createElement('div');
    container.id = 'subject-detail-container';
    container.innerHTML = html;
    document.body.appendChild(container);
    renderTopicList();
}

let selectedTopicsForMax = new Set();

function renderTopicList() {
    const key = currentSubjectView;
    const topics = CURRICULUM[key] || [];
    const toIndex = state.progress[key]?.toIndex ?? topics.length;
    const active = new Set(topics.slice(0, toIndex));
    const container = document.getElementById('topic-list');
    if (!container) return;
    const seen = state.exerciseSeen || {};
    const subColor = SUBJECTS[key]?.color || '#7c3aed';
    // Tópicos recomendados pelo diagnóstico Mat+ (destacar)
    const recommendedSet = (key === 'mat_plus' && state.matPlusDiag && Array.isArray(state.matPlusDiag.recommended))
        ? new Set(state.matPlusDiag.recommended)
        : new Set();
    container.innerHTML = topics.map((t, i) => {
        const isActive = active.has(t);
        const isRecommended = recommendedSet.has(t);
        // Pool deste tópico (estático + IA)
        const pool = [
            ...EXERCISES.filter(e => e.s === key && e.t === t),
            ...(state.maxExercises || []).filter(e => e.s === key && e.t === t)
        ];
        const count = pool.length;
        // Quantos respondidos correctamente / errados
        const seenIds = pool.filter(e => seen[e.id]).map(e => e.id);
        const seenCount = seenIds.length;
        // Calcular acertos a partir do history (mais recente vence por id)
        const lastResultById = {};
        (state.history || []).forEach(h => { if (h && h.id) lastResultById[h.id] = h.c; });
        const correctCount = seenIds.filter(id => lastResultById[id] === true).length;
        const wrongCount = seenIds.filter(id => lastResultById[id] === false).length;
        const pct = count > 0 ? Math.round((seenCount / count) * 100) : 0;
        const sel = selectedTopicsForMax.has(t);
        const tEsc = t.replace(/'/g, "\\'");
        // Cor da barra de progresso: verde se ≥ 80% acertos, amarelo se intermédio, cinza se nada
        const progBarColor = seenCount === 0 ? '#e5e7eb' : (correctCount / Math.max(seenCount, 1)) >= 0.8 ? '#16a34a' : '#f59e0b';
        const stars = topicStars(key, t);
        const borderColor = sel ? '#7c3aed' : (isRecommended ? '#14b8a6' : 'transparent');
        const cardBg = sel ? '#f5f3ff' : (isRecommended ? '#f0fdfa' : '#fff');
        return `
            <div onclick="${isActive ? `toggleTopicSelection('${tEsc}')` : ''}" style="background:${cardBg};padding:10px 12px;border-radius:10px;box-shadow:var(--shadow-sm);margin-bottom:8px;display:flex;align-items:center;gap:8px;opacity:${isActive ? '1' : '0.45'};cursor:${isActive ? 'pointer' : 'default'};border:2px solid ${borderColor}">
                ${isActive ? `<input type="checkbox" ${sel ? 'checked' : ''} onclick="event.stopPropagation();toggleTopicSelection('${tEsc}')" style="width:16px;height:16px;accent-color:#7c3aed;flex-shrink:0">` : `<span style="width:16px;height:16px;flex-shrink:0"></span>`}
                <span style="width:22px;height:22px;border-radius:50%;background:${isActive ? subColor : '#e5e7eb'};color:#fff;font-size:0.7rem;font-weight:800;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0">${i+1}</span>
                <div style="flex:1;min-width:0">
                    <div style="font-weight:600;font-size:0.9rem;display:flex;align-items:center;gap:6px">${t}${isRecommended ? '<span title="Tópico recomendado pelo diagnóstico" style="background:#14b8a6;color:#fff;font-size:0.62rem;font-weight:700;padding:1px 6px;border-radius:4px;letter-spacing:0.05em;text-transform:uppercase">REC.</span>' : ''}${stars ? `<span title="Estrelas de domínio" style="font-size:0.78rem;letter-spacing:1px">${stars}</span>` : ''}</div>
                    <div style="font-size:0.72rem;color:var(--text-light);margin-top:2px">
                        <span style="color:${seenCount > 0 ? subColor : 'var(--text-light)'};font-weight:600">${seenCount}/${count}</span> respondidos
                        ${correctCount > 0 ? ` · <span style="color:#16a34a">✓ ${correctCount}</span>` : ''}
                        ${wrongCount > 0 ? ` · <span style="color:#dc2626">✗ ${wrongCount}</span>` : ''}
                    </div>
                    ${count > 0 ? `<div style="margin-top:5px;height:4px;background:#f3f4f6;border-radius:999px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${progBarColor};border-radius:999px;transition:width 0.3s"></div></div>` : ''}
                </div>
                <button class="icon-btn" onclick="event.stopPropagation();openTopicAnsweredModal('${key}','${tEsc}')" title="Ver perguntas respondidas" style="background:#ede9fe;color:#7c3aed;flex-shrink:0"><i class="fas fa-list-check"></i></button>
                ${LESSONS[`${key}/${t}`] ? `<button class="icon-btn help-btn" onclick="event.stopPropagation();openLessonByKey('${key}/${tEsc}')" title="Ver explicação"><i class="fas fa-book-open"></i></button>` : ''}
            </div>
        `;
    }).join('');
    updateTopicSelBar();
}

// Modal: lista de perguntas respondidas para um tópico
function openTopicAnsweredModal(subjectKey, topic) {
    const sub = SUBJECTS[subjectKey];
    const seen = state.exerciseSeen || {};
    const lastResultById = {};
    (state.history || []).forEach(h => { if (h && h.id) lastResultById[h.id] = h.c; });
    const pool = [
        ...EXERCISES.filter(e => e.s === subjectKey && e.t === topic),
        ...(state.maxExercises || []).filter(e => e.s === subjectKey && e.t === topic)
    ];
    const seenItems = pool
        .filter(e => seen[e.id])
        .sort((a, b) => (seen[b.id] || 0) - (seen[a.id] || 0)); // mais recentes primeiro
    const unseenCount = pool.length - seenItems.length;

    document.getElementById('topic-answered-modal-temp')?.remove();
    let listHtml;
    if (seenItems.length === 0) {
        listHtml = `<p style="text-align:center;color:var(--text-light);padding:20px">Ainda não respondeste a nenhuma pergunta deste tópico.</p>`;
    } else {
        listHtml = seenItems.map(e => {
            const result = lastResultById[e.id];
            const icon = result === true ? '✓' : result === false ? '✗' : '•';
            const color = result === true ? '#16a34a' : result === false ? '#dc2626' : '#9ca3af';
            const bg    = result === true ? '#f0fdf4' : result === false ? '#fef2f2' : '#f9fafb';
            const ts = seen[e.id];
            const date = ts ? new Date(ts).toLocaleDateString('pt-PT', { day:'2-digit', month:'2-digit', year:'numeric' }) : '';
            const qPreview = String(e.q || '').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim().slice(0, 100);
            return `
                <div style="background:${bg};padding:10px 12px;border-radius:8px;margin-bottom:6px;display:flex;align-items:flex-start;gap:10px;border-left:3px solid ${color}">
                    <div style="font-size:1.2rem;font-weight:700;color:${color};line-height:1;width:18px;flex-shrink:0;text-align:center">${icon}</div>
                    <div style="flex:1;min-width:0">
                        <div style="font-size:0.85rem;color:var(--text);line-height:1.35">${escapeHtml(qPreview)}${qPreview.length >= 100 ? '…' : ''}</div>
                        <div style="font-size:0.7rem;color:var(--text-light);margin-top:3px">${date}${e.diff ? ` · dif. ${e.diff}` : ''}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    const html = `
        <div id="topic-answered-modal-temp" class="modal" style="display:flex;align-items:center;justify-content:center;padding:20px">
            <div class="modal-content" style="max-width:560px;max-height:90vh;border-radius:18px;display:flex;flex-direction:column">
                <div class="modal-header">
                    <h2 style="font-size:1rem">📚 ${escapeHtml(topic)}</h2>
                    <button class="icon-btn" onclick="closeTopicAnsweredModal()" aria-label="Fechar"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body" style="flex:1;overflow-y:auto">
                    <div style="display:flex;gap:8px;margin-bottom:14px;font-size:0.78rem;flex-wrap:wrap">
                        <span style="background:#ede9fe;color:#7c3aed;padding:4px 10px;border-radius:999px;font-weight:700">📖 ${pool.length} no total</span>
                        <span style="background:#dbeafe;color:#1d4ed8;padding:4px 10px;border-radius:999px;font-weight:700">${seenItems.length} respondidas</span>
                        ${unseenCount > 0 ? `<span style="background:#f3f4f6;color:#6b7280;padding:4px 10px;border-radius:999px;font-weight:700">${unseenCount} novas</span>` : ''}
                    </div>
                    ${listHtml}
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

function closeTopicAnsweredModal() {
    document.getElementById('topic-answered-modal-temp')?.remove();
}

function toggleTopicSelection(topic) {
    if (selectedTopicsForMax.has(topic)) selectedTopicsForMax.delete(topic);
    else selectedTopicsForMax.add(topic);
    renderTopicList();
}

function clearTopicSelection() {
    selectedTopicsForMax.clear();
    renderTopicList();
}

function updateTopicSelBar() {
    const n = selectedTopicsForMax.size;
    const maxBar = document.getElementById('max-topic-sel-bar');
    const maxCnt = document.getElementById('max-sel-count');
    if (maxBar) maxBar.style.display = n > 0 ? 'block' : 'none';
    if (maxCnt) maxCnt.textContent = n;
    const selBar = document.getElementById('topic-sel-actions');
    const selCnt = document.getElementById('sel-count');
    if (selBar) selBar.style.display = n > 0 ? 'block' : 'none';
    if (selCnt) selCnt.textContent = n;
}

function selectAllTopics() {
    const key = currentSubjectView;
    if (!key) return;
    const topics = CURRICULUM[key] || [];
    const toIndex = state.progress[key]?.toIndex ?? topics.length;
    topics.slice(0, toIndex).forEach(t => selectedTopicsForMax.add(t));
    renderTopicList();
}

function startMaxForSelected(key, isTestPrep = false) {
    const topics = [...selectedTopicsForMax];
    selectedTopicsForMax.clear();
    startMaxSession(key, { topics, forceNew: true, testPrep: isTestPrep });
}

function onProgressSlider(val) {
    const key = currentSubjectView;
    state.progress[key] = { toIndex: parseInt(val) };
    saveState();
    document.getElementById('progress-current').textContent = val;
    renderTopicList();
}

function closeSubjectDetail() {
    selectedTopicsForMax.clear();
    const el = document.getElementById('subject-detail-container');
    if (el) el.remove();
    currentSubjectView = null;
    renderSubjects();
    renderHome();
}

// ========== TESTS ==========
function renderTests() {
    const list = document.getElementById('tests-list');
    const today = todayStr();
    const sorted = [...state.tests].sort((a, b) => a.date.localeCompare(b.date));
    if (sorted.length === 0) {
        list.innerHTML = `<p class="muted" style="text-align:center;padding:20px">Sem testes agendados. Adiciona um para começares a receber lembretes.</p>`;
        return;
    }
    list.innerHTML = sorted.map(t => {
        const sub = SUBJECTS[t.subject];
        const days = daysBetween(today, t.date);
        const past = days < 0;
        let cls = 'future';
        if (t.done) cls = 'done';
        else if (past) cls = 'done';
        else if (days <= 2) cls = 'urgent';
        else if (days <= 5) cls = 'soon';
        const daysLabel = t.done ? 'Feito' : past ? `${-days}d atrás` : days === 0 ? 'Hoje!' : days === 1 ? 'Amanhã' : `em ${days}d`;
        const topicsLabel = (t.topics && t.topics.length) ? `${t.topics.length} tópicos: ${t.topics.slice(0, 3).join(', ')}${t.topics.length > 3 ? '…' : ''}` : 'todos os tópicos activos';
        const seenCount = (t.seenEx || []).length;
        const seenLabel = seenCount > 0 ? `<div style="font-size:0.72rem;color:#7c3aed;font-weight:600;margin-top:3px">📚 ${seenCount} pergunta${seenCount === 1 ? '' : 's'} vista${seenCount === 1 ? '' : 's'}</div>` : '';
        // Pílulas de nota objetivo / nota obtida. A nota obtida muda de cor
        // conforme bate o objetivo — feedback visual claro.
        const gradePills = [];
        if (t.targetGrade != null) {
            gradePills.push(`<span class="test-grade-pill test-grade-target" title="Nota objetivo">🎯 ${t.targetGrade}</span>`);
        }
        if (t.actualGrade != null) {
            const hit = t.targetGrade != null && t.actualGrade >= t.targetGrade;
            const cls2 = hit ? 'test-grade-hit' : (t.targetGrade != null ? 'test-grade-miss' : 'test-grade-actual');
            gradePills.push(`<span class="test-grade-pill ${cls2}" title="Nota obtida">${hit ? '✓' : '📝'} ${t.actualGrade}</span>`);
        }
        const gradeLabel = gradePills.length > 0 ? `<div class="test-grade-row">${gradePills.join('')}</div>` : '';
        return `
            <div class="test-item ${cls}">
                <div class="test-item-icon" style="background:${sub?.color || '#6b7280'}"><i class="fas ${sub?.icon || 'fa-book'}"></i></div>
                <div class="test-item-body">
                    <div class="test-item-subject">${sub?.name || t.subject}</div>
                    <div class="test-item-date">${formatDatePT(t.date)} · ${daysLabel}</div>
                    <div class="test-item-note">${topicsLabel}${t.note ? ` · ${t.note}` : ''}</div>
                    ${gradeLabel}
                    ${seenLabel}
                </div>
                <div class="test-item-actions">
                    ${!t.done ? `<button class="practice" title="Treinar para este teste" onclick="startTestPrep('${t.id}')"><i class="fas fa-dumbbell"></i></button>` : ''}
                    ${!t.done ? `<button class="practice" style="background:linear-gradient(135deg,#7c3aed,#ec4899);color:#fff" title="Treino MAX (IA) para este teste" onclick="startMaxForTest('${t.id}')"><i class="fas fa-wand-magic-sparkles"></i></button>` : ''}
                    <button onclick="editTest('${t.id}')" title="Editar"><i class="fas fa-pen"></i></button>
                    <button class="del" onclick="deleteTest('${t.id}')" title="Apagar"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    }).join('');
}

function openAddTestModal(testId = null) {
    pendingTestId = testId;
    document.getElementById('test-modal-title').textContent = testId ? 'Editar teste' : 'Adicionar teste';
    const sel = document.getElementById('test-subject');
    sel.innerHTML = Object.entries(SUBJECTS).map(([k, s]) => `<option value="${k}">${s.fullName || s.name}</option>`).join('');
    const today = new Date();
    today.setDate(today.getDate() + 7);
    const defaultDate = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    if (testId) {
        const t = state.tests.find(x => x.id === testId);
        if (t) {
            sel.value = t.subject;
            document.getElementById('test-date').value = t.date;
            document.getElementById('test-note').value = t.note || '';
            document.getElementById('test-target-grade').value = (t.targetGrade != null) ? t.targetGrade : '';
            document.getElementById('test-actual-grade').value = (t.actualGrade != null) ? t.actualGrade : '';
        }
    } else {
        sel.value = Object.keys(SUBJECTS)[0];
        document.getElementById('test-date').value = defaultDate;
        document.getElementById('test-note').value = '';
        document.getElementById('test-target-grade').value = '';
        document.getElementById('test-actual-grade').value = '';
    }
    renderTestTopicsPicker();
    sel.onchange = renderTestTopicsPicker;
    document.getElementById('test-modal').style.display = 'flex';
}

function renderTestTopicsPicker() {
    const subKey = document.getElementById('test-subject').value;
    const topics = CURRICULUM[subKey] || [];
    const active = activeTopicsFor(subKey);
    const existing = pendingTestId ? state.tests.find(t => t.id === pendingTestId) : null;
    const selectedSet = new Set((existing?.topics) || []);
    const list = topics.map(t => {
        const isActive = active.has(t);
        const isChecked = selectedSet.has(t);
        return `
            <label style="display:flex;align-items:center;gap:8px;padding:8px 6px;border-radius:8px;${isActive ? '' : 'opacity:0.45'}">
                <input type="checkbox" value="${t.replace(/"/g, '&quot;')}" ${isChecked ? 'checked' : ''} ${isActive ? '' : 'disabled'}>
                <span style="font-size:0.9rem">${t}${!isActive ? ' <span style="color:var(--text-muted);font-size:0.72rem">(ainda não estudado)</span>' : ''}</span>
            </label>
        `;
    }).join('');
    const wrap = document.getElementById('test-topics-picker');
    if (wrap) wrap.innerHTML = `<p class="muted" style="margin:6px 0">Marca os tópicos que saem neste teste (se não marcares nenhum, treinamos com todos os activos).</p>${list}`;
}

// Lê um campo numérico de nota (0-20). Devolve null se vazio/invalido.
function _parseGradeInput(id) {
    const raw = document.getElementById(id)?.value.trim();
    if (raw == null || raw === '') return null;
    const n = parseFloat(raw.replace(',', '.'));
    if (!Number.isFinite(n)) return null;
    if (n < 0 || n > 20) return NaN; // sentinela "fora da escala"
    return Math.round(n * 2) / 2; // arredonda a 0.5
}

function saveTest() {
    const subject = document.getElementById('test-subject').value;
    const date = document.getElementById('test-date').value;
    const note = document.getElementById('test-note').value.trim();
    if (!date) { showToast('Escolhe uma data'); return; }
    const target = _parseGradeInput('test-target-grade');
    const actual = _parseGradeInput('test-actual-grade');
    if (Number.isNaN(target)) { showToast('Nota objetivo tem de ser entre 0 e 20'); return; }
    if (Number.isNaN(actual)) { showToast('Nota obtida tem de ser entre 0 e 20'); return; }
    const topics = Array.from(document.querySelectorAll('#test-topics-picker input[type="checkbox"]:checked')).map(cb => cb.value);

    let xpGained = 0;
    if (pendingTestId) {
        const t = state.tests.find(x => x.id === pendingTestId);
        if (t) {
            t.subject = subject;
            t.date = date;
            t.note = note;
            t.topics = topics;
            t.targetGrade = target;
            t.actualGrade = actual;
            // Atribuir XP só na 1.ª vez que a nota obtida é registada
            if (actual != null && !t.gradeXPAwarded) {
                xpGained = Math.min(200, Math.round(actual * 10));
                state.xp += xpGained;
                t.gradeXPAwarded = true;
                t.done = true;
            }
        }
    } else {
        const t = { id: uid(), subject, date, note, topics, done: false, targetGrade: target, actualGrade: actual };
        if (actual != null) {
            xpGained = Math.min(200, Math.round(actual * 10));
            state.xp += xpGained;
            t.gradeXPAwarded = true;
            t.done = true;
        }
        state.tests.push(t);
    }
    saveState();
    const wasEditing = !!pendingTestId;
    closeAddTestModal();
    renderTests();
    renderHome();
    if (xpGained > 0) {
        showToast(`Nota guardada — +${xpGained} XP! 🎉`);
    } else {
        showToast(wasEditing ? 'Teste actualizado' : 'Teste adicionado');
    }
}

function closeAddTestModal() {
    document.getElementById('test-modal').style.display = 'none';
    pendingTestId = null;
}

function editTest(id) { openAddTestModal(id); }

function deleteTest(id) {
    if (!confirm('Apagar este teste?')) return;
    state.tests = state.tests.filter(t => t.id !== id);
    saveState();
    renderTests();
    renderHome();
}

function startTestPrep(testId, opts = {}) {
    const t = state.tests.find(x => x.id === testId);
    if (!t) return;
    t.seenEx = t.seenEx || [];
    // Se bypass, ignora o seenEx e considera todas as perguntas como disponíveis
    const seenSet = opts.bypassSeenCheck ? new Set() : new Set(t.seenEx);

    const key = t.subject;
    const active = activeTopicsFor(key);
    const orderArr = CURRICULUM[key] || [];
    // Tópicos do teste (por ordem curricular); se vazio, todos os activos
    const rawTopics = (t.topics && t.topics.length > 0) ? t.topics : Array.from(active);
    const topicsOrdered = rawTopics
        .filter(tp => active.has(tp))
        .sort((a, b) => orderArr.indexOf(a) - orderArr.indexOf(b));
    if (topicsOrdered.length === 0) { showToast('Sem tópicos activos para este teste.'); return; }

    // Construir pool por tópico, excluindo TUDO o que já foi visto neste teste
    const availableByTopic = {};
    let totalAvailable = 0;
    let totalPool = 0;
    topicsOrdered.forEach(topic => {
        const pool = allExercisesFor(key, new Set([topic]));
        totalPool += pool.length;
        const av = pool.filter(e => !seenSet.has(e.id));
        availableByTopic[topic] = av;
        totalAvailable += av.length;
    });

    if (totalPool === 0) {
        showToast('Sem exercícios para estes tópicos. Ajusta o progresso da disciplina.');
        return;
    }

    // Já respondeu a TODAS — abrir modal com opções
    if (totalAvailable === 0) {
        showAllAnsweredTestModal(testId, totalPool);
        return;
    }

    // Distribuir por tópicos
    const target = Math.max(PRACTICE_QUESTIONS, topicsOrdered.length * 2);
    const perTopic = Math.max(2, Math.ceil(target / topicsOrdered.length));
    const items = [];
    topicsOrdered.forEach(topic => {
        const av = availableByTopic[topic];
        if (av.length === 0) return; // tópico já totalmente respondido — salta
        const chosen = av.sort(() => Math.random() - 0.5).slice(0, perTopic);
        items.push(...chosen);
    });

    if (items.length === 0) {
        showAllAnsweredTestModal(testId, totalPool);
        return;
    }

    // Aviso se restam poucas perguntas (só na sessão normal, não no bypass)
    if (!opts.bypassSeenCheck && totalAvailable < target) {
        showToast(`📚 Só restam ${totalAvailable} perguntas novas — vamos a essas!`);
    }

    currentSession = { items, idx: 0, correct: 0, wrong: 0, xp: 0, streak: 0, results: [], isDaily: false, subject: key, testId, startedAt: Date.now() };
    openExerciseScreen();
    renderQuestion();
}

// Modal: já respondeu a todas as perguntas deste teste
function showAllAnsweredTestModal(testId, totalCount) {
    const t = state.tests.find(x => x.id === testId);
    if (!t) return;
    const sub = SUBJECTS[t.subject];
    const subName = sub?.name || t.subject;

    document.getElementById('all-answered-modal-temp')?.remove();
    const html = `
        <div id="all-answered-modal-temp" class="modal" style="display:flex;align-items:center;justify-content:center;padding:20px">
            <div class="modal-content" style="max-width:480px;border-radius:18px;max-height:90vh">
                <div class="modal-header">
                    <h2>🎉 Treino completo!</h2>
                    <button class="icon-btn" onclick="closeAllAnsweredModal()" aria-label="Fechar"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body" style="text-align:center">
                    <div style="font-size:3.4rem;margin-bottom:10px">📚</div>
                    <p style="margin-bottom:6px;font-size:1rem"><strong>Já respondeste a todas as ${totalCount} perguntas deste teste de ${escapeHtml(subName)}!</strong></p>
                    <p class="muted" style="font-size:0.88rem;margin-bottom:20px">Excelente trabalho. O que queres fazer?</p>
                    <button class="btn btn-block" onclick="continueTestAnyway('${testId}')" style="background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;border:none;font-weight:700;padding:14px;margin-bottom:10px">
                        <i class="fas fa-rotate-left"></i> Responder de novo (mesmas perguntas)
                    </button>
                    <button class="btn btn-block" onclick="closeAllAnsweredModal();startMaxForTest('${testId}')" style="background:linear-gradient(135deg,#7c3aed,#ec4899);color:#fff;border:none;font-weight:700;padding:14px;margin-bottom:10px">
                        <i class="fas fa-wand-magic-sparkles"></i> Carregar novas com IA MAX
                    </button>
                    <button class="btn btn-block btn-secondary" onclick="closeAllAnsweredModal()" style="padding:12px">
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

function closeAllAnsweredModal() {
    document.getElementById('all-answered-modal-temp')?.remove();
}

// Continua o teste com as mesmas perguntas (ignora seenEx para esta sessão)
function continueTestAnyway(testId) {
    closeAllAnsweredModal();
    startTestPrep(testId, { bypassSeenCheck: true });
}

// ========== PROGRESS ==========
function renderProgress() {
    const list = document.getElementById('progress-list');
    list.innerHTML = Object.entries(SUBJECTS).map(([key, sub]) => {
        const stats = state.subjects[key] || { answered: 0, correct: 0, xp: 0 };
        const pct = stats.answered > 0 ? Math.round(stats.correct / stats.answered * 100) : 0;
        return `
            <div class="progress-row">
                <div class="progress-row-head">
                    <div class="progress-row-name">
                        <span class="progress-row-dot" style="background:${sub.color}"></span>
                        ${sub.name}
                    </div>
                    <div class="progress-row-meta">${stats.correct}/${stats.answered} · ${stats.xp} XP</div>
                </div>
                <div class="progress-bar"><div class="progress-bar-fill" style="width:${pct}%;background:${sub.color}"></div></div>
            </div>
        `;
    }).join('');

    // Prémios (visão geral)
    const rewardList = document.getElementById('rewards-list');
    rewardList.innerHTML = (state.rewards || []).sort((a,b) => a.cost - b.cost).map(r => {
        const unlocked = state.xp >= r.cost;
        const cls = r.claimed ? 'claimed' : unlocked ? 'unlocked' : '';
        const icon = r.claimed ? '\u2705' : unlocked ? '\u{1F381}' : '\u{1F512}';
        const barPct = Math.min(100, Math.round(state.xp / r.cost * 100));
        const button = r.claimed
            ? `<button disabled>Resgatado</button>`
            : unlocked
                ? `<button onclick="claimReward('${r.id}')">Resgatar</button>`
                : `<button disabled style="background:#e5e7eb;color:var(--text-light)">${r.cost} XP</button>`;
        return `
            <div class="reward-item ${cls}">
                <div class="reward-item-icon">${icon}</div>
                <div class="reward-item-body">
                    <div class="reward-item-name">${r.name}</div>
                    <div class="reward-item-meta">${r.cost} XP · ${r.claimed ? 'Já resgatado' : unlocked ? 'Pronto a resgatar!' : `${state.xp}/${r.cost}`}</div>
                    ${!r.claimed && !unlocked ? `<div class="reward-item-bar"><div class="reward-item-bar-fill" style="width:${barPct}%"></div></div>` : ''}
                </div>
                ${button}
            </div>
        `;
    }).join('');

    // Medalhas
    const badgeGrid = document.getElementById('badges-grid');
    badgeGrid.innerHTML = BADGES.map(b => {
        const earned = state.badges.includes(b.id);
        return `
            <div class="badge ${earned ? 'earned' : ''}">
                <div class="badge-icon">${b.icon}</div>
                <div class="badge-name">${b.name}</div>
                <div class="badge-desc">${b.desc}</div>
            </div>
        `;
    }).join('');
}

function claimReward(id) {
    const r = (state.rewards || []).find(x => x.id === id);
    if (!r) return;
    r.claimed = true;
    r.claimedAt = todayStr();
    saveState();
    renderProgress();
    renderHome();
    showToast(`Prémio resgatado: ${r.name}!`);
}

// ========== PROFILE SWITCHER (header) ==========
function openProfileSwitcher() {
    let modal = document.getElementById('profile-switcher-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'profile-switcher-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-users"></i> Perfis</h2>
                    <button class="icon-btn" onclick="closeProfileSwitcher()"><i class="fas fa-xmark"></i></button>
                </div>
                <div class="modal-body" id="profile-switcher-body"></div>
            </div>`;
        document.body.appendChild(modal);
    }
    const body = document.getElementById('profile-switcher-body');
    body.innerHTML = state.profiles.map(p => {
        const active = p.id === state.activeProfileId;
        return `
            <div onclick="switchProfile('${p.id}')" style="display:flex;align-items:center;gap:12px;padding:12px;border-radius:12px;background:${active ? '#ede9fe' : '#fff'};border:2px solid ${active ? '#7c3aed' : 'var(--border)'};margin-bottom:8px;cursor:pointer">
                <div style="width:42px;height:42px;border-radius:50%;background:${active ? '#7c3aed' : '#f3f4f6'};color:#fff;font-size:1.4rem;display:flex;align-items:center;justify-content:center">${p.avatar}</div>
                <div style="flex:1;min-width:0">
                    <div style="font-weight:700">${p.name}</div>
                    <div style="font-size:0.78rem;color:var(--text-light)">${p.year}.º ano · ${p.xp} XP</div>
                </div>
                ${active ? '<i class="fas fa-check" style="color:#7c3aed"></i>' : ''}
            </div>`;
    }).join('') + `
        <button class="btn btn-primary-solid btn-block" style="margin-top:6px" onclick="openAddProfileModal()">
            <i class="fas fa-plus"></i> Adicionar perfil
        </button>`;
    modal.style.display = 'flex';
}
function closeProfileSwitcher() {
    const m = document.getElementById('profile-switcher-modal');
    if (m) m.style.display = 'none';
}
function openAddProfileModal() {
    closeProfileSwitcher();
    let modal = document.getElementById('add-profile-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'add-profile-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-user-plus"></i> Novo perfil</h2>
                    <button class="icon-btn" id="add-profile-close" onclick="closeAddProfileModal()"><i class="fas fa-xmark"></i></button>
                </div>
                <div class="modal-body">
                    <label>Nome</label>
                    <input type="text" id="new-profile-name" placeholder="Ex: Eduarda" maxlength="24">
                    <label>Ano de escolaridade</label>
                    <div id="new-profile-years" style="display:flex;gap:8px;margin-bottom:10px"></div>
                    <label>Avatar</label>
                    <div id="new-profile-avatars" class="avatar-grid"></div>
                    <button class="btn btn-primary-solid btn-block" style="margin-top:14px" onclick="addProfileFromForm()">
                        <i class="fas fa-floppy-disk"></i> Criar perfil
                    </button>
                </div>
            </div>`;
        document.body.appendChild(modal);
    }
    // Se ainda não há nenhum perfil, esconde o X (não pode fechar sem criar)
    const closeBtn = document.getElementById('add-profile-close');
    if (closeBtn) closeBtn.style.display = hasAnyProfile() ? '' : 'none';
    document.getElementById('new-profile-name').value = '';
    const yearsHtml = YEARS_AVAILABLE.map((y, i) => `
        <label style="flex:1;display:flex;align-items:center;gap:6px;padding:10px;border:2px solid var(--border);border-radius:10px;cursor:pointer">
            <input type="radio" name="new-profile-year" value="${y.year}" ${i===0?'checked':''}>
            <div><div style="font-weight:700">${y.label}</div><div style="font-size:0.7rem;color:var(--text-light)">${y.cycle}</div></div>
        </label>
    `).join('');
    document.getElementById('new-profile-years').innerHTML = yearsHtml;
    const avGrid = document.getElementById('new-profile-avatars');
    avGrid.innerHTML = AVATARS.map((a, i) => `
        <div class="avatar-option ${i===0?'selected':''}" data-avatar="${a}" onclick="selectNewProfileAvatar(this)">${a}</div>
    `).join('');
    modal.style.display = 'flex';
}
function selectNewProfileAvatar(el) {
    document.querySelectorAll('#new-profile-avatars .avatar-option').forEach(x => x.classList.remove('selected'));
    el.classList.add('selected');
}
function closeAddProfileModal() {
    const m = document.getElementById('add-profile-modal');
    if (m) m.style.display = 'none';
}

// ========== PROFILE (+ rewards editor) ==========
function renderProfile() {
    // Estado do botão "Instalar app"
    try { refreshInstallUI(); } catch {}
    // Listagem de perfis (gestão)
    const pList = document.getElementById('profiles-list');
    if (pList) {
        pList.innerHTML = state.profiles.map(p => {
            const active = p.id === state.activeProfileId;
            return `
                <div style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:10px;background:${active ? '#ede9fe' : '#fff'};box-shadow:var(--shadow-sm);margin-bottom:6px">
                    <div style="width:34px;height:34px;border-radius:50%;background:${active ? '#7c3aed' : '#f3f4f6'};color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.1rem">${p.avatar}</div>
                    <div style="flex:1;min-width:0">
                        <div style="font-weight:600;font-size:0.92rem">${p.name} ${active ? '<span style="color:#7c3aed;font-size:0.7rem">(activo)</span>' : ''}</div>
                        <div style="font-size:0.72rem;color:var(--text-light)">${p.year}.º ano · ${p.xp} XP · ${(p.tests||[]).length} testes</div>
                    </div>
                    ${!active ? `<button class="btn btn-secondary" style="padding:6px 10px;font-size:0.78rem" onclick="switchProfile('${p.id}')">Usar</button>` : ''}
                    <button class="icon-btn" onclick="removeProfile('${p.id}')" title="Apagar perfil"><i class="fas fa-trash" style="color:#dc2626"></i></button>
                </div>`;
        }).join('');
    }

    document.getElementById('input-name').value = state.profile.name;
    const grid = document.getElementById('avatar-grid');
    grid.innerHTML = AVATARS.map(a => `
        <div class="avatar-option ${a === state.profile.avatar ? 'selected' : ''}" onclick="selectAvatar('${a}')">${a}</div>
    `).join('');

    // MAX config
    const maxEnabled = document.getElementById('max-enabled');
    const maxKey = document.getElementById('max-apikey');
    const maxMistralKey = document.getElementById('max-mistral-apikey');
    const maxPreferred = document.getElementById('max-preferred');
    if (maxEnabled) maxEnabled.checked = !!state.max.enabled;
    if (maxKey) maxKey.value = state.max.apiKey || '';
    if (maxMistralKey) maxMistralKey.value = state.max.mistralKey || '';
    if (maxPreferred) maxPreferred.value = state.max.preferredProvider === 'mistral' ? 'mistral' : 'groq';
    const stats = document.getElementById('max-stats');
    if (stats) {
        if (state.max.totalRequests > 0) {
            stats.innerHTML = `<i class="fas fa-chart-simple"></i> ${state.max.totalRequests} sessões geradas · ${state.max.totalGenerated} exercícios criados`;
        } else {
            stats.textContent = '';
        }
    }

    const ed = document.getElementById('rewards-editor');
    ed.innerHTML = (state.rewards || []).map((r, i) => `
        <div class="reward-edit-row">
            <input type="text" value="${r.name.replace(/"/g, '&quot;')}" placeholder="Nome do prémio" oninput="updateRewardName('${r.id}', this.value)">
            <input type="number" min="50" step="50" value="${r.cost}" oninput="updateRewardCost('${r.id}', this.value)">
            <button onclick="removeReward('${r.id}')" title="Remover"><i class="fas fa-trash"></i></button>
        </div>
    `).join('');
}
function selectAvatar(a) {
    state.profile.avatar = a;
    renderProfile();
    updateHeader();
}
function saveProfile() {
    const name = document.getElementById('input-name').value.trim() || 'Aluno(a)';
    state.profile.name = name;
    saveState();
    updateHeader();
    showToast('Perfil guardado!');
}
function updateRewardName(id, val) {
    const r = state.rewards.find(x => x.id === id);
    if (r) { r.name = val; saveState(); }
}
function updateRewardCost(id, val) {
    const r = state.rewards.find(x => x.id === id);
    if (r) { r.cost = Math.max(50, parseInt(val) || 50); saveState(); }
}
function addReward() {
    state.rewards.push({ id: uid(), name: 'Novo prémio', cost: 500, claimed: false });
    saveState();
    renderProfile();
    renderProgress();
}
function removeReward(id) {
    if (!confirm('Remover este prémio?')) return;
    state.rewards = state.rewards.filter(r => r.id !== id);
    saveState();
    renderProfile();
    renderProgress();
    renderHome();
}
function resetRewards() {
    if (!confirm('Voltar aos prémios padrão? Os actuais serão substituídos.')) return;
    state.rewards = JSON.parse(JSON.stringify(DEFAULT_REWARDS));
    saveState();
    renderProfile();
    renderProgress();
    renderHome();
}
function applyRewardPreset(preset) {
    const costs = REWARD_PRESETS[preset];
    if (!costs) return;
    const labels = { facil: 'Fácil', normal: 'Normal', dificil: 'Difícil' };
    if (!confirm(`Aplicar preset "${labels[preset]}"? Os custos actuais serão substituídos.`)) return;
    state.rewards.forEach((r, i) => { if (costs[i]) r.cost = costs[i]; });
    saveState();
    renderProfile();
    renderProgress();
    renderHome();
    showToast(`Preset ${labels[preset]} aplicado`);
}
function toggleMax() {
    state.max.enabled = document.getElementById('max-enabled').checked;
    saveState();
}
function saveMaxConfig() {
    const key = document.getElementById('max-apikey').value.trim();
    const mistralKey = document.getElementById('max-mistral-apikey')?.value.trim() || '';
    const enabled = document.getElementById('max-enabled').checked;
    const preferred = document.getElementById('max-preferred')?.value || 'groq';
    if (enabled && !key && !mistralKey) { showToast('Precisas de pelo menos uma chave (Groq ou Mistral) para activar MAX'); return; }
    if (key && !/^gsk_/.test(key)) { showToast('Chave Groq inválida — deve começar por gsk_'); return; }
    // Chaves Mistral não têm prefixo fixo. Validação mínima de comprimento para evitar
    // que um espaço ou carácter mal colado active o provedor com garbage.
    if (mistralKey && mistralKey.length < 20) { showToast('Chave Mistral parece curta demais'); return; }
    state.max.apiKey = key;
    state.max.mistralKey = mistralKey;
    state.max.preferredProvider = preferred === 'mistral' ? 'mistral' : 'groq';
    state.max.enabled = enabled;
    saveState();
    showToast(enabled ? 'MAX activado!' : 'Configuração guardada');
}

// ========== MAX: chamada à API de IA (Groq → Mistral fallback) ==========
// Ordem de prioridade: Groq (mais rápido, 14 400 pedidos/dia grátis) →
// Mistral (fallback quando o Groq está em rate limit ou indisponível).
// Cada provedor tem uma cadeia de modelos (primário + fallback menor).
// Todos os endpoints são OpenAI-compatible, logo partilham o mesmo formato.
const AI_PROVIDERS = [
    {
        id: 'groq',
        name: 'Groq',
        endpoint: 'https://api.groq.com/openai/v1/chat/completions',
        models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
        stateKey: 'apiKey'
    },
    {
        id: 'mistral',
        name: 'Mistral',
        endpoint: 'https://api.mistral.ai/v1/chat/completions',
        models: ['mistral-small-latest', 'open-mistral-nemo'],
        stateKey: 'mistralKey'
    }
];

const _AI_SYS_JSON = 'Respond ONLY with valid JSON. No markdown, no asterisks, no explanation outside JSON. When writing in Portuguese, always use European Portuguese (Portugal), never Brazilian Portuguese. Use vocabulary, spelling and expressions from Portugal.';
const _AI_SYS_TEXT = 'Always use European Portuguese (Portugal), never Brazilian Portuguese. Use vocabulary, spelling and expressions from Portugal. No markdown, no asterisks.';

async function _callAIProvider(provider, model, prompt, maxTokens, wantJson, key, temperature) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
        const res = await fetch(provider.endpoint, {
            method: 'POST',
            signal: controller.signal,
            headers: { 'content-type': 'application/json', 'authorization': `Bearer ${key}` },
            body: JSON.stringify({
                model, max_tokens: maxTokens, temperature: temperature ?? 0.7,
                messages: [
                    { role: 'system', content: wantJson ? _AI_SYS_JSON : _AI_SYS_TEXT },
                    { role: 'user', content: prompt }
                ]
            })
        });
        return res;
    } finally { clearTimeout(timeout); }
}

// Modelos "fortes" (geração de conteúdo pedagógico exige raciocínio mais
// fiável). Os modelos pequenos (8b-instant, nemo) são úteis para validar
// respostas curtas mas geram exercícios com erros/incoerências.
const _STRONG_MODELS = new Set(['llama-3.3-70b-versatile', 'mistral-small-latest']);

// Detecta padrões "x-y-z → N sílabas/letras" no texto e valida que o número
// bate com a contagem real (de hífens+1 ou de caracteres). Se houver
// contradição interna óbvia, devolve true — o chamador descarta o exercício.
// Só dispara para mismatches descarados — não tenta inferir contagens
// quando o texto não inclui a divisão explícita.
function _hasCountContradiction(text) {
    if (!text || typeof text !== 'string') return false;
    // Padrão: "<token-com-hífenes> → <num> sílaba(s)/letra(s)"
    // Permite setas → -> => ou apenas ":" / "="
    const re = /([\p{L}]+(?:[-‐][\p{L}]+){1,12})\s*(?:→|->|=>|:|=)\s*(\d{1,3})\s*(síl|sil|let)/giu;
    let m;
    while ((m = re.exec(text)) !== null) {
        const division = m[1];
        const stated = parseInt(m[2], 10);
        const kind = m[3].toLowerCase().slice(0, 3);
        if (kind === 'síl' || kind === 'sil') {
            const parts = division.split(/[-‐]/).filter(Boolean).length;
            if (parts !== stated) return true;
        } else if (kind === 'let') {
            // Para letras conta caracteres alfabéticos (sem hífens)
            const letters = division.replace(/[-‐]/g, '').length;
            if (letters !== stated) return true;
        }
    }
    return false;
}

// Distância de Levenshtein (edição) — usada para comparar opções ortográficas.
function _levenshtein(a, b) {
    if (a === b) return 0;
    if (!a) return b.length;
    if (!b) return a.length;
    const m = a.length, n = b.length;
    let prev = new Array(n + 1);
    let curr = new Array(n + 1);
    for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
        curr[0] = i;
        for (let j = 1; j <= n; j++) {
            const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
            curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
        }
        [prev, curr] = [curr, prev];
    }
    return prev[n];
}

// Detecta perguntas de ortografia ("qual está escrita correctamente") onde
// as 4 opções são PALAVRAS DIFERENTES, não variantes ortográficas — caso
// real: A "transporte", B "exceção", C "ação", D "relação" (TODAS bem
// escritas). Numa pergunta legítima de ortografia esperam-se variantes
// próximas (ex.: azeitona/asseitona/aceitona/azeytona).
function _isFakeOrthographyMC(ex) {
    if (ex.type !== 'mc' || !Array.isArray(ex.opts) || ex.opts.length < 3) return false;
    const isOrtoQ = /qual\s+(?:das|destas)?\s*palavras?\s+(?:est[áa]\s+)?(?:escrit[ao]s?|grafad[ao]s?)\s+(?:correc?tamente|bem)/i.test(ex.q || '');
    if (!isOrtoQ) return false;
    const opts = ex.opts.map(o => String(o).toLowerCase().trim());
    let differentPairs = 0;
    let totalPairs = 0;
    for (let i = 0; i < opts.length; i++) {
        for (let j = i + 1; j < opts.length; j++) {
            const d = _levenshtein(opts[i], opts[j]);
            const norm = d / Math.max(opts[i].length, opts[j].length, 1);
            // Variantes ortográficas: 1-2 chars diferentes em palavra de
            // 7-10 letras (~0.1-0.3). Palavras diferentes: >0.4.
            if (norm > 0.4) differentPairs++;
            totalPairs++;
        }
    }
    if (totalPairs === 0) return false;
    // Se 80%+ dos pares são "muito diferentes", são palavras distintas, não
    // variantes ortográficas — pergunta inválida.
    return differentPairs / totalPairs >= 0.8;
}

// Valida exercícios "Quantas destas palavras têm a letra X" — fazemos a
// contagem real char-by-char e descartamos se a resposta não bater.
// Caso real que apanhou: "exceção/ação/nação/relação têm letra ç" →
// resposta "3" (errado, são 4 — todas têm ç). A IA confunde-se com regras
// gramaticais ("ação tem c simples") em vez de olhar para o carácter.
// Devolve true se houver contradição.
function _hasLetterCountError(ex) {
    if (!ex || !ex.q) return false;
    // Padrão: "Quantas (destas)? palavras têm/contêm/possuem a letra 'X'"
    const m = ex.q.match(/quant[ao]s?\s+(?:dest[ae]s\s+)?palavras?\s+(?:t[êe]m|cont[êe]m|possuem|usam)\s+(?:a\s+)?(?:letra|consoante|vogal|carácter|caractere|caracter)\s*['"`]?(.)['"`]?/iu);
    if (!m) return false;
    const letter = m[1].toLowerCase();
    if (!letter || letter.length !== 1) return false;
    // Extrai palavras entre aspas (simples ou duplas) na pergunta
    const wordMatches = [...ex.q.matchAll(/['"`]([\p{L}\p{M}\-]{2,})['"`]/gu)];
    const words = wordMatches.map(w => w[1]).filter(w => w.length > 1);
    if (words.length < 2) return false;
    // Conta as palavras que contêm a letra (case-insensitive, sem
    // normalização — queremos distinguir 'ç' de 'c').
    const actualCount = words.filter(w => w.toLowerCase().includes(letter)).length;
    // Determina o que a IA respondeu como certo
    let stated = null;
    if (ex.type === 'mc' && Array.isArray(ex.opts) && typeof ex.ans === 'number') {
        const optTxt = String(ex.opts[ex.ans] || '').match(/\d+/);
        if (optTxt) stated = parseInt(optTxt[0], 10);
    } else if ((ex.type === 'fill' || ex.type === 'problem') && Array.isArray(ex.ans)) {
        const optTxt = String(ex.ans[0] || '').match(/\d+/);
        if (optTxt) stated = parseInt(optTxt[0], 10);
    }
    if (stated === null) return false;
    return stated !== actualCount;
}

// O prefixo "A " / "B) " / "C: " etc. costuma aparecer no início das opções
// porque o modelo "ajuda" a numerar — mas o renderer já mostra o A/B/C/D
// em círculo, ficando duplicado ("A   A caneca"). Só removemos se TODAS
// as opções tiverem o padrão em sequência (A→B→C→D…) — assim evitamos
// partir opções legítimas como "A bola" (artigo + nome) onde a sequência
// não bateria certo (ia ser A,A,A,A em vez de A,B,C,D).
function _stripLetterPrefixesFromOptions(opts) {
    if (!Array.isArray(opts) || opts.length < 2) return opts;
    const letters = ['A','B','C','D','E','F'];
    const allMatch = opts.every((o, i) => {
        if (typeof o !== 'string') return false;
        const expected = letters[i];
        if (!expected) return false;
        const re = new RegExp('^\\s*' + expected + '\\s*([\\).:\\-–—]\\s*|\\s+)\\S', 'i');
        return re.test(o);
    });
    if (!allMatch) return opts;
    return opts.map(o => o.replace(/^\s*[A-Fa-f]\s*([\).:\-–—]\s*|\s+)/, '').trim());
}

// Há pelo menos um provedor de IA configurado (Groq ou Mistral)?
function hasAIKey() {
    return !!(state?.max?.apiKey || state?.max?.mistralKey);
}

// Mantém o nome callClaudeAPI por compatibilidade com os chamadores existentes
// (apesar de usar Groq/Mistral — o "Claude" é um vestígio histórico).
// opts: { highQuality?: bool, temperature?: number }
//  - highQuality: ignora modelos pequenos (8b/nemo) — usar para gerar
//    exercícios pedagógicos. Os pequenos confundem-se com coerência interna
//    (ex.: dizem "testes é substantivo" e listam-no como verbo).
async function callClaudeAPI(prompt, maxTokens = 3500, wantJson = true, opts = {}) {
    const { highQuality = false, temperature } = opts;
    const active = AI_PROVIDERS
        .map(p => {
            const models = highQuality ? p.models.filter(m => _STRONG_MODELS.has(m)) : p.models;
            return { ...p, key: state.max?.[p.stateKey], models };
        })
        .filter(p => !!p.key && p.models.length > 0);
    if (active.length === 0) throw new Error('Sem chave API');
    // Reordena para o provedor preferido vir primeiro (mantém os restantes
    // na ordem original como fallback).
    const preferred = state.max?.preferredProvider || 'mistral';
    active.sort((a, b) => (a.id === preferred ? -1 : b.id === preferred ? 1 : 0));

    let lastErr = '';
    const preferredName = active[0].name; // após o sort, o primeiro é o preferido (se disponível)
    for (let pi = 0; pi < active.length; pi++) {
        const p = active[pi];
        for (let mi = 0; mi < p.models.length; mi++) {
            const model = p.models[mi];
            let res;
            try {
                res = await _callAIProvider(p, model, prompt, maxTokens, wantJson, p.key, temperature);
            } catch (e) {
                if (e.name === 'AbortError') { lastErr = `${p.name}: tempo esgotado (30s)`; break; }
                lastErr = `${p.name}: rede: ${e.message}`;
                break;
            }
            if (res.ok) {
                const data = await res.json();
                const text = data.choices?.[0]?.message?.content || '';
                if (!text) { lastErr = `${p.name}: resposta vazia`; break; }
                // Aviso visível quando o provider preferido falha e foi usado fallback
                if (pi > 0) {
                    console.warn(`MAX: usado fallback ${p.name}/${model} (preferido ${preferredName} falhou: ${lastErr})`);
                    if (typeof showToast === 'function') {
                        try { showToast(`⚠️ ${preferredName} falhou — usei ${p.name}`); } catch(_) {}
                    }
                } else if (mi > 0) {
                    console.warn(`MAX: usado modelo alternativo ${p.name}/${model}`);
                }
                return { text, usage: data.usage, model, provider: p.id, providerName: p.name, usedFallback: pi > 0 };
            }
            const errText = await res.text().catch(() => '');
            lastErr = `${p.name} ${res.status}: ${errText.slice(0, 200)}`;
            // 429 (rate limit) ou 503 (sobrecarga): tenta o próximo modelo do mesmo provedor.
            // Qualquer outro erro (401 chave inválida, 400 pedido mau, 500 servidor):
            // salta directamente para o próximo provedor.
            if (res.status !== 429 && res.status !== 503) break;
        }
    }
    throw new Error(lastErr || 'Erro desconhecido AI');
}

async function generateMaxExercises(subjectKey, topics, count = 12, testPrep = false) {
    const sub = SUBJECTS[subjectKey];
    const subName = sub.fullName || sub.name;
    const topicsStr = topics.join(', ');
    const isEnglish = subjectKey === 'ingles';
    const yr = activeProfile()?.year || 6;

    // Persona e regras por ano (aderente ao Programa e Aprendizagens Essenciais — AE 2018 — DGE/ME Portugal)
    let persona;
    if (yr === 2) {
        persona = `És uma professora titular do 2.º ano do 1.º ciclo do Ensino Básico português, com 15+ anos de experiência e formação em métodos pedagógicos para crianças de 7-8 anos. Crias exercícios EXACTAMENTE de acordo com as Aprendizagens Essenciais (AE 2018, DGE/ME) e com os manuais escolares de referência usados em Portugal (Texto "Pasta Mágica", Porto Editora "Alfa", Leya "Top!", Santillana "A Grande Aventura"). Usas vocabulário simples, frases curtas e contextos concretos do dia-a-dia da criança (família, escola, brinquedos, fruta, animais, dinheiro pequeno). Português Europeu, sempre.`;
    } else if (yr === 5) {
        persona = `És um professor titular do 5.º ano do 2.º ciclo do Ensino Básico português, com 15+ anos de experiência. Crias exercícios EXACTAMENTE de acordo com as Aprendizagens Essenciais (AE 2018, DGE/ME) e com os manuais escolares de referência usados em Portugal (Porto Editora "Diálogos"/"Numa Aventura"/"Páginas"; Texto "Mensagens"/"Asa"; Leya "Novo Plural"; Santillana). O 5.º ano é o início do 2.º ciclo: foca conceitos novos sem assumir tudo do 1.º ciclo. Português Europeu, sempre.`;
    } else if (yr === 6) {
        persona = `És uma professora titular do 6.º ano do 2.º ciclo do Ensino Básico português, com 15+ anos de experiência. Crias exercícios EXACTAMENTE de acordo com as Aprendizagens Essenciais (AE 2018, DGE/ME) e com os manuais escolares de referência usados em Portugal (Porto Editora "Diálogos 6"/"Eureka 6"/"MSI 6"; Texto "Mensagens 6"; Leya "(MAT) Pi 6"). O 6.º ano consolida e aprofunda — exige raciocínio mais elaborado que o 5.º (frações operatórias, potências, funções sintáticas, modos verbais avançados). Português Europeu, sempre.`;
    } else {
        persona = `És um(a) professor(a) titular do ${yr}.º ano do Ensino Básico português, com 15+ anos de experiência, aderente às AE 2018 da DGE/ME e aos manuais escolares de referência (Porto Editora, Texto, Leya, Santillana). Português Europeu, sempre.`;
    }

    let ageRule;
    if (yr === 2) {
        ageRule = 'IDADE: 7-8 anos. Frases curtas (máx. 15 palavras). Vocabulário simples e familiar. Em Matemática (AE 2.º ano): contar/ler/escrever até 1000, valor posicional (centenas/dezenas/unidades), adição e subtração com transporte/empréstimo até 100 (até 1000 sem), tabuada do 2/3/4/5/6/10, sequências, sólidos geométricos básicos, simetria, dinheiro até 20€, leitura de horas certas e meias. PROIBIDO: frações com denominador ≠ 2, 3 ou 4; percentagens; decimais; potências; números negativos; equações; divisões longas.';
    } else if (yr === 5) {
        ageRule = 'IDADE: 10-11 anos. Estritamente conteúdos do 5.º ano segundo as AE: números naturais, divisibilidade básica, frações iniciais, perímetros, áreas elementares, ângulos, retas, classes de palavras, funções sintáticas básicas (sujeito, predicado), seres vivos, classificação animal, geografia de Portugal, pré-história/romanos/muçulmanos/fundação. NÃO entres em conteúdos do 6.º ano (operações com frações, potências, sistema digestivo/circulatório, séc. XV em diante).';
    } else if (yr === 6) {
        ageRule = 'IDADE: 11-12 anos. Estritamente conteúdos do 6.º ano segundo as AE: números racionais e operações com frações, potências de expoente natural, sequências, proporcionalidade direta, áreas/volumes, isometrias, estatística (média/mediana/moda); funções sintáticas avançadas (CD, CI, modificador, predicativo do sujeito), modos verbais (incl. conjuntivo), tempos compostos, discurso direto/indireto; sistemas do organismo humano; História de Portugal séc. XV-XX (Expansão, União Ibérica, Restauração, Iluminismo, Liberalismo, 1.ª República, Estado Novo, 25 de Abril). NÃO recuar para conteúdos do 5.º.';
    } else {
        ageRule = `IDADE adequada ao ${yr}.º ano. Estritamente conteúdos desse ano segundo as AE.`;
    }

    let langRule;
    // Reforço anti-BR-PT que se aplica sempre (excepto inglês)
    const ptStrict = isEnglish ? '' : `

PORTUGUÊS DE PORTUGAL — REGRA OBRIGATÓRIA. NÃO uses NENHUMA destas palavras/expressões brasileiras:
- "gols" → escreve "golos"
- "time" (de futebol) → escreve "equipa"
- "estar economizando" → escreve "estar a poupar"
- "estar estudando/comendo/jogando/correndo" → escreve "estar a estudar/comer/jogar/correr"
- "trem" → escreve "comboio"
- "ônibus" → escreve "autocarro"
- "celular" → escreve "telemóvel"
- "geladeira" → escreve "frigorífico"
- "abacaxi" → escreve "ananás"
- "sorvete" → escreve "gelado"
- "esporte" → escreve "desporto"
- "garoto/garota" → escreve "rapaz/rapariga"
- "mamãe/papai" → escreve "mãe/pai"
- "café da manhã" → escreve "pequeno-almoço"
- "geladeira/legal/maneiro" → não usar
- "você" → escreve "tu" (excepto em contexto formal escolar)

Verifica TODAS as perguntas e explicações antes de devolver. Se encontrares qualquer palavra brasileira, reescreve em português europeu.`;
    if (isEnglish && yr === 2) {
        langRule = `LANGUAGE — INGLÊS 2.º ANO (REGRA ESTRITA):
- A criança tem 7-8 anos e ainda não lê inglês fluentemente.
- A pergunta "q" e a explicação "exp" devem estar em PORTUGUÊS EUROPEU.
- APENAS as palavras inglesas a aprender aparecem em inglês (nas opções "opts" e citadas dentro da pergunta entre aspas).
- Inclui SEMPRE um emoji visual na pergunta (🐶, 🔴, 🖐️, 👋, 🌙, etc.) que dá a pista do conteúdo.
- Tipo: usar APENAS "mc" com 3 opções (todas palavras inglesas reais e curtas, ex: ['cat','dog','bird']).
- PROIBIDO: "tf", "fill", "problem". PROIBIDO frases inglesas longas.
- Tópicos do 2.º: Cores (red/blue/yellow/green/pink/black/white), Números 1-5 (one/two/three/four/five), Animais (dog/cat/fish/bird/rabbit/horse), Família (mum/dad/sister/brother/grandma/grandpa), Cumprimentos (Hello/Good morning/Good night/Bye/Thank you).
EXEMPLO BOM: { "type":"mc", "q":"🐶 Que animal é em inglês?", "opts":["cat","dog","bird"], "ans":1, "exp":"🐶 = dog (cão)." }
EXEMPLO PROIBIDO: { "q":"What color is the apple?", "opts":[...] } — pergunta em inglês não!`;
    } else if (isEnglish) {
        langRule = `LANGUAGE: All content (passages, questions, options, answers, explanations) must be in ENGLISH at A2/B1 level for a Portuguese student.`;
    } else {
        langRule = 'LANGUAGE: Português Europeu (Portugal), Acordo Ortográfico 1990. Vocabulário e expressões de Portugal, nunca do Brasil.';
    }

    let mathNote = '';
    if (subjectKey === 'matematica') {
        if (yr === 2) {
            mathNote = '\nMATEMÁTICA 2.º ano: Apenas conceitos do 2.º ano. Em problemas, usa contextos concretos (cromos, chocolates, berlindes, brinquedos, dinheiro pequeno). Apresenta números bem espaçados. EVITA filas longas de algarismos sem espaços.';
        } else if (yr === 5) {
            mathNote = '\nMATEMÁTICA 5.º ano: Números naturais, MDC/MMC, divisibilidade, frações simples (introdução), percentagens elementares, ângulos, perímetros, áreas de quadriláteros simples. EVITAR: operações complexas com frações, potências, volumes, isometrias (são do 6.º).';
        } else if (yr === 6) {
            mathNote = '\nMATEMÁTICA 6.º ano: Operações com frações, potências de expoente natural, prioridade de operações, mmc/mdc avançado, áreas (paralelogramo, triângulo, trapézio, círculo), volumes (prismas, cilindros), proporções, percentagens avançadas, sequências, estatística (média/mediana/moda), isometrias. PROIBIDO: adição/subtração simples sem contexto, ou conteúdos do 5.º isolados.';
        }
    }

    // Regras anti-erro para tipo 'tf' — historicamente o modelo gera tf com ans incorrecto
    let tfRule = '\nREGRA TF: Para cada exercício "tf", verifica MATEMATICAMENTE/FACTUALMENTE a afirmação ANTES de definir ans_tf. Se houver QUALQUER ambiguidade, NÃO uses tf — usa mc ou fill. Exemplos PROIBIDOS de tf: "O número X é composto por Y dezenas e Z unidades" (ambíguo se X = Y×10+Z é Verdadeiro mas pode ser interpretado de outra forma).';
    if (yr === 2 && subjectKey === 'matematica') {
        tfRule = '\nREGRA TF: PROIBIDO usar tipo "tf" em Matemática do 2.º ano (crianças de 7 anos confundem-se com afirmações). Usa apenas mc, fill ou problem.';
    }

    // Regra específica para Português 2.º ano — evitar perguntas absurdas ("ctd", "cidad", abreviações)
    let portugueseRule = '';
    if (yr === 2 && subjectKey === 'portugues') {
        portugueseRule = `\n\nPERSONA REFORÇADA — PROFESSORA DE PORTUGUÊS DO 2.º ANO:
És a Professora Eduarda, 20 anos de experiência a ensinar Português no 1.º ciclo, especialista em literacia inicial (métodos da Maria José Araújo, Inês Sim-Sim, e dos manuais "Pasta Mágica"/"Alfa"/"Top!"/"A Grande Aventura"). Crianças de 7-8 anos.

REGRAS PEDAGÓGICAS (OBRIGATÓRIAS):
1. SÓ usa palavras REAIS do português — palavras que uma criança de 7 anos ouve em casa, na escola, em livros infantis (cão, gato, mãe, pai, escola, livro, sol, lua, casa, pão, mesa, cadeira, fruta, flor, mar, areia, brinquedo, chuva, vento, peixe, bola).
2. PROIBIDO inventar abreviações ou strings incompletas como "ctd", "csa", "lvr". Se quiseres testar reconhecimento de letras, usa palavras COMPLETAS.
3. PROIBIDO pedir para "adivinhar" qual é a palavra a partir de consoantes — isso é um puzzle de adultos, não pedagogia de 2.º ano.
4. Para "Vogais e consoantes" — pergunta antes: "Quantas vogais tem a palavra MENINA?" / "Qual é a primeira letra da palavra ESCOLA?" / "Indica uma vogal da palavra GATO." NUNCA "Qual a vogal que falta em 'gt'?".
5. Para "Sílabas" — usa palavras de 2-4 sílabas familiares (ca-sa, me-ni-na, bo-rra-cha, e-le-fan-te). Pede para CONTAR sílabas ou DIVIDIR uma palavra dada.
6. Para "Sinónimos/Antónimos" — usa pares simples e claros (bonito/feio, alto/baixo, alegre/triste, grande/pequeno, dia/noite). NÃO uses sinónimos cultos.
7. Para "Tipos de frase" — usa frases CURTAS e do dia-a-dia: "O cão ladra." / "Onde está a Joana?" / "Que casa grande!" / "Fecha a porta."
8. Para "Verbos no presente" — verbos comuns (ser, estar, ter, ir, comer, beber, brincar, correr, dormir, ler, escrever).
9. As OPÇÕES de mc devem ser todas palavras REAIS, não strings absurdas. Distratores plausíveis (mesma classe gramatical, sentido relacionado).
10. Explicações "exp" devem ser CARINHOSAS e simples, como uma professora a falar com a criança ("Boa! O 'gato' tem 2 vogais: o 'a' e o 'o'.").

EXEMPLOS DE PERGUNTAS BOAS:
- "Quantas sílabas tem a palavra 'borboleta'?" (mc: 2/3/4/5)
- "Qual é o sinónimo de 'feliz'?" (mc: triste/alegre/zangado/cansado)
- "Na frase 'A Maria comeu uma maçã', quem comeu?" (mc: Maria/maçã/comeu/uma)
- "Completa: O contrário de 'pequeno' é ___." (fill: grande)

EXEMPLOS DE PERGUNTAS PROIBIDAS (NÃO GERES NUNCA):
- "Qual é a vogal que falta em 'ctd'?" — palavra inventada, sem sentido para criança
- "Adivinha a palavra: c_sa" — adivinhação, não aprendizagem
- "Qual é o sinónimo de 'volátil'?" — vocabulário fora do 2.º ano`;
    }

    // Variedade: lista perguntas existentes para o GROQ evitar repetir
    const existingForTopics = (state.maxExercises || [])
        .filter(e => e.s === subjectKey && topics.includes(e.t))
        .slice(-30)
        .map(e => `- ${(e.q || '').slice(0, 90)}`)
        .join('\n');
    const avoidBlock = existingForTopics
        ? `\n\nPERGUNTAS JÁ FEITAS NO PASSADO (NÃO REPITAS, nem variações superficiais):\n${existingForTopics}\n\nVARIA o início das perguntas — NÃO comeces sempre por "Qual" ou "O que". Usa também: "Calcula...", "Indica...", "Considera...", "Numa frase como...", "Imagina que...", "Resolve...", "Compara...", "Quantos...", "Em que...", "Como classificas...", "Que valor...".`
        : '\n\nVARIA o início das perguntas: usa "Qual", "Calcula", "Indica", "Considera", "Imagina que", "Resolve", "Compara", "Quantos", "Em que", "Como", "Que valor".';

    const prompt = `${persona}

DISCIPLINA: ${subName}
TÓPICOS: ${topicsStr}
QUANTIDADE: ${count} exercícios
MODO: ${testPrep ? `PREPARAÇÃO PARA TESTE — simula perguntas de exame${yr === 2 ? ' adequadas ao 2.º ano' : ''}, cobrindo os tópicos em profundidade. ${yr === 2 ? 'Pelo menos 4 exercícios de dificuldade 2.' : 'Pelo menos 6 exercícios de dificuldade 3.'} Inclui sempre "solution" detalhada.` : 'TREINO — variedade de tipos e dificuldades'}
${ageRule}
${langRule}${ptStrict}${mathNote}${tfRule}${portugueseRule}${avoidBlock}

CRITÉRIOS DE QUALIDADE (OBRIGATÓRIOS):
1. Cada exercício testa um conceito específico do ${yr}.º ano — não anos anteriores nem posteriores.
2. Perguntas claras, sem ambiguidade, uma única resposta correcta.
3. Nas opções múltiplas, distratores plausíveis mas claramente errados para quem sabe.
4. Problemas com contexto real adequado à idade (${yr === 2 ? 'casa, escola, animais, fruta, brinquedos, dinheiro' : 'escola, desporto, família, natureza, tecnologia'}).
5. A explicação "exp" ensina o raciocínio, não apenas confirma a resposta.
6. ${yr === 2 ? '2-3' : 'Pelo menos 4'} exercícios de dificuldade ${yr === 2 ? '2' : '3'}.
7. NUNCA repitas perguntas óbvias ou triviais que qualquer criança saberia sem estudar.

REGRA DE COERÊNCIA INTERNA (CRÍTICA — falhas aqui invalidam o exercício):
A. A resposta correcta DEVE ser consistente com a explicação "exp". Se a explicação diz "X é Y", a resposta NÃO pode contradizer isso.
B. Antes de devolver, RELÊ cada exercício: a explicação justifica a resposta indicada? Se não, corrige a resposta OU a explicação.
C. Em perguntas de identificação ("quantos X há na frase", "indica os X"), VERIFICA palavra a palavra. Não confies na intuição — analisa cada termo.
D. Para classes de palavras: VERBO = ação/estado (estudar, ser, ter, correr); SUBSTANTIVO = nome de coisa/ser/conceito (testes, alunos, turma); ADJECTIVO = qualifica (bonito, alto). PALAVRAS QUE TERMINAM EM "-es" PODEM SER PLURAIS DE SUBSTANTIVO (testes, peixes, lápis) — não são verbos só pela terminação.
E. Para problemas de matemática: REFAZ o cálculo passo a passo antes de gravar o ans_fill. Se 3+4=7, ans_fill="7", não "8".
F. Para tf: a afirmação tem de ser inequivocamente V ou F. Se houver dúvida, troca para mc.
G. Em mc, EXACTAMENTE 1 das opções é correcta — as outras 3 são CLARAMENTE incorrectas. NUNCA "todas estão certas" nem "duas estão certas". PROIBIDO duas opções IGUAIS (ex.: A "transporte", B "transporte"). VERIFICA antes de fechar: as 4 strings de opts são DIFERENTES entre si.

G3. ORTOGRAFIA — "qual está escrita correctamente": as 4 opções TÊM de ser VARIANTES DA MESMA PALAVRA (1 certa + 3 com erros ortográficos diferentes). PROIBIDO listar 4 palavras diferentes todas correctas.
   ❌ ERRADO: A "transporte" / B "exceção" / C "ação" / D "relação" — são 4 palavras diferentes, TODAS bem escritas. Não há resposta errada.
   ✅ CERTO: A "exceção" / B "esceção" / C "excessão" / D "exceição" — variantes da mesma palavra, 1 certa + 3 erradas.
   ✅ CERTO (AO 1990): A "ato" / B "acto" / C "atto" / D "actto" — testa a queda das consoantes mudas.
   ✅ CERTO: A "azeitona" / B "asseitona" / C "aceitona" / D "azeytona".
   REGRA: as 4 opções devem partilhar pelo menos 60% dos caracteres em comum (variantes próximas).
G2. Em mc com listas ("quais são os X", "indica os X da frase", "quantos X há e quais"), a opção correcta tem de listar TODOS os X da frase — EXAUSTIVA. Se a frase tem 3 determinantes (A, minha, a), a opção certa lista os 3 — não vale "minha, a" porque omite o "A".
   Exemplo PROIBIDO: pergunta "Quais são os determinantes em 'A minha professora explicou a lição com paciência'?", opções "A,a"/"minha,a"/"explicou,a"/"paciência,a" — TODAS incompletas (faltam pelo menos um determinante). Reformula: ou inclui uma opção "A, minha, a", ou muda a frase para ter só 2 determinantes em vez de 3, ou usa fill em vez de mc.
   ANTES DE FECHAR um mc deste tipo: identifica TODOS os X da frase, e confirma que a opção marcada como correcta os contém TODOS.
H. As "opts" contêm APENAS o texto da opção — NUNCA prefixes com "A)", "A.", "A -", "A " ou similar. O sistema renderiza a letra automaticamente. Errado: "A caneca" / "B) ananás". Certo: "caneca" / "ananás".
J. CEDILHA (Ç): a terminação "-ção" e "-são" das palavras portuguesas é ESCRITA com Ç (não com C simples). Palavras com Ç: ação, nação, relação, exceção, coração, lição, função, atenção, situação, exposição, reação. NUNCA digas que "ação" ou "nação" se escrevem com "c simples" — é falso. A regra "ç antes de a/o/u" significa que Ç ANTECEDE 'a/o/u' (incluindo 'ã'). A regra "c antes de e/i" aplica-se a casos como 'cebola', 'cidade'. Se uma pergunta perguntar "quantas das palavras X, Y, Z têm a letra ç", CONTA carácter a carácter — não confies em raciocínio gramatical.
I. CONTAGEM (letras, sílabas, palavras, sons): se mostras uma divisão com hífen (ex-ce-ci-o-nal), o número de partes separadas por hífen TEM DE BATER com o número anunciado. CONTA os hífenes + 1 antes de escrever o número.
   Exemplo PROIBIDO: "ex-ce-ci-o-nal → 4 sílabas" (são 5 partes!).
   Exemplo BOM: "ex-ce-ci-o-nal → 5 sílabas" OU "ex-ce-cio-nal → 4 sílabas" (escolhe uma divisão e conta-a).
   PALAVRAS COM CONTAGEM TÍPICA (PT-PT, divisão padrão dicionário Priberam):
   - excecional: ex-ce-ci-o-nal (5 sílabas, 10 letras)
   - nacional: na-ci-o-nal (4 sílabas)
   - racional: ra-ci-o-nal (4 sílabas)
   - função: fun-ção (2 sílabas)
   - história: his-tó-ria (3 sílabas)
   - borboleta: bor-bo-le-ta (4 sílabas)
   - escola: es-co-la (3 sílabas)
   Se não tens 100% de certeza da divisão, ESCOLHE outra palavra mais simples.

EXEMPLO PROIBIDO (NÃO geres NUNCA exercícios assim):
{"q":"Na frase 'Os alunos estudam para os testes', quantos verbos há?","opts":["1","2","3","4"],"ans_mc":1,"exp":"'Testes' é um substantivo, não um verbo, mas a resposta é 2 verbos: estudam, testes."}
↑ INCOERENTE: a explicação diz que "testes" é substantivo mas a resposta conta-o como verbo. CORRIGIR para ans_mc:0 (1 verbo: estudam) e exp coerente.

EXEMPLO BOM:
{"q":"Na frase 'Os alunos estudam para os testes', quantos verbos há?","opts":["1","2","3","4"],"ans_mc":0,"exp":"Há 1 verbo: 'estudam' (ação). 'Testes' parece um verbo pela terminação -es mas é o plural do substantivo 'teste'."}

TIPOS DISPONÍVEIS:
- "mc": escolha múltipla, 4 opções (1 correcta, 3 distratores plausíveis)
- "tf": verdadeiro ou falso (afirmação completa e precisa)
- "fill": completar frase com lacuna ___ (aceita variantes ortográficas em ans_fill)
- "problem": problema com contexto real; "material" = fórmula/regra; "solution" = resolução passo a passo numerada
- "passage": texto informativo de 3-5 frases + pergunta de compreensão/aplicação. Para visual:
   - SVG (campo "svg", viewBox="0 0 220 160", máx. 220 unidades de largura): APENAS para Matemática (figuras geométricas: triângulos, círculos, polígonos, ângulos) e Ciências (diagramas, esquemas científicos, gráficos de barras). PROIBIDO para Português, História, Inglês ou qualquer análise textual/gramatical. NUNCA metas frases longas dentro de <text> SVG — o texto NÃO QUEBRA linha em SVG e fica cortado no viewBox de 220px. Se uma <text> tem mais de 25 caracteres, NÃO uses SVG.
   - "table" (HTML <table>): para análise sintáctica, classes de palavras, comparação de termos, tabelas de dados. Usa <th>/<td> normais. Aqui podes pôr texto longo — a tabela quebra linha no telemóvel.

LIÇÕES: para cada tópico, escreve uma mini-lição de 2-3 frases no campo "lessons" que explique o conceito principal de forma simples.

Responde APENAS com JSON válido (sem markdown, sem texto fora do JSON):

{"lessons":{"<tópico>":"<mini-lição 2-3 frases>"},"exercises":[
  {"t":"<tópico>","type":"mc","diff":2,"q":"<pergunta>","opts":["<A>","<B>","<C>","<D>"],"ans_mc":<0-3>,"exp":"<explicação pedagógica>"},
  {"t":"<tópico>","type":"tf","diff":1,"q":"<afirmação completa>","ans_tf":<true|false>,"exp":"<explicação>"},
  {"t":"<tópico>","type":"fill","diff":2,"q":"<frase com ___ no meio>","ans_fill":["<resposta>","<variante>"],"exp":"<explicação>"},
  {"t":"<tópico>","type":"problem","diff":3,"q":"<enunciado com dados concretos>","ans_fill":["<valor>"],"material":"<regra ou fórmula>","solution":"<passo 1. passo 2. resultado>","exp":"<dica>"},
  {"t":"<tópico>","type":"passage","diff":3,"passage":"<texto 3-5 frases>","q":"<pergunta>","ans_fill":["<resposta>"],"svg":"<SVG>","exp":"<explicação>"}
]}`;

    // highQuality: usa só os modelos grandes (70b/small) — os pequenos
    // (8b-instant, nemo) geram exercícios com incoerências.
    // temperature 0.4: mais determinista, reduz alucinações em respostas factuais.
    const { text, usage } = await callClaudeAPI(prompt, 4000, true, { highQuality: true, temperature: 0.4 });
    // Extrair o JSON (o modelo pode envolver em markdown apesar da instrução)
    let jsonStr = text.trim();
    const fence = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) jsonStr = fence[1].trim();
    const start = jsonStr.indexOf('{');
    const end = jsonStr.lastIndexOf('}');
    if (start < 0 || end < 0) throw new Error('Resposta não contém JSON');
    jsonStr = jsonStr.slice(start, end + 1);
    jsonStr = jsonStr.replace(/\*\*/g, '').replace(/\*/g, '');
    let parsed;
    try { parsed = JSON.parse(jsonStr); }
    catch (e) { throw new Error('JSON inválido: ' + e.message); }
    // Pós-processamento: limpa termos BR-PT (brToPt) e SVGs triviais
    // (_isTrivialSvg). Helpers globais definidos perto de loadState.
    const _toPT = (s) => isEnglish ? s : brToPt(s);
    const items = (parsed.exercises || []).map((raw, i) => {
        const rawTopic = (raw.t || '').toLowerCase();
        const matchedTopic = topics.find(t => t.toLowerCase() === rawTopic) || topics[0];
        const ex = {
            id: `max_${Date.now()}_${i}`,
            s: subjectKey,
            t: matchedTopic,
            type: raw.type,
            diff: Math.max(1, Math.min(3, raw.diff || 2)),
            q: isEnglish ? raw.q : _toPT(raw.q),
            exp: isEnglish ? (raw.exp || '') : _toPT(raw.exp || '')
        };
        if (raw.type === 'mc') {
            const cleaned = (raw.opts || []).map(o => isEnglish ? o : _toPT(o));
            ex.opts = _stripLetterPrefixesFromOptions(cleaned);
            ex.ans = raw.ans_mc;
        }
        else if (raw.type === 'tf') { ex.ans = raw.ans_tf; }
        else if (raw.type === 'fill' || raw.type === 'problem') {
            const ansArr = Array.isArray(raw.ans_fill) ? raw.ans_fill : [String(raw.ans_fill)];
            ex.ans = isEnglish ? ansArr : ansArr.map(a => _toPT(String(a)));
        }
        if (raw.type === 'passage') {
            ex.passage = isEnglish ? (raw.passage || '') : _toPT(raw.passage || '');
            const ansArr = Array.isArray(raw.ans_fill) ? raw.ans_fill : [String(raw.ans_fill || '')];
            ex.ans = isEnglish ? ansArr : ansArr.map(a => _toPT(String(a)));
            if (raw.table) ex.table = raw.table;
            // Descartar SVGs triviais (apenas um quadrado colorido sem geometria real)
            if (raw.svg && !_isTrivialSvg(raw.svg) && !_isTextHeavySvg(raw.svg)) ex.svg = raw.svg;
        }
        if (raw.material) ex.material = isEnglish ? raw.material : _toPT(raw.material);
        if (raw.solution) ex.solution = isEnglish ? raw.solution : _toPT(raw.solution);
        return ex;
    }).filter(e => {
        if (!e.q || !e.type) return false;
        if (e.type === 'tf' ? typeof e.ans !== 'boolean' : e.ans === undefined) return false;
        // Descarta exercícios com contradição interna na contagem
        // (ex.: "ex-ce-ci-o-nal → 4 sílabas" — são 5 partes, não 4).
        const fullText = [e.q, e.exp, e.solution, e.material, ...(Array.isArray(e.ans) ? e.ans : [])].join(' ');
        if (_hasCountContradiction(fullText)) {
            console.warn('MAX: descartado por contradição de contagem:', e.q?.slice(0, 60));
            return false;
        }
        // Descarta "quantas palavras têm a letra X" com contagem errada
        // (ex.: 'exceção/ação/nação/relação' → 4 têm ç, IA disse 3).
        if (_hasLetterCountError(e)) {
            console.warn('MAX: descartado por contagem errada de letras:', e.q?.slice(0, 60));
            return false;
        }
        // Descarta mc com opções duplicadas (ex.: A "transporte", B "transporte"
        // — duas correctas, viola "exactamente 1").
        if (e.type === 'mc' && Array.isArray(e.opts)) {
            const seen = new Set();
            for (const o of e.opts) {
                const key = String(o || '').trim().toLowerCase();
                if (!key) continue;
                if (seen.has(key)) {
                    console.warn('MAX: descartado por opção duplicada:', e.q?.slice(0, 60));
                    return false;
                }
                seen.add(key);
            }
        }
        // Descarta ortografia "qual está correctamente escrita" com 4
        // palavras diferentes (todas reais, sem opção errada).
        if (_isFakeOrthographyMC(e)) {
            console.warn('MAX: descartado — ortografia com palavras todas diferentes:', e.q?.slice(0, 60));
            return false;
        }
        return true;
    });
    if (items.length === 0) throw new Error('Nenhum exercício válido na resposta');
    const lessons = parsed.lessons || {};
    return { items, lessons, usage };
}

function showMaxLoader(msg) {
    const el = document.getElementById('max-loader');
    if (msg) document.getElementById('max-loader-msg').textContent = msg;
    el.style.display = 'flex';
}
function hideMaxLoader() {
    document.getElementById('max-loader').style.display = 'none';
}

function maxCacheKey(subjectKey, topics) {
    return 'max_cache_' + subjectKey + '_' + topics.slice().sort().join('|');
}
function getMaxCache(subjectKey, topics) {
    try {
        const raw = localStorage.getItem(maxCacheKey(subjectKey, topics));
        if (!raw) return null;
        const { items, ts } = JSON.parse(raw);
        // Cache válido por 30 dias
        if (Date.now() - ts > 30 * 24 * 3600 * 1000) return null;
        return items;
    } catch(e) { return null; }
}
function setMaxCache(subjectKey, topics, items) {
    try {
        localStorage.setItem(maxCacheKey(subjectKey, topics), JSON.stringify({ items, ts: Date.now() }));
    } catch(e) {}
}

async function startMaxSession(subjectKey, opts = {}) {
    if (!state.max.enabled || !hasAIKey()) {
        showToast('Activa o MAX no Perfil primeiro');
        switchTab('profile');
        return;
    }
    const active = activeTopicsFor(subjectKey);
    let topics = opts.topics && opts.topics.length > 0 ? opts.topics : Array.from(active);
    topics = topics.filter(t => active.has(t));
    if (topics.length === 0) { showToast('Sem tópicos activos. Ajusta o progresso da disciplina.'); return; }
    const order = CURRICULUM[subjectKey] || [];
    topics = topics.sort((a, b) => order.indexOf(a) - order.indexOf(b)).slice(0, 6);
    if (currentSubjectView) closeSubjectDetail();

    // Usar cache se existir (evita chamadas à API desnecessárias)
    const forceNew = opts.forceNew || false;
    const cached = !forceNew && getMaxCache(subjectKey, topics);
    if (cached) {
        const shuffled = [...cached].sort(() => Math.random() - 0.5);
        currentSession = { items: shuffled, idx: 0, correct: 0, wrong: 0, xp: 0, streak: 0, isDaily: false, subject: subjectKey, isMax: true };
        openExerciseScreen();
        renderQuestion();
        return;
    }

    const isTestPrep = opts.testPrep || false;
    showMaxLoader(isTestPrep ? 'A preparar simulação de teste…' : 'A gerar exercícios novos com IA…');
    try {
        const { items, lessons } = await generateMaxExercises(subjectKey, topics, 12, isTestPrep);
        setMaxCache(subjectKey, topics, items);
        // Guardar no pool offline permanente
        const existingIds = new Set((state.maxExercises || []).map(e => e.id));
        const newExs = items.filter(e => !existingIds.has(e.id));
        state.maxExercises = [...(state.maxExercises || []), ...newExs].slice(-500);
        // Guardar mini-lições
        Object.entries(lessons).forEach(([topic, text]) => {
            state.maxLessons[`${subjectKey}/${topic}`] = { title: topic, body: text };
        });
        state.max.totalGenerated = (state.max.totalGenerated || 0) + items.length;
        state.max.totalRequests = (state.max.totalRequests || 0) + 1;
        saveState();
        currentSession = { items, idx: 0, correct: 0, wrong: 0, xp: 0, streak: 0, isDaily: false, subject: subjectKey, isMax: true };
        hideMaxLoader();
        openExerciseScreen();
        renderQuestion();
    } catch (err) {
        hideMaxLoader();
        console.error('MAX error:', err);
        showToast('Erro MAX: ' + (err.message || 'desconhecido'));
    }
}

async function startMaxForTest(testId) {
    const t = state.tests.find(x => x.id === testId);
    if (!t) return;
    const topics = (t.topics && t.topics.length > 0) ? t.topics : Array.from(activeTopicsFor(t.subject));
    return startMaxSession(t.subject, { topics });
}

function resetStats() {
    if (!confirm('Tens a certeza? Vais perder XP, streak, testes, prémios e histórico deste perfil.')) return;
    const p = activeProfile();
    if (!p) return;
    const year = p.year;
    const subs = SUBJECTS_BY_YEAR[year];
    const curr = CURRICULUM_BY_YEAR[year];
    const subStats = {};
    Object.keys(subs).forEach(k => { subStats[k] = { answered: 0, correct: 0, xp: 0 }; });
    const prog = {};
    Object.keys(curr).forEach(k => { prog[k] = { toIndex: curr[k].length }; });
    p.xp = 0;
    p.streak = { days: 0, lastDate: null, best: 0 };
    p.daily = { date: null, completed: false, correct: 0 };
    p.subjects = subStats;
    p.badges = [];
    p.history = [];
    p.totalDailies = 0;
    p.perfectDailies = 0;
    p.recentIds = [];
    p.exerciseSeen = {};
    p.tests = [];
    p.rewards = JSON.parse(JSON.stringify(DEFAULT_REWARDS));
    p.progress = prog;
    p.maxExercises = [];
    p.maxLessons = {};
    saveState();
    updateAll();
    showToast('Progresso reiniciado.');
}

function clearMaxCache() {
    const p = activeProfile();
    if (!p) return;
    if (!confirm('Apagar todas as perguntas geradas pela IA (MAX) deste perfil? Vão ser geradas novas perguntas mais limpas no próximo treino.')) return;
    p.maxExercises = [];
    p.maxLessons = {};
    // limpar cache localStorage do MAX
    Object.keys(localStorage).filter(k => k.startsWith('max_cache_')).forEach(k => localStorage.removeItem(k));
    saveState();
    showToast('Perguntas IA apagadas. Vão ser geradas novas no próximo treino.');
}

// ========== INSTALAÇÃO COMO PWA ==========
// Captura o evento `beforeinstallprompt` no Android para permitir abrir o
// diálogo nativo a partir de um botão personalizado. Em iOS Safari o evento
// não existe — mostra-se um tutorial visual em vez disso.
let _installPromptEvent = null;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _installPromptEvent = e;
    // Actualiza a UI — o botão "Instalar" pode deixar de ficar escondido
    try { refreshInstallUI(); } catch {}
});

window.addEventListener('appinstalled', () => {
    _installPromptEvent = null;
    try {
        localStorage.setItem('pwaInstalledAt', String(Date.now()));
        closeInstallModal();
        refreshInstallUI();
        showToast('🎉 App instalada!');
    } catch {}
});

function isRunningAsPWA() {
    try {
        return window.matchMedia('(display-mode: standalone)').matches
            || window.navigator.standalone === true;
    } catch { return false; }
}

function isIOSDevice() {
    const ua = navigator.userAgent || '';
    // iPadOS 13+ apresenta-se como "Mac" — verifica também maxTouchPoints
    return /iPad|iPhone|iPod/.test(ua)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isSafariBrowser() {
    const ua = navigator.userAgent || '';
    return /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

// Mostra/esconde banner e botão conforme estado actual.
function refreshInstallUI() {
    const banner = document.getElementById('install-banner');
    const profileBtn = document.getElementById('profile-install-btn');
    const profileHint = document.getElementById('profile-install-hint');
    const installedBadge = document.getElementById('profile-installed-badge');
    const installed = isRunningAsPWA();

    if (installed) {
        if (banner) banner.style.display = 'none';
        if (profileBtn) profileBtn.style.display = 'none';
        if (profileHint) profileHint.style.display = 'none';
        if (installedBadge) installedBadge.style.display = 'block';
        return;
    }

    // Não instalada → mostra sempre botão no Perfil
    if (profileBtn) profileBtn.style.display = 'block';
    if (profileHint) profileHint.style.display = 'block';
    if (installedBadge) installedBadge.style.display = 'none';

    // Banner na Home: só se o utilizador ainda não dispensou
    const dismissed = localStorage.getItem('installBannerDismissed') === '1';
    if (banner) banner.style.display = dismissed ? 'none' : 'flex';
}

function dismissInstallBanner() {
    localStorage.setItem('installBannerDismissed', '1');
    const banner = document.getElementById('install-banner');
    if (banner) banner.style.display = 'none';
}

function openInstallModal() {
    const body = document.getElementById('install-modal-body');
    if (!body) return;
    let html = '';

    if (isRunningAsPWA()) {
        html = `<p style="text-align:center;color:#16a34a;font-weight:600">
            <i class="fas fa-circle-check"></i> A app já está instalada no teu dispositivo.
        </p>`;
    } else if (_installPromptEvent) {
        // Android Chrome/Edge com prompt capturado — dispara o diálogo nativo
        html = `
            <p style="margin-bottom:12px;color:var(--text-light);font-size:0.88rem">
                Instala a EscolaPlay como app no teu telemóvel. Abre mais rápido, funciona sem Internet e fica no ecrã principal como uma aplicação normal.
            </p>
            <button class="btn btn-primary-solid btn-block" onclick="triggerInstallPrompt()">
                <i class="fas fa-download"></i> Instalar agora
            </button>
        `;
    } else if (isIOSDevice()) {
        // iOS Safari — mostra tutorial visual
        if (!isSafariBrowser()) {
            html = `
                <div style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:10px;padding:12px;margin-bottom:14px;font-size:0.88rem;color:#78350f">
                    <strong>Abre no Safari</strong><br>
                    No iPhone/iPad, a instalação só funciona a partir do <strong>Safari</strong> (não Chrome/Firefox). Copia este URL e abre-o no Safari:
                </div>
                <div style="background:#f9fafb;border-radius:8px;padding:10px;font-family:monospace;font-size:0.82rem;word-break:break-all;margin-bottom:14px">${escapeHtml(window.location.origin + window.location.pathname)}</div>
            `;
        }
        html += `
            <ol style="padding-left:18px;line-height:1.9;font-size:0.92rem;color:var(--text)">
                <li>Toca no botão <strong>Partilhar</strong>
                    <span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;background:#e0e7ff;border-radius:6px;margin:0 4px;vertical-align:middle">
                        <i class="fas fa-arrow-up-from-bracket" style="color:#4f46e5"></i>
                    </span>
                    no fundo do Safari.
                </li>
                <li>Desliza para baixo e escolhe <strong>Adicionar ao Ecrã Principal</strong>
                    <span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:6px;margin:0 4px;vertical-align:middle">
                        <i class="fas fa-plus" style="color:#374151"></i>
                    </span>.
                </li>
                <li>Confirma o nome "EscolaPlay" e toca em <strong>Adicionar</strong>.</li>
                <li>Pronto — abre a app pelo ícone no ecrã principal como uma aplicação normal.</li>
            </ol>
        `;
    } else {
        // Android sem prompt capturado ainda, ou desktop
        html = `
            <p style="margin-bottom:14px;color:var(--text-light);font-size:0.88rem">
                Para instalar a app:
            </p>
            <ol style="padding-left:18px;line-height:1.8;font-size:0.92rem;color:var(--text)">
                <li>Toca no menu do browser
                    <span style="display:inline-block;padding:2px 8px;background:#f3f4f6;border-radius:6px;margin:0 4px;font-weight:600">⋮</span>
                    no canto superior direito.
                </li>
                <li>Escolhe <strong>Instalar app</strong> ou <strong>Adicionar ao ecrã principal</strong>.</li>
                <li>Confirma — a app aparece no launcher como uma aplicação normal.</li>
            </ol>
            <p style="margin-top:14px;font-size:0.78rem;color:var(--text-light)">
                Se tiveres o Chrome/Edge e o botão nativo aparecer, ele também funciona.
            </p>
        `;
    }

    body.innerHTML = html;
    document.getElementById('install-modal').style.display = 'flex';
}

function closeInstallModal() {
    const m = document.getElementById('install-modal');
    if (m) m.style.display = 'none';
}

async function triggerInstallPrompt() {
    if (!_installPromptEvent) {
        // Prompt já foi consumido ou não está disponível — mostra tutorial
        openInstallModal();
        return;
    }
    try {
        _installPromptEvent.prompt();
        const { outcome } = await _installPromptEvent.userChoice;
        if (outcome === 'accepted') {
            showToast('A instalar…');
        }
    } catch (e) {
        console.warn('Install prompt falhou:', e);
    }
    _installPromptEvent = null;
    closeInstallModal();
    refreshInstallUI();
}

// Limpa caches do service worker e recarrega a app, preservando localStorage
// (perfis, XP, medalhas, testes). Útil quando sai uma nova versão e o SW
// continua a servir a antiga.
async function forceAppUpdate() {
    if (!confirm('Forçar atualização da app? A página vai recarregar. Os teus dados (XP, perfis, medalhas, testes) não são apagados.')) return;
    showToast('A atualizar…');
    try {
        // 1. Apagar todas as caches (CacheStorage)
        if (window.caches && caches.keys) {
            const keys = await caches.keys();
            await Promise.all(keys.map(k => caches.delete(k)));
        }
        // 2. Desregistar todos os service workers desta origem
        if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map(r => r.unregister()));
        }
    } catch (e) {
        console.warn('forceAppUpdate: falha a limpar cache/SW:', e);
    }
    // 3. Recarregar com cache-busting para garantir HTML/JS/CSS novos
    const url = new URL(window.location.href);
    url.searchParams.set('_v', Date.now().toString());
    window.location.replace(url.toString());
}

// ========== EXPORT / IMPORT PERGUNTAS ==========
function _groupExercisesBySubjectTopic(list, subjectsMap) {
    const bySubject = {};
    list.forEach(ex => {
        if (!ex || !ex.s || !ex.t) return;
        if (!bySubject[ex.s]) bySubject[ex.s] = {};
        if (!bySubject[ex.s][ex.t]) bySubject[ex.s][ex.t] = [];
        bySubject[ex.s][ex.t].push(ex);
    });
    return Object.keys(bySubject).sort().map(sk => ({
        subject: sk,
        name: (subjectsMap && subjectsMap[sk] && subjectsMap[sk].name) || sk,
        topics: Object.keys(bySubject[sk]).sort().map(tk => ({
            topic: tk,
            exercises: bySubject[sk][tk]
        }))
    }));
}

function exportQuestions() {
    const p = activeProfile();
    if (!p) { showToast('Cria primeiro um perfil.'); return; }
    const yr = p.year;
    const subsMap = SUBJECTS_BY_YEAR[yr] || {};
    const staticRaw = EXERCISES_BY_YEAR[yr] || [];
    const staticAll = Array.isArray(staticRaw)
        ? staticRaw.slice()
        : Object.values(staticRaw).flat();
    const aiAll = (p.maxExercises || []).slice();
    const payload = {
        v: 1,
        exportedAt: new Date().toISOString(),
        year: yr,
        profileName: p.name,
        counts: { static: staticAll.length, ai: aiAll.length, total: staticAll.length + aiAll.length },
        sections: {
            static: _groupExercisesBySubjectTopic(staticAll, subsMap),
            ai: _groupExercisesBySubjectTopic(aiAll, subsMap)
        }
    };
    try {
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const safeName = (p.name || 'aluno').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'aluno';
        const date = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `escolaplay-${safeName}-${yr}ano-${date}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        showToast(`Exportadas ${payload.counts.total} perguntas.`);
    } catch (err) {
        console.error('exportQuestions', err);
        showToast('Erro a exportar: ' + (err.message || 'desconhecido'));
    }
}

function importQuestionsClick() {
    const input = document.getElementById('import-questions-input');
    if (input) { input.value = ''; input.click(); }
}

function _flattenSections(sections) {
    const out = [];
    if (!sections) return out;
    const groups = Array.isArray(sections) ? sections : [].concat(sections.static || [], sections.ai || []);
    groups.forEach(sec => {
        (sec.topics || []).forEach(tp => {
            (tp.exercises || []).forEach(ex => {
                if (!ex || !ex.q) return;
                out.push({
                    ...ex,
                    s: ex.s || sec.subject,
                    t: ex.t || tp.topic
                });
            });
        });
    });
    return out;
}

async function importQuestionsFile(input) {
    const file = input && input.files && input.files[0];
    if (!file) return;
    const p = activeProfile();
    if (!p) { showToast('Cria primeiro um perfil.'); return; }
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data || data.v !== 1 || !data.sections) {
            alert('Ficheiro inválido. Esperava formato EscolaPlay v1.');
            return;
        }
        if (data.year && data.year !== p.year) {
            if (!confirm(`O ficheiro é do ${data.year}.º ano e o perfil activo é do ${p.year}.º ano. Importar mesmo assim?`)) return;
        }
        const incoming = _flattenSections(data.sections);
        if (incoming.length === 0) { showToast('Sem perguntas no ficheiro.'); return; }
        const yr = p.year;
        const staticIds = new Set();
        const staticRaw = EXERCISES_BY_YEAR[yr] || [];
        const staticList = Array.isArray(staticRaw) ? staticRaw : Object.values(staticRaw).flat();
        staticList.forEach(ex => { if (ex && ex.id) staticIds.add(ex.id); });
        const existing = p.maxExercises || [];
        const existingIds = new Set(existing.map(e => e.id));
        const toAdd = [];
        incoming.forEach(ex => {
            let id = ex.id || ('imp_' + Math.random().toString(36).slice(2, 9));
            if (staticIds.has(id) || existingIds.has(id)) {
                id = 'imp_' + Math.random().toString(36).slice(2, 9);
            }
            existingIds.add(id);
            toAdd.push({ ...ex, id });
        });
        if (!confirm(`Vais importar ${toAdd.length} perguntas para o perfil "${p.name}". Continuar?`)) return;
        p.maxExercises = [...existing, ...toAdd].slice(-1000);
        saveState();
        updateAll();
        showToast(`Importadas ${toAdd.length} perguntas.`);
    } catch (err) {
        console.error('importQuestionsFile', err);
        alert('Erro a importar: ' + (err.message || 'desconhecido'));
    } finally {
        input.value = '';
    }
}

// ========== TABS ==========
function switchTab(name) {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === `tab-${name}`));
    if (name === 'home') renderHome();
    if (name === 'subjects') renderSubjects();
    if (name === 'tests') renderTests();
    if (name === 'progress') renderProgress();
    if (name === 'profile') { renderProfile(); try { refreshNotifUI(); } catch {} }
}

// ========== TOAST ==========
let toastTimer;
function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

// ========== SESSION ==========
// Calcula a dificuldade-alvo para um tópico, com base no histórico de acertos.
// Regra: precisa de 3+ acertos numa dificuldade para "desbloquear" a próxima.
// Devolve { target, prefer: { 1: w, 2: w, 3: w } } com pesos para a seleção.
function targetDifficultyFor(subKey, topic) {
    const m = (state.topicMastery || {})[subKey + '/' + topic] || { d1:0, d2:0, d3:0 };
    const c1 = m.d1 || 0, c2 = m.d2 || 0, c3 = m.d3 || 0;
    // Threshold de "domínio" por nível (mais baixo para os mais novos)
    const yr = activeProfile()?.year || 6;
    const TH = yr <= 2 ? 3 : (yr <= 4 ? 4 : 5);
    if (c1 < TH) {
        // Ainda a aprender: maioria diff:1, raramente diff:2 para não saturar
        return { target: 1, prefer: { 1: 0.9, 2: 0.1, 3: 0 } };
    }
    if (c2 < TH) {
        // Domina o básico: foco em diff:2, alguma reciclagem de diff:1, raro diff:3
        return { target: 2, prefer: { 1: 0.25, 2: 0.65, 3: 0.10 } };
    }
    // Domina os 2 níveis: foco em diff:3, mistura tudo
    return { target: 3, prefer: { 1: 0.15, 2: 0.30, 3: 0.55 } };
}

// Escolhe N exercícios com progressão adaptativa de dificuldade COMO PRIORIDADE.
// 1) Dificuldade alvo do tópico (com base nos acertos do utilizador) é PRIMEIRO
// 2) Dentro da mesma dificuldade, nunca-vistos primeiro
// 3) Mais antigos primeiro
// 4) Aleatório
// Resultado final é baralhado para não dar sempre a mesma ordem.
function pickExercises(pool, n) {
    const seen = state.exerciseSeen || {};
    // Spaced repetition LITE: marca exercícios errados na última tentativa
    // para serem priorizados no próximo teste do mesmo tópico.
    const lastResultById = {};
    (state.history || []).forEach(h => { if (h && h.id) lastResultById[h.id] = h.c; });
    const annotated = pool.map(e => {
        const tgt = targetDifficultyFor(e.s, e.t);
        const d = Math.max(1, Math.min(3, e.diff || 1));
        const diffScore = (tgt.prefer && tgt.prefer[d]) || 0;
        const wrongLast = lastResultById[e.id] === false;
        return {
            e,
            d,
            lastSeen: seen[e.id] || 0,
            diffScore,
            wrongLast,
            rand: Math.random()
        };
    });
    // Estratégia: reservar até ~35% do teste para revisão de errados (até 5 de 14)
    const reviewBudget = Math.min(Math.floor(n * 0.35), 5);
    const wrongPool = annotated.filter(x => x.wrongLast)
        .sort((a,b) => a.lastSeen - b.lastSeen); // mais antigos primeiro (já tiveram tempo)
    const reviewItems = wrongPool.slice(0, reviewBudget);
    const reviewIds = new Set(reviewItems.map(x => x.e.id));
    const fresh = annotated.filter(x => !reviewIds.has(x.e.id));
    fresh.sort((a, b) => {
        // 1) Dificuldade alvo PRIMEIRO (maior diffScore vence)
        if (Math.abs(a.diffScore - b.diffScore) > 0.05) return b.diffScore - a.diffScore;
        // 2) Nunca vistos antes de já vistos
        if (a.lastSeen === 0 && b.lastSeen !== 0) return -1;
        if (b.lastSeen === 0 && a.lastSeen !== 0) return 1;
        // 3) Mais antigos
        if (a.lastSeen !== b.lastSeen) return a.lastSeen - b.lastSeen;
        // 4) Empate → random
        return a.rand - b.rand;
    });
    // Mistura: review primeiro (vai ser baralhado no fim), depois novos
    const annotated2 = [...reviewItems, ...fresh];
    // Substitui o array original para o resto da função usar `annotated`
    annotated.length = 0;
    annotated.push(...annotated2);
    annotated.sort((a, b) => {
        // Estável agora — manter ordem prévia (review já está em cima)
        // Mas precisamos do mesmo critério para itens não-review:
        if (reviewIds.has(a.e.id) && !reviewIds.has(b.e.id)) return -1;
        if (!reviewIds.has(a.e.id) && reviewIds.has(b.e.id)) return 1;
        // Entre review: mais antigos primeiro
        if (reviewIds.has(a.e.id) && reviewIds.has(b.e.id)) return a.lastSeen - b.lastSeen;
        // Entre fresh: usar critério normal
        if (Math.abs(a.diffScore - b.diffScore) > 0.05) return b.diffScore - a.diffScore;
        if (a.lastSeen === 0 && b.lastSeen !== 0) return -1;
        if (b.lastSeen === 0 && a.lastSeen !== 0) return 1;
        if (a.lastSeen !== b.lastSeen) return a.lastSeen - b.lastSeen;
        return a.rand - b.rand;
    });
    // De-dup por texto + resposta normalizados: alguns bancos extra têm
    // o mesmo exercício duplicado em ficheiros diferentes (mesmo Q + mesma
    // resposta/opções). Sem este filtro podem aparecer dois iguais no mesmo
    // teste. ATENÇÃO: comparamos texto E resposta — exercícios com prompt
    // genérico tipo "Qual destas palavras está bem escrita?" com opções
    // diferentes NÃO são considerados duplicados (testam palavras diferentes).
    const normTxt = s => (s||'').toLowerCase()
        .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
        .replace(/[^\p{L}\p{N} ]/gu, '')
        .replace(/\s+/g, ' ')
        .trim();
    const dupKey = e => {
        let ans = '';
        if (e.type === 'mc') ans = (e.opts || []).map(o => normTxt(String(o))).sort().join(',');
        else if (e.type === 'tf') ans = String(e.ans);
        else if (e.type === 'fill' || e.type === 'problem' || e.type === 'passage') {
            const a = Array.isArray(e.ans) ? e.ans : [e.ans || ''];
            ans = a.map(x => normTxt(String(x))).sort().join(',');
        } else if (e.type === 'order') ans = (e.items || []).map(o => normTxt(String(o))).sort().join(',');
        else if (e.type === 'match') ans = (e.pairs || []).map(p => normTxt(String(p[0])) + '|' + normTxt(String(p[1]))).sort().join(',');
        return (e.s || '') + '|' + normTxt(e.q) + '|' + ans;
    };
    const pickedKeys = new Set();
    const top = [];
    for (const x of annotated) {
        const k = dupKey(x.e);
        if (pickedKeys.has(k)) continue;
        pickedKeys.add(k);
        top.push(x.e);
        if (top.length >= n) break;
    }
    return top.sort(() => Math.random() - 0.5);
}

function allExercisesFor(subjectKey, activeTopics) {
    const base = EXERCISES.filter(e => e.s === subjectKey && activeTopics.has(e.t));
    const maxEx = (state.maxExercises || []).filter(e => e.s === subjectKey && activeTopics.has(e.t));
    return [...base, ...maxEx];
}

function startDailyChallenge() {
    const items = [];
    const seen = state.exerciseSeen || {};
    Object.keys(SUBJECTS).forEach(key => {
        const active = activeTopicsFor(key);
        const pool = allExercisesFor(key, active);
        if (pool.length === 0) return;
        // Ordena por: nunca vistos primeiro, depois mais antigos
        const sorted = [...pool].sort((a, b) => {
            const sa = seen[a.id] || 0;
            const sb = seen[b.id] || 0;
            if (sa === 0 && sb !== 0) return -1;
            if (sb === 0 && sa !== 0) return 1;
            return sa - sb;
        });
        // Escolhe 1 ao acaso entre os 5 mais "frescos" para variedade
        const top = sorted.slice(0, Math.min(5, sorted.length));
        items.push(top[Math.floor(Math.random() * top.length)]);
    });
    if (items.length === 0) { showToast('Activa alguns tópicos primeiro nas disciplinas.'); return; }
    const shuffled = items.sort(() => Math.random() - 0.5).slice(0, DAILY_QUESTIONS);
    currentSession = { items: shuffled, idx: 0, correct: 0, wrong: 0, xp: 0, streak: 0, isDaily: true, startedAt: Date.now() };
    openExerciseScreen();
    renderQuestion();
}

function startSubjectSession(key, opts = {}) {
    let topicSet;
    if (opts.useSelection && selectedTopicsForMax.size > 0) {
        topicSet = new Set(selectedTopicsForMax);
    } else {
        topicSet = activeTopicsFor(key);
    }
    const pool = allExercisesFor(key, topicSet);
    if (pool.length === 0) {
        showToast(opts.useSelection
            ? 'Sem exercícios para os tópicos selecionados.'
            : 'Sem exercícios. Aumenta o teu progresso para incluir mais tópicos.');
        return;
    }
    // Detectar "tudo já respondido" — só se o utilizador não pediu explicitamente para ignorar
    if (!opts.bypassSeenCheck) {
        const seen = state.exerciseSeen || {};
        const allSeen = pool.every(e => seen[e.id]);
        if (allSeen) {
            showAllAnsweredSubjectModal(key, topicSet, pool.length, opts);
            return;
        }
    }
    const items = pickExercises(pool, Math.min(PRACTICE_QUESTIONS, pool.length));
    currentSession = { items, idx: 0, correct: 0, wrong: 0, xp: 0, streak: 0, isDaily: false, subject: key, topicSet, startedAt: Date.now() };
    closeSubjectDetail();
    openExerciseScreen();
    renderQuestion();
}

// Modal: já respondeu a todas as perguntas dos tópicos selecionados (treino de disciplina)
let _pendingSubjectRetry = null;
function showAllAnsweredSubjectModal(subjectKey, topicSet, totalCount, originalOpts = {}) {
    const topicsArr = Array.from(topicSet);
    const topicsLabel = topicsArr.length === 1
        ? `do tópico "${topicsArr[0]}"`
        : (topicsArr.length <= 3 ? `dos tópicos: ${topicsArr.join(', ')}` : `dos ${topicsArr.length} tópicos seleccionados`);
    const sub = SUBJECTS[subjectKey];
    const subName = sub?.name || subjectKey;

    _pendingSubjectRetry = { subjectKey, opts: { ...originalOpts } };
    document.getElementById('all-answered-subject-modal-temp')?.remove();
    const html = `
        <div id="all-answered-subject-modal-temp" class="modal" style="display:flex;align-items:center;justify-content:center;padding:20px">
            <div class="modal-content" style="max-width:480px;border-radius:18px;max-height:90vh">
                <div class="modal-header">
                    <h2>🎉 Já respondeste a todas!</h2>
                    <button class="icon-btn" onclick="closeAllAnsweredSubjectModal()" aria-label="Fechar"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body" style="text-align:center">
                    <div style="font-size:3.4rem;margin-bottom:10px">📚</div>
                    <p style="margin-bottom:6px;font-size:1rem"><strong>Já respondeste às ${totalCount} perguntas ${escapeHtml(topicsLabel)} de ${escapeHtml(subName)}!</strong></p>
                    <p class="muted" style="font-size:0.88rem;margin-bottom:20px">O que queres fazer?</p>
                    <button class="btn btn-block" onclick="continueSubjectAnyway()" style="background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;border:none;font-weight:700;padding:14px;margin-bottom:10px">
                        <i class="fas fa-rotate-left"></i> Responder de novo (mesmas perguntas)
                    </button>
                    <button class="btn btn-block" onclick="generateMaxForSubjectAnswered()" style="background:linear-gradient(135deg,#7c3aed,#ec4899);color:#fff;border:none;font-weight:700;padding:14px;margin-bottom:10px">
                        <i class="fas fa-wand-magic-sparkles"></i> Carregar novas com IA MAX
                    </button>
                    <button class="btn btn-block btn-secondary" onclick="closeAllAnsweredSubjectModal()" style="padding:12px">
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

function closeAllAnsweredSubjectModal() {
    document.getElementById('all-answered-subject-modal-temp')?.remove();
    _pendingSubjectRetry = null;
}

function continueSubjectAnyway() {
    if (!_pendingSubjectRetry) { closeAllAnsweredSubjectModal(); return; }
    const { subjectKey, opts } = _pendingSubjectRetry;
    _pendingSubjectRetry = null;
    document.getElementById('all-answered-subject-modal-temp')?.remove();
    startSubjectSession(subjectKey, { ...opts, bypassSeenCheck: true });
}

function generateMaxForSubjectAnswered() {
    if (!_pendingSubjectRetry) { closeAllAnsweredSubjectModal(); return; }
    const { subjectKey, opts } = _pendingSubjectRetry;
    _pendingSubjectRetry = null;
    document.getElementById('all-answered-subject-modal-temp')?.remove();
    if (opts.useSelection && selectedTopicsForMax.size > 0) {
        startMaxForSelected(subjectKey, false);
    } else {
        startMaxSession(subjectKey);
    }
}

function openExerciseScreen() {
    document.getElementById('exercise-screen').style.display = 'flex';
    document.getElementById('summary-screen').style.display = 'none';
}
function closeExerciseScreen() { document.getElementById('exercise-screen').style.display = 'none'; }

function exitSession() {
    if (!currentSession) { closeExerciseScreen(); return; }
    if (currentSession.idx > 0 && currentSession.idx < currentSession.items.length) {
        if (!confirm('Queres mesmo sair? Perdes o progresso deste treino.')) return;
    }
    currentSession = null;
    closeExerciseScreen();
    switchTab('home');
}

function renderQuestion() {
    const s = currentSession;
    const e = s.items[s.idx];
    // Lição-primeiro: se a criança nunca viu um exercício deste tópico
    // e há lição disponível, abrir lição automaticamente.
    if (s.idx === 0 && typeof _maybeShowFirstLesson === 'function') _maybeShowFirstLesson(e);
    // Conforto de leitura: aluno do 2.º ano em matemática (e estudo do meio) → mais espaçamento
    const yr = activeProfile()?.year;
    const screenEl = document.getElementById('exercise-screen');
    const friendly = yr === 2 && (e.s === 'matematica' || e.s === 'estudo_meio');
    if (screenEl) screenEl.classList.toggle('reader-friendly', !!friendly);
    const dots = s.items.map((_, i) => {
        let cls = '';
        if (i < s.idx) cls = (s.results && s.results[i]) ? 'done' : 'wrong';
        else if (i === s.idx) cls = 'current';
        return `<div class="progress-dot ${cls}"></div>`;
    }).join('');
    document.getElementById('progress-dots').innerHTML = dots;
    document.getElementById('session-xp').textContent = s.xp;
    const sub = SUBJECTS[e.s];
    const tag = document.getElementById('ex-subject-tag');
    tag.textContent = sub.name;
    tag.style.background = sub.color;
    document.getElementById('ex-topic').textContent = e.t;
    // Indicador de dificuldade — APENAS se:
    //  (1) o ano é 2 (foi onde fizemos a curadoria de niveis)
    //  (2) a pergunta tem diff explicitamente definido (1, 2 ou 3)
    // Para outros anos ou perguntas nao classificadas, esconder o chip.
    const diffEl = document.getElementById('ex-difficulty');
    if (diffEl) {
        const hasExplicitDiff = e.diff === 1 || e.diff === 2 || e.diff === 3;
        const isYear2 = yr === 2;
        if (isYear2 && hasExplicitDiff) {
            const d = e.diff;
            const labels = { 1: 'Fácil', 2: 'Médio', 3: 'Difícil' };
            diffEl.className = 'exercise-difficulty diff-' + d;
            diffEl.style.display = '';
            diffEl.innerHTML = `${labels[d]}` +
                ` <span class="diff-dot ${d>=1?'on':''}"></span>` +
                `<span class="diff-dot ${d>=2?'on':''}"></span>` +
                `<span class="diff-dot ${d>=3?'on':''}"></span>`;
        } else {
            diffEl.style.display = 'none';
            diffEl.innerHTML = '';
            diffEl.className = 'exercise-difficulty';
        }
    }
    // Suporte a passagem de texto / tabela / SVG acima da pergunta
    const qEl = document.getElementById('ex-question');
    let qHtml = '';
    // Three-Reads scaffold (Mat+ problemas) — guia em 3 passos para ler problemas
    // de forma estratégica, baseado na rotina de Kelemanik/Lucenta/Creighton.
    if (e.s === 'mat_plus' && e.type === 'problem') {
        qHtml += `<details class="three-reads"><summary>📖 Lê em 3 passos (clica)</summary>
            <ol>
                <li><strong>1.ª leitura</strong> — lê a história devagar. Sobre o que é?</li>
                <li><strong>2.ª leitura</strong> — que está a pergunta a pedir?</li>
                <li><strong>3.ª leitura</strong> — que números/informação preciso para responder?</li>
            </ol>
        </details>`;
    }
    if (e.passage) qHtml += `<div class="ex-passage">${escapeHtml(e.passage).replace(/\n/g,'<br>')}</div>`;
    if (e.table)   qHtml += `<div class="ex-table-wrap">${e.table}</div>`;
    if (e.svg)     qHtml += `<div class="ex-svg-wrap">${e.svg}</div>`;
    // Render question com markdown leve: **bold** e *italic*. Segura porque
    // escapamos HTML primeiro e só depois substituímos pelos tags <strong>/<em>.
    const renderMd = (s) => escapeHtml(s || '')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
    qHtml += `<span class="ex-q-text">${renderMd(e.q)}</span>`;
    // Botão 🔊 (TTS) para Som+ — bem visível, abaixo da pergunta
    if (e.s === 'som_plus' && 'speechSynthesis' in window) {
        const textToSpeak = (e.q || '').replace(/\*\*/g,'').replace(/\*/g,'')
            .replace(/'/g,"&#39;").replace(/"/g,'&quot;');
        qHtml += `<div style="text-align:center;margin:10px 0 0"><button onclick="ttsSpeak('${textToSpeak}')" title="Ouvir a pergunta" style="background:linear-gradient(135deg,#2563eb,#0891b2);color:#fff;border:none;border-radius:24px;padding:10px 18px;font-size:0.92rem;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(37,99,235,0.25);display:inline-flex;align-items:center;gap:8px">🔊 Ouvir a pergunta</button></div>`;
    }
    qEl.innerHTML = qHtml;
    document.getElementById('ex-feedback').style.display = 'none';
    // Reabrir interação na área de resposta (foi trancada em showFeedback)
    const _aa = document.getElementById('ex-answer-area');
    if (_aa) _aa.style.pointerEvents = '';
    // Mostrar botão Professor IA inline; resetar estado
    const profWrap = document.getElementById('ex-prof-ia-wrap');
    const profBox  = document.getElementById('ex-prof-ia-box');
    const profBtn  = document.getElementById('ex-prof-ia-btn');
    const profTxt  = document.getElementById('ex-prof-ia-text');
    if (profWrap) profWrap.style.display = 'block';
    if (profBox)  profBox.style.display = 'none';
    if (profTxt)  profTxt.textContent = 'A pensar…';
    if (profBtn)  { profBtn.innerHTML = '<i class="fas fa-robot"></i> Professor IA — pedir pista'; profBtn.disabled = false; }
    // Esconder painel de pista do feedback (será de novo configurado em showFeedback)
    const fbWrap = document.getElementById('feedback-prof-ia-wrap');
    if (fbWrap) fbWrap.style.display = 'none';
    // Reset do painel "Tens uma dúvida?" — recolhe, limpa input e resposta antiga
    const doubtPanel = document.getElementById('ex-doubt-panel');
    const doubtInput = document.getElementById('ex-doubt-input');
    const doubtAns   = document.getElementById('ex-doubt-answer');
    const doubtTrig  = document.getElementById('ex-doubt-trigger');
    const doubtSugg  = document.getElementById('ex-doubt-suggestions');
    if (doubtPanel) doubtPanel.style.display = 'none';
    if (doubtInput) doubtInput.value = '';
    if (doubtAns)   { doubtAns.style.display = 'none'; doubtAns.innerHTML = ''; }
    if (doubtTrig)  doubtTrig.classList.remove('open');
    if (doubtSugg)  { doubtSugg.style.display = 'none'; doubtSugg.innerHTML = ''; }
    selectedAnswer = null;
    matchSelection = { left: null };
    const area = document.getElementById('ex-answer-area');
    if (e.type === 'mc') area.innerHTML = renderMC(e);
    else if (e.type === 'tf') area.innerHTML = renderTF(e);
    else if (e.type === 'fill' || e.type === 'problem' || e.type === 'passage') area.innerHTML = renderFill(e);
    else if (e.type === 'order') { area.innerHTML = `<ul class="order-list" id="order-list"></ul><button class="btn btn-primary-solid btn-block" onclick="submitAnswer()">Responder</button>`; orderState = [...e.items].sort(() => Math.random() - 0.5); setTimeout(redrawOrder, 0); }
    else if (e.type === 'match') { matchState = { leftItems: e.pairs.map(p=>p[0]), rightItems: [...e.pairs.map(p=>p[1])].sort(()=>Math.random()-0.5), pairs: e.pairs, matched: {} }; area.innerHTML = `<div class="match-area" id="match-area"></div><button class="btn btn-primary-solid btn-block" onclick="submitAnswer()">Responder</button>`; setTimeout(redrawMatch, 0); }
    if (e.type === 'fill' || e.type === 'problem' || e.type === 'passage') {
        const inp = document.getElementById('fill-input');
        if (inp) {
            inp.value = '';
            setTimeout(() => { inp.value = ''; inp.focus(); }, 50);
        }
    }
}

function renderMC(e) {
    return `
        ${e.opts.map((o, i) => `
            <button class="btn-option" id="opt-${i}" onclick="selectMC(${i})">
                <span class="opt-letter">${String.fromCharCode(65+i)}</span>
                <span>${o}</span>
            </button>
        `).join('')}
        <button class="btn btn-primary-solid btn-block" onclick="submitAnswer()">Responder</button>
    `;
}
function selectMC(i) {
    selectedAnswer = i;
    document.querySelectorAll('#ex-answer-area .btn-option').forEach((el, idx) => el.classList.toggle('selected', idx === i));
}

function renderTF(e) {
    return `
        <div class="tf-buttons">
            <button class="tf-btn" id="tf-true" onclick="selectTF(true)">&#10004; Verdadeiro</button>
            <button class="tf-btn" id="tf-false" onclick="selectTF(false)">&#10008; Falso</button>
        </div>
        <button class="btn btn-primary-solid btn-block" style="margin-top:14px" onclick="submitAnswer()">Responder</button>
    `;
}
function selectTF(v) {
    selectedAnswer = v;
    document.getElementById('tf-true').classList.toggle('selected', v === true);
    document.getElementById('tf-false').classList.toggle('selected', v === false);
}

function renderFill(e) {
    return `
        <input type="text" class="fill-input" id="fill-input" placeholder="Escreve a tua resposta" autocomplete="new-password" autocorrect="off" autocapitalize="off" spellcheck="false" value="">
        <button class="btn btn-primary-solid btn-block" id="submit-btn" onclick="submitAnswer()">Responder</button>
    `;
}

let orderState = [];
function redrawOrder() {
    const list = document.getElementById('order-list');
    if (!list) return;
    list.innerHTML = orderState.map((it, i) => `
        <li class="order-item">
            <span class="order-item-num">${i+1}</span>
            <span style="flex:1">${it}</span>
            <span class="order-ctrls">
                <button class="order-btn" onclick="moveOrder(${i}, -1)"><i class="fas fa-arrow-up"></i></button>
                <button class="order-btn" onclick="moveOrder(${i}, 1)"><i class="fas fa-arrow-down"></i></button>
            </span>
        </li>
    `).join('');
}
function moveOrder(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= orderState.length) return;
    [orderState[i], orderState[j]] = [orderState[j], orderState[i]];
    redrawOrder();
}

let matchState = { leftItems: [], rightItems: [], matched: {} };
function redrawMatch() {
    const area = document.getElementById('match-area');
    if (!area) return;
    const leftHtml = matchState.leftItems.map((it, i) => {
        const matched = matchState.matched[i] !== undefined;
        const selected = matchSelection.left === i;
        return `<div class="match-cell ${matched ? 'matched' : ''} ${selected ? 'selected' : ''}" onclick="matchPickLeft(${i})">${it}</div>`;
    }).join('');
    const matchedRightIdx = new Set(Object.values(matchState.matched));
    const rightHtml = matchState.rightItems.map((it, i) => {
        const matched = matchedRightIdx.has(i);
        return `<div class="match-cell ${matched ? 'matched' : ''}" onclick="matchPickRight(${i})">${it}</div>`;
    }).join('');
    area.innerHTML = `<div class="match-col">${leftHtml}</div><div class="match-col">${rightHtml}</div>`;
}
function matchPickLeft(i) {
    if (matchState.matched[i] !== undefined) return;
    matchSelection.left = i;
    redrawMatch();
}
function matchPickRight(j) {
    if (matchSelection.left === null) { showToast('Escolhe primeiro a esquerda'); return; }
    if (Object.values(matchState.matched).includes(j)) return;
    matchState.matched[matchSelection.left] = j;
    matchSelection.left = null;
    redrawMatch();
}

// ========== VALIDAÇÃO IA ==========
// Devolve { status: 'correct'|'partial'|'wrong', missing?: string }.
// "partial" = resposta tem parte certa mas é incompleta — usado em
// perguntas com vários itens ("agrupa", "indica todos", "quantos X há
// e quais"). O missing descreve o que ainda falta para o aluno melhorar
// na próxima.
async function aiValidateAnswer(exercise, studentAnswer) {
    const n = normalize(studentAnswer);
    if ((exercise.ans || []).some(a => {
        const na = normalize(a);
        return na === n || (n.length >= 3 && (na.includes(n) || n.includes(na)));
    })) return { status: 'correct' };
    const cacheKey = `aival_${exercise.id}_${n.slice(0, 40)}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached !== null) {
        try { return JSON.parse(cached); }
        catch (_) { return { status: cached === '1' ? 'correct' : 'wrong' }; }
    }
    const correctAnswers = (exercise.ans || []).join(' ou ');
    const langNote = exercise.s === 'ingles'
        ? '\nThe answer must be in English — Portuguese words are NOT accepted as correct even if they mean the same thing.'
        : '';
    const prompt = `És um(a) professor(a) a corrigir uma resposta de aluno em PORTUGUÊS EUROPEU.

PERGUNTA: "${exercise.q}"
RESPOSTA ESPERADA: "${correctAnswers}"
RESPOSTA DO ALUNO: "${studentAnswer}"

Decide entre 3 status:
- "correct": resposta certa. Aceita variações de escrita, abreviaturas, formas equivalentes (ex.: "atlântico" vale para "Oceano Atlântico").
- "partial": resposta TEM parte certa MAS está INCOMPLETA. Usa SEMPRE quando a pergunta pede VÁRIOS itens ("agrupa", "indica TODOS", "lista", "quais são", "quantos X há e quais") e o aluno só identificou ALGUNS. Em "missing" diz o que falta (curto, em PT-PT, máx. 12 palavras).
- "wrong": resposta factualmente errada ou não responde à pergunta.

Exemplo: pergunta "Agrupa correr/bonito/livro/rapidamente por classes"; aluno escreve "bonito é adjetivo" → status "partial", missing "falta classificar correr (verbo), livro (substantivo), rapidamente (advérbio)".${langNote}

Responde APENAS com JSON, um destes formatos:
{"status":"correct"}
{"status":"partial","missing":"<o que falta>"}
{"status":"wrong"}`;
    try {
        const { text } = await callClaudeAPI(prompt, 220);
        const m = text.match(/\{[\s\S]*\}/);
        let result = { status: 'wrong' };
        if (m) {
            try {
                const parsed = JSON.parse(m[0]);
                if (parsed && ['correct', 'partial', 'wrong'].includes(parsed.status)) {
                    result = { status: parsed.status };
                    if (parsed.status === 'partial' && typeof parsed.missing === 'string') {
                        result.missing = parsed.missing.slice(0, 200);
                    }
                }
            } catch (_) {}
        }
        sessionStorage.setItem(cacheKey, JSON.stringify(result));
        return result;
    } catch(e) { return { status: 'wrong' }; }
}

// ========== SUBMIT ==========
async function submitAnswer() {
    if (!currentSession) return;
    const s = currentSession;
    if (s._submitting) return;
    if (s.results && s.results[s.idx] !== undefined) return;
    s._submitting = true;
    try {
        const e = s.items[s.idx];
        let isCorrect = false;
        if (e.type === 'mc') {
            if (selectedAnswer === null) { showToast('Escolhe uma opção'); return; }
            isCorrect = selectedAnswer === e.ans;
            document.querySelectorAll('#ex-answer-area .btn-option').forEach((el, idx) => {
                el.disabled = true;
                if (idx === e.ans) el.classList.add('correct');
                else if (idx === selectedAnswer) el.classList.add('wrong');
            });
        } else if (e.type === 'tf') {
            if (selectedAnswer === null) { showToast('Escolhe Verdadeiro ou Falso'); return; }
            isCorrect = selectedAnswer === e.ans;
        } else if (e.type === 'fill' || e.type === 'problem' || e.type === 'passage') {
            const val = document.getElementById('fill-input')?.value || '';
            if (!val.trim()) { showToast('Escreve uma resposta'); return; }
            const n = normalize(val);
            isCorrect = (e.ans || []).some(a => {
                const na = normalize(a);
                return na === n || (n.length >= 3 && (na.includes(n) || n.includes(na)));
            });
            // Validação IA como fallback — só se não acertou no matching e há chave API.
            // Pode devolver "partial" (resposta tem parte certa mas falta completar).
            if (!isCorrect && hasAIKey()) {
                const btn = document.getElementById('submit-btn');
                if (btn) { btn.disabled = true; btn.textContent = 'A verificar…'; }
                const r = await aiValidateAnswer(e, val);
                if (btn) { btn.disabled = false; btn.textContent = 'Responder'; }
                // Se a sessão mudou durante o await (ex: utilizador cancelou e
                // entrou noutra), descartar o resultado para não corromper a nova.
                if (currentSession !== s) return;
                isCorrect = r.status === 'correct';
                if (r.status === 'partial') {
                    s._partial = { missing: r.missing || '' };
                }
            }
        } else if (e.type === 'order') {
            isCorrect = orderState.every((it, i) => it === e.items[i]);
        } else if (e.type === 'match') {
            const all = Object.keys(matchState.matched).length === matchState.leftItems.length;
            if (!all) { showToast('Completa todas as associações'); return; }
            isCorrect = Object.entries(matchState.matched).every(([li, ri]) => {
                const left = matchState.leftItems[li];
                const right = matchState.rightItems[ri];
                return e.pairs.some(p => p[0] === left && p[1] === right);
            });
        }
        if (currentSession !== s) return;
        recordAnswer(e, isCorrect);
        showFeedback(e, isCorrect);
    } finally {
        s._submitting = false;
    }
}

function recordAnswer(e, isCorrect) {
    const s = currentSession;
    s.results = s.results || [];
    s.results[s.idx] = isCorrect;
    let gained = 0;
    if (isCorrect) {
        gained = XP_BY_DIFF[e.diff] || 10;
        s.streak += 1;
        if (s.streak >= 3) gained += 5;
        s.correct++;
    } else {
        s.streak = 0;
        s.wrong++;
    }
    s.xp += gained;
    const sub = state.subjects[e.s] || { answered: 0, correct: 0, xp: 0 };
    sub.answered += 1;
    if (isCorrect) { sub.correct += 1; sub.xp += gained; }
    state.subjects[e.s] = sub;
    state.xp += gained;
    state.history.push({ id: e.id, s: e.s, c: isCorrect, d: todayStr() });
    if (state.history.length > 500) state.history.shift();
    state.recentIds = state.recentIds || [];
    state.recentIds.push(e.id);
    if (state.recentIds.length > 30) state.recentIds.shift();
    // Regista timestamp da última vez que foi vista (para rotação inteligente)
    state.exerciseSeen = state.exerciseSeen || {};
    state.exerciseSeen[e.id] = Date.now();
    // Tracking de mestria por tópico+dificuldade (progressão adaptativa)
    state.topicMastery = state.topicMastery || {};
    if (e.s && e.t) {
        const key = e.s + '/' + e.t;
        const m = state.topicMastery[key] || { d1: 0, d2: 0, d3: 0, w1: 0, w2: 0, w3: 0 };
        const d = Math.max(1, Math.min(3, e.diff || 1));
        if (isCorrect) m['d' + d] = (m['d' + d] || 0) + 1;
        else m['w' + d] = (m['w' + d] || 0) + 1;
        state.topicMastery[key] = m;
    }
    // Marca pergunta como vista no teste activo (para evitar repetir em sessões futuras)
    if (s.testId) {
        const t = (state.tests || []).find(x => x.id === s.testId);
        if (t) {
            t.seenEx = t.seenEx || [];
            if (!t.seenEx.includes(e.id)) t.seenEx.push(e.id);
        }
    }
    saveState();
}

// Áudio: gera tons sintetizados sem assets (Web Audio API). Silencioso se o browser bloquear.
let _audioCtx = null;
function getAudioCtx() {
    if (_audioCtx) return _audioCtx;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    try { _audioCtx = new Ctx(); } catch (_) { return null; }
    return _audioCtx;
}

// Nota tipo "sino" — fundamental + harmónica oitava + ataque rápido + decay lento exponencial
function playBellNote(freq, startOffsetMs, durationMs, peakGain) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') { try { ctx.resume(); } catch (_) {} }
    const t0 = ctx.currentTime + (startOffsetMs / 1000);
    const dur = durationMs / 1000;
    const peak = peakGain == null ? 0.22 : peakGain;

    // Fundamental — triangle dá calor, pouco harmónico desagradável
    const oscF = ctx.createOscillator();
    const gainF = ctx.createGain();
    oscF.type = 'triangle';
    oscF.frequency.value = freq;
    gainF.gain.setValueAtTime(0.0001, t0);
    gainF.gain.exponentialRampToValueAtTime(peak, t0 + 0.005);
    gainF.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    oscF.connect(gainF).connect(ctx.destination);
    oscF.start(t0);
    oscF.stop(t0 + dur + 0.05);

    // Harmónica oitava acima — sine, mais discreta, dá brilho de sino
    const oscH = ctx.createOscillator();
    const gainH = ctx.createGain();
    oscH.type = 'sine';
    oscH.frequency.value = freq * 2;
    gainH.gain.setValueAtTime(0.0001, t0);
    gainH.gain.exponentialRampToValueAtTime(peak * 0.35, t0 + 0.005);
    gainH.gain.exponentialRampToValueAtTime(0.0001, t0 + dur * 0.75);
    oscH.connect(gainH).connect(ctx.destination);
    oscH.start(t0);
    oscH.stop(t0 + dur + 0.05);
}

// ---- sons estilo Duolingo ----
function _duoNote(ctx, freq, delayMs, durMs, peak) {
    const t0 = ctx.currentTime + delayMs / 1000;
    const dur = durMs / 1000;
    // Fundamental sine puro — brilhante e limpo como xilofone
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
    // Harmónica oitava — dá corpo de sino, decay mais rápido
    const oscH = ctx.createOscillator();
    const gH = ctx.createGain();
    oscH.type = 'sine';
    oscH.frequency.value = freq * 2;
    gH.gain.setValueAtTime(0.0001, t0);
    gH.gain.linearRampToValueAtTime(peak * 0.28, t0 + 0.003);
    gH.gain.exponentialRampToValueAtTime(0.0001, t0 + dur * 0.5);
    oscH.connect(gH).connect(ctx.destination);
    oscH.start(t0); oscH.stop(t0 + dur + 0.05);
}
function _duoWrong(ctx, freq, delayMs, durMs, peak) {
    const t0 = ctx.currentTime + delayMs / 1000;
    const dur = durMs / 1000;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.87, t0 + dur); // glide para baixo
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
}

function playCorrectSound() {
    // Duolingo: "ding ding" — dois sinos ascendentes D5 → A5
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') { try { ctx.resume(); } catch (_) {} }
    _duoNote(ctx, 587,  0,  280, 0.28); // D5
    _duoNote(ctx, 880, 85,  380, 0.25); // A5
}

function playWrongSound() {
    // Duolingo: "dun dun" — dois tons descendentes Eb4 → Bb3
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') { try { ctx.resume(); } catch (_) {} }
    _duoWrong(ctx, 311,   0, 250, 0.22); // Eb4
    _duoWrong(ctx, 233, 170, 300, 0.20); // Bb3
}

function playPerfectSound() {
    // Sessão 100% — fanfare ascendente C5→E5→G5→C6 (arpejo de Dó maior)
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') { try { ctx.resume(); } catch (_) {} }
    _duoNote(ctx, 523,   0, 260, 0.24); // C5
    _duoNote(ctx, 659,  80, 260, 0.24); // E5
    _duoNote(ctx, 784, 160, 260, 0.24); // G5
    _duoNote(ctx, 1047,240, 550, 0.28); // C6 — nota longa final
}

function playVictorySound() {
    // ≥80% — G5→B5→D6 arpejo de Sol maior, alegre mas mais curto
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') { try { ctx.resume(); } catch (_) {} }
    _duoNote(ctx, 784,   0, 250, 0.22); // G5
    _duoNote(ctx, 988,  75, 250, 0.22); // B5
    _duoNote(ctx, 1175,150, 400, 0.24); // D6
}

function playBadgeSound() {
    // Badge desbloqueado — sparkle: 3 notas agudas ascendentes rápidas
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') { try { ctx.resume(); } catch (_) {} }
    _duoNote(ctx, 880,   0, 180, 0.18); // A5
    _duoNote(ctx, 1175,  55, 180, 0.17); // D6
    _duoNote(ctx, 1568, 110, 320, 0.16); // G6
}

function playRewardSound() {
    // Prémio desbloqueado — "chest open": arpejo mais lento e encorpado
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') { try { ctx.resume(); } catch (_) {} }
    _duoNote(ctx, 392,   0, 200, 0.20); // G4
    _duoNote(ctx, 523,  80, 200, 0.20); // C5
    _duoNote(ctx, 659, 160, 200, 0.22); // E5
    _duoNote(ctx, 784, 240, 200, 0.22); // G5
    _duoNote(ctx, 1047,320, 550, 0.26); // C6 — nota de chegada longa
}

function playStreakSound() {
    // Streak novo — whoosh ascendente + ding final
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') { try { ctx.resume(); } catch (_) {} }
    const t0 = ctx.currentTime;
    // Sweep de frequência ascendente (o "whoosh")
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, t0);
    osc.frequency.exponentialRampToValueAtTime(840, t0 + 0.22);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.16, t0 + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0); osc.stop(t0 + 0.32);
    // Ding de confirmação no fim do sweep
    _duoNote(ctx, 1047, 220, 350, 0.20); // C6
}

function playEncouragementSound() {
    // Meio da sessão — dois "dings" alegres mas discretos
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') { try { ctx.resume(); } catch (_) {} }
    _duoNote(ctx, 659,  0, 200, 0.16); // E5
    _duoNote(ctx, 880, 70, 260, 0.15); // A5
}

const ENCOURAGE_MSGS = [
    { icon: '⭐', text: 'Estás a ir muito bem!' },
    { icon: '💪', text: 'Continua assim!' },
    { icon: '🌟', text: 'Boa! Estás no caminho certo!' },
    { icon: '🎉', text: 'Já levas mais de metade!' },
    { icon: '🚀', text: 'Quase a chegar ao fim!' },
    { icon: '👏', text: 'Excelente! Não pares!' }
];
function showEncouragement() {
    const s = currentSession;
    if (!s) return;
    // Mostra a meio (~50%) e a 75% se tiver pelo menos 4 perguntas, e só se acertou maioria até aqui
    const total = s.items.length;
    if (total < 4) return;
    const idx = s.idx + 1; // já respondida
    const half = Math.floor(total / 2);
    const threeQ = Math.floor(total * 0.75);
    const fireAt = (idx === half) || (idx === threeQ);
    if (!fireAt) return;
    const ratio = s.correct / Math.max(1, idx);
    if (ratio < 0.5) return; // só encorajar se está a conseguir
    let msg;
    if (idx === half)         msg = ENCOURAGE_MSGS[3]; // metade
    else if (ratio === 1)     msg = ENCOURAGE_MSGS[2]; // perfeito
    else                      msg = ENCOURAGE_MSGS[Math.floor(Math.random() * 3)];
    const banner = document.createElement('div');
    banner.className = 'ep-encourage';
    banner.innerHTML = `<span class="ep-encourage-icon">${msg.icon}</span><span class="ep-encourage-text">${msg.text}</span>`;
    document.body.appendChild(banner);
    playEncouragementSound();
    requestAnimationFrame(() => banner.classList.add('show'));
    setTimeout(() => { banner.classList.remove('show'); setTimeout(() => banner.remove(), 400); }, 1800);
}

function showFeedback(e, isCorrect) {
    // Detecta resposta parcial (só fill-in via IA pode marcar — ver submitAnswer)
    const partial = (!isCorrect && currentSession?._partial) || null;
    if (currentSession) currentSession._partial = null; // consumido aqui
    if (isCorrect) playCorrectSound(); else playWrongSound();
    // Esconder botão IA inline (a pista só faz sentido ANTES de responder)
    const profWrap = document.getElementById('ex-prof-ia-wrap');
    if (profWrap) profWrap.style.display = 'none';
    // Trancar a área de resposta: esconder botões "Responder" e bloquear
    // interação (não dá para clicar opções, arrastar, escrever). O utilizador
    // é direccionado para o painel de feedback que aparece logo abaixo.
    const answerArea = document.getElementById('ex-answer-area');
    if (answerArea) {
        answerArea.style.pointerEvents = 'none';
        answerArea.querySelectorAll('button.btn-primary-solid').forEach(b => {
            // Esconde apenas botões "Responder" — preserva qualquer outro
            if ((b.textContent || '').trim().toLowerCase().startsWith('responder')) {
                b.style.display = 'none';
            }
        });
        answerArea.querySelectorAll('input, textarea').forEach(el => { el.disabled = true; });
    }
    const panel = document.getElementById('ex-feedback');
    panel.style.display = 'block';
    document.getElementById('feedback-icon').innerHTML = isCorrect ? '\u{1F389}' : (partial ? '\u{1F914}' : '\u{1F914}');
    const txt = document.getElementById('feedback-text');
    if (partial) {
        txt.textContent = 'Incompleto…';
        txt.className = 'feedback-text feedback-partial';
    } else {
        txt.textContent = isCorrect ? 'Certo!' : 'Ainda não…';
        txt.className = 'feedback-text ' + (isCorrect ? 'feedback-correct' : 'feedback-wrong');
    }
    let expParts = [];
    if (partial && partial.missing) {
        expParts.push(`Falta: ${partial.missing}.`);
    }
    if (!isCorrect) {
        // Mostra sempre a resposta certa — pode repetir no final da sessão
        if (e.type === 'mc') expParts.push(`Resposta certa: ${e.opts[e.ans]}.`);
        else if (e.type === 'tf') expParts.push(`Resposta certa: ${e.ans ? 'Verdadeiro' : 'Falso'}.`);
        else if (e.type === 'fill' || e.type === 'problem') expParts.push(`Resposta certa: ${e.ans[0]}.`);
        else if (e.type === 'order') expParts.push(`Ordem certa: ${e.items.join(' > ')}.`);
        if (e.exp) expParts.push(e.exp);
    }
    if (e.material)  expParts.push(`📘 ${e.material}`);
    if (e.solution)  expParts.push(`📐 Resolução: ${e.solution}`);
    if (e.exp && isCorrect) expParts.push(e.exp);
    // Render markdown leve (**bold**/*italic*) na explicação
    const _renderMdExp = (s) => escapeHtml(s || '')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
    const expEl = document.getElementById('feedback-exp');
    expEl.innerHTML = expParts.map(p => _renderMdExp(p)).join('<br><br>');
    expEl.style.whiteSpace = 'pre-wrap';
    document.getElementById('feedback-exp').style.textAlign = 'left';
    // Botão explicação detalhada: sempre visível
    const detailBtn = document.getElementById('feedback-detail-btn');
    const detailWrap = document.getElementById('feedback-detail-wrap');
    if (detailWrap) { detailWrap.style.display = 'none'; detailWrap.innerHTML = ''; }
    if (detailBtn) {
        detailBtn.style.display = 'block';
        detailBtn.textContent = '💡 Explicar passo a passo';
        detailBtn.disabled = false;
    }
    // Botão de avanço: sempre "Continuar" ou "Ver resultado"
    const nextSpan = document.getElementById('feedback-next');
    const nextIcon = document.getElementById('feedback-next-icon');
    const isLast = currentSession.idx + 1 >= currentSession.items.length;
    nextSpan.textContent = isLast ? 'Ver resultado' : 'Continuar';
    if (nextIcon) nextIcon.className = 'fas fa-arrow-right';
    document.getElementById('session-xp').textContent = currentSession.xp;
    // Garantir que o utilizador vê o feedback (e o botão Continuar) — scroll suave
    requestAnimationFrame(() => panel.scrollIntoView({ behavior: 'smooth', block: 'center' }));
}

// Avança para a próxima pergunta (ou termina a sessão)
function feedbackNext() {
    if (!currentSession) return;
    nextQuestion();
}

// Constrói o prompt detalhado do Professor IA — explicação pós-resposta com passos
function _buildDetailedExplanationPrompt(e, yr) {
    const subName = SUBJECTS[e.s]?.name || e.s;

    // Resposta certa em texto legível por tipo
    let correctAns;
    if (e.type === 'mc') correctAns = e.opts[e.ans];
    else if (e.type === 'tf') correctAns = e.ans ? 'Verdadeiro' : 'Falso';
    else if (e.type === 'order') correctAns = (e.items || []).join(' > ');
    else if (e.type === 'match' && e.pairs) correctAns = e.pairs.map(p => `${p[0]} ↔ ${p[1]}`).join('; ');
    else correctAns = Array.isArray(e.ans) ? e.ans[0] : String(e.ans);

    let qContext = `Disciplina: ${subName}\nTópico: ${e.t}\nPergunta: "${e.q}"\nResposta CERTA: ${correctAns}`;
    if (e.type === 'mc' && e.opts) qContext += `\nOpções apresentadas: ${e.opts.map((o,i)=>`${String.fromCharCode(65+i)}) ${o}`).join(' | ')}`;
    if (e.passage) qContext += `\nTexto de apoio: "${e.passage.slice(0, 400)}"`;
    if (e.material) qContext += `\nRegra do tópico: "${e.material}"`;
    if (e.exp) qContext += `\nNota curta do exercício: "${e.exp}"`;
    if (e.solution) qContext += `\nResolução resumida: "${e.solution}"`;

    // Lição estática para fundamentar
    const lesson = LESSONS[`${e.s}/${e.t}`] || state.maxLessons?.[`${e.s}/${e.t}`];
    if (lesson) {
        const lessonSnippet = lesson.body.replace(/\*\*/g, '').slice(0, 800);
        qContext += `\n\n--- Conteúdo do tópico (currículo, usa-o como base) ---\n${lessonSnippet}\n--- fim ---`;
    }

    // Estilo por faixa etária + tamanho
    let ageStyle, length;
    if (yr <= 2) {
        ageStyle = 'Estás a falar com uma criança de 7-8 anos. Frases CURTAS, palavras simples, exemplos do dia-a-dia (animais, comida, brincadeiras). Tom carinhoso. 1-2 emojis ajudam.';
        length = '3-4 frases muito curtas';
    } else if (yr <= 4) {
        ageStyle = `Estás a falar com uma criança do ${yr}.º ano (8-10 anos). Frases simples, com 1 exemplo concreto. Tom amigável, sem infantilizar.`;
        length = '4-6 frases claras';
    } else {
        ageStyle = `Estás a falar com um aluno do ${yr}.º ano (10-12 anos). Tom de professor/a, vocabulário próprio mas explicado. Sem rodeios.`;
        length = '5-8 frases ou 4-6 passos';
    }

    const isMath = e.s === 'matematica';
    const isEnglishY2 = e.s === 'ingles' && yr <= 2;

    return `És um professor/professora do ${yr}.º ano do Ensino Básico português, em Portugal. O aluno acabou de responder à pergunta abaixo (terá acertado ou errado — não interessa). Vais explicar-lhe DETALHADAMENTE, em Português Europeu (Portugal), como se chega à resposta certa, para ele perceber bem o assunto.

${qContext}

${ageStyle}

Estrutura da tua resposta (segue EXACTAMENTE este formato):

📚 O que está em causa
[Explica em 1-2 frases o conceito/regra envolvido nesta pergunta, ligado ao tópico "${e.t}".]

🪜 Passo a passo
${isMath ? `1. [Identifica o que a pergunta pede]
2. [Mostra o cálculo ou raciocínio passo a passo, com os números/operações concretos desta pergunta]
3. [Chega à resposta: ${correctAns}]
${yr >= 5 ? '4. [Confirma o resultado ou mostra como verificar]' : ''}` : `1. [Primeiro passo do raciocínio para esta pergunta concreta]
2. [Segundo passo, aplicando a regra ao caso]
3. [Conclusão: porquê a resposta é "${correctAns}"]
${yr >= 5 ? '4. [Reforço ou exemplo análogo]' : ''}`}

✅ Resposta: ${correctAns}
[Frase curta a justificar porquê esta é a resposta — sem repetir os passos.]

${isEnglishY2 ? '🇬🇧 Em Inglês: [palavra/frase inglesa] → 🇵🇹 Em Português: [tradução]\n[Dica de memorização para a criança.]' : ''}

Regras OBRIGATÓRIAS:
- Português EUROPEU (Portugal): "estás", "tu", "comboio", "autocarro", "rapariga"/"rapaz", "ecrã", "pequeno-almoço" — NUNCA "você", "trem", "ônibus", "garota"/"garoto", "tela", "café da manhã"
- ${length} no total (não escrevas demasiado)
- NÃO comentes a tua explicação ("vou explicar...", "espero ter ajudado", "como podes ver")
- NÃO digas coisas como "a resposta dada está correcta" ou "depende da interpretação"
- Vai DIRECTO ao conteúdo
- Sem markdown (**negrito**, # títulos), sem JSON, sem chavetas
- Usa SEMPRE as 3 secções acima com os emojis 📚 🪜 ✅ no início`;
}

// Renderiza a explicação detalhada em HTML rico
function _renderDetailedExplanationHtml(rawText) {
    const text = String(rawText || '').trim();
    const causaMatch = text.match(/📚\s*O que está em causa[:\s]*\n?([\s\S]*?)(?=\n*🪜|\n*✅|\n*🇬🇧|$)/);
    const passosMatch = text.match(/🪜\s*Passo a passo[:\s]*\n?([\s\S]*?)(?=\n*✅|\n*🇬🇧|\n*📚|$)/);
    const respMatch = text.match(/✅\s*Resposta[:\s]*([\s\S]*?)(?=\n*🇬🇧|\n*📚|\n*🪜|$)/);
    const engMatch = text.match(/🇬🇧[\s\S]*$/);

    let html = '';
    if (causaMatch) {
        const body = escapeHtml(causaMatch[1].trim()).replace(/\n+/g, '<br>');
        html += `<div style="margin-bottom:14px"><div style="font-weight:700;color:#1d4ed8;margin-bottom:4px;font-size:0.88rem">📚 O que está em causa</div><div>${body}</div></div>`;
    }
    if (passosMatch) {
        const passosRaw = passosMatch[1].trim();
        const lines = passosRaw.split('\n').map(l => l.trim()).filter(Boolean);
        const numbered = lines.filter(l => /^\d+\.?\s/.test(l));
        let passosHtml;
        if (numbered.length >= 2) {
            passosHtml = '<ol style="margin:0;padding-left:22px">' +
                numbered.map(l => `<li style="margin-bottom:6px">${escapeHtml(l.replace(/^\d+\.?\s*/, ''))}</li>`).join('') +
                '</ol>';
        } else {
            passosHtml = `<div>${escapeHtml(passosRaw).replace(/\n+/g, '<br>')}</div>`;
        }
        html += `<div style="margin-bottom:14px"><div style="font-weight:700;color:#1d4ed8;margin-bottom:6px;font-size:0.88rem">🪜 Passo a passo</div><div>${passosHtml}</div></div>`;
    }
    if (respMatch) {
        const body = escapeHtml(respMatch[1].trim()).replace(/\n+/g, '<br>');
        html += `<div style="margin-bottom:10px;padding:10px 12px;background:#dcfce7;border-left:4px solid #16a34a;border-radius:8px"><div style="font-weight:700;color:#166534;margin-bottom:2px;font-size:0.88rem">✅ Resposta</div><div style="color:#14532d">${body}</div></div>`;
    }
    if (engMatch) {
        const body = escapeHtml(engMatch[0].trim()).replace(/\n+/g, '<br>');
        html += `<div style="margin-top:8px;padding:10px 12px;background:#fef9c3;border-left:4px solid #eab308;border-radius:8px;font-size:0.88rem">${body}</div>`;
    }

    if (!html) html = `<div>${escapeHtml(text).replace(/\n+/g, '<br>')}</div>`;
    return html;
}

async function loadDetailedExplanation() {
    const e = currentSession.items[currentSession.idx];
    const btn = document.getElementById('feedback-detail-btn');
    const wrap = document.getElementById('feedback-detail-wrap');
    const cacheKey = `detail_v2_${e.id}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) { wrap.innerHTML = cached; wrap.style.display = 'block'; btn.style.display = 'none'; return; }

    // Lição estática (fallback se IA falhar ou não houver chave — currículo completo)
    const lessonKey = `${e.s}/${e.t}`;
    const lesson = LESSONS[lessonKey] || state.maxLessons?.[lessonKey];
    const showLesson = () => {
        const html = `<strong>${lesson.title}</strong><br><br>${escapeHtml(lesson.body).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>')}`;
        sessionStorage.setItem(cacheKey, html);
        wrap.innerHTML = html; wrap.style.display = 'block'; btn.style.display = 'none';
    };

    // Sem API key → lição estática se existir, senão e.exp
    if (!hasAIKey()) {
        if (lesson) return showLesson();
        const fallback = e.exp || 'Não há explicação detalhada disponível para esta pergunta.';
        wrap.innerHTML = escapeHtml(fallback).replace(/\n/g, '<br>');
        wrap.style.display = 'block'; btn.style.display = 'none';
        return;
    }

    // Com API key → IA detalhada
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A pensar…'; btn.disabled = true;
    const yr = activeProfile()?.year || 6;
    const prompt = _buildDetailedExplanationPrompt(e, yr);
    try {
        const { text } = await callClaudeAPI(prompt, 700, false);
        let clean = text.trim();
        if (clean.startsWith('{')) {
            try {
                const obj = JSON.parse(clean);
                clean = Object.values(obj).filter(v => typeof v === 'string').join('\n');
            } catch(_) {
                clean = clean.replace(/[{}"]/g, '').replace(/\b\w+:/g, '').trim();
            }
        }
        const html = _renderDetailedExplanationHtml(clean);
        sessionStorage.setItem(cacheKey, html);
        wrap.innerHTML = html; wrap.style.display = 'block'; btn.style.display = 'none';
    } catch(err) {
        if (lesson) return showLesson();
        const fallback = e.exp
            ? `${escapeHtml(e.exp).replace(/\n/g,'<br>')}<br><br><em style="color:#9ca3af">(IA indisponível: ${String(err.message || err).slice(0, 100)})</em>`
            : `<em style="color:#dc2626">Erro: ${String(err.message || err).slice(0, 200)}</em>`;
        wrap.innerHTML = fallback;
        wrap.style.display = 'block'; btn.style.display = 'none';
    }
}

function nextQuestion() {
    showEncouragement();
    currentSession.idx += 1;
    if (currentSession.idx >= currentSession.items.length) finishSession();
    else renderQuestion();
}

function finishSession() {
    const s = currentSession;
    // Se for duelo, vai para o ecrã de comparação e termina aqui
    if (s && s.isDuel) {
        _finishDuel();
        return;
    }
    let newBadges = [];
    // === STREAK (Ofensiva) ===
    // Conta QUALQUER sessão de exercícios (não só desafio diário).
    // Tolera 1 dia de folga: reset só ocorre quando passam 2+ dias sem fazer
    // (gap entre o último dia e hoje > 2).
    const today = todayStr();
    const prevStreak = state.streak.days;
    const lastDate = state.streak.lastDate;
    let streakJustIncreased = false;
    let streakReset = false;
    if (lastDate !== today) {
        const gap = daysBetween(lastDate, today);
        if (gap >= 1 && gap <= 2) {
            // Continuou: gap=1 (jogou ontem) ou gap=2 (1 dia de folga, ainda dentro)
            state.streak.days += 1;
            streakJustIncreased = true;
        } else {
            // Reinicia: ou primeira vez, ou passaram 2+ dias sem fazer
            if (state.streak.days > 0) streakReset = true;
            state.streak.days = 1;
        }
        state.streak.lastDate = today;
        if (state.streak.days > state.streak.best) state.streak.best = state.streak.days;
    }
    if (s.isDaily) {
        state.daily = { date: today, completed: true, correct: s.correct };
        state.totalDailies = (state.totalDailies || 0) + 1;
        if (s.correct === s.items.length) state.perfectDailies = (state.perfectDailies || 0) + 1;
    }
    // Notificações visuais ao utilizador
    if (streakJustIncreased && state.streak.days >= 2) {
        const milestoneMap = { 3: '🔥 3 dias seguidos!', 7: '🏆 1 semana inteira!', 14: '⭐ 2 semanas!', 30: '👑 1 mês completo!', 60: '💎 2 meses!', 100: '🌟 100 dias!' };
        const ms = milestoneMap[state.streak.days];
        if (ms) showToast(ms);
        else if (typeof showToast === 'function') showToast(`🔥 ${state.streak.days} dias seguidos!`);
        // Animação visual no chip
        setTimeout(() => { try { _flashStreakChip(); } catch(_) {} }, 200);
    } else if (streakReset && prevStreak >= 3) {
        // Aviso amistoso quando perdeu uma streak grande
        if (typeof showToast === 'function') showToast(`💪 Recomeçaste a tua ofensiva! (anterior: ${prevStreak} dias)`);
    }
    BADGES.forEach(b => {
        if (!state.badges.includes(b.id) && b.check(state)) {
            state.badges.push(b.id);
            newBadges.push(b);
        }
    });
    // Verificar prémios desbloqueados (ainda não reclamados e sem unlockedAt)
    const newlyUnlocked = (state.rewards || []).filter(r => !r.claimed && !r.unlockedAt && state.xp >= r.cost);
    newlyUnlocked.forEach(r => { r.unlockedAt = todayStr(); });
    saveState();
    showSummary(s, newBadges, newlyUnlocked, streakJustIncreased);
}

function showSummary(s, newBadges, newRewards, streakIncreased) {
    document.getElementById('exercise-screen').style.display = 'none';
    document.getElementById('summary-screen').style.display = 'flex';
    const total = s.items.length;
    const acc = total ? Math.round(s.correct / total * 100) : 0;

    // Tier por desempenho
    let title, emoji, tier;
    if (acc === 100)      { title = 'Perfeito!';     emoji = '🏆'; tier = 'tier-perfect'; }
    else if (acc >= 80)   { title = 'Excelente!';    emoji = '🌟'; tier = 'tier-great'; }
    else if (acc >= 50)   { title = 'Quase lá!';     emoji = '💪'; tier = 'tier-ok'; }
    else                  { title = 'Treina mais!';  emoji = '🌱'; tier = 'tier-low'; }

    // Sub-label do hero
    const subLabel = s.isDaily ? 'Desafio diário' : (s.testId ? 'Treino para teste' : 'Sessão de treino');

    // Hero
    const hero = document.getElementById('summary-hero');
    hero.classList.remove('tier-perfect','tier-great','tier-ok','tier-low');
    hero.classList.add(tier);
    document.getElementById('summary-emoji').textContent = emoji;
    document.getElementById('summary-sub').textContent = subLabel;
    document.getElementById('summary-title').textContent = title;
    document.getElementById('sum-correct').textContent = `${s.correct}/${total}`;
    document.getElementById('sum-xp').textContent = '+' + s.xp;
    // Anima o número da accuracy
    _animateNumber(document.getElementById('sum-accuracy'), 0, acc, 900, v => v + '%');

    // Sons
    if (acc === 100) playPerfectSound();
    else if (acc >= 80) playVictorySound();
    if (streakIncreased) setTimeout(playStreakSound, 600);
    if (newBadges && newBadges.length > 0) setTimeout(playBadgeSound, acc === 100 ? 900 : 500);
    if (newRewards && newRewards.length > 0) setTimeout(playRewardSound, 1400);

    // Confetti se >= 80% (e celebração maior se 100%)
    if (acc >= 80) _launchConfetti(acc === 100 ? 'big' : 'normal');

    // Cards informativos abaixo do hero
    const info = document.getElementById('summary-info-cards');
    const cards = [];
    if (s.testId) {
        const t = state.tests.find(x => x.id === s.testId);
        const sub = t ? SUBJECTS[t.subject] : null;
        if (sub) cards.push(_summaryCard('fa-graduation-cap', sub.color, 'TESTE', sub.fullName || sub.name));
    } else if (s.subject) {
        const sub = SUBJECTS[s.subject];
        if (sub) cards.push(_summaryCard('fa-' + (sub.icon || '').replace(/^fa-/, ''), sub.color, 'DISCIPLINA', sub.fullName || sub.name));
    }
    if (s.isDaily && state.streak && state.streak.days > 0) {
        cards.push(_summaryCard('fa-fire', '#f97316', 'SEQUÊNCIA', `${state.streak.days} dia${state.streak.days === 1 ? '' : 's'} seguido${state.streak.days === 1 ? '' : 's'}`));
    }
    cards.push(_summaryCard('fa-bolt', '#facc15', 'XP TOTAL', `${state.xp} pontos`));
    info.innerHTML = cards.join('');

    // Badges/prémios
    const bdg = document.getElementById('summary-badges');
    const badgeChips = newBadges.map(b => `<div class="summary-badge-chip">${b.icon} ${b.name}</div>`).join('');
    const rewardChips = (newRewards || []).map(r => `<div class="summary-badge-chip" style="background:linear-gradient(135deg,#fef9c3,#fde047);border-color:#eab308">🎁 ${r.name}</div>`).join('');
    bdg.innerHTML = badgeChips + rewardChips;

    // Botão repetir perguntas erradas
    // Usa s.correct como fonte de verdade para evitar inconsistência visual
    const wrongCount = total - s.correct;
    const retryWrap = document.getElementById('summary-retry-wrap');
    if (retryWrap) {
        if (wrongCount > 0 && s.correct < total) {
            retryWrap.innerHTML = `<button class="btn btn-block" onclick="retryWrongSession()" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;font-weight:700;margin-bottom:10px;border:none;padding:14px"><i class="fas fa-rotate-left"></i> Repetir perguntas erradas (${wrongCount})</button>`;
        } else {
            retryWrap.innerHTML = '';
        }
    }

    // Botão "Mais um ciclo!" — só em sessões de treino normais (não diário, não teste, não duelo)
    const newCycleWrap = document.getElementById('summary-newcycle-wrap');
    if (newCycleWrap) {
        if (!s.isDaily && !s.testId && !s.isDuel && !s.isMax && !s._isRetry && s.subject) {
            newCycleWrap.innerHTML = `<button class="btn btn-block" onclick="startNewCycle()" style="background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;font-weight:700;padding:14px;margin-bottom:10px;border:none"><i class="fas fa-rotate-right"></i> Mais um ciclo!</button>`;
        } else {
            newCycleWrap.innerHTML = '';
        }
    }

    // Modal de prémio desbloqueado
    if (newRewards && newRewards.length > 0) {
        pendingRewardId = newRewards[0].id;
        setTimeout(() => {
            document.getElementById('reward-unlocked-name').textContent = newRewards[0].name;
            document.getElementById('reward-modal').style.display = 'flex';
        }, 800);
    }

    // Guarda dados para a partilha
    _lastSummary = { s, acc, total, title, subLabel };
}

// Card "ícone circular + label/value"
function _summaryCard(icon, color, label, value) {
    const c = color || '#6d28d9';
    // bg suave a partir da cor (12% opacidade)
    const bg = c + '22';
    return `<div class="summary-info-card">
        <div class="summary-info-icon" style="background:${bg};color:${c}"><i class="fas ${icon}"></i></div>
        <div class="summary-info-body">
            <div class="summary-info-label">${label}</div>
            <div class="summary-info-value">${value}</div>
        </div>
    </div>`;
}

// Anima um número de start até end no DOM
function _animateNumber(el, start, end, durationMs, fmt) {
    if (!el) return;
    const t0 = performance.now();
    fmt = fmt || (v => String(v));
    const step = (now) => {
        const p = Math.min(1, (now - t0) / durationMs);
        const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
        const v = Math.round(start + (end - start) * eased);
        el.textContent = fmt(v);
        if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

// Confetti em canvas — sem libs
function _launchConfetti(intensity) {
    const canvas = document.getElementById('summary-confetti');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1);
    const H = canvas.height = canvas.clientHeight * (window.devicePixelRatio || 1);
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    const colors = ['#f59e0b','#ef4444','#ec4899','#8b5cf6','#3b82f6','#10b981','#facc15'];
    const count = intensity === 'big' ? 140 : 80;
    const parts = [];
    for (let i = 0; i < count; i++) {
        parts.push({
            x: (canvas.clientWidth/2) + (Math.random() - 0.5) * canvas.clientWidth * 0.3,
            y: -20 - Math.random() * 60,
            vx: (Math.random() - 0.5) * 5,
            vy: 2 + Math.random() * 4,
            size: 6 + Math.random() * 8,
            color: colors[Math.floor(Math.random() * colors.length)],
            angle: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 0.3,
            life: 0
        });
    }
    let frames = 0;
    const maxFrames = 220;
    function loop() {
        frames++;
        ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
        parts.forEach(p => {
            p.vy += 0.12; // gravidade
            p.x += p.vx;
            p.y += p.vy;
            p.angle += p.spin;
            p.life++;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.max(0, 1 - frames / maxFrames);
            ctx.fillRect(-p.size/2, -p.size/4, p.size, p.size/2);
            ctx.restore();
        });
        if (frames < maxFrames) requestAnimationFrame(loop);
        else ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    }
    requestAnimationFrame(loop);
}

// Partilha do resultado da sessão
let _lastSummary = null;
async function shareSummary() {
    if (!_lastSummary) return;
    const { s, acc, total, title, subLabel } = _lastSummary;
    const lines = [];
    lines.push(`🏆 ${title} — ${acc}% de precisão`);
    lines.push('');
    lines.push(`📚 ${subLabel}`);
    lines.push(`🎯 ${s.correct}/${total} certas`);
    lines.push(`⭐ +${s.xp} XP`);
    if (s.isDaily && state.streak?.days > 0) lines.push(`🔥 Sequência: ${state.streak.days} dia(s)`);
    lines.push('');
    lines.push(`— EscolaPlay`);
    const text = lines.join('\n');
    if (navigator.share) {
        try { await navigator.share({ title: 'O meu resultado no EscolaPlay', text }); return; }
        catch (err) { if (err && err.name === 'AbortError') return; }
    }
    try {
        await navigator.clipboard.writeText(text);
        showToast('📋 Resultado copiado!');
    } catch {
        showToast('Não foi possível partilhar.');
    }
}

function closeSummary() {
    document.getElementById('summary-screen').style.display = 'none';
    currentSession = null;
    updateAll();
    switchTab('home');
}

// Inicia novo ciclo com o mesmo tópico/disciplina (bypassa verificação de "tudo visto")
function startNewCycle() {
    const s = currentSession;
    if (!s || !s.subject) { closeSummary(); return; }
    const key = s.subject;
    const topicSet = s.topicSet || activeTopicsFor(key);
    const pool = allExercisesFor(key, topicSet);
    if (pool.length === 0) { closeSummary(); return; }
    const items = pickExercises(pool, Math.min(PRACTICE_QUESTIONS, pool.length));
    document.getElementById('summary-screen').style.display = 'none';
    currentSession = { items, idx: 0, correct: 0, wrong: 0, xp: 0, streak: 0, isDaily: false, subject: key, topicSet, startedAt: Date.now() };
    openExerciseScreen();
    renderQuestion();
}

// Inicia uma mini-sessão só com as perguntas que o aluno errou
function retryWrongSession() {
    const s = currentSession;
    if (!s) return;
    const wrongItems = s.items.filter((_, i) => s.results && s.results[i] === false);
    if (!wrongItems.length) {
        // Não há erros reais em s.results — botão não devia aparecer; volta ao início
        showToast('Afinal não há perguntas erradas! 🎉');
        setTimeout(closeSummary, 1200);
        return;
    }
    document.getElementById('summary-screen').style.display = 'none';
    currentSession = {
        items:   wrongItems,
        idx:     0,
        correct: 0,
        wrong:   0,
        xp:      0,
        streak:  0,
        results: [],
        isDaily: false,
        testId:  null,
        _isRetry: true
    };
    document.getElementById('exercise-screen').style.display = 'flex';
    renderQuestion();
}

function claimCurrentReward() {
    if (pendingRewardId) claimReward(pendingRewardId);
    closeRewardModal();
}
function closeRewardModal() {
    document.getElementById('reward-modal').style.display = 'none';
    pendingRewardId = null;
}

// ============================================================
// ============== DUELOS — desafiar amigos via URL =============
// ============================================================
// Sem backend: a URL transporta { perguntas, score do criador, tempo }.
// O amigo abre o link, faz as MESMAS perguntas com cronómetro, vê
// comparação no fim, e pode enviar o seu resultado de volta via outro
// link. Sistema viral estilo Wordle.

// ----- helpers de codificação base64 URL-safe -----
function _b64UrlEncode(str) {
    return btoa(unescape(encodeURIComponent(str)))
        .replace(/=+$/, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}
function _b64UrlDecode(s) {
    let b64 = s.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4;
    if (pad) b64 += '='.repeat(4 - pad);
    return decodeURIComponent(escape(atob(b64)));
}
function encodeDuel(obj) {
    try { return _b64UrlEncode(JSON.stringify(obj)); } catch (_) { return ''; }
}
function decodeDuel(s) {
    try { return JSON.parse(_b64UrlDecode(s)); } catch (_) { return null; }
}

// ----- procura exercício por id em qualquer ano carregado -----
function _findExerciseAnyYear(id) {
    if (!id) return null;
    // Tenta no ano activo primeiro
    if (Array.isArray(EXERCISES)) {
        const e = EXERCISES.find(x => x && x.id === id);
        if (e) return e;
    }
    // Procura em todos os anos disponíveis
    if (window.EXERCISES_BY_YEAR) {
        for (const yr of Object.keys(window.EXERCISES_BY_YEAR)) {
            const arr = window.EXERCISES_BY_YEAR[yr];
            if (Array.isArray(arr)) {
                const e = arr.find(x => x && x.id === id);
                if (e) return e;
            }
        }
    }
    // MAX exercises do estado
    if (state && Array.isArray(state.maxExercises)) {
        const e = state.maxExercises.find(x => x && x.id === id);
        if (e) return e;
    }
    return null;
}

// ----- formatação do tempo -----
function _formatDuelTime(ms) {
    const sec = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}:${String(s).padStart(2,'0')}` : `${s}s`;
}

// ----- pontuação de duelo -----
// 100 pontos por certa + bónus por velocidade (5 pontos por seg restante)
function _duelScore(correct, timeUsedSec, timeLimitSec) {
    const baseScore = correct * 100;
    const speedBonus = Math.max(0, Math.floor((timeLimitSec - timeUsedSec) * 5));
    return baseScore + speedBonus;
}

// ===== CRIAR DUELO a partir da última sessão =====
function shareLastSummaryAsDuel() {
    if (!_lastSummary) return;
    const { s } = _lastSummary;
    const p = activeProfile();
    if (!p || !s.items || s.items.length === 0) return;
    // Tempo do criador
    const usedSec = Math.max(1, Math.floor((Date.now() - (s.startedAt || Date.now())) / 1000));
    // Tempo limite: 20s por pergunta, mínimo 60s
    const timeLimit = Math.max(60, s.items.length * 20);
    const data = {
        v: 1,
        c: p.name,
        ca: p.avatar,
        cy: p.year,
        q: s.items.map(e => e.id),
        tl: timeLimit,
        sb: s.correct,                          // perguntas certas do criador
        st: Math.min(usedSec, timeLimit),       // tempo usado pelo criador
        ss: _duelScore(s.correct, usedSec, timeLimit), // score do criador
        ts: Date.now()
    };
    const url = `${location.origin}${location.pathname}?duel=${encodeDuel(data)}`;
    _shareDuelUrl(url, data);
}

async function _shareDuelUrl(url, data) {
    const sub = SUBJECTS[ data.q && _findExerciseAnyYear(data.q[0])?.s ];
    const subName = sub?.name || 'EscolaPlay';
    const text =
`🥊 ${data.c} desafia-te no EscolaPlay!

${subName} · ${data.q.length} perguntas
${data.sb}/${data.q.length} certas em ${_formatDuelTime(data.st * 1000)}

📲 Como aceitar:
1. Abre a app EscolaPlay no telemóvel
2. No início, toca em "🥊 Tens um duelo?"
3. Cola este link

${url}

(Se não tiveres a app, o link funciona também no browser.)`;
    if (navigator.share) {
        try { await navigator.share({ title: '🥊 Duelo no EscolaPlay', text }); return; }
        catch (err) { if (err && err.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(text); showToast('🔗 Link de duelo copiado!'); }
    catch { prompt('Copia este link e envia ao teu amigo:', url); }
}

// ===== ACEITAR DUELO via paste (para quando o link abre no browser
//       em vez da app instalada — comum em iOS) =====
function openAcceptDuelModal() {
    document.getElementById('duel-paste-modal-temp')?.remove();
    const html = `
    <div id="duel-paste-modal-temp" class="modal" style="align-items:center;padding:20px">
        <div class="modal-content" style="max-width:480px;border-radius:24px;max-height:92vh;overflow:hidden">
            <div style="background:linear-gradient(135deg,#dc2626 0%,#f97316 50%,#facc15 100%);color:#fff;padding:24px 22px;text-align:center;position:relative;overflow:hidden">
                <div style="position:absolute;top:-60px;right:-40px;width:160px;height:160px;border-radius:50%;background:rgba(255,255,255,0.10);pointer-events:none"></div>
                <div style="font-size:2.8rem;line-height:1;margin-bottom:6px">🥊</div>
                <h2 style="font-size:1.3rem;font-weight:900;letter-spacing:-0.01em">Aceitar duelo</h2>
                <p style="font-size:0.86rem;opacity:0.94;margin-top:4px">Cola aqui o link que recebeste</p>
            </div>
            <div class="modal-body" style="padding:20px 22px 24px">
                <textarea id="duel-paste-input" placeholder="Cola aqui o link ou código do duelo…" style="width:100%;min-height:90px;padding:14px;border:1.5px solid var(--border);border-radius:12px;font-size:0.92rem;background:#fafafa;font-family:inherit;resize:vertical;line-height:1.4"></textarea>
                <button class="btn btn-block btn-secondary" onclick="pasteDuelFromClipboard()" style="margin-top:10px;padding:11px"><i class="fas fa-clipboard"></i> Colar da área de transferência</button>
                <button class="btn btn-block" onclick="processPastedDuel()" style="margin-top:10px;background:linear-gradient(135deg,#dc2626,#f97316);color:#fff;border:none;font-weight:800;padding:14px;box-shadow:0 8px 20px rgba(220,38,38,0.32)">
                    <i class="fas fa-fist-raised"></i> Aceitar duelo
                </button>
                <button class="btn btn-block btn-secondary" onclick="closeAcceptDuelModal()" style="margin-top:10px;padding:11px">Cancelar</button>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    setTimeout(() => document.getElementById('duel-paste-input')?.focus(), 100);
}
function closeAcceptDuelModal() {
    document.getElementById('duel-paste-modal-temp')?.remove();
}
async function pasteDuelFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        const input = document.getElementById('duel-paste-input');
        if (input) input.value = text;
    } catch (_) {
        showToast('Permissão negada — cola manualmente.');
    }
}
function processPastedDuel() {
    const input = document.getElementById('duel-paste-input');
    if (!input) return;
    const text = (input.value || '').trim();
    if (!text) { showToast('Cola primeiro o link.'); return; }
    // Procura ?duel=... no texto colado (pode vir com texto à volta)
    const m = text.match(/[?&]duel=([A-Za-z0-9_\-=]+)/);
    let raw = m ? m[1] : text; // se for só o código, aceita também
    raw = raw.split(/[\s&]/)[0]; // limpa caracteres extra após o código
    const data = decodeDuel(raw);
    if (!data || !Array.isArray(data.q) || data.q.length === 0) {
        showToast('Link inválido. Verifica que copiaste o link completo.');
        return;
    }
    closeAcceptDuelModal();
    // Garante que o ano do criador está carregado
    if (data.cy && window.EXERCISES_BY_YEAR && window.EXERCISES_BY_YEAR[data.cy] && typeof loadYearExtras === 'function') {
        loadYearExtras(data.cy).then(() => setTimeout(() => _showDuelIntro(data), 200));
    } else {
        setTimeout(() => _showDuelIntro(data), 200);
    }
}

// ===== ABRIR DUELO RECEBIDO via URL =====
function _checkIncomingDuel() {
    try {
        const params = new URLSearchParams(location.search);
        const raw = params.get('duel');
        if (!raw) return;
        const data = decodeDuel(raw);
        if (!data || !Array.isArray(data.q) || data.q.length === 0) return;
        // Limpa o URL para não voltar a abrir o duelo após reload
        try { history.replaceState({}, '', location.pathname); } catch (_) {}
        // Garante que o ano do criador está carregado (se diferente do activo)
        if (data.cy && window.EXERCISES_BY_YEAR && window.EXERCISES_BY_YEAR[data.cy] && typeof loadYearExtras === 'function') {
            loadYearExtras(data.cy).then(() => setTimeout(() => _showDuelIntro(data), 200));
        } else {
            setTimeout(() => _showDuelIntro(data), 200);
        }
    } catch (_) {}
}

function _isStandaloneApp() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
        || window.navigator.standalone === true;
}

async function _copyDuelLinkToClipboard(url) {
    try {
        await navigator.clipboard.writeText(url);
        showToast('🔗 Link copiado! Abre a app e cola.');
    } catch (_) {
        prompt('Copia este link e abre na app:', url);
    }
}

function _showDuelIntro(data) {
    const items = data.q.map(id => _findExerciseAnyYear(id)).filter(Boolean);
    if (items.length === 0) {
        showToast('Não foi possível abrir o desafio. Talvez seja de um ano que ainda não criaste.');
        return;
    }
    if (!activeProfile()) {
        showToast('Cria primeiro um perfil para aceitar o desafio!');
        switchTab('profile');
        return;
    }
    const sub = SUBJECTS[items[0]?.s];
    const subName = sub?.fullName || sub?.name || 'EscolaPlay';

    // Banner de aviso quando aberto no browser em vez da app instalada
    const inBrowser = !_isStandaloneApp();
    // Construir o link actual para que o utilizador possa copiá-lo e colar na app
    const currentUrl = `${location.origin}${location.pathname}?duel=${encodeDuel(data)}`;
    const browserBanner = inBrowser ? `
        <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #f59e0b;border-radius:12px;padding:12px 14px;margin-bottom:14px;font-size:0.85rem;color:#78350f;line-height:1.5">
            <div style="font-weight:800;margin-bottom:4px">⚠️ Estás no browser</div>
            Os teus pontos do duelo NÃO vão ficar no perfil da app instalada (são memórias separadas).
            <details style="margin-top:8px">
                <summary style="cursor:pointer;font-weight:700;color:#92400e">Como abrir na app instalada?</summary>
                <div style="margin-top:6px;font-size:0.82rem">
                    1. Toca <i class="fas fa-clipboard"></i> abaixo para copiar o link<br>
                    2. Abre a app EscolaPlay (no ecrã principal)<br>
                    3. No início, toca "🥊 Tens um duelo?" e cola
                </div>
                <button onclick="_copyDuelLinkToClipboard('${currentUrl.replace(/'/g, "\\'")}')" style="margin-top:8px;padding:8px 14px;border:none;border-radius:8px;background:#92400e;color:#fff;font-weight:700;font-size:0.82rem;cursor:pointer"><i class="fas fa-clipboard"></i> Copiar link</button>
            </details>
        </div>` : '';

    document.getElementById('duel-intro-modal-temp')?.remove();
    const html = `
    <div id="duel-intro-modal-temp" class="modal" style="align-items:center;padding:20px">
        <div class="modal-content" style="max-width:480px;border-radius:24px;max-height:92vh;overflow:auto">
            <div style="background:linear-gradient(135deg,#dc2626 0%,#f97316 50%,#facc15 100%);color:#fff;padding:28px 24px;text-align:center;position:relative;overflow:hidden">
                <div style="position:absolute;top:-60px;right:-40px;width:160px;height:160px;border-radius:50%;background:rgba(255,255,255,0.10);pointer-events:none"></div>
                <div style="font-size:3.6rem;line-height:1;margin-bottom:6px;animation:heroBounce 1.4s cubic-bezier(.34,1.56,.64,1)">🥊</div>
                <div style="font-size:0.74rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;opacity:0.9;margin-bottom:6px">Duelo recebido</div>
                <h2 style="font-size:1.6rem;font-weight:900;margin-bottom:4px;letter-spacing:-0.01em">${escapeHtml(data.ca || '👤')} ${escapeHtml(data.c || 'Alguém')} desafia-te!</h2>
                <p style="font-size:0.92rem;opacity:0.95;font-weight:600">${escapeHtml(subName)}</p>
            </div>
            <div class="modal-body" style="padding:22px 22px 26px">
                ${browserBanner}
                <div style="background:#f9fafb;border-radius:14px;padding:14px 16px;margin-bottom:14px;display:flex;justify-content:space-around;text-align:center">
                    <div>
                        <div style="font-size:0.7rem;color:var(--text-light);font-weight:700;letter-spacing:0.06em;text-transform:uppercase">Perguntas</div>
                        <div style="font-size:1.5rem;font-weight:800;color:var(--text)">${items.length}</div>
                    </div>
                    <div>
                        <div style="font-size:0.7rem;color:var(--text-light);font-weight:700;letter-spacing:0.06em;text-transform:uppercase">Tempo</div>
                        <div style="font-size:1.5rem;font-weight:800;color:#dc2626">${_formatDuelTime(data.tl * 1000)}</div>
                    </div>
                    <div>
                        <div style="font-size:0.7rem;color:var(--text-light);font-weight:700;letter-spacing:0.06em;text-transform:uppercase">A bater</div>
                        <div style="font-size:1.5rem;font-weight:800;color:#f97316">${data.sb}/${items.length}</div>
                    </div>
                </div>
                <p style="text-align:center;font-size:0.92rem;color:var(--text);margin-bottom:18px;line-height:1.5">
                    Mesmas perguntas. Cronómetro a contar. Quem fizer mais pontos vence!<br>
                    <span style="color:var(--text-light);font-size:0.82rem">Pontos = certas × 100 + bónus de velocidade</span>
                </p>
                <button class="btn btn-block" onclick="acceptDuel()" style="background:linear-gradient(135deg,#dc2626,#f97316);color:#fff;border:none;font-weight:800;padding:16px;font-size:1rem;margin-bottom:10px;box-shadow:0 8px 20px rgba(220,38,38,0.35)">
                    <i class="fas fa-fist-raised"></i> Aceitar duelo!
                </button>
                <button class="btn btn-block btn-secondary" onclick="closeDuelIntro()" style="padding:13px">
                    Talvez depois
                </button>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    _pendingIncomingDuel = { data, items };
}

let _pendingIncomingDuel = null;
function closeDuelIntro() {
    document.getElementById('duel-intro-modal-temp')?.remove();
    _pendingIncomingDuel = null;
}

function acceptDuel() {
    if (!_pendingIncomingDuel) return;
    const { data, items } = _pendingIncomingDuel;
    closeDuelIntro();
    _startDuelSession(data, items);
}

let _duelTimerInterval = null;
function _startDuelSession(data, items) {
    if (_duelTimerInterval) { clearInterval(_duelTimerInterval); _duelTimerInterval = null; }
    currentSession = {
        items, idx: 0, correct: 0, wrong: 0, xp: 0, streak: 0, results: [],
        isDaily: false, isDuel: true, duel: data,
        startedAt: Date.now()
    };
    openExerciseScreen();
    renderQuestion();
    _showDuelTimerBar(data.tl);
}

function _showDuelTimerBar(seconds) {
    document.getElementById('duel-timer-bar')?.remove();
    const bar = document.createElement('div');
    bar.id = 'duel-timer-bar';
    bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:201;padding:6px 14px;background:linear-gradient(135deg,#dc2626,#f97316);color:#fff;font-weight:800;font-size:0.95rem;display:flex;align-items:center;justify-content:space-between;box-shadow:0 4px 16px rgba(220,38,38,0.35)';
    bar.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px">
            <i class="fas fa-stopwatch"></i> <span>DUELO</span>
        </div>
        <div id="duel-timer-display" style="font-variant-numeric:tabular-nums">${_formatDuelTime(seconds * 1000)}</div>
    `;
    document.body.appendChild(bar);
    // Compensa o exercise-screen para não esconder atrás da barra
    const ex = document.getElementById('exercise-screen');
    if (ex) ex.style.paddingTop = '40px';

    const start = Date.now();
    const limitMs = seconds * 1000;
    _duelTimerInterval = setInterval(() => {
        const elapsed = Date.now() - start;
        const remaining = Math.max(0, limitMs - elapsed);
        const display = document.getElementById('duel-timer-display');
        if (display) {
            display.textContent = _formatDuelTime(remaining);
            // Pisca quando faltar ≤ 10s
            if (remaining < 10000) display.style.animation = 'duelPulse 0.6s infinite';
        }
        if (remaining <= 0) {
            clearInterval(_duelTimerInterval);
            _duelTimerInterval = null;
            _finishDuel();
        }
    }, 200);
}

function _hideDuelTimerBar() {
    document.getElementById('duel-timer-bar')?.remove();
    const ex = document.getElementById('exercise-screen');
    if (ex) ex.style.paddingTop = '';
    if (_duelTimerInterval) { clearInterval(_duelTimerInterval); _duelTimerInterval = null; }
}

// Chamado quando o tempo acaba OU quando o aluno termina todas
function _finishDuel() {
    const s = currentSession;
    if (!s || !s.isDuel) return;
    _hideDuelTimerBar();
    _showDuelSummary(s);
    currentSession = null;
}

function _showDuelSummary(s) {
    const data = s.duel || {};
    const items = s.items || [];
    const usedSec = Math.min(data.tl, Math.max(1, Math.floor((Date.now() - s.startedAt) / 1000)));
    const myScore = _duelScore(s.correct, usedSec, data.tl);
    const oppScore = data.ss != null ? data.ss : _duelScore(data.sb || 0, data.st || data.tl, data.tl);
    const oppCorrect = data.sb || 0;
    const oppTime = data.st || data.tl;

    const won = myScore > oppScore;
    const tied = myScore === oppScore;

    let title, emoji, gradient;
    if (won)      { title = 'Venceste!';       emoji = '🏆'; gradient = 'linear-gradient(135deg,#facc15 0%,#f97316 50%,#dc2626 100%)'; }
    else if (tied){ title = 'Empate!';         emoji = '🤝'; gradient = 'linear-gradient(135deg,#7c3aed 0%,#8b5cf6 50%,#06b6d4 100%)'; }
    else          { title = 'Quase!';          emoji = '💪'; gradient = 'linear-gradient(135deg,#475569 0%,#64748b 50%,#94a3b8 100%)'; }

    if (won) playPerfectSound();
    else if (tied) playVictorySound();
    if (won) setTimeout(() => _launchConfetti('big'), 200);

    document.getElementById('duel-summary-modal-temp')?.remove();
    const me = activeProfile();
    const html = `
    <div id="duel-summary-modal-temp" class="modal" style="align-items:center;padding:20px">
        <canvas id="duel-confetti-canvas" style="position:fixed;inset:0;pointer-events:none;z-index:1"></canvas>
        <div class="modal-content" style="max-width:520px;border-radius:24px;max-height:94vh;overflow:auto;position:relative;z-index:2">
            <div style="background:${gradient};color:#fff;padding:28px 24px;text-align:center;position:relative;overflow:hidden">
                <div style="position:absolute;top:-60px;right:-40px;width:160px;height:160px;border-radius:50%;background:rgba(255,255,255,0.10);pointer-events:none"></div>
                <div style="font-size:3.6rem;line-height:1;margin-bottom:8px;animation:heroBounce 1.4s cubic-bezier(.34,1.56,.64,1)">${emoji}</div>
                <h1 style="font-size:1.8rem;font-weight:900;margin-bottom:6px;letter-spacing:-0.02em">${title}</h1>
                <div style="font-size:0.82rem;opacity:0.92;font-weight:600">Duelo concluído</div>
            </div>
            <div class="modal-body" style="padding:22px">
                <!-- VS comparison -->
                <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:14px;align-items:stretch;margin-bottom:18px">
                    <div style="background:${won ? '#fef3c7' : tied ? '#ede9fe' : '#fff'};border:2px solid ${won ? '#f59e0b' : tied ? '#a78bfa' : 'var(--border)'};border-radius:18px;padding:16px 12px;text-align:center">
                        <div style="font-size:2rem;line-height:1;margin-bottom:4px">${escapeHtml(me?.avatar || '👤')}</div>
                        <div style="font-size:0.8rem;font-weight:800;color:var(--text);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.04em">${escapeHtml(me?.name || 'Tu')}</div>
                        <div style="font-size:1.7rem;font-weight:900;color:${won ? '#d97706' : tied ? '#7c3aed' : 'var(--text-light)'};letter-spacing:-0.02em">${myScore}</div>
                        <div style="font-size:0.72rem;color:var(--text-light);font-weight:700;margin-top:2px">PONTOS</div>
                        <div style="font-size:0.74rem;color:var(--text-light);margin-top:6px">🎯 ${s.correct}/${items.length} · ⏱ ${_formatDuelTime(usedSec * 1000)}</div>
                    </div>
                    <div style="display:flex;align-items:center;justify-content:center;font-size:1.3rem;font-weight:900;color:var(--text-light)">VS</div>
                    <div style="background:${!won && !tied ? '#fef3c7' : '#fff'};border:2px solid ${!won && !tied ? '#f59e0b' : 'var(--border)'};border-radius:18px;padding:16px 12px;text-align:center">
                        <div style="font-size:2rem;line-height:1;margin-bottom:4px">${escapeHtml(data.ca || '👤')}</div>
                        <div style="font-size:0.8rem;font-weight:800;color:var(--text);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.04em">${escapeHtml(data.c || 'Adversário')}</div>
                        <div style="font-size:1.7rem;font-weight:900;color:${!won && !tied ? '#d97706' : 'var(--text-light)'};letter-spacing:-0.02em">${oppScore}</div>
                        <div style="font-size:0.72rem;color:var(--text-light);font-weight:700;margin-top:2px">PONTOS</div>
                        <div style="font-size:0.74rem;color:var(--text-light);margin-top:6px">🎯 ${oppCorrect}/${items.length} · ⏱ ${_formatDuelTime(oppTime * 1000)}</div>
                    </div>
                </div>
                <p style="text-align:center;font-size:0.86rem;color:var(--text-light);margin-bottom:18px;line-height:1.5">
                    ${won ? `Bateste o ${escapeHtml(data.c || 'adversário')} por <strong style="color:#d97706">${myScore - oppScore}</strong> pontos! 🎉` :
                       tied ? `Empate técnico! Ambos com ${myScore} pontos.` :
                       `Faltaram <strong style="color:#dc2626">${oppScore - myScore}</strong> pontos. Treina mais e desafia de volta!`}
                </p>
                <button class="btn btn-block" onclick="sendDuelReplyResult()" style="background:linear-gradient(135deg,#dc2626,#f97316);color:#fff;border:none;font-weight:800;padding:14px;margin-bottom:10px;box-shadow:0 8px 20px rgba(220,38,38,0.32)">
                    <i class="fas fa-paper-plane"></i> Enviar resultado ao ${escapeHtml(data.c || 'amigo')}
                </button>
                <button class="btn btn-block btn-primary-solid" onclick="closeDuelSummary()" style="padding:13px">
                    <i class="fas fa-house"></i> Voltar ao início
                </button>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);

    // Guarda dados para o "enviar resultado de volta"
    _lastDuelResult = { data, myScore, oppScore, myCorrect: s.correct, myTime: usedSec, items };

    // Update stats no perfil
    if (me) {
        if (won) state.xp = (state.xp || 0) + 50; // bónus por vencer duelo
        saveState(); updateAll();
    }
}

function closeDuelSummary() {
    document.getElementById('duel-summary-modal-temp')?.remove();
    document.getElementById('exercise-screen').style.display = 'none';
    switchTab('home');
}

let _lastDuelResult = null;
async function sendDuelReplyResult() {
    if (!_lastDuelResult) return;
    const { data, myScore, oppScore, myCorrect, myTime, items } = _lastDuelResult;
    const me = activeProfile();
    const verdict = myScore > oppScore ? 'venci-te!' : myScore === oppScore ? 'empatámos!' : 'venceste!';
    const text = `🥊 Duelo respondido! ${verdict}\n\n${escapeHtml(me?.name || 'Eu')}: ${myScore} pts (${myCorrect}/${items.length}, ${_formatDuelTime(myTime*1000)})\n${escapeHtml(data.c || 'Tu')}: ${oppScore} pts (${data.sb}/${items.length}, ${_formatDuelTime((data.st||data.tl)*1000)})\n\n— EscolaPlay`;
    if (navigator.share) {
        try { await navigator.share({ title: '🥊 Resultado do duelo', text }); return; }
        catch (err) { if (err && err.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(text); showToast('📋 Resultado copiado!'); }
    catch { prompt('Copia o resultado:', text); }
}

// ========== PARTILHAR PERGUNTA ==========
// Partilha APENAS a pergunta (e opções, se aplicável). Sem respostas,
// sem dicas, sem explicações — para quem recebe poder responder sem ver.
// Tenta navigator.share() primeiro (iOS/Android), fallback para mailto:.
function _buildShareText(e) {
    const sub = SUBJECTS[e.s];
    const subName = sub?.fullName || sub?.name || e.s;
    const lines = [];
    lines.push(`📚 ${subName} — ${e.t}`);
    lines.push('');
    lines.push(String(e.q || ''));

    // Opções (se MC) — necessárias para a pergunta fazer sentido
    if (e.type === 'mc' && Array.isArray(e.opts)) {
        lines.push('');
        e.opts.forEach((o, i) => lines.push(`  ${String.fromCharCode(65+i)}) ${o}`));
    } else if (e.type === 'tf') {
        lines.push('');
        lines.push('  (Verdadeiro / Falso)');
    } else if (e.type === 'order' && Array.isArray(e.items)) {
        lines.push('');
        lines.push('Elementos a ordenar (baralhados):');
        const shuffled = [...e.items].sort(() => Math.random() - 0.5);
        shuffled.forEach((it, i) => lines.push(`  ${i+1}. ${it}`));
    } else if (e.type === 'match' && Array.isArray(e.pairs)) {
        lines.push('');
        lines.push('Associa os pares:');
        const left  = e.pairs.map(p => p[0]);
        const right = [...e.pairs.map(p => p[1])].sort(() => Math.random() - 0.5);
        left.forEach((l, i) => lines.push(`  ${l}  ↔  ${right[i]}`));
    }

    // Texto de apoio (necessário para responder)
    if (e.passage) {
        lines.push('');
        lines.push('— Texto de apoio —');
        lines.push(String(e.passage));
    }

    lines.push('');
    lines.push('—');
    lines.push('Partilhado a partir de EscolaPlay');
    return lines.join('\n');
}

async function shareCurrentQuestion() {
    if (!currentSession) { showToast('Não há pergunta activa.'); return; }
    const e = currentSession.items[currentSession.idx];
    if (!e) return;

    const sub = SUBJECTS[e.s];
    const subName = sub?.name || e.s;
    const subject = `EscolaPlay — ${subName} · ${e.t}`;
    const body = _buildShareText(e);

    // 1) Tentar Web Share API (nativo no iOS/Android — abre Mail, WhatsApp, etc.)
    if (navigator.share) {
        try {
            await navigator.share({ title: subject, text: body });
            return;
        } catch (err) {
            // Utilizador cancelou — sem toast nem fallback
            if (err && err.name === 'AbortError') return;
            // Outro erro — cai para mailto
        }
    }

    // 2) Fallback: mailto:
    const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    // Em PWAs (sobretudo iOS standalone) window.location.href com mailto pode falhar silenciosamente
    try {
        const a = document.createElement('a');
        a.href = mailto;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } catch (_) {
        // 3) Último recurso: copiar para clipboard
        try {
            await navigator.clipboard.writeText(body);
            showToast('📋 Pergunta copiada para a área de transferência');
        } catch {
            showToast('Não foi possível partilhar. Tenta outro browser.');
        }
    }
}

// ========== LESSON + HINT MODAL ==========
function openLessonModal() {
    if (!currentSession) return;
    const e = currentSession.items[currentSession.idx];
    openLessonByKey(`${e.s}/${e.t}`);
}

function openHintModal() {
    if (!currentSession) return;
    const e = currentSession.items[currentSession.idx];
    const sub = SUBJECTS[e.s];
    document.getElementById('lesson-title').innerHTML = `<i class="fas fa-lightbulb" style="color:#2563eb"></i> Pista · ${sub?.name || e.s} · ${e.t}`;
    const body = document.getElementById('lesson-body');
    const parts = [];

    // 1) Pista estática do exercício (e.hint) ou regra (e.material)
    if (e.hint) {
        parts.push(`<p style="background:#dbeafe;border-left:4px solid #2563eb;padding:10px 12px;border-radius:8px;margin-bottom:10px"><strong>💬 Pista:</strong> ${escapeHtml(e.hint)}</p>`);
    }
    if (e.material) {
        parts.push(`<p style="background:#f0fdf4;border-left:4px solid #16a34a;padding:10px 12px;border-radius:8px;margin-bottom:10px"><strong>📘 Regra:</strong> ${escapeHtml(e.material)}</p>`);
    }

    // 2) Excerto do resumo do tópico (se existir)
    const lesson = LESSONS[`${e.s}/${e.t}`];
    if (lesson) {
        const snippet = lesson.body.split('\n').filter(l => l.trim()).slice(0, 3).join('\n');
        const formatted = escapeHtml(snippet).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        parts.push(`<div style="font-size:0.82rem;color:var(--text-light);margin-bottom:8px;white-space:pre-wrap;line-height:1.5">${formatted}</div>`);
        parts.push(`<button class="btn btn-secondary btn-block" style="margin-bottom:10px" onclick="closeLessonModal();setTimeout(openLessonModal,50)">📖 Ver resumo completo do tópico</button>`);
    }

    // 3) Pista IA — sempre disponível (com ou sem chave, usa Groq interno se possível)
    const cacheKey = `ai_hint_v2_${e.id}`;
    const cachedHint = sessionStorage.getItem(cacheKey);
    if (cachedHint) {
        parts.push(_hintAiBox(cachedHint));
    } else {
        parts.push(`<div id="hint-ai-area">
            <button class="btn btn-primary btn-block" id="hint-ai-btn" onclick="loadAIHint('${e.id}')" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;color:#fff">
                <i class="fas fa-robot"></i> Pedir ajuda ao Professor IA
            </button>
        </div>`);
    }

    if (parts.length === 0 || (parts.length === 1 && parts[0].includes('hint-ai-area'))) {
        parts.unshift(`<p style="color:var(--text-light);margin-bottom:10px">Lê a pergunta com atenção e pensa no conceito do tópico.</p>`);
    }

    body.innerHTML = `<div style="padding:4px">${parts.join('')}</div>`;
    document.getElementById('lesson-modal').style.display = 'flex';
}

// Palavras-função portuguesas de 7+ letras que NÃO são bons candidatos a
// perguntar o significado (são comuns). Tudo em minúsculas, sem acentos.
const _DOUBT_STOP = new Set([
    'aquele','aqueles','aquela','aquelas','quando','quanto','quantos','quantas',
    'porque','sempre','nunca','grande','grandes','pequeno','pequena','pequenos','pequenas',
    'primeiro','primeira','primeiros','primeiras','ultimo','ultima','ultimos','ultimas',
    'contra','durante','atraves','enquanto','entretanto','todavia','contudo','tambem',
    'mesmo','mesma','mesmos','mesmas','outro','outra','outros','outras','alguns','algumas',
    'assim','talvez','apenas','seguinte','seguintes','segundo','terceiro','quarto','quinto',
    'figura','imagem','abaixo','acima','frente','dentro','direita','esquerda',
    'existe','existem','possui','possuem','possuir','conforme',
    'pergunta','perguntas','palavra','palavras','frase','frases','exemplo','exemplos',
    'correcta','correcto','correctas','correctos','correta','correto','corretas','corretos',
    'indica','calcula','considera','escolhe','completa','verifica','observa','descobre',
    'numero','numeros'
]);

// Gera 2-3 sugestões de dúvidas a partir do texto do exercício + opções.
// Heurística: palavras com ≥7 letras que não sejam palavras-função comuns.
// Adiciona sempre uma sugestão genérica "Explica por outras palavras" no fim.
function buildDoubtSuggestions(exercise) {
    if (!exercise) return [];
    const pieces = [exercise.q || ''];
    if (Array.isArray(exercise.opts)) pieces.push(exercise.opts.join(' '));
    if (exercise.passage) pieces.push(exercise.passage);
    const text = pieces.join(' ');
    // Tokenizar mantendo letras (incluindo acentuadas) e filtrar por comprimento
    const words = text
        .replace(/[^\p{L}\s]/gu, ' ')
        .split(/\s+/)
        .filter(w => w.length >= 7);
    const seen = new Set();
    const picked = [];
    for (const w of words) {
        const norm = _askNorm(w); // minúsculas + sem acentos (helper já existe)
        if (_DOUBT_STOP.has(norm)) continue;
        if (seen.has(norm)) continue;
        seen.add(norm);
        picked.push(w.toLowerCase());
        if (picked.length >= 3) break;
    }
    const suggestions = picked.map(w => `O que significa "${w}"?`);
    suggestions.push('Explica por outras palavras');
    return suggestions;
}

// Chip foi clicado: preenche o input e submete automaticamente.
function useDoubtSuggestion(text) {
    const input = document.getElementById('ex-doubt-input');
    if (!input) return;
    input.value = text;
    askExerciseDoubt();
}

// Expande/recolhe o painel "Tens uma dúvida?" inline no ecrã do exercício.
// Quando expande, foca o input para escrita imediata e mostra sugestões
// contextuais (palavras difíceis da pergunta actual).
function toggleExerciseDoubt() {
    const panel = document.getElementById('ex-doubt-panel');
    const trigger = document.getElementById('ex-doubt-trigger');
    const input = document.getElementById('ex-doubt-input');
    const sugg = document.getElementById('ex-doubt-suggestions');
    if (!panel) return;
    const isOpen = panel.style.display !== 'none';
    panel.style.display = isOpen ? 'none' : 'block';
    if (trigger) trigger.classList.toggle('open', !isOpen);
    if (!isOpen) {
        // Construir sugestões contextuais com base na pergunta actual
        const e = currentSession?.items?.[currentSession?.idx];
        const items = buildDoubtSuggestions(e);
        if (sugg) {
            if (items.length > 0) {
                sugg.style.display = 'flex';
                sugg.innerHTML = items.map(s => {
                    const attr = escapeHtml(s).replace(/"/g, '&quot;');
                    return `<button type="button" class="ex-doubt-chip" data-text="${attr}" onclick="useDoubtSuggestion(this.dataset.text)">${escapeHtml(s)}</button>`;
                }).join('');
            } else {
                sugg.style.display = 'none';
            }
        }
        if (input) setTimeout(() => input.focus(), 100);
    }
}

// Pergunta livre da criança sobre a pergunta actualmente visível. Usa a IA
// (Groq/Mistral) com o enunciado + opções + tópico como contexto. Não dá a
// resposta directamente — explica conceitos, dá pistas pedagógicas.
async function askExerciseDoubt() {
    const input = document.getElementById('ex-doubt-input');
    const btn = document.querySelector('.ex-doubt-send');
    const answer = document.getElementById('ex-doubt-answer');
    if (!input || !currentSession) return;
    const q = (input.value || '').trim();
    if (!q) { showToast('Escreve uma dúvida primeiro'); return; }
    if (!hasAIKey()) { showToast('Configura uma chave IA no Perfil'); return; }

    const e = currentSession.items[currentSession.idx];
    const subName = SUBJECTS[e.s]?.name || e.s;
    const yr = activeProfile()?.year || 6;

    // Contexto do exercício — enunciado, opções (mc) e tópico
    let ctx = `Disciplina: ${subName}\nTópico: ${e.t}\nPergunta apresentada ao aluno: "${e.q}"`;
    if (e.type === 'mc' && Array.isArray(e.opts)) {
        ctx += `\nOpções: ${e.opts.map((o, i) => `${String.fromCharCode(65 + i)}) ${o}`).join(' | ')}`;
    }
    if (e.type === 'tf') ctx += `\nTipo: Verdadeiro ou Falso`;
    if (e.material) ctx += `\nRegra/material: ${e.material}`;

    const prompt = `És um(a) professor(a) do ${yr}.º ano do Ensino Básico português, paciente e carinhoso(a). Um(a) aluno(a) está a resolver o exercício abaixo e tem uma dúvida. Responde em PORTUGUÊS EUROPEU (Portugal), com 2-4 frases, simples e claras.

${ctx}

DÚVIDA DO ALUNO: "${q}"

REGRAS:
- NÃO reveles a resposta correcta da pergunta. Explica apenas o conceito ou termo que o aluno perguntou.
- Usa linguagem adequada ao ${yr}.º ano (sem jargão técnico desnecessário).
- Se a dúvida for sobre o significado de uma palavra, dá uma definição curta + exemplo.
- Se for sobre "como resolver", dá uma pista (não a solução).
- Se a dúvida for fora do contexto, responde na mesma mas de forma breve.
- NUNCA uses português do Brasil ("você", "time", "gols", "trem", "celular", "geladeira", "sorvete"...).
- Sem markdown, sem asteriscos, sem listas numeradas — texto corrido.`;

    if (answer) {
        answer.style.display = 'block';
        answer.textContent = 'A pensar…';
    }
    if (btn) btn.disabled = true;
    try {
        const { text, provider } = await callClaudeAPI(prompt, 400, false);
        const clean = (text || '').replace(/\*\*/g, '').replace(/\*/g, '').trim();
        if (answer) {
            answer.textContent = clean || 'Sem resposta.';
            // Tag discreta do provedor usado
            const tag = document.createElement('div');
            tag.style.cssText = 'font-size:0.68rem;color:var(--text-light);margin-top:6px;text-align:right;font-style:italic';
            tag.textContent = `via ${provider || 'IA'}`;
            answer.appendChild(tag);
        }
        input.value = '';
    } catch (err) {
        if (answer) answer.textContent = 'Não consegui responder: ' + (err.message || 'erro');
    } finally {
        if (btn) btn.disabled = false;
    }
}

// ===== Professor IA inline (durante a pergunta e no feedback) =====
// Constrói o prompt do Professor IA — pista pedagógica focada na pergunta
function _buildProfessorIAPrompt(e, yr) {
    const subName = SUBJECTS[e.s]?.name || e.s;

    // Contexto rico da pergunta
    let qContext = `Disciplina: ${subName}\nTópico: ${e.t}\nPergunta apresentada ao aluno: "${e.q}"`;
    if (e.type === 'mc' && e.opts) {
        qContext += `\nOpções de resposta visíveis ao aluno: ${e.opts.map((o,i)=>`${String.fromCharCode(65+i)}) ${o}`).join(' | ')}`;
    }
    if (e.type === 'tf') qContext += `\nTipo: Verdadeiro ou Falso`;
    if (e.type === 'fill' || e.type === 'problem' || e.type === 'passage') qContext += `\nTipo: o aluno tem de escrever a resposta`;
    if (e.type === 'order') qContext += `\nTipo: ordenar elementos\nElementos a ordenar (baralhados): ${(e.items||[]).join(', ')}`;
    if (e.type === 'match' && e.pairs) qContext += `\nTipo: associar pares de elementos`;
    if (e.passage) qContext += `\nTexto de apoio: "${e.passage.slice(0, 300)}"`;
    if (e.material) qContext += `\nRegra/conteúdo do tópico: "${e.material}"`;
    if (e.hint) qContext += `\nPista do exercício (podes inspirar-te nela mas reformula): "${e.hint}"`;

    // Lição estática de fundo (se existir) — dá ao IA contexto pedagógico verdadeiro do currículo
    const lesson = LESSONS[`${e.s}/${e.t}`] || state.maxLessons?.[`${e.s}/${e.t}`];
    if (lesson) {
        const lessonSnippet = lesson.body.replace(/\*\*/g, '').slice(0, 600);
        qContext += `\n\n--- Resumo do tópico (curriculum oficial, usa-o para fundamentar a tua explicação) ---\n${lessonSnippet}\n--- fim do resumo ---`;
    }

    // Estilo por faixa etária
    let ageStyle, conceitoLen, dicasLen;
    if (yr <= 2) {
        ageStyle = 'Estás a falar com uma criança de 7-8 anos. Usa FRASES MUITO CURTAS, palavras simples, exemplos do dia-a-dia (animais, comida, brincadeiras, família). Tom carinhoso e encorajador. Podes usar 1-2 emojis para tornar amigável.';
        conceitoLen = '1-2 frases muito curtas';
        dicasLen = '2 dicas curtinhas';
    } else if (yr <= 4) {
        ageStyle = `Estás a falar com uma criança do ${yr}.º ano (8-10 anos). Frases simples e directas, vocabulário acessível, com 1 exemplo concreto. Tom amigável e encorajador, sem infantilizar.`;
        conceitoLen = '2 frases claras';
        dicasLen = '2-3 dicas';
    } else {
        ageStyle = `Estás a falar com um aluno do ${yr}.º ano (10-12 anos). Tom de professor/a directo e claro, vocabulário próprio da disciplina mas explicado quando necessário. Não infantilizes.`;
        conceitoLen = '2-3 frases';
        dicasLen = '3 dicas';
    }

    return `És um professor/professora do ${yr}.º ano do Ensino Básico português, em Portugal. Um aluno está a tentar resolver a pergunta abaixo e pediu-te ajuda. NÃO podes dar a resposta — tens de o levar a chegar lá sozinho.

${qContext}

${ageStyle}

OBJECTIVO: ajudar o aluno a CHEGAR à resposta sozinho — NUNCA reveles a resposta nem digas qual a opção certa, nem dês a solução directa.

Responde SEMPRE com esta estrutura EXACTA (em Português Europeu de Portugal, NUNCA português do Brasil):

📚 Conceito
[Resume o conceito/regra que esta pergunta envolve, ligado ao tópico "${e.t}". ${conceitoLen}.]

💡 Como pensar
• [primeira dica de raciocínio, focada nesta pergunta concreta]
• [segunda dica que aponta o caminho sem dar a resposta]
${yr >= 5 ? '• [terceira dica, com exemplo análogo se ajudar]' : ''}
[${dicasLen} no total. Dá pistas para abordar ESTA pergunta específica — não respostas genéricas.]

✨ [Uma frase curta de encorajamento personalizada à pergunta — não genérica.]

Regras OBRIGATÓRIAS:
- Português EUROPEU (Portugal): usa "estás", "tu", "comboio", "autocarro", "rapariga"/"rapaz", "ecrã", "pequeno-almoço", "sumo" — NUNCA "você", "trem", "ônibus", "garota"/"garoto", "tela", "café da manhã", "suco"
- NÃO reveles a resposta nem nenhuma opção específica (ex: não digas "a resposta é B" nem "é o autocarro")
- Vai DIRECTO ao conteúdo, sem introduções tipo "Olá!", "Vou ajudar-te" ou "Boa pergunta!"
- Usa as 3 secções acima EXACTAMENTE como indicado, com os emojis 📚 💡 ✨ no início de cada secção
- Bullets em "Como pensar" começam com "• " (bullet + espaço)
- Sem markdown (**negrito**, _itálico_, # títulos), sem JSON, texto corrido simples`;
}

// Renderiza a resposta estruturada do Professor IA em HTML bonito
function _renderHintHtml(rawText) {
    const text = String(rawText || '').trim();
    const conceitoMatch = text.match(/📚\s*Conceito[:\s]*\n?([\s\S]*?)(?=\n*💡|\n*✨|$)/);
    const dicasMatch    = text.match(/💡\s*Como pensar[:\s]*\n?([\s\S]*?)(?=\n*✨|\n*📚|$)/);
    const encMatch      = text.match(/✨\s*([\s\S]*?)$/);

    let html = '';
    if (conceitoMatch) {
        const body = escapeHtml(conceitoMatch[1].trim()).replace(/\n+/g, '<br>');
        html += `<div style="margin-bottom:12px"><div style="font-weight:700;color:#7c3aed;margin-bottom:4px;font-size:0.85rem">📚 Conceito</div><div style="color:#1e1b4b">${body}</div></div>`;
    }
    if (dicasMatch) {
        const dicas = dicasMatch[1].trim();
        const lines = dicas.split('\n').map(l => l.trim()).filter(Boolean);
        const bullets = lines.filter(l => /^[•\-*]\s/.test(l));
        let dicasHtml;
        if (bullets.length >= 2) {
            dicasHtml = '<ul style="margin:0;padding-left:20px;list-style:none">' +
                bullets.map(l => `<li style="margin-bottom:6px;position:relative;padding-left:4px"><span style="position:absolute;left:-16px;color:#7c3aed">•</span>${escapeHtml(l.replace(/^[•\-*]\s*/, ''))}</li>`).join('') +
                '</ul>';
        } else {
            dicasHtml = `<div>${escapeHtml(dicas).replace(/\n+/g, '<br>')}</div>`;
        }
        html += `<div style="margin-bottom:12px"><div style="font-weight:700;color:#7c3aed;margin-bottom:6px;font-size:0.85rem">💡 Como pensar</div><div style="color:#1e1b4b">${dicasHtml}</div></div>`;
    }
    if (encMatch) {
        html += `<div style="margin-top:10px;padding-top:8px;border-top:1px dashed #c4b5fd;color:#6d28d9;font-style:italic;font-size:0.88rem">✨ ${escapeHtml(encMatch[1].trim())}</div>`;
    }

    // Fallback: se a IA não respeitou o formato, mostra o texto puro
    if (!html) html = `<div>${escapeHtml(text).replace(/\n+/g, '<br>')}</div>`;
    return html;
}

async function _loadAndShowHint(textEl, btnEl, boxEl) {
    if (!currentSession) return;
    const e = currentSession.items[currentSession.idx];
    const cacheKey = `ai_hint_v2_${e.id}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
        textEl.innerHTML = _renderHintHtml(cached);
        boxEl.style.display = 'block';
        btnEl.innerHTML = '<i class="fas fa-robot"></i> Professor IA — esconder pista';
        return;
    }
    btnEl.disabled = true;
    btnEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A pensar…';
    textEl.innerHTML = '<div style="color:#7c3aed">A preparar a pista…</div>';
    boxEl.style.display = 'block';

    const yr = activeProfile()?.year || 6;
    const prompt = _buildProfessorIAPrompt(e, yr);
    try {
        const { text } = await callClaudeAPI(prompt, 450, false);
        const clean = text.trim().replace(/^["']|["']$/g, '');
        sessionStorage.setItem(cacheKey, clean);
        textEl.innerHTML = _renderHintHtml(clean);
        btnEl.disabled = false;
        btnEl.innerHTML = '<i class="fas fa-robot"></i> Professor IA — esconder pista';
    } catch(_) {
        textEl.innerHTML = '<div style="color:#dc2626">Não foi possível carregar a pista. Toca de novo no botão para tentar outra vez.</div>';
        btnEl.disabled = false;
        btnEl.innerHTML = '<i class="fas fa-robot"></i> Professor IA — tentar novamente';
    }
}

function toggleInlineHint() {
    const box = document.getElementById('ex-prof-ia-box');
    const btn = document.getElementById('ex-prof-ia-btn');
    const txt = document.getElementById('ex-prof-ia-text');
    if (!box || !btn || !txt) return;
    if (box.style.display === 'block') {
        box.style.display = 'none';
        btn.innerHTML = '<i class="fas fa-robot"></i> Professor IA — pedir pista';
    } else {
        _loadAndShowHint(txt, btn, box);
    }
}

function _hintAiBox(text) {
    return `<div style="background:linear-gradient(135deg,#f5f3ff,#ede9fe);border-left:4px solid #7c3aed;border-radius:10px;padding:14px 16px;margin-top:4px">
        <div style="font-size:0.78rem;font-weight:700;color:#7c3aed;margin-bottom:8px;letter-spacing:.03em">🎓 PROFESSOR IA</div>
        <div style="font-size:0.9rem;line-height:1.6;color:#1e1b4b">${_renderHintHtml(text)}</div>
    </div>`;
}

async function loadAIHint(exerciseId) {
    if (!currentSession) return;
    const e = currentSession.items[currentSession.idx];
    if (e.id !== exerciseId) return; // exercício já mudou

    const btn = document.getElementById('hint-ai-btn');
    const area = document.getElementById('hint-ai-area');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A pensar…'; }

    const cacheKey = `ai_hint_v2_${e.id}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) { if (area) area.outerHTML = _hintAiBox(cached); return; }

    const yr = activeProfile()?.year || 6;
    const prompt = _buildProfessorIAPrompt(e, yr);

    try {
        const { text } = await callClaudeAPI(prompt, 450, false);
        const clean = text.trim().replace(/^["']|["']$/g, '');
        sessionStorage.setItem(cacheKey, clean);
        if (area) area.outerHTML = _hintAiBox(clean);
    } catch (err) {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-robot"></i> Tentar novamente';
        }
    }
}

function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
// ========== ASK AI — Query em linguagem natural ==========
// Estado da última resposta, para os botões "praticar" usarem.
let _lastAskResult = null;

function askQuestionExample(text) {
    const input = document.getElementById('ask-input');
    if (input) input.value = text;
    askQuestion();
}

// Extrai até N tópicos únicos em que o aluno errou recentemente, percorrendo
// state.history do mais recente para o mais antigo. Usa o banco de exercícios
// (estáticos + IA) para descobrir o tópico/disciplina de cada id.
function lastWrongTopics(maxN = 3) {
    const hist = Array.isArray(state.history) ? state.history : [];
    if (hist.length === 0) return [];
    const lookup = new Map();
    (EXERCISES || []).forEach(e => lookup.set(e.id, e));
    (state.maxExercises || []).forEach(e => lookup.set(e.id, e));
    const seen = new Set();
    const out = [];
    for (let i = hist.length - 1; i >= 0 && out.length < maxN; i--) {
        const h = hist[i];
        if (h.c !== false) continue;
        const ex = lookup.get(h.id);
        if (!ex || !ex.t) continue;
        const key = `${ex.s}/${ex.t}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ subject: ex.s, topic: ex.t });
    }
    return out;
}

// Sugestões de chips para o "Tens uma dúvida?" da Home. Prioriza tópicos
// onde o aluno errou recentemente. Alterna formatos para variedade visual.
// Sem histórico de erros → cai nos exemplos fixos de arranque.
function buildHomeAskSuggestions() {
    const wrongs = lastWrongTopics(3);
    if (wrongs.length === 0) {
        return [
            'O que significa narrativa?',
            'Quero praticar frações',
            'Verbos no presente'
        ];
    }
    // Primeira letra em minúscula para encaixar em frases ("Explica frações"
    // em vez de "Explica Frações"). Não toca no resto para preservar topónimos
    // e siglas embebidas.
    const lc = t => (t && t.length > 0 ? t[0].toLowerCase() + t.slice(1) : t);
    const formats = [
        t => `Quero praticar ${lc(t)}`,
        t => `Explica ${lc(t)}`,
        t => `Ajuda com ${lc(t)}`
    ];
    return wrongs.map((w, i) => formats[i % formats.length](w.topic));
}

function renderAskSuggestions() {
    const container = document.getElementById('ask-examples');
    if (!container) return;
    const items = buildHomeAskSuggestions();
    container.innerHTML = items.map(s => {
        const attr = escapeHtml(s).replace(/"/g, '&quot;');
        return `<span class="ask-chip" data-text="${attr}" onclick="askQuestionExample(this.dataset.text)">${escapeHtml(s)}</span>`;
    }).join('');
}

async function askQuestion() {
    const input = document.getElementById('ask-input');
    const box = document.getElementById('ask-result');
    const btn = document.getElementById('ask-btn');
    if (!input || !box) return;
    const q = (input.value || '').trim();
    if (!q) { showToast('Escreve uma dúvida primeiro'); return; }
    if (!SUBJECTS || Object.keys(SUBJECTS).length === 0) {
        showToast('Cria um perfil primeiro');
        return;
    }

    box.style.display = 'block';
    box.innerHTML = `<div class="ask-loading"><i class="fas fa-circle-notch fa-spin"></i> A pensar na tua pergunta…</div>`;
    if (btn) btn.disabled = true;

    try {
        let result;
        const hasKey = !!(hasAIKey() && state.max?.enabled);
        if (hasKey) {
            try {
                result = await _askAIResolve(q);
            } catch (err) {
                console.warn('Ask AI falhou, a usar pesquisa local:', err?.message);
                result = _askLocalResolve(q);
                result._fallback = 'ai_error';
                result._errMsg = err?.message || '';
            }
        } else {
            result = _askLocalResolve(q);
            result._fallback = 'no_key';
        }
        _lastAskResult = result;
        box.innerHTML = _renderAskResult(q, result);
    } catch (err) {
        box.innerHTML = `<div class="ask-error"><i class="fas fa-triangle-exclamation"></i> Não consegui responder: ${escapeHtml(err.message || 'erro')}</div>`;
    } finally {
        if (btn) btn.disabled = false;
    }
}

// Constrói o "catálogo" de disciplinas+tópicos activos para o modelo
function _askBuildCatalog() {
    const out = {};
    Object.keys(SUBJECTS).forEach(key => {
        out[key] = {
            name: SUBJECTS[key].name,
            topics: (CURRICULUM[key] || []).slice()
        };
    });
    return out;
}

async function _askAIResolve(q) {
    const catalog = _askBuildCatalog();
    const yr = activeProfile()?.year || 6;
    const catalogStr = Object.entries(catalog).map(([k, v]) =>
        `- ${k} (${v.name}): ${v.topics.join(', ')}`
    ).join('\n');

    const prompt = `És um(a) professor(a) do ${yr}.º ano do Ensino Básico português. Um(a) aluno(a) fez a seguinte pergunta em linguagem natural:

PERGUNTA: "${q}"

A tua tarefa:
1. Identificar a(s) disciplina(s) e tópico(s) do currículo que melhor correspondem à pergunta.
2. Responder de forma clara, curta e pedagógica (máx. 4 frases), em PORTUGUÊS EUROPEU (Portugal). Nunca uses "você", "time", "gols", "trem", "celular", "geladeira", "sorvete", "esporte", "garoto", etc.
3. Se a pergunta for vaga ou fora do currículo, devolve subject null e topics vazio, mas tenta na mesma dar uma resposta útil no campo "answer".

CATÁLOGO DE DISCIPLINAS E TÓPICOS DISPONÍVEIS (usa EXACTAMENTE estes nomes):
${catalogStr}

REGRAS:
- "subject" deve ser uma das CHAVES do catálogo (ex: "portugues", "matematica") ou null.
- "topics" é um array com 0 a 3 tópicos, cada um EXACTAMENTE como aparece no catálogo (sensível a maiúsculas/acentos).
- "answer" é o texto pedagógico em português europeu (sem markdown, sem asteriscos).
- "keywords" são 2-5 palavras-chave do assunto (em minúsculas, sem acentos) para pesquisa local.

Responde APENAS com JSON válido (sem markdown):

{"subject":"<chave ou null>","topics":["<tópico>"],"answer":"<explicação curta>","keywords":["<kw>"]}`;

    const aiResp = await callClaudeAPI(prompt, 600, true);
    const text = aiResp.text;
    let jsonStr = text.trim();
    const fence = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) jsonStr = fence[1].trim();
    const start = jsonStr.indexOf('{');
    const end = jsonStr.lastIndexOf('}');
    if (start < 0 || end < 0) throw new Error('Resposta não é JSON');
    const parsed = JSON.parse(jsonStr.slice(start, end + 1));

    // Validar/normalizar: só aceitar disciplinas e tópicos do catálogo
    const subject = parsed.subject && catalog[parsed.subject] ? parsed.subject : null;
    const topics = [];
    if (subject && Array.isArray(parsed.topics)) {
        const valid = new Set(catalog[subject].topics);
        parsed.topics.forEach(t => { if (valid.has(t) && !topics.includes(t)) topics.push(t); });
    }
    return {
        subject,
        topics,
        answer: String(parsed.answer || '').trim(),
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords.map(k => String(k).toLowerCase()) : [],
        _source: 'ai',
        _provider: aiResp.provider || 'ai',
        _providerName: aiResp.providerName || 'IA'
    };
}

// Normaliza uma string: minúsculas, sem acentos/diacríticos.
function _askNorm(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// Pesquisa local nos tópicos do currículo + títulos/corpos das lições.
function _askLocalResolve(q) {
    const nq = _askNorm(q);
    // Tokens significativos (>= 3 letras), ignora stopwords comuns em PT
    const stop = new Set(['que','qual','quais','como','onde','quem','porque','para','pelo','pela','dos','das','dum','numa','numo','com','sem','por','mais','menos','meu','minha','meus','minhas','tens','tenho','uma','umas','uns','uma','este','esta','estes','estas','esse','essa','isso','isto','aquilo','aquele','aquela','significa','explica','explicar','ajuda','ajudar','quero','queria','saber','praticar','treino','treinar']);
    const tokens = nq.split(/[^a-z0-9]+/).filter(t => t.length >= 3 && !stop.has(t));

    const matches = [];
    Object.keys(SUBJECTS).forEach(subKey => {
        const topics = CURRICULUM[subKey] || [];
        topics.forEach(topic => {
            const nt = _askNorm(topic);
            const lesson = LESSONS[`${subKey}/${topic}`] || state.maxLessons?.[`${subKey}/${topic}`];
            const lessonText = lesson ? _askNorm((lesson.title || '') + ' ' + (lesson.body || '')) : '';
            let score = 0;
            tokens.forEach(tk => {
                if (nt === tk) score += 10;
                else if (nt.includes(tk)) score += 5;
                if (lessonText.includes(tk)) score += 2;
            });
            // Bónus se a disciplina aparece literal na pergunta
            const nsub = _askNorm(SUBJECTS[subKey].name);
            if (nsub && nq.includes(nsub)) score += 3;
            if (score > 0) matches.push({ subKey, topic, score, lesson });
        });
    });
    matches.sort((a, b) => b.score - a.score);

    let answer = '';
    const top = matches.slice(0, 3);
    if (top.length > 0 && top[0].lesson) {
        // Usa a 1.ª frase da lição como resposta
        const body = top[0].lesson.body.replace(/\*\*/g, '').split(/\n/).map(s => s.trim()).filter(Boolean);
        answer = (body[0] || '').slice(0, 280);
    }
    if (!answer) {
        answer = top.length > 0
            ? `Encontrei tópicos relacionados na disciplina de ${SUBJECTS[top[0].subKey].name}. Vê abaixo.`
            : 'Não encontrei nenhum tópico no teu currículo que corresponda à pergunta. Tenta reformular, ou activa o MAX (IA) no Perfil para respostas mais amplas.';
    }

    return {
        subject: top[0]?.subKey || null,
        topics: top.map(m => m.topic),
        answer,
        keywords: tokens,
        _source: 'local'
    };
}

function _renderAskResult(q, r) {
    const parts = [];
    parts.push(`<div class="ask-result-q"><i class="fas fa-quote-left"></i> ${escapeHtml(q)}</div>`);

    if (r.answer) {
        parts.push(`<div class="ask-result-answer">${escapeHtml(r.answer)}</div>`);
    }

    if (r.subject || (r.topics && r.topics.length > 0)) {
        const tagParts = [];
        if (r.subject && SUBJECTS[r.subject]) {
            const sub = SUBJECTS[r.subject];
            tagParts.push(`<span class="ask-tag ask-tag-subject" style="--tag-color:${sub.color}"><i class="fas ${sub.icon}"></i> ${escapeHtml(sub.name)}</span>`);
        }
        (r.topics || []).forEach(t => {
            tagParts.push(`<span class="ask-tag">${escapeHtml(t)}</span>`);
        });
        parts.push(`<div class="ask-result-tags">${tagParts.join('')}</div>`);
    }

    // Acções
    const actions = [];
    if (r.subject && SUBJECTS[r.subject]) {
        // Praticar sobre estes tópicos
        if (r.topics && r.topics.length > 0) {
            actions.push(`<button class="btn btn-primary-solid btn-block" onclick="askStartPractice()"><i class="fas fa-dumbbell"></i> Treinar este tópico</button>`);
        }
        // Abrir a lição detalhada do 1.º tópico
        if (r.topics && r.topics[0]) {
            const key = `${r.subject}/${r.topics[0]}`;
            const has = !!(LESSONS[key] || state.maxLessons?.[key]);
            if (has) {
                actions.push(`<button class="btn btn-secondary btn-block" onclick="openLessonByKey('${escapeHtml(key).replace(/'/g, "\\'")}')"><i class="fas fa-book-open"></i> Ver explicação completa</button>`);
            }
        }
        // Entrar na disciplina
        actions.push(`<button class="btn btn-secondary btn-block" onclick="openSubjectDetail('${r.subject}')"><i class="fas fa-arrow-right"></i> Abrir ${escapeHtml(SUBJECTS[r.subject].name)}</button>`);
    }
    if (actions.length > 0) parts.push(`<div class="ask-result-actions">${actions.join('')}</div>`);

    // Origem da resposta (IA ou local)
    let footer = '';
    if (r._source === 'ai') footer = 'Resposta gerada pela IA (' + (r._providerName || 'IA') + ')';
    else if (r._fallback === 'ai_error') footer = 'A IA falhou — pesquisa no currículo local';
    else if (r._fallback === 'no_key') footer = 'Pesquisa no currículo local · activa o MAX para respostas com IA';
    else footer = 'Pesquisa no currículo local';
    parts.push(`<div class="ask-result-footer">${escapeHtml(footer)}</div>`);

    return parts.join('');
}

// Inicia uma sessão de treino filtrada pelos tópicos identificados na última
// pergunta. Reutiliza o pool estático + IA; escolhe até 6 exercícios.
function askStartPractice() {
    const r = _lastAskResult;
    if (!r || !r.subject) { showToast('Primeiro faz uma pergunta'); return; }
    const subKey = r.subject;
    const topicsSet = new Set(r.topics || []);
    if (topicsSet.size === 0) { openSubjectDetail(subKey); return; }
    const pool = [
        ...EXERCISES.filter(e => e.s === subKey && topicsSet.has(e.t)),
        ...((state.maxExercises || []).filter(e => e.s === subKey && topicsSet.has(e.t)))
    ];
    if (pool.length === 0) {
        showToast('Sem exercícios para esses tópicos. A abrir a disciplina…');
        openSubjectDetail(subKey);
        return;
    }
    const items = pickExercises(pool, Math.min(6, pool.length));
    currentSession = { items, idx: 0, correct: 0, wrong: 0, xp: 0, streak: 0, isDaily: false, subject: subKey, startedAt: Date.now(), fromAsk: true };
    openExerciseScreen();
    renderQuestion();
}

// Estado da dúvida actual aberta dentro da lição (para contexto da pergunta)
let _currentLessonDoubtCtx = null;

function openLessonByKey(key) {
    const lesson = LESSONS[key] || state.maxLessons?.[key];
    const [subKey, topic] = key.split('/');
    const subName = SUBJECTS[subKey]?.name || subKey;
    document.getElementById('lesson-title').innerHTML = `<i class="fas fa-book-open"></i> ${subName} · ${topic}`;
    const body = document.getElementById('lesson-body');
    // Detectar ano para aplicar variante de leitura mais confortável aos mais novos
    const _year = activeProfile()?.year || 0;
    const _bodyClasses = ['lesson-body'];
    if (_year && _year <= 2) _bodyClasses.push('lesson-body--y2');
    else if (_year && _year <= 4) _bodyClasses.push('lesson-body--y4');
    if (!lesson) {
        body.innerHTML = `<p style="color:var(--text-light)">Ainda não há uma explicação detalhada para este tópico. Tenta resolver o exercício — a explicação aparece depois de responderes.</p>`;
    } else {
        // Markdown-lite + caixas especiais
        let html = lesson.body
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        // Para os mais novos, colapsa quebras múltiplas (3+ \n consecutivas)
        // para no máximo 1 linha em branco — evita gaps verticais enormes.
        if (_year && _year <= 2) {
            html = html.replace(/\n{3,}/g, '\n\n');
        }

        // [exemplo]...[/exemplo] → caixa amarela "Exercício tipo de exame"
        html = html.replace(/\[exemplo\]([\s\S]*?)\[\/exemplo\]/g, (_, inner) => {
            const innerHtml = _renderInnerLessonBlock(inner.trim());
            return `<div class="lesson-example-box"><div class="lesson-example-label">📝 Exercício tipo de exame</div><div class="lesson-example-body">${innerHtml}</div></div>`;
        });

        // [erros]...[/erros] → caixa vermelha "Erros frequentes"
        html = html.replace(/\[erros\]([\s\S]*?)\[\/erros\]/g, (_, inner) => {
            const innerHtml = _renderInnerLessonBlock(inner.trim());
            return `<div class="lesson-error-box"><div class="lesson-error-label">❌ Erros frequentes em exame</div><div class="lesson-error-body">${innerHtml}</div></div>`;
        });

        // Tabelas markdown: |a|b|c|\n|---|---|---|\n|x|y|z|
        html = _renderMarkdownTables(html);

        // Cabeçalhos numerados ("**1. Título**") → badge colorido (apenas para os mais novos)
        if (_year && _year <= 2) {
            html = html.replace(/(^|\n)\*\*(\d+)\.\s+([^*\n]+?)\*\*/g, (_, before, num, title) => {
                return `${before}<div class="lesson-section-header-block"><span class="lesson-section-num">${num}</span><span class="lesson-section-title">${title.trim()}</span></div>`;
            });
        }

        // **bold** restante
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

        body.innerHTML = `<div class="${_bodyClasses.join(' ')}"><h3 style="font-size:1rem;font-weight:700;color:var(--primary);margin-bottom:10px">${lesson.title}</h3>${html}</div>`;
    }

    // Preparar o widget "Tens uma dúvida?"
    _currentLessonDoubtCtx = { key, subKey, topic, subName, lesson };
    const doubtWrap = document.getElementById('lesson-doubt-wrap');
    if (doubtWrap) {
        doubtWrap.style.display = 'block';
        // Garantir estado inicial: trigger visível, painel fechado
        const panel = document.getElementById('lesson-doubt-panel');
        if (panel) panel.style.display = 'none';
        const chevron = document.getElementById('lesson-doubt-chevron');
        if (chevron) chevron.style.transform = '';
        const ans = document.getElementById('lesson-doubt-answer');
        if (ans) { ans.style.display = 'none'; ans.innerHTML = ''; }
        const inp = document.getElementById('lesson-doubt-input');
        if (inp) {
            inp.value = '';
            // Placeholder dinâmico ligado ao tópico
            inp.placeholder = `Ex: o que significa ${_topicHintWord(topic)}?`;
        }
        // Sugestões contextuais
        _renderLessonDoubtSuggestions();
    }

    document.getElementById('lesson-modal').style.display = 'flex';
}

function closeLessonModal() {
    document.getElementById('lesson-modal').style.display = 'none';
    _currentLessonDoubtCtx = null;
}

// Extrai uma palavra-chave do tópico para o placeholder
function _topicHintWord(topic) {
    const t = String(topic || '').toLowerCase();
    // Tira preposições/artigos comuns e devolve a 1.ª palavra "forte"
    const stop = new Set(['o','a','os','as','do','da','dos','das','de','e','com','em','um','uma','para','por']);
    const words = t.split(/[\s\-—,/()]+/).filter(w => w.length > 2 && !stop.has(w));
    return words[0] || 'isto';
}

// Sugestões de dúvidas contextualizadas pelo tópico
function _renderLessonDoubtSuggestions() {
    const wrap = document.getElementById('lesson-doubt-suggestions');
    if (!wrap || !_currentLessonDoubtCtx) return;
    const { topic, subName, lesson } = _currentLessonDoubtCtx;
    const suggestions = _generateLessonDoubtSuggestions(topic, subName, lesson);
    if (!suggestions.length) { wrap.style.display = 'none'; wrap.innerHTML = ''; return; }
    wrap.style.display = 'flex';
    wrap.innerHTML = suggestions.map(s =>
        `<button type="button" class="lesson-doubt-chip" onclick="useLessonDoubtSuggestion(this)" data-q="${s.replace(/"/g, '&quot;')}">${escapeHtml(s)}</button>`
    ).join('');
}

// Gera 3-4 sugestões inteligentes a partir do tópico + corpo da lição
function _generateLessonDoubtSuggestions(topic, subName, lesson) {
    const out = [];
    const tLow = String(topic || '').toLowerCase();
    const body = String(lesson?.body || '');

    // Heurísticas por palavras-chave do tópico
    const map = [
        { match: /verbo|conjuga/i, qs: ['Como conjugar este verbo?', 'O que é um verbo regular?', 'Diferença entre tempo e modo?'] },
        { match: /fra(c|ç)/i,      qs: ['Como simplificar uma fração?', 'Quando se reduz ao mesmo denominador?', 'O que é fração irredutível?'] },
        { match: /percent/i,       qs: ['Como calcular 25% de um número?', 'Como converter fração em percentagem?', 'Diferença entre desconto e aumento'] },
        { match: /pot[eê]ncia/i,   qs: ['Quanto é qualquer número elevado a 0?', 'Como multiplicar potências da mesma base?', 'O que é base e expoente?'] },
        { match: /(área|areas|perímetro)/i, qs: ['Diferença entre área e perímetro?', 'Como calcular a área de um triângulo?', 'O que é π (pi)?'] },
        { match: /volume/i,        qs: ['Quantos litros tem 1 m³?', 'Como calcular o volume de um cubo?', 'Diferença entre volume e capacidade?'] },
        { match: /equil(í|i)brio/i,qs: ['O que é uma reacção reversível?', 'Como interpretar Kc?', 'Em que sentido evolui o equilíbrio?'] },
        { match: /(ácido|base|pH)/i, qs: ['O que é um ácido forte?', 'Como calcular o pH?', 'Quando uma solução é neutra?'] },
        { match: /reacc?[aã]o|le ch[aâ]telier/i, qs: ['Como aplicar Le Châtelier?', 'O que é o quociente de reacção?', 'Catalisador desloca o equilíbrio?'] },
        { match: /(ânimal|animal|vertebrad|invertebrad)/i, qs: ['Como classificar este animal?', 'Diferença entre vivíparo e ovíparo?', 'Que classes têm coluna vertebral?'] },
        { match: /sistema (digest|circulat|respirat|excret|reprod|nervo)/i, qs: ['Quais são os principais órgãos?', 'Qual é a função principal?', 'Como funciona em poucas palavras?'] },
        { match: /microrgan|bact[eé]r|v[ií]rus|fungo/i, qs: ['Diferença entre vírus e bactéria?', 'Antibiótico funciona em vírus?', 'Que doenças causam?'] },
        { match: /portugal|fronteir|distrit|continente|geograf/i, qs: ['Quantos distritos tem Portugal?', 'Quantas ilhas têm os Açores?', 'Qual é o ponto mais alto?'] },
        { match: /reconquist|funda[cç][aã]o|romano|mu[cç]ulman|b[aá]rbar|monarq|repúblic|estado novo|25 de abril/i, qs: ['Em que ano aconteceu?', 'Quem foi o protagonista?', 'Qual a importância para Portugal?'] },
        { match: /sin[oó]nim/i,     qs: ['Diferença entre sinónimo e antónimo?', 'Dá um exemplo de sinónimo', 'Para que servem os sinónimos?'] },
        { match: /ant[oó]nim/i,     qs: ['Diferença entre antónimo e sinónimo?', 'Dá um exemplo de antónimo', 'Toda a palavra tem antónimo?'] },
        { match: /tabuada/i,        qs: ['Como decorar a tabuada?', 'Truque para multiplicar por 10', 'Tabuada do 5 termina em quê?'] },
        { match: /dezena|unidade|n[uú]mer/i, qs: ['Como ler números grandes?', 'Quanto vale o 4 em 47?', 'O que é o sucessor?'] },
        { match: /isometr/i,        qs: ['Diferença entre rotação e translação?', 'O que é eixo de simetria?', 'Reflexão muda o tamanho?'] },
        { match: /past simple|present|past|future/i, qs: ['Como se forma o past simple?', 'Quando usar going to vs will?', 'Verbos irregulares mais comuns'] },
        { match: /comparativ|superlativ/i, qs: ['Quando usar -er vs more?', 'Forma irregular de "good"?', 'Como se faz o superlativo?'] },
    ];
    for (const r of map) {
        if (r.match.test(tLow) || r.match.test(body)) {
            r.qs.forEach(q => out.push(q));
            if (out.length >= 4) break;
        }
    }

    // Sugestões genéricas se ainda há espaço
    const generic = [
        `O que é mais importante neste tópico?`,
        `Dá-me um exemplo simples de ${topic}.`,
        `Como costuma sair em teste?`
    ];
    while (out.length < 3) out.push(generic[out.length] || `Explica-me ${topic} por outras palavras.`);

    // Limita a 4 e remove duplicados
    return [...new Set(out)].slice(0, 4);
}

function useLessonDoubtSuggestion(btn) {
    const q = btn?.dataset?.q || '';
    const inp = document.getElementById('lesson-doubt-input');
    if (inp) { inp.value = q; inp.focus(); }
}

function toggleLessonDoubt() {
    const panel = document.getElementById('lesson-doubt-panel');
    const chevron = document.getElementById('lesson-doubt-chevron');
    if (!panel) return;
    const open = panel.style.display !== 'none';
    if (open) {
        panel.style.display = 'none';
        if (chevron) chevron.style.transform = '';
    } else {
        panel.style.display = 'block';
        if (chevron) chevron.style.transform = 'rotate(180deg)';
        setTimeout(() => document.getElementById('lesson-doubt-input')?.focus(), 80);
    }
}

async function askLessonDoubt() {
    const input = document.getElementById('lesson-doubt-input');
    const ans = document.getElementById('lesson-doubt-answer');
    if (!input || !ans || !_currentLessonDoubtCtx) return;
    const q = (input.value || '').trim();
    if (!q) { showToast('Escreve a tua dúvida primeiro'); return; }
    const { subKey, subName, topic, lesson } = _currentLessonDoubtCtx;

    ans.style.display = 'block';
    ans.innerHTML = `<div class="lesson-doubt-loading"><i class="fas fa-circle-notch fa-spin"></i> A pensar na tua pergunta…</div>`;

    try {
        const yr = activeProfile()?.year || 6;
        const audience = yr <= 2 ? 'uma criança do 2.º ano (7-8 anos)' :
                        yr <= 4 ? `uma criança do ${yr}.º ano (8-10 anos)` :
                        yr <= 6 ? `um aluno do ${yr}.º ano (10-12 anos)` :
                        `um aluno do ${yr}.º ano`;
        const lessonText = String(lesson?.body || '').replace(/\*\*/g, '').slice(0, 1200);
        // Regras especiais para os mais novos: linguagem simples, frases curtas, exemplos do dia-a-dia
        const youngExtras = yr <= 2
            ? `\n\nREGRAS ESPECIAIS (porque o aluno tem 7-8 anos):\n- Frases CURTAS (máximo 12 palavras cada).\n- Vocabulário simples — evita palavras técnicas; se as usares, explica logo.\n- Dá pelo menos 1 EXEMPLO CONCRETO do dia-a-dia da criança (brinquedos, frutas, animais, escola, família).\n- Se ajudar, usa 1 ou 2 emojis no início para captar atenção.\n- Tom carinhoso, encorajador. Trata por "tu".\n- NÃO uses listas com mais de 3 pontos. NÃO uses tabelas.`
            : (yr <= 4
                ? `\n\nNotas: usa frases curtas (máx. 15 palavras), pelo menos 1 exemplo concreto, tom encorajador, trata por "tu".`
                : '');
        const prompt = `És um professor/professora português a ajudar ${audience}.\n\nO aluno está a ler o seguinte resumo do tópico "${topic}" (${subName}):\n---\n${lessonText}\n---\n\nO aluno tem esta dúvida:\n"${q}"\n\nResponde de forma BREVE (3 a 6 frases), CLARA e em PORTUGUÊS EUROPEU (Portugal). Usa linguagem adequada à idade. Se a dúvida for um pedido de exemplo, dá um exemplo concreto. Se for uma pergunta de "como fazer", dá os passos. Se for uma definição, sê preciso. NUNCA digas "não sei" — usa o resumo acima como base. Não digas "olá" nem te apresentes — vai direto à resposta.${youngExtras}`;

        const hasKey = !!(typeof hasAIKey === 'function' && hasAIKey() && state.max?.enabled);
        if (hasKey && typeof callClaudeAPI === 'function') {
            const { text } = await callClaudeAPI(prompt, 380, false);
            const clean = String(text || '').trim().replace(/^["']|["']$/g, '');
            ans.innerHTML = `<div class="lesson-doubt-result"><div class="lesson-doubt-result-q"><i class="fas fa-quote-left"></i> ${escapeHtml(q)}</div><div class="lesson-doubt-result-answer">${_lessonDoubtFormat(clean)}</div></div>`;
        } else {
            ans.innerHTML = `<div class="lesson-doubt-result"><div class="lesson-doubt-result-q"><i class="fas fa-quote-left"></i> ${escapeHtml(q)}</div><div class="lesson-doubt-result-answer">Para responder a perguntas livres preciso da chave da IA. Vai a Perfil → MAX e activa-a, ou consulta o resumo acima.</div></div>`;
        }
    } catch (err) {
        ans.innerHTML = `<div class="lesson-doubt-error"><i class="fas fa-triangle-exclamation"></i> Não consegui responder: ${escapeHtml(err?.message || 'erro')}</div>`;
    }
}

// Renderiza o conteúdo de uma caixa [exemplo]/[erros]: bold, tabelas e quebras de linha
function _renderInnerLessonBlock(inner) {
    let h = inner.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    h = _renderMarkdownTables(h);
    // Converter \n para <br> EXCEPTO quando estiver imediatamente antes/depois de uma tabela
    h = h.replace(/\n+(<table)/g, '$1').replace(/(<\/table>)\n+/g, '$1');
    h = h.replace(/\n/g, '<br>');
    return h;
}

// Converte tabelas markdown em <table>. Aceita pipes opcionais nas pontas.
// Linha separadora: |---|---|---|  ou  | --- | :---: |
function _renderMarkdownTables(html) {
    // Captura blocos de 2+ linhas começadas/cercadas por pipes, sendo a 2.ª uma separadora
    const re = /(?:^|\n)((?:[^\n]*\|[^\n]*\n){2,})/g;
    return html.replace(re, (full, block) => {
        const lines = block.split('\n').filter(l => l.trim() !== '');
        if (lines.length < 2) return full;
        const sep = lines[1].trim();
        if (!/^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?$/.test(sep)) return full;
        const splitRow = (row) => {
            // Tira pipes externos (se houver) e divide por |
            let r = row.trim();
            if (r.startsWith('|')) r = r.slice(1);
            if (r.endsWith('|')) r = r.slice(0, -1);
            return r.split('|').map(c => c.trim());
        };
        const header = splitRow(lines[0]);
        const rows = lines.slice(2).map(splitRow);
        let out = '<div class="lesson-table-wrap"><table class="lesson-table"><thead><tr>';
        header.forEach(c => { out += `<th>${c.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</th>`; });
        out += '</tr></thead><tbody>';
        rows.forEach(r => {
            out += '<tr>';
            // Garante mesmo número de colunas que o header.
            // Inclui data-label com o cabeçalho da coluna — em layouts
            // mobile (2.º ano) é mostrado como etiqueta antes da célula
            // para não perder o contexto quando o thead é ocultado.
            for (let i = 0; i < header.length; i++) {
                const headerLabel = (header[i] || '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/"/g, '&quot;');
                const cell = (r[i] || '').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
                out += `<td data-label="${headerLabel}">${cell}</td>`;
            }
            out += '</tr>';
        });
        out += '</tbody></table></div>';
        // Devolve com newlines mínimas a tornar pre-wrap menos disruptivo
        return '\n' + out + '\n';
    });
}

function _lessonDoubtFormat(text) {
    return escapeHtml(text)
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
        .replace(/^/, '<p>')
        .replace(/$/, '</p>');
}

// ========== BOOT ==========
function hasAnyProfile() { return state && Array.isArray(state.profiles) && state.profiles.length > 0; }

function showFirstRunGate() {
    // Esconde o avatar/nome/header data e abre o modal de criar perfil sem botão de fechar.
    const av = document.getElementById('avatar');           if (av) av.textContent = '\uD83C\uDF93';
    const nm = document.getElementById('user-name');        if (nm) nm.textContent = 'Bem-vindo!';
    const yr = document.getElementById('header-year');      if (yr) yr.textContent = '—';
    const lv = document.getElementById('level-name');       if (lv) lv.textContent = 'Cria o teu perfil';
    ['streak-days','xp-total','xp-into-level'].forEach(id => { const e = document.getElementById(id); if (e) e.textContent = '0'; });
    const xp = document.getElementById('xp-bar-fill');      if (xp) xp.style.width = '0%';
    // Substituir o conteúdo do tab activo por uma chamada à acção
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    let gate = document.getElementById('first-run-gate');
    if (!gate) {
        gate = document.createElement('section');
        gate.id = 'first-run-gate';
        gate.className = 'tab-content';
        gate.innerHTML = `
            <div class="hero-card" style="text-align:center">
                <div class="hero-icon" style="margin:0 auto 10px"><i class="fas fa-user-plus"></i></div>
                <h2>Vamos começar!</h2>
                <p style="margin:8px 0 14px;color:var(--text-light)">Cria o primeiro perfil para escolheres o ano de escolaridade.</p>
                <button class="btn btn-primary btn-block" onclick="openAddProfileModal()">
                    <i class="fas fa-plus"></i> Criar perfil
                </button>
            </div>`;
        document.querySelector('#app').appendChild(gate);
    }
    gate.classList.add('active');
    openAddProfileModal();
}

function hideFirstRunGate() {
    const gate = document.getElementById('first-run-gate');
    if (gate) gate.classList.remove('active');
    // restaurar tab activo se nenhum estiver visível
    if (!document.querySelector('.tab-content.active')) {
        document.getElementById('tab-home')?.classList.add('active');
    }
}

function updateAll() {
    if (!hasAnyProfile()) { showFirstRunGate(); return; }
    hideFirstRunGate();
    updateHeader();
    renderHome();
    renderSubjects();
    renderTests();
    renderProgress();
    renderProfile();
}

// Desbloquear AudioContext no primeiro toque (iOS exige gesto do utilizador).
// Cria o contexto silenciosamente para que esteja pronto quando o primeiro som for chamado.
function _unlockAudio() {
    const ctx = getAudioCtx();
    if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
    }
    document.removeEventListener('touchstart', _unlockAudio, true);
    document.removeEventListener('click',      _unlockAudio, true);
}
document.addEventListener('touchstart', _unlockAudio, { once: true, capture: true, passive: true });
document.addEventListener('click',      _unlockAudio, { once: true, capture: true });

window.addEventListener('DOMContentLoaded', () => {
    // Inicializar estado agora — neste ponto PROFILE_FIELDS, AVATARS, defaultState etc. já existem.
    state = loadState();
    // Activar o ano do perfil activo (troca SUBJECTS/CURRICULUM/EXERCISES/LESSONS).
    // Se não existir perfil, não carrega nada (regra: nenhum ano por defeito).
    if (typeof setActiveYear === 'function') {
        const p = activeProfile();
        if (p) {
            setActiveYear(p.year);
            loadYearExtras(p.year); // síncrono desde v148 — exs já estão em window
            // Reaplicar packs secretos já desbloqueados (plaintext em localStorage)
            try { _applyAllUnlockedSecrets(p); } catch (e) { console.warn('[secret] apply failed', e); }
        }
    }
    // Inicializar version tag + long-press handler
    _setupVersionTag();
    // Injectar container dos tópicos do teste no modal (se não existir)
    const modalBody = document.querySelector('#test-modal .modal-body');
    if (modalBody && !document.getElementById('test-topics-picker')) {
        const div = document.createElement('div');
        div.id = 'test-topics-picker';
        div.style.maxHeight = '220px';
        div.style.overflowY = 'auto';
        div.style.border = '1px solid var(--border)';
        div.style.borderRadius = '10px';
        div.style.padding = '6px';
        div.style.margin = '8px 0 4px';
        // Inserir antes do botão de guardar
        const saveBtn = modalBody.querySelector('button');
        modalBody.insertBefore(div, saveBtn);
        const label = document.createElement('label');
        label.textContent = 'Tópicos que saem no teste';
        modalBody.insertBefore(label, div);
    }
    updateAll();
    // Detectar se URL tem ?duel=... e abrir intro do duelo recebido
    if (typeof _checkIncomingDuel === 'function') _checkIncomingDuel();
    // Aviso "ofensiva em risco" estilo Duolingo (1x por dia)
    setTimeout(_maybeShowStreakGuilt, 800);
    // Notificações: refrescar UI + reagendar lembrete diário
    try { refreshNotifUI(); } catch {}
    try { _scheduleStreakReminder(); } catch {}
});

// ============ STREAK GUILT-TRIP ============
function _maybeShowStreakGuilt() {
    if (!state || !state.streak) return;
    const today = todayStr();
    const last = state.streak.lastDate;
    const days = state.streak.days || 0;
    if (days < 1) return;                     // sem ofensiva ativa, não pressiona
    if (last === today) return;               // já praticou hoje
    const gap = daysBetween(last, today);
    if (gap < 1) return;                      // ainda dentro do dia
    if (gap > 2) return;                      // já está perdida — não vale culpar
    if (state.lastGuiltDate === today) return; // já mostrou hoje
    // Mostra
    const modal = document.getElementById('streak-guilt-modal');
    if (!modal) return;
    const title = document.getElementById('streak-guilt-title');
    const sub = document.getElementById('streak-guilt-sub');
    if (gap === 1) {
        if (title) title.textContent = `${days} ${days === 1 ? 'dia' : 'dias'} de ofensiva em risco!`;
        if (sub) sub.textContent = 'Faz só 1 teste hoje para a manteres viva 🔥';
    } else { // gap === 2 — última hipótese
        if (title) title.textContent = `Última hipótese para a tua ofensiva!`;
        if (sub) sub.textContent = `Tens ${days} ${days === 1 ? 'dia' : 'dias'} acumulados. Se não fizeres um teste hoje, perdes tudo 💔`;
    }
    modal.style.display = 'flex';
    state.lastGuiltDate = today;
    saveState();
}

function closeStreakGuilt(goPractice) {
    const modal = document.getElementById('streak-guilt-modal');
    if (modal) modal.style.display = 'none';
    if (goPractice && typeof startDailyChallenge === 'function') {
        startDailyChallenge();
    }
}

// ============ NOTIFICAÇÕES (lembretes diários) ============
function _notifSupported() {
    return 'Notification' in window && 'serviceWorker' in navigator;
}
function refreshNotifUI() {
    const btn = document.getElementById('btn-toggle-notif');
    const label = document.getElementById('notif-btn-label');
    const status = document.getElementById('notif-status');
    if (!btn || !label || !status) return;
    if (!_notifSupported()) {
        btn.disabled = true;
        label.textContent = 'Não suportado neste browser';
        status.textContent = 'Instala a app no ecrã principal para receberes lembretes.';
        return;
    }
    const perm = Notification.permission;
    const enabled = !!(state && state.notifEnabled) && perm === 'granted';
    if (enabled) {
        label.textContent = 'Lembretes ativados ✓';
        btn.classList.add('btn-primary'); btn.classList.remove('btn-secondary');
        status.textContent = 'Vais receber um aviso por dia se ainda não tiveres feito um teste.';
    } else if (perm === 'denied') {
        label.textContent = 'Permissão bloqueada';
        status.textContent = 'Ativa as notificações nas definições do sistema para esta app.';
    } else {
        label.textContent = 'Ativar lembretes diários';
        btn.classList.remove('btn-primary'); btn.classList.add('btn-secondary');
        status.textContent = 'Recebe um aviso para não perderes a tua ofensiva 🔥';
    }
}

async function toggleNotifications() {
    if (!_notifSupported()) return;
    if (state.notifEnabled && Notification.permission === 'granted') {
        // Desativar
        state.notifEnabled = false;
        saveState();
        showToast('Lembretes desativados');
        refreshNotifUI();
        return;
    }
    let perm = Notification.permission;
    if (perm === 'default') {
        perm = await Notification.requestPermission();
    }
    if (perm !== 'granted') {
        showToast('Permissão recusada — ativa nas definições');
        refreshNotifUI();
        return;
    }
    state.notifEnabled = true;
    saveState();
    showToast('Lembretes ativados! 🔔');
    refreshNotifUI();
    _scheduleStreakReminder();
    // Notificação imediata só para confirmar
    try {
        const reg = await navigator.serviceWorker.ready;
        reg.showNotification('EscolaPlay', {
            body: 'Lembretes ativados! Vais ser avisada quando faltar fazer o teste 🔥',
            icon: 'icon-192.png',
            badge: 'icon-192.png',
            tag: 'escolaplay-welcome'
        });
    } catch {}
}

async function _scheduleStreakReminder() {
    if (!_notifSupported()) return;
    if (!state || !state.notifEnabled) return;
    if (Notification.permission !== 'granted') return;
    try {
        const reg = await navigator.serviceWorker.ready;
        // Agendar para hoje às 19:00 (ou amanhã se já passou)
        const now = new Date();
        const target = new Date();
        target.setHours(19, 0, 0, 0);
        if (target <= now) target.setDate(target.getDate() + 1);
        const tag = 'escolaplay-daily-' + target.toISOString().slice(0,10);
        const opts = {
            body: 'Não te esqueças da tua ofensiva! Faz só 1 teste hoje 🔥',
            icon: 'icon-192.png',
            badge: 'icon-192.png',
            tag,
            requireInteraction: false
        };
        // Best-effort: usar TimestampTrigger se disponível (Chrome)
        if ('TimestampTrigger' in window) {
            opts.showTrigger = new TimestampTrigger(target.getTime());
            await reg.showNotification('EscolaPlay 🦊', opts);
        }
        // Sem TimestampTrigger (iOS Safari etc.) — não há agendamento real;
        // o aviso aparecerá via guilt-trip modal quando reabrir a app.
    } catch (e) { console.warn('schedule reminder failed', e); }
}

// ============================================================
// CONTEÚDO SECRETO (cifrado) — long-press na versão para destrancar
// ============================================================
// Os blobs estão em content_secret.js (window.SECRET_PACKS).
// Cada blob é AES-GCM cifrado. A password só é conhecida pelo dono.
// Quando se acerta a password, o plaintext fica em
// activeProfile().unlockedSecrets[packId] e o conteúdo é injetado nas
// estruturas SUBJECTS_BY_YEAR / CURRICULUM_BY_YEAR / etc. para o ano
// indicado no payload.

function _setupVersionTag() {
    const el = document.getElementById('app-version-tag');
    if (!el) return;
    el.textContent = (typeof APP_VERSION === 'string' ? APP_VERSION : '');
    // Long-press 2.5s (mouse + touch) → abre modal de código
    let timer = null;
    const start = (ev) => {
        // só permitir se houver perfil ativo
        if (!activeProfile()) return;
        timer = setTimeout(() => { timer = null; openSecretModal(); }, 2500);
    };
    const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
    el.addEventListener('mousedown', start);
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('mouseup', cancel);
    el.addEventListener('mouseleave', cancel);
    el.addEventListener('touchend', cancel);
    el.addEventListener('touchcancel', cancel);
}

function openSecretModal() {
    const modal = document.getElementById('secret-modal');
    if (!modal) return;
    renderSecretModalList();
    modal.style.display = 'flex';
}

function closeSecretModal() {
    const modal = document.getElementById('secret-modal');
    if (modal) modal.style.display = 'none';
}

function renderSecretModalList() {
    const list = document.getElementById('secret-locks-list');
    if (!list) return;
    const profile = activeProfile();
    const added = (profile && profile.unlockedSecrets) || {};
    const packs = (window.SECRET_PACKS || []);
    // Filtra packs cujo year != ano do perfil (se year especificado no pack)
    const profileYear = profile ? profile.year : null;
    const visible = packs.filter(p => !p.year || p.year === profileYear);
    if (!profile) {
        list.innerHTML = '<em>Cria um perfil primeiro.</em>';
        return;
    }
    if (visible.length === 0) {
        list.innerHTML = '<em>Sem disciplinas extra disponíveis para este ano.</em>';
        return;
    }
    list.innerHTML = visible.map(p => {
        const isAdded = !!added[p.id];
        const btn = isAdded
            ? `<button onclick="removeSecretPack('${p.id}')" style="background:#fee2e2;color:#b91c1c;border:1.5px solid #fecaca;border-radius:8px;padding:8px 14px;font-size:0.84rem;font-weight:700;cursor:pointer">− Remover</button>`
            : `<button onclick="addSecretPack('${p.id}')" style="background:linear-gradient(135deg,#7c3aed,#5b21b6);color:#fff;border:none;border-radius:8px;padding:8px 14px;font-size:0.84rem;font-weight:700;cursor:pointer">+ Adicionar</button>`;
        return `
            <div style="background:${isAdded?'#f0fdf4':'#f8fafc'};border:1.5px solid ${isAdded?'#86efac':'#e2e8f0'};border-radius:10px;padding:12px;margin-top:10px;display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
                <div style="flex:1;min-width:0">
                    <div style="font-size:0.94rem;font-weight:800;color:#1e293b;margin-bottom:4px">${isAdded?'✓ ':''}${escapeHtml(p.label || p.id)}</div>
                    ${p.description ? `<div style="font-size:0.78rem;color:var(--text-light);line-height:1.4">${escapeHtml(p.description)}</div>` : ''}
                </div>
                <div style="flex-shrink:0">${btn}</div>
            </div>`;
    }).join('');
}

function addSecretPack(packId) {
    const profile = activeProfile();
    if (!profile) return;
    const pack = (window.SECRET_PACKS || []).find(p => p.id === packId);
    if (!pack || !pack.payloadJSON) return;
    profile.unlockedSecrets = profile.unlockedSecrets || {};
    profile.unlockedSecrets[packId] = { pt: pack.payloadJSON, at: Date.now() };
    try {
        _injectSecretPayload(pack.payloadJSON, profile);
    } catch (e) { console.warn('[secret] inject failed', e); }
    saveState();
    if (typeof showToast === 'function') showToast('✓ ' + (pack.label || packId) + ' adicionada');
    if (typeof updateAll === 'function') updateAll();
    renderSecretModalList();
}

function removeSecretPack(packId) {
    const profile = activeProfile();
    if (!profile || !profile.unlockedSecrets) return;
    delete profile.unlockedSecrets[packId];
    saveState();
    if (typeof showToast === 'function') showToast('Disciplina removida — a recarregar…');
    setTimeout(() => location.reload(), 600);
}

// Compatibilidade — alguns sítios chamavam lockSecretPack
function lockSecretPack(packId) { return removeSecretPack(packId); }

function _applyAllUnlockedSecrets(profile) {
    if (!profile || !profile.unlockedSecrets) return;
    for (const id of Object.keys(profile.unlockedSecrets)) {
        const blob = profile.unlockedSecrets[id];
        if (blob && blob.pt) {
            try { _injectSecretPayload(blob.pt, profile); }
            catch (e) { console.warn('[secret] inject '+id+' failed', e); }
        }
    }
}

function _injectSecretPayload(plaintext, profile) {
    let data;
    try { data = JSON.parse(plaintext); }
    catch (e) { console.warn('[secret] JSON parse failed', e); return; }
    if (!data || typeof data !== 'object') return;
    const year = data.year || (profile && profile.year);
    if (!year || !window.SUBJECTS_BY_YEAR || !window.SUBJECTS_BY_YEAR[year]) {
        console.warn('[secret] year inválido ou não existe:', year);
        return;
    }
    // Merge SUBJECTS
    if (data.subjects && typeof data.subjects === 'object') {
        Object.assign(window.SUBJECTS_BY_YEAR[year], data.subjects);
    }
    // Merge CURRICULUM (cada disciplina = array de tópicos)
    if (data.curriculum && typeof data.curriculum === 'object') {
        const curr = window.CURRICULUM_BY_YEAR[year];
        for (const subj of Object.keys(data.curriculum)) {
            const topics = data.curriculum[subj];
            if (Array.isArray(topics)) {
                curr[subj] = [...(curr[subj] || []), ...topics.filter(t => !(curr[subj] || []).includes(t))];
            }
        }
    }
    // Merge PERIODS
    if (data.periods && typeof data.periods === 'object') {
        const per = window.PERIODS_BY_YEAR[year];
        for (const subj of Object.keys(data.periods)) {
            per[subj] = Object.assign({}, per[subj] || {}, data.periods[subj]);
        }
    }
    // Merge LESSONS
    if (data.lessons && typeof data.lessons === 'object') {
        Object.assign(window.LESSONS_BY_YEAR[year], data.lessons);
    }
    // Append EXERCISES (com sanitização)
    if (Array.isArray(data.exercises)) {
        const dest = window.EXERCISES_BY_YEAR[year];
        const existing = new Set(dest.map(e => e.id));
        for (const raw of data.exercises) {
            const e = (typeof _sanitizeExercise === 'function') ? _sanitizeExercise(raw) : raw;
            if (e && e.id && !existing.has(e.id)) {
                dest.push(e);
                existing.add(e.id);
            }
        }
    }
    // Se o ano corresponde ao ativo, sincronizar as referências mutáveis
    if (window.activeYear === year && typeof setActiveYear === 'function') {
        setActiveYear(year);
    }
    // Garantir que o perfil tem toIndex para a nova disciplina
    if (profile && profile.progress && data.curriculum) {
        for (const subj of Object.keys(data.curriculum)) {
            if (!profile.progress[subj]) {
                profile.progress[subj] = { toIndex: (window.CURRICULUM_BY_YEAR[year][subj] || []).length };
            } else {
                profile.progress[subj].toIndex = (window.CURRICULUM_BY_YEAR[year][subj] || []).length;
            }
        }
    }
    // Garantir subjects stats
    if (profile && profile.subjects && data.subjects) {
        for (const subj of Object.keys(data.subjects)) {
            if (!profile.subjects[subj]) profile.subjects[subj] = { answered: 0, correct: 0, xp: 0 };
        }
    }
}

// ============================================================
// TTS (Text-to-Speech) — leitura em PT-PT
// ============================================================
// Usado pelo pack Som+ para crianças ouvirem palavras/perguntas em voz alta.
// Web Speech API é nativo do browser. iOS Safari suporta desde iOS 7.

function ttsSpeak(text) {
    if (!text || !('speechSynthesis' in window)) return;
    try {
        window.speechSynthesis.cancel(); // cancela qualquer fala em curso
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'pt-PT';
        u.rate = 0.85; // mais lento para crianças
        u.pitch = 1.0;
        u.volume = 1.0;
        // Procurar voz PT-PT preferencialmente
        const voices = window.speechSynthesis.getVoices();
        const pt = voices.find(v => v.lang === 'pt-PT') || voices.find(v => v.lang && v.lang.startsWith('pt'));
        if (pt) u.voice = pt;
        window.speechSynthesis.speak(u);
    } catch (e) { console.warn('[tts] failed:', e); }
}

// Garantir que as vozes são carregadas (algumas browsers precisam de tempo)
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try { window.speechSynthesis.getVoices(); } catch {}
    window.speechSynthesis.onvoiceschanged = () => {};
}

// ============================================================
// TTS — Web Speech API para Som+ (e qualquer pack que peça)
// ============================================================
let _ttsVoice = null;
// Selecciona a MELHOR voz PT disponível. Estratégia em camadas:
// 1.º — voz PT-PT marcada como Enhanced/Premium/Neural/Online (mais natural)
// 2.º — vozes "famosas" boas: Joana, Catarina, Joaquim (iOS PT-PT)
// 3.º — qualquer PT-PT
// 4.º — voz PT-BR Premium (Luciana, Felipe) — sotaque BR mas natural
// 5.º — qualquer PT
// 6.º — primeira voz disponível
function _pickPTVoice() {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || !voices.length) return null;
    const score = (v) => {
        let s = 0;
        const name = (v.name || '').toLowerCase();
        const lang = (v.lang || '').toLowerCase();
        // Idioma
        if (/pt[-_]pt/.test(lang)) s += 100;
        else if (/^pt/.test(lang)) s += 50;
        // Qualidade
        if (/(enhanced|premium|neural|google|natural)/i.test(name)) s += 40;
        // Vozes PT-PT conhecidas boas (iOS / macOS)
        if (/^(joana|catarina|joaquim)/i.test(name)) s += 30;
        // Vozes PT-BR Premium (sotaque BR mas naturais — Luciana, Felipe)
        if (/^(luciana|felipe)/i.test(name)) s += 15;
        // Penalizar vozes muito robóticas conhecidas
        if (/(compact|eloquence)/i.test(name)) s -= 10;
        // Online costuma ser melhor que offline (Google, Microsoft)
        if (v.localService === false) s += 5;
        return s;
    };
    const best = voices.slice().sort((a,b) => score(b) - score(a))[0];
    return best || voices[0];
}
window.ttsSpeak = function (text) {
    try {
        if (!('speechSynthesis' in window)) return;
        // Cancelar fala em curso
        window.speechSynthesis.cancel();
        const cleaned = String(text || '').replace(/<[^>]+>/g,'').replace(/\*\*/g,'').replace(/\*/g,'');
        const u = new SpeechSynthesisUtterance(cleaned);
        u.lang = 'pt-PT';
        // Parâmetros para som mais natural (menos robótico)
        u.rate = 0.92;    // ligeiramente mais lento que normal mas não dormente
        u.pitch = 1.0;    // pitch natural (não esticado para cima)
        u.volume = 1.0;
        // Pode demorar a carregar vozes — tenta agora e em fallback
        if (!_ttsVoice) _ttsVoice = _pickPTVoice();
        if (_ttsVoice) u.voice = _ttsVoice;
        window.speechSynthesis.speak(u);
    } catch (err) { console.warn('TTS failed', err); }
};

// ============================================================
// ESTRELAS DE DOMÍNIO — por tópico, baseado em respostas certas
// ★      = 3+ corretas, accuracy ≥ 50%
// ★★     = 10+ corretas, accuracy ≥ 70%
// ★★★    = 20+ corretas, accuracy ≥ 80% E pelo menos 2 difíceis
// ============================================================
function topicStars(subjectKey, topic) {
    if (!state || !state.topicMastery) return '';
    const m = state.topicMastery[subjectKey + '/' + topic];
    if (!m) return '';
    const c = (m.d1||0) + (m.d2||0) + (m.d3||0);
    const w = (m.w1||0) + (m.w2||0) + (m.w3||0);
    const tot = c + w;
    if (tot < 3 || c < 3) return '';
    const acc = c / tot;
    if (c >= 20 && acc >= 0.80 && (m.d3||0) >= 2) return '★★★';
    if (c >= 10 && acc >= 0.70) return '★★';
    if (c >= 3 && acc >= 0.50) return '★';
    return '';
}

// ============================================================
// LIÇÃO PRIMEIRO — abre a lição do tópico antes do primeiro exercício
// se a criança ainda nunca viu nenhum exercício desse tópico.
// ============================================================
function _maybeShowFirstLesson(e) {
    try {
        const profile = activeProfile();
        if (!profile || !e || !e.s || !e.t) return;
        profile.lessonsSeen = profile.lessonsSeen || {};
        const key = e.s + '/' + e.t;
        if (profile.lessonsSeen[key]) return; // já viu
        if (!window.LESSONS || !window.LESSONS[key]) return; // sem lição
        // Verificar se já respondeu algum exercício deste tópico
        const seen = state.exerciseSeen || {};
        const anySeenInTopic = (window.EXERCISES || []).some(x => x.s === e.s && x.t === e.t && seen[x.id]);
        if (anySeenInTopic) {
            // Já respondeu antes — só marca como visto, não interrompe
            profile.lessonsSeen[key] = Date.now();
            saveState();
            return;
        }
        // Primeira vez — abrir lição automaticamente
        if (typeof openLessonByKey === 'function') {
            setTimeout(() => {
                openLessonByKey(key);
                profile.lessonsSeen[key] = Date.now();
                saveState();
            }, 250);
        }
    } catch (err) { console.warn('first-lesson hook failed', err); }
}

// ============================================================
// MAT+ DIAGNOSTIC SCREENER — 10 perguntas curtas para identificar
// pontos fracos e recomendar tópicos iniciais
// Cobre: subitizing, ligação a 10, dezenas/unidades, somar/tirar,
// dobros, partilha, padrões e problema simples.
// ============================================================
const MATPLUS_DIAG = [
    { area: 'subitizing',  q: 'Quantos pontos vês? ● ● ●', opts: ['2','3','4','5'], ans: 1 },
    { area: 'subitizing',  q: 'Quantos pontos vês? ● ● ● ● ●', opts: ['3','4','5','6'], ans: 2 },
    { area: 'ten_bond',    q: '7 + ? = 10', opts: ['2','3','4','5'], ans: 1 },
    { area: 'add_easy',    q: '5 + 4 = ?', opts: ['7','8','9','10'], ans: 2 },
    { area: 'add_bridge',  q: '8 + 6 = ?', opts: ['12','13','14','15'], ans: 2 },
    { area: 'sub_easy',    q: '10 − 3 = ?', opts: ['6','7','8','9'], ans: 1 },
    { area: 'tens_units',  q: 'No número 47, quantas dezenas há?', opts: ['4','7','40','11'], ans: 0 },
    { area: 'doubles',     q: 'Quanto é o dobro de 6?', opts: ['10','11','12','13'], ans: 2 },
    { area: 'multiplic',   q: '3 × 4 = ?', opts: ['7','10','12','14'], ans: 2 },
    { area: 'problem',     q: 'Tinha 8 cromos. Dei 3 ao Tomás. Quantos ficaram?', opts: ['4','5','6','11'], ans: 1 },
];
// Mapa: área fraca → tópicos sugeridos (do Mat+)
const MATPLUS_DIAG_RECS = {
    subitizing:  ['Quantos vês?', 'Contar até 10'],
    ten_bond:    ['Fazer 10', 'Partir números'],
    add_easy:    ['Juntar e tirar com desenhos', 'Mais, menos, igual'],
    add_bridge:  ['Somar até 100 (com transporte)', 'Fazer 10'],
    sub_easy:    ['Tirar até 100 (sem empréstimo)', 'Famílias de factos'],
    tens_units:  ['Dezenas e unidades', 'Saltar de 10 em 10'],
    doubles:     ['Dobros e quase-dobros', 'Dobro e metade'],
    multiplic:   ['Grupos iguais', 'Tabuada do 2', 'Tabuada do 5'],
    problem:     ['Problemas — juntar e tirar', 'Modelo de barra'],
};
let _matDiagState = null;
function showMatPlusDiagnosticIntro() {
    document.getElementById('mat-diag-modal-temp')?.remove();
    const m = document.createElement('div');
    m.id = 'mat-diag-modal-temp';
    m.className = 'modal';
    m.style.display = 'flex';
    m.style.alignItems = 'center';
    m.style.justifyContent = 'center';
    m.style.padding = '20px';
    m.innerHTML = `
      <div class="modal-content" style="max-width:420px;padding:20px">
        <h3 style="margin:0 0 10px;font-size:1.15rem;color:#0f766e">🎯 Diagnóstico inicial de Mat+</h3>
        <p style="font-size:0.92rem;line-height:1.5;color:#374151;margin:0 0 14px">
          10 perguntas rápidas para descobrir os melhores tópicos para começar. Não conta para pontuação — é só para te orientar!
        </p>
        <p style="font-size:0.85rem;color:#6b7280;margin:0 0 16px">⏱️ ~3 minutos</p>
        <div style="display:flex;flex-direction:column;gap:8px">
          <button class="btn btn-primary-solid btn-block" onclick="startMatDiagnostic()">Começar diagnóstico</button>
          <button class="btn btn-secondary btn-block" onclick="skipMatDiagnostic()">Saltar (posso fazer depois)</button>
        </div>
      </div>
    `;
    document.body.appendChild(m);
}
function skipMatDiagnostic() {
    state.matPlusDiagSkipped = true;
    saveState();
    document.getElementById('mat-diag-modal-temp')?.remove();
    openSubjectDetail('mat_plus');
}
function startMatDiagnostic() {
    _matDiagState = { idx: 0, answers: [], wrong: [] };
    renderMatDiagQuestion();
}
function renderMatDiagQuestion() {
    const s = _matDiagState;
    const q = MATPLUS_DIAG[s.idx];
    const modal = document.getElementById('mat-diag-modal-temp');
    if (!modal) return;
    modal.innerHTML = `
      <div class="modal-content" style="max-width:420px;padding:20px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <div style="flex:1;height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden">
            <div style="height:100%;background:#0f766e;width:${((s.idx)/MATPLUS_DIAG.length)*100}%;transition:width 0.3s"></div>
          </div>
          <span style="font-size:0.8rem;color:#6b7280;font-weight:700">${s.idx+1}/${MATPLUS_DIAG.length}</span>
        </div>
        <div style="font-size:1.05rem;font-weight:700;color:#0f766e;margin-bottom:16px;line-height:1.4">${q.q}</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${q.opts.map((o,i) => `
            <button class="btn-option" onclick="answerMatDiag(${i})" style="text-align:left">
              <span class="opt-letter">${String.fromCharCode(65+i)}</span>
              <span>${o}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;
}
function answerMatDiag(i) {
    const s = _matDiagState;
    const q = MATPLUS_DIAG[s.idx];
    s.answers.push(i);
    if (i !== q.ans) s.wrong.push(q.area);
    s.idx++;
    if (s.idx >= MATPLUS_DIAG.length) {
        finishMatDiagnostic();
    } else {
        renderMatDiagQuestion();
    }
}
function finishMatDiagnostic() {
    const s = _matDiagState;
    const correctCount = MATPLUS_DIAG.length - s.wrong.length;
    // Compila tópicos recomendados (deduplicado, máx 5)
    const recs = [];
    const seen = new Set();
    for (const area of s.wrong) {
        for (const topic of (MATPLUS_DIAG_RECS[area] || [])) {
            if (!seen.has(topic)) { seen.add(topic); recs.push(topic); }
            if (recs.length >= 5) break;
        }
        if (recs.length >= 5) break;
    }
    if (recs.length === 0) {
        // Acertou tudo — dá tópicos de desafio
        recs.push('Estimativa', 'Estratégias mentais', 'Problemas em 2 passos');
    }
    state.matPlusDiag = {
        date: Date.now(),
        score: correctCount,
        total: MATPLUS_DIAG.length,
        wrongAreas: s.wrong,
        recommended: recs,
    };
    saveState();
    const modal = document.getElementById('mat-diag-modal-temp');
    if (modal) {
        const pct = Math.round((correctCount/MATPLUS_DIAG.length)*100);
        modal.innerHTML = `
          <div class="modal-content" style="max-width:440px;padding:20px">
            <h3 style="margin:0 0 8px;color:#0f766e">🎯 Resultado</h3>
            <div style="font-size:2rem;font-weight:900;color:#0f766e;text-align:center;margin:8px 0">${correctCount}/${MATPLUS_DIAG.length} <span style="font-size:1rem;color:#6b7280">(${pct}%)</span></div>
            <p style="font-size:0.92rem;color:#374151;line-height:1.5;margin:0 0 12px">
              ${correctCount === MATPLUS_DIAG.length
                ? '✨ Acertaste em tudo! Aqui ficam tópicos de desafio:'
                : 'Os tópicos abaixo vão ajudar-te a reforçar onde tive(s)te mais dificuldade:'}
            </p>
            <div style="background:#f0fdfa;border:1.5px solid #14b8a6;border-radius:10px;padding:10px 12px;margin:8px 0">
              ${recs.map(t => `<div style="padding:4px 0;color:#0f766e;font-weight:600">→ ${escapeHtml(t)}</div>`).join('')}
            </div>
            <button class="btn btn-primary-solid btn-block" onclick="closeMatDiagAndOpen()" style="margin-top:12px">Abrir Mat+ →</button>
          </div>
        `;
    }
}
function closeMatDiagAndOpen() {
    document.getElementById('mat-diag-modal-temp')?.remove();
    openSubjectDetail('mat_plus');
}
window.startMatDiagnostic = startMatDiagnostic;
window.skipMatDiagnostic = skipMatDiagnostic;
window.answerMatDiag = answerMatDiag;
window.closeMatDiagAndOpen = closeMatDiagAndOpen;


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
const PROFILE_FIELDS = ['profile','xp','streak','daily','subjects','badges','history','totalDailies','perfectDailies','recentIds','tests','rewards','progress','maxExercises','maxLessons'];

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
        max: { enabled: true, apiKey: '', totalGenerated: 0, totalRequests: 0 }
    };
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
                max: { enabled: true, apiKey: '', totalGenerated: 0, totalRequests: 0, ...(parsed.max || {}) }
            };
            if (!s.max.enabled) s.max.enabled = true;
            return installStateProxy(s);
        }

        // Estado novo já tem profiles[] (pode estar vazio até o utilizador criar o primeiro perfil)
        const s = {
            profiles: parsed.profiles.map(p => {
                const yr = SUBJECTS_BY_YEAR[p.year] ? p.year : (parseInt(Object.keys(SUBJECTS_BY_YEAR)[0]) || 2);
                return { ...newProfile({ year: yr }), ...p, year: yr };
            }),
            activeProfileId: parsed.activeProfileId,
            max: { enabled: true, apiKey: '', totalGenerated: 0, totalRequests: 0, ...(parsed.max || {}) }
        };
        if (!s.max.enabled) s.max.enabled = true;
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
function migrateMaxExercise(e) {
    if (!e) return e;
    if (typeof e.q === 'string') e.q = brToPt(e.q);
    if (typeof e.exp === 'string') e.exp = brToPt(e.exp);
    if (typeof e.passage === 'string') e.passage = brToPt(e.passage);
    if (typeof e.material === 'string') e.material = brToPt(e.material);
    if (typeof e.solution === 'string') e.solution = brToPt(e.solution);
    if (Array.isArray(e.opts)) e.opts = e.opts.map(o => typeof o === 'string' ? brToPt(o) : o);
    if (Array.isArray(e.ans)) e.ans = e.ans.map(a => typeof a === 'string' ? brToPt(a) : a);
    if (e.svg && _isTrivialSvg(e.svg)) delete e.svg;
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
        { src: 'content_2_m_extra2.js', varName: 'EXERCISES_2_M_EXTRA2' },
        { src: 'content_2_e_extra2.js', varName: 'EXERCISES_2_E_EXTRA2' },
        { src: 'content_2_i_extra2.js', varName: 'EXERCISES_2_I_EXTRA2' }
    ],
    5: [
        { src: 'content_5_p_extra.js', varName: 'EXERCISES_5_P_EXTRA' },
        { src: 'content_5_m_extra.js', varName: 'EXERCISES_5_M_EXTRA' },
        { src: 'content_5_i_extra.js', varName: 'EXERCISES_5_I_EXTRA' },
        { src: 'content_5_c_extra.js', varName: 'EXERCISES_5_C_EXTRA' },
        { src: 'content_5_h_extra.js', varName: 'EXERCISES_5_H_EXTRA' }
    ],
    6: [
        { src: 'content_6_p_extra.js', varName: 'EXERCISES_6_P_EXTRA' },
        { src: 'content_6_m_extra.js', varName: 'EXERCISES_6_M_EXTRA' },
        { src: 'content_6_i_extra.js', varName: 'EXERCISES_6_I_EXTRA' },
        { src: 'content_6_c_extra.js', varName: 'EXERCISES_6_C_EXTRA' },
        { src: 'content_6_h_extra.js', varName: 'EXERCISES_6_H_EXTRA' }
    ]
};

const _yearExtrasLoaded = {};

function _loadExtraScript(file) {
    return new Promise(resolve => {
        const s = document.createElement('script');
        s.src = `${file.src}?v=${Date.now()}`;
        s.async = true;
        s.onload = () => resolve(window[file.varName] || []);
        s.onerror = () => resolve([]);
        document.head.appendChild(s);
    });
}

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

function loadYearExtras(year) {
    if (!year) return Promise.resolve(0);
    if (_yearExtrasLoaded[year]) return _yearExtrasLoaded[year];
    const files = YEAR_EXTRA_FILES[year] || [];
    if (!files.length) {
        _yearExtrasLoaded[year] = Promise.resolve(0);
        return _yearExtrasLoaded[year];
    }
    _yearExtrasLoaded[year] = Promise.all(files.map(_loadExtraScript)).then(arrays => {
        const base = window.EXERCISES_BY_YEAR && window.EXERCISES_BY_YEAR[year];
        if (!Array.isArray(base)) return 0;
        const existing = new Set(base.map(e => e && e.id));
        let added = 0;
        arrays.forEach(arr => {
            if (!Array.isArray(arr)) return;
            arr.forEach(raw => {
                const e = _sanitizeExercise(raw);
                if (e && e.id && !existing.has(e.id)) {
                    base.push(e);
                    existing.add(e.id);
                    added++;
                }
            });
        });
        if (window.activeYear === year) window.EXERCISES = base;
        if (added > 0 && typeof updateAll === 'function') {
            try { updateAll(); } catch {}
        }
        return added;
    });
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
    loadYearExtras(p.year);
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
    loadYearExtras(p.year);
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

// ========== HOME ==========
function renderHome() {
    document.getElementById('mini-streak').textContent = state.streak.days;
    document.getElementById('mini-xp').textContent = state.xp;
    document.getElementById('mini-correct').textContent = totalCorrect(state);
    document.getElementById('mini-badges').textContent = state.badges.length;

    const dailyDone = state.daily.date === todayStr() && state.daily.completed;
    document.getElementById('daily-status').textContent = dailyDone
        ? `Concluído hoje (${state.daily.correct}/${DAILY_QUESTIONS})`
        : `${DAILY_QUESTIONS} perguntas, 1 de cada disciplina`;
    document.getElementById('btn-start-daily-label').textContent = dailyDone ? 'Repetir desafio' : 'Começar desafio';

    // Próximo teste
    renderNextTestCard();
    // Próximo prémio
    renderNextRewardCard();

    // Treino rápido
    const container = document.getElementById('quick-subjects');
    container.innerHTML = Object.entries(SUBJECTS).map(([key, sub]) => `
        <div class="quick-subject" onclick="openSubjectDetail('${key}')">
            <i class="fas ${sub.icon}" style="color:${sub.color}"></i>
            <div class="qs-name">${sub.name}</div>
        </div>
    `).join('');
}

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
    grid.innerHTML = Object.entries(SUBJECTS).map(([key, sub]) => {
        const stats = state.subjects[key] || { answered: 0, correct: 0, xp: 0 };
        const pct = stats.answered > 0 ? Math.round(stats.correct / stats.answered * 100) : 0;
        const active = activeTopicsFor(key);
        const maxEx = state.maxExercises || [];
        const totalActive = EXERCISES.filter(e => e.s === key && active.has(e.t)).length
                          + maxEx.filter(e => e.s === key && active.has(e.t)).length;
        const totalAll = EXERCISES.filter(e => e.s === key).length
                       + maxEx.filter(e => e.s === key).length;
        return `
            <div class="subject-card" onclick="openSubjectDetail('${key}')">
                <div class="subject-card-icon" style="background:${sub.color}"><i class="fas ${sub.icon}"></i></div>
                <h3>${sub.name}</h3>
                <div class="subject-card-meta">${stats.correct}/${stats.answered} certas · ${totalActive}/${totalAll} activos</div>
                <div class="subject-card-bar"><div class="subject-card-bar-fill" style="width:${pct}%;background:${sub.color}"></div></div>
            </div>
        `;
    }).join('');
}

// ========== SUBJECT DETAIL (modal fullscreen) ==========
function openSubjectDetail(key) {
    currentSubjectView = key;
    const sub = SUBJECTS[key];
    const topics = CURRICULUM[key] || [];
    const toIndex = state.progress[key]?.toIndex ?? topics.length;
    const stats = state.subjects[key] || { answered: 0, correct: 0, xp: 0 };

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
                    <div style="font-size:0.8rem;color:var(--text-light);margin-bottom:4px">Respostas certas</div>
                    <div style="font-size:1.3rem;font-weight:800">${stats.correct}/${stats.answered} &middot; ${stats.xp} XP</div>
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
    container.innerHTML = topics.map((t, i) => {
        const isActive = active.has(t);
        const count = EXERCISES.filter(e => e.s === key && e.t === t).length
                    + (state.maxExercises || []).filter(e => e.s === key && e.t === t).length;
        const sel = selectedTopicsForMax.has(t);
        const tEsc = t.replace(/'/g, "\\'");
        return `
            <div onclick="${isActive ? `toggleTopicSelection('${tEsc}')` : ''}" style="background:${sel ? '#f5f3ff' : '#fff'};padding:10px 12px;border-radius:10px;box-shadow:var(--shadow-sm);margin-bottom:6px;display:flex;align-items:center;gap:8px;opacity:${isActive ? '1' : '0.45'};cursor:${isActive ? 'pointer' : 'default'};border:2px solid ${sel ? '#7c3aed' : 'transparent'}">
                ${isActive ? `<input type="checkbox" ${sel ? 'checked' : ''} onclick="event.stopPropagation();toggleTopicSelection('${tEsc}')" style="width:16px;height:16px;accent-color:#7c3aed;flex-shrink:0">` : `<span style="width:16px;height:16px;flex-shrink:0"></span>`}
                <span style="width:22px;height:22px;border-radius:50%;background:${isActive ? SUBJECTS[key].color : '#e5e7eb'};color:#fff;font-size:0.7rem;font-weight:800;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0">${i+1}</span>
                <div style="flex:1;min-width:0">
                    <div style="font-weight:600;font-size:0.9rem">${t}</div>
                    <div style="font-size:0.7rem;color:var(--text-light)">${count} exercícios${LESSONS[`${key}/${t}`] ? ' · tem explicação' : ''}</div>
                </div>
                ${LESSONS[`${key}/${t}`] ? `<button class="icon-btn help-btn" onclick="event.stopPropagation();openLessonByKey('${key}/${tEsc}')" title="Ver explicação"><i class="fas fa-lightbulb"></i></button>` : ''}
            </div>
        `;
    }).join('');
    updateTopicSelBar();
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
        return `
            <div class="test-item ${cls}">
                <div class="test-item-icon" style="background:${sub?.color || '#6b7280'}"><i class="fas ${sub?.icon || 'fa-book'}"></i></div>
                <div class="test-item-body">
                    <div class="test-item-subject">${sub?.name || t.subject}</div>
                    <div class="test-item-date">${formatDatePT(t.date)} · ${daysLabel}</div>
                    <div class="test-item-note">${topicsLabel}${t.note ? ` · ${t.note}` : ''}</div>
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
        }
    } else {
        sel.value = Object.keys(SUBJECTS)[0];
        document.getElementById('test-date').value = defaultDate;
        document.getElementById('test-note').value = '';
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

function saveTest() {
    const subject = document.getElementById('test-subject').value;
    const date = document.getElementById('test-date').value;
    const note = document.getElementById('test-note').value.trim();
    if (!date) { showToast('Escolhe uma data'); return; }
    const topics = Array.from(document.querySelectorAll('#test-topics-picker input[type="checkbox"]:checked')).map(cb => cb.value);
    if (pendingTestId) {
        const t = state.tests.find(x => x.id === pendingTestId);
        if (t) { t.subject = subject; t.date = date; t.note = note; t.topics = topics; }
    } else {
        state.tests.push({ id: uid(), subject, date, note, topics, done: false });
    }
    saveState();
    const wasEditing = !!pendingTestId;
    closeAddTestModal();
    renderTests();
    renderHome();
    showToast(wasEditing ? 'Teste actualizado' : 'Teste adicionado');
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

function startTestPrep(testId) {
    const t = state.tests.find(x => x.id === testId);
    if (!t) return;
    const key = t.subject;
    const active = activeTopicsFor(key);
    const orderArr = CURRICULUM[key] || [];
    // Tópicos do teste (por ordem curricular); se vazio, todos os activos
    const rawTopics = (t.topics && t.topics.length > 0) ? t.topics : Array.from(active);
    const topicsOrdered = rawTopics
        .filter(tp => active.has(tp))
        .sort((a, b) => orderArr.indexOf(a) - orderArr.indexOf(b));
    if (topicsOrdered.length === 0) { showToast('Sem tópicos activos para este teste.'); return; }
    // Para cada tópico, recolher até 3 exercícios (evitando recentes quando possível)
    const recent = new Set(state.recentIds || []);
    const target = Math.max(PRACTICE_QUESTIONS, topicsOrdered.length * 2);
    const perTopic = Math.max(2, Math.ceil(target / topicsOrdered.length));
    const items = [];
    topicsOrdered.forEach(topic => {
        const pool = allExercisesFor(key, new Set([topic]));
        const fresh = pool.filter(e => !recent.has(e.id));
        const chosen = (fresh.length >= perTopic ? fresh : pool)
            .sort(() => Math.random() - 0.5)
            .slice(0, perTopic);
        items.push(...chosen);
    });
    if (items.length === 0) { showToast('Sem exercícios para estes tópicos. Ajusta o progresso da disciplina.'); return; }
    // Manter ordem curricular: itens já estão por ordem dos tópicos
    currentSession = { items, idx: 0, correct: 0, wrong: 0, xp: 0, streak: 0, isDaily: false, subject: key, testId };
    openExerciseScreen();
    renderQuestion();
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
    if (maxEnabled) maxEnabled.checked = !!state.max.enabled;
    if (maxKey) maxKey.value = state.max.apiKey || '';
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
    const enabled = document.getElementById('max-enabled').checked;
    if (enabled && !key) { showToast('Precisas de uma chave API para activar MAX'); return; }
    if (enabled && !/^gsk_/.test(key)) { showToast('Chave inválida — deve começar por gsk_'); return; }
    state.max.apiKey = key;
    state.max.enabled = enabled;
    saveState();
    showToast(enabled ? 'MAX activado!' : 'Configuração guardada');
}

// ========== MAX: chamada à Groq API ==========
const GROQ_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];

async function _callGroq(model, prompt, maxTokens, wantJson, key) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            signal: controller.signal,
            headers: { 'content-type': 'application/json', 'authorization': `Bearer ${key}` },
            body: JSON.stringify({
                model, max_tokens: maxTokens, temperature: 0.7,
                messages: [
                    { role: 'system', content: wantJson ? 'Respond ONLY with valid JSON. No markdown, no asterisks, no explanation outside JSON. When writing in Portuguese, always use European Portuguese (Portugal), never Brazilian Portuguese. Use vocabulary, spelling and expressions from Portugal.' : 'Always use European Portuguese (Portugal), never Brazilian Portuguese. Use vocabulary, spelling and expressions from Portugal. No markdown, no asterisks.' },
                    { role: 'user', content: prompt }
                ]
            })
        });
        return res;
    } finally { clearTimeout(timeout); }
}

async function callClaudeAPI(prompt, maxTokens = 3500, wantJson = true) {
    const key = state.max?.apiKey;
    if (!key) throw new Error('Sem chave API');
    let lastErr = '';
    for (let i = 0; i < GROQ_MODELS.length; i++) {
        const model = GROQ_MODELS[i];
        let res;
        try {
            res = await _callGroq(model, prompt, maxTokens, wantJson, key);
        } catch (e) {
            if (e.name === 'AbortError') throw new Error('Tempo esgotado (30s). Verifica a ligação.');
            throw new Error('Erro de rede: ' + e.message);
        }
        if (res.ok) {
            const data = await res.json();
            const text = data.choices?.[0]?.message?.content || '';
            if (!text) throw new Error('Resposta vazia do Groq');
            if (i > 0) console.warn(`MAX: usado modelo de fallback ${model}`);
            return { text, usage: data.usage, model };
        }
        const errText = await res.text();
        lastErr = `Groq ${res.status}: ${errText.slice(0, 300)}`;
        // 429 (rate limit) ou 503 (capacidade): tenta o próximo modelo
        if (res.status !== 429 && res.status !== 503) break;
    }
    throw new Error(lastErr || 'Erro desconhecido Groq');
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

TIPOS DISPONÍVEIS:
- "mc": escolha múltipla, 4 opções (1 correcta, 3 distratores plausíveis)
- "tf": verdadeiro ou falso (afirmação completa e precisa)
- "fill": completar frase com lacuna ___ (aceita variantes ortográficas em ans_fill)
- "problem": problema com contexto real; "material" = fórmula/regra; "solution" = resolução passo a passo numerada
- "passage": texto informativo de 3-5 frases + pergunta de compreensão/aplicação; para Matemática e Ciências incluir obrigatoriamente "svg" (SVG 220x160, viewBox="0 0 220 160", com figuras geométricas, gráficos ou diagramas) ou "table" (HTML <table> com cabeçalhos)

LIÇÕES: para cada tópico, escreve uma mini-lição de 2-3 frases no campo "lessons" que explique o conceito principal de forma simples.

Responde APENAS com JSON válido (sem markdown, sem texto fora do JSON):

{"lessons":{"<tópico>":"<mini-lição 2-3 frases>"},"exercises":[
  {"t":"<tópico>","type":"mc","diff":2,"q":"<pergunta>","opts":["<A>","<B>","<C>","<D>"],"ans_mc":<0-3>,"exp":"<explicação pedagógica>"},
  {"t":"<tópico>","type":"tf","diff":1,"q":"<afirmação completa>","ans_tf":<true|false>,"exp":"<explicação>"},
  {"t":"<tópico>","type":"fill","diff":2,"q":"<frase com ___ no meio>","ans_fill":["<resposta>","<variante>"],"exp":"<explicação>"},
  {"t":"<tópico>","type":"problem","diff":3,"q":"<enunciado com dados concretos>","ans_fill":["<valor>"],"material":"<regra ou fórmula>","solution":"<passo 1. passo 2. resultado>","exp":"<dica>"},
  {"t":"<tópico>","type":"passage","diff":3,"passage":"<texto 3-5 frases>","q":"<pergunta>","ans_fill":["<resposta>"],"svg":"<SVG>","exp":"<explicação>"}
]}`;

    const { text, usage } = await callClaudeAPI(prompt, 4000);
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
            ex.opts = (raw.opts || []).map(o => isEnglish ? o : _toPT(o));
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
            if (raw.svg && !_isTrivialSvg(raw.svg)) ex.svg = raw.svg;
        }
        if (raw.material) ex.material = isEnglish ? raw.material : _toPT(raw.material);
        if (raw.solution) ex.solution = isEnglish ? raw.solution : _toPT(raw.solution);
        return ex;
    }).filter(e => e.q && e.type && (e.type === 'tf' ? typeof e.ans === 'boolean' : e.ans !== undefined));
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
    if (!state.max.enabled || !state.max.apiKey) {
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
    if (name === 'profile') renderProfile();
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
function pickExercises(pool, n) {
    const recent = new Set(state.recentIds || []);
    const fresh = pool.filter(e => !recent.has(e.id));
    const usable = fresh.length >= n ? fresh : pool;
    const shuffled = [...usable].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
}

function allExercisesFor(subjectKey, activeTopics) {
    const base = EXERCISES.filter(e => e.s === subjectKey && activeTopics.has(e.t));
    const maxEx = (state.maxExercises || []).filter(e => e.s === subjectKey && activeTopics.has(e.t));
    return [...base, ...maxEx];
}

function startDailyChallenge() {
    const items = [];
    Object.keys(SUBJECTS).forEach(key => {
        const active = activeTopicsFor(key);
        const pool = allExercisesFor(key, active);
        if (pool.length === 0) return;
        items.push(pool[Math.floor(Math.random() * pool.length)]);
    });
    if (items.length === 0) { showToast('Activa alguns tópicos primeiro nas disciplinas.'); return; }
    const shuffled = items.sort(() => Math.random() - 0.5).slice(0, DAILY_QUESTIONS);
    currentSession = { items: shuffled, idx: 0, correct: 0, wrong: 0, xp: 0, streak: 0, isDaily: true };
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
    const items = pickExercises(pool, Math.min(PRACTICE_QUESTIONS, pool.length));
    currentSession = { items, idx: 0, correct: 0, wrong: 0, xp: 0, streak: 0, isDaily: false, subject: key };
    closeSubjectDetail();
    openExerciseScreen();
    renderQuestion();
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
    // Suporte a passagem de texto / tabela / SVG acima da pergunta
    const qEl = document.getElementById('ex-question');
    let qHtml = '';
    if (e.passage) qHtml += `<div class="ex-passage">${escapeHtml(e.passage).replace(/\n/g,'<br>')}</div>`;
    if (e.table)   qHtml += `<div class="ex-table-wrap">${e.table}</div>`;
    if (e.svg)     qHtml += `<div class="ex-svg-wrap">${e.svg}</div>`;
    qHtml += `<span class="ex-q-text">${escapeHtml(e.q)}</span>`;
    qEl.innerHTML = qHtml;
    document.getElementById('ex-feedback').style.display = 'none';
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
async function aiValidateAnswer(exercise, studentAnswer) {
    const n = normalize(studentAnswer);
    if ((exercise.ans || []).some(a => {
        const na = normalize(a);
        return na === n || (n.length >= 3 && (na.includes(n) || n.includes(na)));
    })) return true;
    const cacheKey = `aival_${exercise.id}_${n.slice(0, 40)}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached !== null) return cached === '1';
    const correctAnswers = (exercise.ans || []).join(' ou ');
    const langNote = exercise.s === 'ingles'
        ? ' The answer must be in English — Portuguese words are NOT accepted as correct even if they mean the same thing.'
        : '';
    const prompt = `Pergunta: "${exercise.q}"\nResposta correta: "${correctAnswers}"\nResposta do aluno: "${studentAnswer}"\nO aluno está correto? Aceita variações de escrita, abreviaturas, formas equivalentes e respostas parciais onde a palavra-chave está correcta (ex: "atlântico" é válido para "Oceano Atlântico"). Usa Português de Portugal (não brasileiro).${langNote} Responde APENAS com JSON: {"ok":true} ou {"ok":false}`;
    try {
        const { text } = await callClaudeAPI(prompt, 80);
        const correct = /"ok"\s*:\s*true/.test(text);
        sessionStorage.setItem(cacheKey, correct ? '1' : '0');
        return correct;
    } catch(e) { return false; }
}

// ========== SUBMIT ==========
async function submitAnswer() {
    if (!currentSession) return;
    const e = currentSession.items[currentSession.idx];
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
        // Validação IA como fallback — só se não acertou no matching e há chave API
        if (!isCorrect && state.max?.apiKey) {
            const btn = document.getElementById('submit-btn');
            if (btn) { btn.disabled = true; btn.textContent = 'A verificar…'; }
            isCorrect = await aiValidateAnswer(e, val);
            if (btn) { btn.disabled = false; btn.textContent = 'Responder'; }
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
    recordAnswer(e, isCorrect);
    showFeedback(e, isCorrect);
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

function playCorrectSound() {
    // Estilo Duolingo: duas notas ascendentes em harmonia (G5 → C6, intervalo de 4ª justa).
    // Decay longo (~450ms) com brilho da harmónica oitava acima — soa a sino/marimba.
    playBellNote(784, 0,   450, 0.22); // G5
    playBellNote(1047, 70, 550, 0.22); // C6 — entra ligeiramente sobreposto
}

function playWrongSound() {
    // Som suave, não punitivo — tom grave curto sem decay exponencial agressivo
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') { try { ctx.resume(); } catch (_) {} }
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(330, t0);
    osc.frequency.exponentialRampToValueAtTime(220, t0 + 0.18);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.12, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.25);
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
    // som suave de subida (2 notas)
    playBellNote(660, 0, 200, 0.18);
    playBellNote(990, 90, 240, 0.18);
    requestAnimationFrame(() => banner.classList.add('show'));
    setTimeout(() => { banner.classList.remove('show'); setTimeout(() => banner.remove(), 400); }, 1800);
}

function showFeedback(e, isCorrect) {
    if (isCorrect) playCorrectSound(); else playWrongSound();
    const panel = document.getElementById('ex-feedback');
    panel.style.display = 'block';
    document.getElementById('feedback-icon').innerHTML = isCorrect ? '\u{1F389}' : '\u{1F914}';
    const txt = document.getElementById('feedback-text');
    txt.textContent = isCorrect ? 'Certo!' : 'Ainda não';
    txt.className = 'feedback-text ' + (isCorrect ? 'feedback-correct' : 'feedback-wrong');
    let expParts = [];
    if (!isCorrect) {
        if (e.type === 'mc') expParts.push(`Resposta certa: ${e.opts[e.ans]}.`);
        else if (e.type === 'tf') expParts.push(`Resposta certa: ${e.ans ? 'Verdadeiro' : 'Falso'}.`);
        else if (e.type === 'fill' || e.type === 'problem') expParts.push(`Resposta certa: ${e.ans[0]}.`);
        else if (e.type === 'order') expParts.push(`Ordem certa: ${e.items.join(' > ')}.`);
    }
    if (e.material)  expParts.push(`📘 ${e.material}`);
    if (e.solution)  expParts.push(`📐 Resolução: ${e.solution}`);
    if (e.exp)       expParts.push(e.exp);
    document.getElementById('feedback-exp').textContent = expParts.join('\n\n');
    document.getElementById('feedback-exp').style.whiteSpace = 'pre-wrap';
    document.getElementById('feedback-exp').style.textAlign = 'left';
    // Botão explicação detalhada
    const detailBtn = document.getElementById('feedback-detail-btn');
    const detailWrap = document.getElementById('feedback-detail-wrap');
    if (detailWrap) { detailWrap.style.display = 'none'; detailWrap.innerHTML = ''; }
    if (detailBtn) { detailBtn.style.display = 'block'; detailBtn.textContent = '💡 Explicar passo a passo'; detailBtn.disabled = false; }
    const nextLbl = (currentSession.idx + 1 >= currentSession.items.length) ? 'Ver resultado' : 'Continuar';
    document.getElementById('feedback-next').textContent = nextLbl;
    document.getElementById('session-xp').textContent = currentSession.xp;
}

async function loadDetailedExplanation() {
    const e = currentSession.items[currentSession.idx];
    const btn = document.getElementById('feedback-detail-btn');
    const wrap = document.getElementById('feedback-detail-wrap');
    const cacheKey = `detail_${e.id}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) { wrap.innerHTML = cached; wrap.style.display = 'block'; btn.style.display = 'none'; return; }

    // Lição estática (1.ª escolha sempre que existe — instantânea, sem custo, em PT)
    const lessonKey = `${e.s}/${e.t}`;
    const lesson = LESSONS[lessonKey] || state.maxLessons?.[lessonKey];
    const showLesson = () => {
        const html = `<strong>${lesson.title}</strong><br><br>${lesson.body.replace(/\n/g,'<br>')}`;
        sessionStorage.setItem(cacheKey, html);
        wrap.innerHTML = html; wrap.style.display = 'block'; btn.style.display = 'none';
    };

    // Sem API key → tenta lição estática; se não houver, mostra a explicação curta do exercício
    if (!state.max?.apiKey) {
        if (lesson) return showLesson();
        const fallback = e.exp || 'Não há explicação detalhada disponível para esta pergunta.';
        wrap.innerHTML = fallback.replace(/\n/g, '<br>');
        wrap.style.display = 'block'; btn.style.display = 'none';
        return;
    }

    // Com API key → tenta IA; em caso de erro, faz fallback para lição estática ou e.exp
    btn.textContent = '⏳ A carregar…'; btn.disabled = true;
    const correctAns = e.type === 'mc' ? e.opts[e.ans] : (Array.isArray(e.ans) ? e.ans[0] : String(e.ans));
    const context = [e.passage && `Texto: "${e.passage}"`, e.material && `Regra: "${e.material}"`].filter(Boolean).join('\n');
    const yr = activeProfile()?.year || 6;
    const audience = yr === 2 ? 'uma criança do 2.º ano (7-8 anos), com frases muito curtas e vocabulário simples e carinhoso' : `um aluno do ${yr}.º ano`;
    const subjectHint = e.s === 'ingles' && yr === 2
        ? '\nÉ uma pergunta de Inglês para 2.º ano: a explicação deve ser em PORTUGUÊS, dizendo o significado da palavra inglesa e dando uma dica para memorizar.'
        : '';
    const prompt = `Explica de forma clara e simples para ${audience}:\nPergunta: "${e.q}"\nResposta correta: "${correctAns}"\n${context}${subjectHint}\nDá uma explicação passo a passo em ${yr === 2 ? '2-3' : '3-4'} frases CURTAS. Português Europeu (Portugal). Sê DIRECTO — não comentes a tua explicação, não digas "pode haver interpretação diferente", não digas "a resposta correta dada é X". Apenas explica o raciocínio para chegar à resposta. Texto corrido simples. Sem JSON, sem chavetas, sem markdown.`;
    try {
        const { text } = await callClaudeAPI(prompt, 400, false);
        let clean = text.trim();
        if (clean.startsWith('{')) {
            try {
                const obj = JSON.parse(clean);
                clean = Object.values(obj).filter(v => typeof v === 'string').join(' ');
            } catch(_) {
                clean = clean.replace(/[{}"]/g, '').replace(/\w+:/g, '').trim();
            }
        }
        const html = clean.replace(/\n/g, '<br>');
        sessionStorage.setItem(cacheKey, html);
        wrap.innerHTML = html; wrap.style.display = 'block'; btn.style.display = 'none';
    } catch(err) {
        // Fallback: lição estática se existir, senão e.exp, senão mensagem de erro
        if (lesson) return showLesson();
        const fallback = e.exp
            ? `${e.exp}<br><br><em style="color:#9ca3af">(IA indisponível: ${String(err.message || err).slice(0, 100)})</em>`
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
    let newBadges = [];
    if (s.isDaily) {
        const today = todayStr();
        const lastDate = state.streak.lastDate;
        if (lastDate !== today) {
            const gap = daysBetween(lastDate, today);
            if (gap === 1) state.streak.days += 1;
            else state.streak.days = 1;
            state.streak.lastDate = today;
            if (state.streak.days > state.streak.best) state.streak.best = state.streak.days;
        }
        state.daily = { date: today, completed: true, correct: s.correct };
        state.totalDailies = (state.totalDailies || 0) + 1;
        if (s.correct === s.items.length) state.perfectDailies = (state.perfectDailies || 0) + 1;
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
    showSummary(s, newBadges, newlyUnlocked);
}

function showSummary(s, newBadges, newRewards) {
    document.getElementById('exercise-screen').style.display = 'none';
    document.getElementById('summary-screen').style.display = 'flex';
    const total = s.items.length;
    const acc = total ? Math.round(s.correct / total * 100) : 0;
    let title = 'Bom trabalho!', emoji = '\u{1F389}';
    if (acc === 100) { title = 'Perfeito!'; emoji = '\u{1F3C6}'; }
    else if (acc >= 80) { title = 'Excelente!'; emoji = '\u{1F31F}'; }
    else if (acc >= 50) { title = 'Quase lá!'; emoji = '\u{1F4AA}'; }
    else { title = 'Treina mais!'; emoji = '\u{1F331}'; }
    document.getElementById('summary-emoji').textContent = emoji;
    document.getElementById('summary-title').textContent = title;
    document.getElementById('summary-sub').textContent = s.isDaily ? 'Desafio diário concluído' : s.testId ? 'Treino para teste concluído' : 'Sessão de treino concluída';
    document.getElementById('sum-correct').textContent = `${s.correct}/${total}`;
    document.getElementById('sum-xp').textContent = '+' + s.xp;
    document.getElementById('sum-accuracy').textContent = acc + '%';
    const bdg = document.getElementById('summary-badges');
    const badgeChips = newBadges.map(b => `<div class="summary-badge-chip">${b.icon} ${b.name}</div>`).join('');
    const rewardChips = (newRewards || []).map(r => `<div class="summary-badge-chip" style="background:linear-gradient(135deg,#fef9c3,#fde047);border-color:#eab308">\u{1F381} ${r.name}</div>`).join('');
    bdg.innerHTML = badgeChips + rewardChips;

    // Se desbloqueou prémio, mostrar modal depois do summary
    if (newRewards && newRewards.length > 0) {
        pendingRewardId = newRewards[0].id;
        setTimeout(() => {
            document.getElementById('reward-unlocked-name').textContent = newRewards[0].name;
            document.getElementById('reward-modal').style.display = 'flex';
        }, 800);
    }
}

function closeSummary() {
    document.getElementById('summary-screen').style.display = 'none';
    currentSession = null;
    updateAll();
    switchTab('home');
}

function claimCurrentReward() {
    if (pendingRewardId) claimReward(pendingRewardId);
    closeRewardModal();
}
function closeRewardModal() {
    document.getElementById('reward-modal').style.display = 'none';
    pendingRewardId = null;
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
    document.getElementById('lesson-title').innerHTML = `<i class="fas fa-comment-dots" style="color:#2563eb"></i> Pista · ${sub?.name || e.s} · ${e.t}`;
    const body = document.getElementById('lesson-body');
    const parts = [];
    if (e.hint) {
        parts.push(`<p style="background:#dbeafe;border-left:4px solid #2563eb;padding:10px 12px;border-radius:8px;margin-bottom:10px"><strong>💬 Pista:</strong> ${escapeHtml(e.hint)}</p>`);
    }
    if (e.material) {
        parts.push(`<p style="background:#f0fdf4;border-left:4px solid #16a34a;padding:10px 12px;border-radius:8px;margin-bottom:10px"><strong>📘 Regra a aplicar:</strong> ${escapeHtml(e.material)}</p>`);
    }
    // Extrair um excerto curto da lição do tópico (se existir)
    const lesson = LESSONS[`${e.s}/${e.t}`];
    if (lesson) {
        const snippet = lesson.body.split('\n').filter(l => l.trim()).slice(0, 4).join('\n');
        const formatted = escapeHtml(snippet).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        parts.push(`<p style="font-size:0.82rem;color:var(--text-light);margin-top:8px;white-space:pre-wrap">${formatted}</p>`);
        parts.push(`<p style="margin-top:10px"><button class="btn btn-secondary btn-block" onclick="closeLessonModal();setTimeout(openLessonModal,50)">Ver explicação completa do tópico</button></p>`);
    }
    if (parts.length === 0) {
        parts.push(`<p style="color:var(--text-light)">Lê a pergunta com atenção. Pensa em que operação ou regra precisas de aplicar.</p>`);
    }
    body.innerHTML = `<div style="padding:4px">${parts.join('')}</div>`;
    document.getElementById('lesson-modal').style.display = 'flex';
}

function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function openLessonByKey(key) {
    const lesson = LESSONS[key] || state.maxLessons?.[key];
    const [subKey, topic] = key.split('/');
    const subName = SUBJECTS[subKey]?.name || subKey;
    document.getElementById('lesson-title').innerHTML = `<i class="fas fa-lightbulb"></i> ${subName} · ${topic}`;
    const body = document.getElementById('lesson-body');
    if (!lesson) {
        body.innerHTML = `<p style="color:var(--text-light)">Ainda não há uma explicação detalhada para este tópico. Tenta resolver o exercício — a explicação aparece depois de responderes.</p>`;
    } else {
        // Markdown-lite: **bold** -> <strong>; linebreaks preserved
        let html = lesson.body
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        body.innerHTML = `<div class="lesson-body"><h3 style="font-size:1rem;font-weight:700;color:var(--primary);margin-bottom:10px">${lesson.title}</h3>${html}</div>`;
    }
    document.getElementById('lesson-modal').style.display = 'flex';
}
function closeLessonModal() {
    document.getElementById('lesson-modal').style.display = 'none';
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

window.addEventListener('DOMContentLoaded', () => {
    // Inicializar estado agora — neste ponto PROFILE_FIELDS, AVATARS, defaultState etc. já existem.
    state = loadState();
    // Activar o ano do perfil activo (troca SUBJECTS/CURRICULUM/EXERCISES/LESSONS).
    // Se não existir perfil, não carrega nada (regra: nenhum ano por defeito).
    if (typeof setActiveYear === 'function') {
        const p = activeProfile();
        if (p) { setActiveYear(p.year); loadYearExtras(p.year); }
    }
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
});

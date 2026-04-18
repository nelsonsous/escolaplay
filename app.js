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
let state = loadState();
let currentSession = null;
let selectedAnswer = null;
let matchSelection = { left: null };
let pendingTestId = null;      // teste a editar
let pendingRewardId = null;    // prémio desbloqueado a mostrar
let currentSubjectView = null; // disciplina visível no modal de detalhes

function defaultState() {
    const subs = {};
    Object.keys(SUBJECTS).forEach(k => { subs[k] = { answered: 0, correct: 0, xp: 0 }; });
    const prog = {};
    Object.keys(CURRICULUM).forEach(k => { prog[k] = { toIndex: CURRICULUM[k].length }; });
    return {
        profile: { name: 'Aluno(a)', avatar: AVATARS[0] },
        xp: 0,
        streak: { days: 0, lastDate: null, best: 0 },
        daily: { date: null, completed: false, correct: 0 },
        subjects: subs,
        badges: [],
        history: [],
        totalDailies: 0,
        perfectDailies: 0,
        recentIds: [],
        tests: [],
        rewards: JSON.parse(JSON.stringify(DEFAULT_REWARDS)),
        progress: prog,
        max: { enabled: true, apiKey: '', totalGenerated: 0, totalRequests: 0 },
        maxExercises: [],
        maxLessons: {}
    };
}
function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return defaultState();
        const parsed = JSON.parse(raw);
        const base = defaultState();
        const merged = { ...base, ...parsed };
        merged.profile  = { ...base.profile, ...(parsed.profile || {}) };
        merged.subjects = { ...base.subjects, ...(parsed.subjects || {}) };
        merged.streak   = { ...base.streak, ...(parsed.streak || {}) };
        merged.daily    = { ...base.daily, ...(parsed.daily || {}) };
        merged.progress = { ...base.progress, ...(parsed.progress || {}) };
        merged.max = { ...base.max, ...(parsed.max || {}) };
        if (!merged.max.enabled) merged.max.enabled = true;
        merged.maxExercises = Array.isArray(parsed.maxExercises) ? parsed.maxExercises : [];
        merged.maxLessons = (parsed.maxLessons && typeof parsed.maxLessons === 'object') ? parsed.maxLessons : {};
        if (!Array.isArray(merged.tests)) merged.tests = [];
        if (!Array.isArray(merged.rewards) || merged.rewards.length === 0) merged.rewards = JSON.parse(JSON.stringify(DEFAULT_REWARDS));
        // Garante que cada disciplina tem toIndex
        Object.keys(CURRICULUM).forEach(k => {
            if (!merged.progress[k]) merged.progress[k] = { toIndex: CURRICULUM[k].length };
        });
        return merged;
    } catch(e) {
        console.error('loadState', e);
        return defaultState();
    }
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

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
    const to = state.progress[subjectKey]?.toIndex ?? CURRICULUM[subjectKey].length;
    return new Set(CURRICULUM[subjectKey].slice(0, to));
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
    document.getElementById('avatar').textContent = state.profile.avatar;
    document.getElementById('user-name').textContent = state.profile.name;
    document.getElementById('level-name').textContent = lvl.name;
    document.getElementById('level-num').textContent = lvl.number;
    document.getElementById('streak-days').textContent = state.streak.days;
    document.getElementById('xp-total').textContent = state.xp;
    document.getElementById('xp-into-level').textContent = lvl.into;
    document.getElementById('xp-next-level').textContent = lvl.span;
    const pct = Math.min(100, Math.round(lvl.into / lvl.span * 100));
    document.getElementById('xp-bar-fill').style.width = pct + '%';
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

                <div class="section-title" style="margin-top:8px"><i class="fas fa-list-ol"></i> Tópicos</div>
                <div id="topic-list"></div>

                <button class="btn btn-primary-solid btn-block" style="margin-top:14px" onclick="startSubjectSession('${key}')">
                    <i class="fas fa-play"></i> Começar treino
                </button>
                <button class="btn btn-max btn-block" style="margin-top:8px" onclick="startMaxSession('${key}')">
                    <i class="fas fa-wand-magic-sparkles"></i> Treino MAX
                </button>
                <button class="btn btn-secondary btn-block" style="margin-top:6px;font-size:0.85rem" onclick="startMaxSession('${key}', {forceNew:true})">
                    <i class="fas fa-rotate"></i> Gerar perguntas novas (usa API)
                </button>
            </div>
        </div>
    `;
    const container = document.createElement('div');
    container.id = 'subject-detail-container';
    container.innerHTML = html;
    document.body.appendChild(container);
    renderTopicList();
}

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
        return `
            <div style="background:#fff;padding:10px 12px;border-radius:10px;box-shadow:var(--shadow-sm);margin-bottom:6px;display:flex;align-items:center;gap:8px;opacity:${isActive ? '1' : '0.45'}">
                <span style="width:24px;height:24px;border-radius:50%;background:${isActive ? SUBJECTS[key].color : '#e5e7eb'};color:#fff;font-size:0.72rem;font-weight:800;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0">${i+1}</span>
                <div style="flex:1;min-width:0">
                    <div style="font-weight:600;font-size:0.9rem">${t}</div>
                    <div style="font-size:0.7rem;color:var(--text-light)">${count} exercícios · ${LESSONS[`${key}/${t}`] ? 'tem explicação' : ''}</div>
                </div>
                ${LESSONS[`${key}/${t}`] ? `<button class="icon-btn help-btn" onclick="openLessonByKey('${key}/${t.replace(/'/g, "\\'")}')" title="Ver explicação"><i class="fas fa-lightbulb"></i></button>` : ''}
            </div>
        `;
    }).join('');
}

function onProgressSlider(val) {
    const key = currentSubjectView;
    state.progress[key] = { toIndex: parseInt(val) };
    saveState();
    document.getElementById('progress-current').textContent = val;
    renderTopicList();
}

function closeSubjectDetail() {
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
    closeAddTestModal();
    renderTests();
    renderHome();
    showToast(pendingTestId ? 'Teste actualizado' : 'Teste adicionado');
    pendingTestId = null;
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

// ========== PROFILE (+ rewards editor) ==========
function renderProfile() {
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
async function callClaudeAPI(prompt, maxTokens = 3500) {
    const key = state.max?.apiKey;
    if (!key) throw new Error('Sem chave API');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    let res;
    try {
        res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            signal: controller.signal,
            headers: {
                'content-type': 'application/json',
                'authorization': `Bearer ${key}`
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                max_tokens: maxTokens,
                temperature: 0.7,
                messages: [
                    { role: 'system', content: 'Respond ONLY with valid JSON. No markdown, no asterisks, no explanation outside JSON. When writing in Portuguese, always use European Portuguese (Portugal), never Brazilian Portuguese. Use vocabulary, spelling and expressions from Portugal.' },
                    { role: 'user', content: prompt }
                ]
            })
        });
    } catch(e) {
        if (e.name === 'AbortError') throw new Error('Tempo esgotado (30s). Verifica a ligação.');
        throw new Error('Erro de rede: ' + e.message);
    } finally {
        clearTimeout(timeout);
    }
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Groq ${res.status}: ${errText.slice(0, 300)}`);
    }
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    if (!text) throw new Error('Resposta vazia do Groq');
    return { text, usage: data.usage };
}

async function generateMaxExercises(subjectKey, topics, count = 12) {
    const sub = SUBJECTS[subjectKey];
    const subName = sub.fullName || sub.name;
    const topicsStr = topics.join(', ');
    const isEnglish = subjectKey === 'ingles';
    const langRule = isEnglish
        ? '- IMPORTANT: All exercise content (passage, question, options, answers, explanations) must be written in ENGLISH. The topic names in "lessons" keys stay as-is.'
        : '- Português Europeu, Acordo Ortográfico 1990. Acentos obrigatórios.';
    const prompt = `És um professor que cria exercícios variados e desafiantes para o 5.º ano (curriculum português).

Gera ${count} exercícios de ${subName} cobrindo os tópicos: ${topicsStr}.

REGRAS GERAIS:
${langRule}
- Dificuldade 1-3. Inclui pelo menos 3 exercícios de dificuldade 3.
- Mistura tipos: mc, tf, fill, problem, passage.
- Para Matemática, pelo menos metade devem ser "problem" ou "passage" com cálculo real.

TIPOS DE EXERCÍCIOS:
1. "mc" - escolha múltipla com 4 opções
2. "tf" - verdadeiro ou falso
3. "fill" - preencher lacuna
4. "problem" - problema com contexto real (campo "material" com regra, "solution" com resolução passo-a-passo)
5. "passage" - texto de contexto longo (2-4 frases) seguido de pergunta; usa campo "passage" com o texto e "q" com a pergunta. Inclui sempre "table" (tabela HTML com <table><tr><th>/<td>) OU "svg" (SVG 200×150 com figuras geométricas, gráficos de barras simples, ou diagramas). Para Matemática e Ciências é OBRIGATÓRIO incluir svg ou table.

Para cada tópico inclui mini-lição de 2-3 frases no campo "lessons".

Responde APENAS com JSON válido (sem markdown):

{"lessons":{"<tópico>":"<explicação 2-3 frases>"},"exercises":[
  {"t":"<tópico>","type":"mc","diff":2,"q":"<pergunta>","opts":["A","B","C","D"],"ans_mc":0,"exp":"<explicação>"},
  {"t":"<tópico>","type":"tf","diff":1,"q":"<afirmação>","ans_tf":true,"exp":"<explicação>"},
  {"t":"<tópico>","type":"fill","diff":2,"q":"<frase com ___>","ans_fill":["resposta","variante"],"exp":"<explicação>"},
  {"t":"<tópico>","type":"problem","diff":3,"q":"<enunciado>","ans_fill":["valor"],"material":"<regra>","solution":"<passos>","exp":"<nota>"},
  {"t":"<tópico>","type":"passage","diff":3,"passage":"<texto contexto longo>","q":"<pergunta sobre o texto>","ans_fill":["resposta"],"table":"<tabela HTML opcional>","svg":"<SVG simples opcional>","exp":"<explicação>"}
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
    const items = (parsed.exercises || []).map((raw, i) => {
        const rawTopic = (raw.t || '').toLowerCase();
        const matchedTopic = topics.find(t => t.toLowerCase() === rawTopic) || topics[0];
        const ex = {
            id: `max_${Date.now()}_${i}`,
            s: subjectKey,
            t: matchedTopic,
            type: raw.type,
            diff: Math.max(1, Math.min(3, raw.diff || 2)),
            q: raw.q,
            exp: raw.exp || ''
        };
        if (raw.type === 'mc') { ex.opts = raw.opts; ex.ans = raw.ans_mc; }
        else if (raw.type === 'tf') { ex.ans = raw.ans_tf; }
        else if (raw.type === 'fill' || raw.type === 'problem') {
            ex.ans = Array.isArray(raw.ans_fill) ? raw.ans_fill : [String(raw.ans_fill)];
        }
        if (raw.type === 'passage') {
            ex.passage = raw.passage || '';
            ex.ans = Array.isArray(raw.ans_fill) ? raw.ans_fill : [String(raw.ans_fill || '')];
            if (raw.table) ex.table = raw.table;
            if (raw.svg)   ex.svg   = raw.svg;
        }
        if (raw.material) ex.material = raw.material;
        if (raw.solution) ex.solution = raw.solution;
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

    showMaxLoader('A gerar exercícios novos com IA…');
    try {
        const { items, lessons } = await generateMaxExercises(subjectKey, topics, 12);
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
    if (!confirm('Tens a certeza? Vais perder XP, streak, testes, prémios e histórico.')) return;
    const profile = state.profile;
    state = defaultState();
    state.profile = profile;
    saveState();
    updateAll();
    showToast('Progresso reiniciado.');
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

function startSubjectSession(key) {
    const active = activeTopicsFor(key);
    const pool = allExercisesFor(key, active);
    if (pool.length === 0) { showToast('Sem exercícios. Aumenta o teu progresso para incluir mais tópicos.'); return; }
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
            setTimeout(() => { inp.value = ''; if (state.max?.enabled && state.max?.apiKey) inp.focus(); }, 50);
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
    if ((exercise.ans || []).some(a => normalize(a) === n)) return true;
    const cacheKey = `aival_${exercise.id}_${n.slice(0, 40)}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached !== null) return cached === '1';
    const correctAnswers = (exercise.ans || []).join(' ou ');
    const langNote = exercise.s === 'ingles'
        ? ' The answer must be in English — Portuguese words are NOT accepted as correct even if they mean the same thing.'
        : '';
    const prompt = `Pergunta: "${exercise.q}"\nResposta correta: "${correctAnswers}"\nResposta do aluno: "${studentAnswer}"\nO aluno está correto? Aceita variações de escrita, abreviaturas e formas equivalentes. Usa Português de Portugal (não brasileiro).${langNote} Responde APENAS com JSON: {"ok":true} ou {"ok":false}`;
    try {
        const { text } = await callClaudeAPI(prompt, 30);
        const correct = /"ok"\s*:\s*true/.test(text);
        sessionStorage.setItem(cacheKey, correct ? '1' : '0');
        return correct;
    } catch(e) { return false; }
}

// ========== SUBMIT ==========
async function submitAnswer() {
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
    } else if (e.type === 'fill' || e.type === 'problem') {
        const val = document.getElementById('fill-input')?.value || '';
        if (!val.trim()) { showToast('Escreve uma resposta'); return; }
        const n = normalize(val);
        isCorrect = (e.ans || []).some(a => normalize(a) === n);
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

function showFeedback(e, isCorrect) {
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
    // Verifica lição estática
    const lessonKey = `${e.s}/${e.t}`;
    const lesson = LESSONS[lessonKey] || state.maxLessons?.[lessonKey];
    if (lesson && !state.max?.apiKey) {
        const html = `<strong>${lesson.title}</strong><br><br>${lesson.body.replace(/\n/g,'<br>')}`;
        wrap.innerHTML = html; wrap.style.display = 'block'; btn.style.display = 'none'; return;
    }
    if (!state.max?.apiKey) { btn.style.display = 'none'; return; }
    btn.textContent = '⏳ A carregar…'; btn.disabled = true;
    const correctAns = e.type === 'mc' ? e.opts[e.ans] : (Array.isArray(e.ans) ? e.ans[0] : String(e.ans));
    const context = [e.passage && `Texto: "${e.passage}"`, e.material && `Regra: "${e.material}"`].filter(Boolean).join('\n');
    const prompt = `Explica de forma clara e simples para um aluno do 5.º ano:\nPergunta: "${e.q}"\nResposta correta: "${correctAns}"\n${context}\nDá uma explicação passo a passo em 3-5 frases. Usa Português de Portugal (não brasileiro), simples. Sem markdown.`;
    try {
        const { text } = await callClaudeAPI(prompt, 250);
        const html = text.trim().replace(/\n/g, '<br>');
        sessionStorage.setItem(cacheKey, html);
        wrap.innerHTML = html; wrap.style.display = 'block'; btn.style.display = 'none';
    } catch(err) { btn.textContent = '💡 Explicar passo a passo'; btn.disabled = false; }
}

function nextQuestion() {
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
function updateAll() {
    updateHeader();
    renderHome();
    renderSubjects();
    renderTests();
    renderProgress();
    renderProfile();
}

window.addEventListener('DOMContentLoaded', () => {
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

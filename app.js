// ========== EscolaPlay ==========
// State + gamification + exercises

const STORAGE_KEY = 'escolaplay_v1';
const AVATARS = ['\u{1F98A}','\u{1F43B}','\u{1F981}','\u{1F436}','\u{1F43C}','\u{1F42F}','\u{1F43A}','\u{1F98A}','\u{1F427}','\u{1F989}','\u{1F984}','\u{1F409}'];
const LEVELS = [
    { min:    0, name: 'Aprendiz' },
    { min:  500, name: 'Aventureiro' },
    { min: 1500, name: 'Explorador' },
    { min: 3000, name: 'Cavaleiro' },
    { min: 5000, name: 'Mestre' },
    { min: 8000, name: 'Sabio' },
    { min:12000, name: 'Lenda' }
];
const XP_BY_DIFF = { 1: 10, 2: 20, 3: 30 };
const DAILY_QUESTIONS = 6;
const PRACTICE_QUESTIONS = 6;

// Badges definition
const BADGES = [
    { id:'first',        icon:'\u{1F331}',  name:'Primeiros Passos',   desc:'1 resposta certa',        check:(s)=> totalCorrect(s) >= 1 },
    { id:'daily_first',  icon:'\u26A1',     name:'Primeiro Desafio',   desc:'1 desafio diario feito',  check:(s)=> s.totalDailies >= 1 },
    { id:'streak3',      icon:'\u{1F525}',  name:'Em Chamas',          desc:'3 dias seguidos',         check:(s)=> s.streak.days >= 3 },
    { id:'streak7',      icon:'\u{1F3C6}',  name:'Semana Perfeita',    desc:'7 dias seguidos',         check:(s)=> s.streak.days >= 7 },
    { id:'correct50',    icon:'\u{1F3AF}',  name:'Bom de Mira',         desc:'50 respostas certas',    check:(s)=> totalCorrect(s) >= 50 },
    { id:'correct200',   icon:'\u{1F31F}',  name:'Super Estrela',       desc:'200 respostas certas',   check:(s)=> totalCorrect(s) >= 200 },
    { id:'xp1000',       icon:'\u26A1',     name:'1000 XP',             desc:'1000 XP acumulado',      check:(s)=> s.xp >= 1000 },
    { id:'xp5000',       icon:'\u{1F4AB}',  name:'5000 XP',             desc:'5000 XP acumulado',      check:(s)=> s.xp >= 5000 },
    { id:'allsubjects',  icon:'\u{1F393}',  name:'Versatil',            desc:'1+ em todas as disciplinas', check:(s)=> Object.keys(SUBJECTS).every(k => (s.subjects[k]?.correct||0) >= 1) },
    { id:'perfect',      icon:'\u{1F4AF}',  name:'Perfeitinho',         desc:'Desafio diario 6/6',     check:(s)=> s.perfectDailies >= 1 },
    { id:'subject_5_por',icon:'\u{1F4D6}',  name:'Letrado',             desc:'20 certas em Portugues', check:(s)=> (s.subjects.portugues?.correct||0) >= 20 },
    { id:'subject_5_mat',icon:'\u{1F9EE}',  name:'Calculista',          desc:'20 certas em Matematica',check:(s)=> (s.subjects.matematica?.correct||0) >= 20 }
];

// ========== STATE ==========
let state = loadState();
let currentSession = null; // { items, idx, correct, wrong, xp, streak, isDaily, subject }
let selectedAnswer = null;
let matchSelection = { left: null };

function defaultState() {
    const subs = {};
    Object.keys(SUBJECTS).forEach(k => { subs[k] = { answered: 0, correct: 0, xp: 0 }; });
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
        recentIds: []
    };
}
function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return defaultState();
        const parsed = JSON.parse(raw);
        const base = defaultState();
        return { ...base, ...parsed, profile: { ...base.profile, ...(parsed.profile||{}) }, subjects: { ...base.subjects, ...(parsed.subjects||{}) }, streak: { ...base.streak, ...(parsed.streak||{}) }, daily: { ...base.daily, ...(parsed.daily||{}) } };
    } catch(e) {
        console.error('loadState', e);
        return defaultState();
    }
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

function totalCorrect(s) { return Object.values(s.subjects).reduce((a,b)=>a+(b.correct||0),0); }
function totalAnswered(s) { return Object.values(s.subjects).reduce((a,b)=>a+(b.answered||0),0); }

// ========== LEVELS ==========
function levelInfo(xp) {
    let idx = 0;
    for (let i = LEVELS.length - 1; i >= 0; i--) { if (xp >= LEVELS[i].min) { idx = i; break; } }
    const current = LEVELS[idx];
    const next = LEVELS[idx+1];
    const base = current.min;
    const nextMin = next ? next.min : base + 5000;
    const into = xp - base;
    const span = nextMin - base;
    return { idx, name: current.name, number: idx+1, into, span, next: next?.name || null };
}

// ========== UI: HEADER & HOME ==========
function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function daysBetween(a, b) {
    if (!a || !b) return 999;
    return Math.round((new Date(b) - new Date(a)) / 86400000);
}

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

function renderHome() {
    document.getElementById('mini-streak').textContent = state.streak.days;
    document.getElementById('mini-xp').textContent = state.xp;
    document.getElementById('mini-correct').textContent = totalCorrect(state);
    document.getElementById('mini-badges').textContent = state.badges.length;
    // Daily status
    const dailyDone = state.daily.date === todayStr() && state.daily.completed;
    const lbl = document.getElementById('daily-status');
    const btnLbl = document.getElementById('btn-start-daily-label');
    if (dailyDone) {
        lbl.textContent = `Concluido hoje (${state.daily.correct}/${DAILY_QUESTIONS})`;
        btnLbl.textContent = 'Repetir desafio';
    } else {
        lbl.textContent = `${DAILY_QUESTIONS} perguntas das tuas disciplinas`;
        btnLbl.textContent = 'Comecar desafio';
    }
    // Quick subjects (3 random)
    const container = document.getElementById('quick-subjects');
    container.innerHTML = Object.entries(SUBJECTS).map(([key, sub]) => `
        <div class="quick-subject" onclick="startSubjectSession('${key}')">
            <i class="fas ${sub.icon}" style="color:${sub.color}"></i>
            <div class="qs-name">${sub.name}</div>
        </div>
    `).join('');
}

// ========== SUBJECTS TAB ==========
function renderSubjects() {
    const grid = document.getElementById('subjects-grid');
    grid.innerHTML = Object.entries(SUBJECTS).map(([key, sub]) => {
        const stats = state.subjects[key] || { answered: 0, correct: 0, xp: 0 };
        const pct = stats.answered > 0 ? Math.round(stats.correct / stats.answered * 100) : 0;
        const totalEx = EXERCISES.filter(e => e.s === key).length;
        return `
            <div class="subject-card" onclick="startSubjectSession('${key}')">
                <div class="subject-card-icon" style="background:${sub.color}"><i class="fas ${sub.icon}"></i></div>
                <h3>${sub.name}</h3>
                <div class="subject-card-meta">${stats.correct}/${stats.answered} certas &middot; ${totalEx} exercicios</div>
                <div class="subject-card-bar"><div class="subject-card-bar-fill" style="width:${pct}%;background:${sub.color}"></div></div>
            </div>
        `;
    }).join('');
}

// ========== PROGRESS TAB ==========
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
                    <div class="progress-row-meta">${stats.correct}/${stats.answered} &middot; ${stats.xp} XP</div>
                </div>
                <div class="progress-bar"><div class="progress-bar-fill" style="width:${pct}%;background:${sub.color}"></div></div>
            </div>
        `;
    }).join('');

    // Badges
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

// ========== PROFILE TAB ==========
function renderProfile() {
    document.getElementById('input-name').value = state.profile.name;
    const grid = document.getElementById('avatar-grid');
    grid.innerHTML = AVATARS.map(a => `
        <div class="avatar-option ${a === state.profile.avatar ? 'selected' : ''}" onclick="selectAvatar('${a}')">${a}</div>
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
function resetStats() {
    if (!confirm('Tens a certeza? Vais perder XP, streak e historial.')) return;
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
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

// ========== SESSION ==========
function pickExercises(pool, n) {
    // Avoid recent IDs if possible
    const recent = new Set(state.recentIds || []);
    const fresh = pool.filter(e => !recent.has(e.id));
    const usable = fresh.length >= n ? fresh : pool;
    const shuffled = [...usable].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
}

function startDailyChallenge() {
    // 1 per subject; order shuffled
    const items = [];
    Object.keys(SUBJECTS).forEach(key => {
        const pool = EXERCISES.filter(e => e.s === key);
        if (pool.length === 0) return;
        items.push(pool[Math.floor(Math.random() * pool.length)]);
    });
    const shuffled = items.sort(() => Math.random() - 0.5).slice(0, DAILY_QUESTIONS);
    currentSession = { items: shuffled, idx: 0, correct: 0, wrong: 0, xp: 0, streak: 0, isDaily: true };
    openExerciseScreen();
    renderQuestion();
}

function startSubjectSession(key) {
    const pool = EXERCISES.filter(e => e.s === key);
    if (pool.length === 0) { showToast('Sem exercicios.'); return; }
    const items = pickExercises(pool, Math.min(PRACTICE_QUESTIONS, pool.length));
    currentSession = { items, idx: 0, correct: 0, wrong: 0, xp: 0, streak: 0, isDaily: false, subject: key };
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
    // Progress dots
    const dots = s.items.map((_, i) => {
        let cls = '';
        if (i < s.idx) cls = (s.results && s.results[i]) ? 'done' : 'wrong';
        else if (i === s.idx) cls = 'current';
        return `<div class="progress-dot ${cls}"></div>`;
    }).join('');
    document.getElementById('progress-dots').innerHTML = dots;
    document.getElementById('session-xp').textContent = s.xp;
    // Subject tag
    const sub = SUBJECTS[e.s];
    const tag = document.getElementById('ex-subject-tag');
    tag.textContent = sub.name;
    tag.style.background = sub.color;
    document.getElementById('ex-topic').textContent = e.t;
    document.getElementById('ex-question').textContent = e.q;
    // Feedback hidden
    document.getElementById('ex-feedback').style.display = 'none';
    // Render answer area by type
    selectedAnswer = null;
    matchSelection = { left: null };
    const area = document.getElementById('ex-answer-area');
    if (e.type === 'mc') area.innerHTML = renderMC(e);
    else if (e.type === 'tf') area.innerHTML = renderTF(e);
    else if (e.type === 'fill') area.innerHTML = renderFill(e);
    else if (e.type === 'order') area.innerHTML = renderOrder(e);
    else if (e.type === 'match') area.innerHTML = renderMatch(e);
    // Auto-focus fill
    if (e.type === 'fill') setTimeout(() => document.getElementById('fill-input')?.focus(), 80);
}

// ----- MC -----
function renderMC(e) {
    return `
        ${e.opts.map((o, i) => `
            <button class="btn-option" id="opt-${i}" onclick="selectMC(${i})">
                <span class="opt-letter">${String.fromCharCode(65+i)}</span>
                <span>${o}</span>
            </button>
        `).join('')}
        <button class="btn btn-primary-solid btn-block" onclick="submitAnswer()" id="btn-submit">Responder</button>
    `;
}
function selectMC(i) {
    selectedAnswer = i;
    document.querySelectorAll('#ex-answer-area .btn-option').forEach((el, idx) => el.classList.toggle('selected', idx === i));
}

// ----- TF -----
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

// ----- FILL -----
function renderFill(e) {
    return `
        <input type="text" class="fill-input" id="fill-input" placeholder="Escreve a tua resposta" autocomplete="off" autocorrect="off" autocapitalize="off">
        <button class="btn btn-primary-solid btn-block" onclick="submitAnswer()">Responder</button>
    `;
}
function normalize(s) {
    return String(s).trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
        .replace(/\s+/g, ' ');
}

// ----- ORDER -----
let orderState = [];
function renderOrder(e) {
    orderState = [...e.items].sort(() => Math.random() - 0.5);
    return `
        <ul class="order-list" id="order-list"></ul>
        <button class="btn btn-primary-solid btn-block" onclick="submitAnswer()">Responder</button>
    ` + `<script>window.__redrawOrder=true;<\/script>`;
}
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

// ----- MATCH -----
let matchState = { leftItems: [], rightItems: [], matched: {} };
function renderMatch(e) {
    const left = e.pairs.map(p => p[0]);
    const right = [...e.pairs.map(p => p[1])].sort(() => Math.random() - 0.5);
    matchState = { leftItems: left, rightItems: right, pairs: e.pairs, matched: {} };
    return `
        <div class="match-area" id="match-area"></div>
        <button class="btn btn-primary-solid btn-block" onclick="submitAnswer()">Responder</button>
    `;
}
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
    // Already matched on right?
    if (Object.values(matchState.matched).includes(j)) return;
    matchState.matched[matchSelection.left] = j;
    matchSelection.left = null;
    redrawMatch();
}

// ========== SUBMIT ==========
function submitAnswer() {
    const e = currentSession.items[currentSession.idx];
    let isCorrect = false;
    let userAnsLabel = '';
    if (e.type === 'mc') {
        if (selectedAnswer === null) { showToast('Escolhe uma opcao'); return; }
        isCorrect = selectedAnswer === e.ans;
        userAnsLabel = e.opts[selectedAnswer];
        // Highlight
        document.querySelectorAll('#ex-answer-area .btn-option').forEach((el, idx) => {
            el.disabled = true;
            if (idx === e.ans) el.classList.add('correct');
            else if (idx === selectedAnswer) el.classList.add('wrong');
        });
    } else if (e.type === 'tf') {
        if (selectedAnswer === null) { showToast('Escolhe Verdadeiro ou Falso'); return; }
        isCorrect = selectedAnswer === e.ans;
    } else if (e.type === 'fill') {
        const val = document.getElementById('fill-input').value;
        if (!val.trim()) { showToast('Escreve uma resposta'); return; }
        const n = normalize(val);
        isCorrect = (e.ans || []).some(a => normalize(a) === n);
        userAnsLabel = val;
    } else if (e.type === 'order') {
        isCorrect = orderState.every((it, i) => it === e.items[i]);
    } else if (e.type === 'match') {
        const allMatched = Object.keys(matchState.matched).length === matchState.leftItems.length;
        if (!allMatched) { showToast('Completa todas as associacoes'); return; }
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
    // XP
    let gained = 0;
    if (isCorrect) {
        gained = XP_BY_DIFF[e.diff] || 10;
        s.streak += 1;
        if (s.streak >= 3) gained += 5; // streak bonus
        s.correct++;
    } else {
        s.streak = 0;
        s.wrong++;
    }
    s.xp += gained;
    // Persist subject stats
    const sub = state.subjects[e.s] || { answered: 0, correct: 0, xp: 0 };
    sub.answered += 1;
    if (isCorrect) { sub.correct += 1; sub.xp += gained; }
    state.subjects[e.s] = sub;
    state.xp += gained;
    state.history.push({ id: e.id, s: e.s, c: isCorrect, d: todayStr() });
    if (state.history.length > 500) state.history.shift();
    // Recent IDs (last 30)
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
    txt.textContent = isCorrect ? 'Certo!' : 'Ainda nao';
    txt.className = 'feedback-text ' + (isCorrect ? 'feedback-correct' : 'feedback-wrong');
    // Explanation + correct answer if wrong
    let exp = e.exp || '';
    if (!isCorrect) {
        if (e.type === 'mc') exp = `Resposta certa: ${e.opts[e.ans]}. ` + exp;
        else if (e.type === 'tf') exp = `Resposta certa: ${e.ans ? 'Verdadeiro' : 'Falso'}. ` + exp;
        else if (e.type === 'fill') exp = `Resposta certa: ${e.ans[0]}. ` + exp;
        else if (e.type === 'order') exp = `Ordem certa: ${e.items.join(' > ')}. ` + exp;
    }
    document.getElementById('feedback-exp').textContent = exp;
    const nextLbl = (currentSession.idx + 1 >= currentSession.items.length) ? 'Ver resultado' : 'Continuar';
    document.getElementById('feedback-next').textContent = nextLbl;
    document.getElementById('session-xp').textContent = currentSession.xp;
}

function nextQuestion() {
    currentSession.idx += 1;
    if (currentSession.idx >= currentSession.items.length) {
        finishSession();
    } else {
        renderQuestion();
    }
}

function finishSession() {
    const s = currentSession;
    // Daily streak update
    let newBadges = [];
    if (s.isDaily) {
        const today = todayStr();
        const lastDate = state.streak.lastDate;
        if (lastDate !== today) {
            const gap = daysBetween(lastDate, today);
            if (gap === 1) state.streak.days += 1;
            else if (gap > 1 || !lastDate) state.streak.days = 1;
            state.streak.lastDate = today;
            if (state.streak.days > state.streak.best) state.streak.best = state.streak.days;
        }
        state.daily = { date: today, completed: true, correct: s.correct };
        state.totalDailies = (state.totalDailies || 0) + 1;
        if (s.correct === s.items.length) state.perfectDailies = (state.perfectDailies || 0) + 1;
    }
    // Badge check
    BADGES.forEach(b => {
        if (!state.badges.includes(b.id) && b.check(state)) {
            state.badges.push(b.id);
            newBadges.push(b);
        }
    });
    saveState();
    // Summary
    showSummary(s, newBadges);
}

function showSummary(s, newBadges) {
    document.getElementById('exercise-screen').style.display = 'none';
    document.getElementById('summary-screen').style.display = 'flex';
    const total = s.items.length;
    const acc = total ? Math.round(s.correct / total * 100) : 0;
    let title = 'Bom trabalho!';
    let emoji = '\u{1F389}';
    if (acc === 100) { title = 'Perfeito!'; emoji = '\u{1F3C6}'; }
    else if (acc >= 80) { title = 'Excelente!'; emoji = '\u{1F31F}'; }
    else if (acc >= 50) { title = 'Quase la!'; emoji = '\u{1F4AA}'; }
    else { title = 'Treina mais!'; emoji = '\u{1F331}'; }
    document.getElementById('summary-emoji').textContent = emoji;
    document.getElementById('summary-title').textContent = title;
    document.getElementById('summary-sub').textContent = s.isDaily ? 'Desafio diario concluido' : 'Sessao de treino concluida';
    document.getElementById('sum-correct').textContent = `${s.correct}/${total}`;
    document.getElementById('sum-xp').textContent = '+' + s.xp;
    document.getElementById('sum-accuracy').textContent = acc + '%';
    const bdg = document.getElementById('summary-badges');
    bdg.innerHTML = newBadges.length
        ? newBadges.map(b => `<div class="summary-badge-chip">${b.icon} ${b.name}</div>`).join('')
        : '';
}
function closeSummary() {
    document.getElementById('summary-screen').style.display = 'none';
    currentSession = null;
    updateAll();
    switchTab('home');
}

// ========== BOOT ==========
function updateAll() {
    updateHeader();
    renderHome();
    renderSubjects();
    renderProgress();
    renderProfile();
}

// Lightweight re-draw hooks for dynamic content (order/match)
document.addEventListener('click', (ev) => {
    if (window.__redrawOrder && document.getElementById('order-list')) { redrawOrder(); window.__redrawOrder = false; }
    if (document.getElementById('match-area') && document.getElementById('match-area').children.length === 0) redrawMatch();
});

// First paint
window.addEventListener('DOMContentLoaded', () => {
    updateAll();
    // Observer to draw order/match when injected
    const obs = new MutationObserver(() => {
        if (document.getElementById('order-list') && document.getElementById('order-list').children.length === 0) redrawOrder();
        const m = document.getElementById('match-area');
        if (m && m.children.length === 0) redrawMatch();
    });
    obs.observe(document.getElementById('ex-answer-area') || document.body, { childList: true, subtree: true });
});

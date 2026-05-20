// EscolaPlay — Modo Escape Room
// Overlay isolado. Funciona para anos 2, 5, 6.
// Salas = 1 por disciplina do ano ativo. Perguntas pescadas do banco
// existente (só tipo 'mc'). Não toca em mais nada da app.

(function () {
    'use strict';

    const ESC = {
        // Durações em segundos -> número de perguntas por sala
        DURATIONS: {
            15: { time: 15 * 60, qPerRoom: 2, label: '15 min', sub: 'Rápido · 2 por sala' },
            30: { time: 30 * 60, qPerRoom: 3, label: '30 min', sub: 'Médio · 3 por sala' },
            50: { time: 50 * 60, qPerRoom: 4, label: '50 min', sub: 'Completo · 4 por sala' }
        },
        // Anos suportados
        ALLOWED_YEARS: [2, 5, 6],
        // Tema de cena por disciplina (mapeia para cor + ícone gigante)
        SCENE: {
            portugues:    { icon: 'fa-feather-pointed', tagline: 'Sala das Palavras' },
            matematica:   { icon: 'fa-square-root-variable', tagline: 'Câmara dos Números' },
            ingles:       { icon: 'fa-globe', tagline: 'Globe Room' },
            estudo_meio:  { icon: 'fa-tree', tagline: 'Câmara da Natureza' },
            ciencias:     { icon: 'fa-flask', tagline: 'Laboratório das Ciências' },
            hgp:          { icon: 'fa-landmark', tagline: 'Sala da História' },
            // Packs secretos (caso ativos no perfil)
            mat_plus:     { icon: 'fa-shapes', tagline: 'Câmara dos Padrões' },
            som_plus:     { icon: 'fa-volume-high', tagline: 'Sala dos Sons' }
        }
    };

    // ========== Estado interno (limpo a cada partida) ==========
    let game = null;

    function _now() { return Date.now(); }
    function _normEsc(s) { return String(s || '').toLowerCase(); }
    function _shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }
    function _esc(s) {
        return String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
    }

    // Renderiza markdown leve (**bold** e *italic*) com escape prévio
    function _renderMd(s) {
        return _esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                       .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
    }

    // ========== Verifica disponibilidade ==========
    function _activeYear() {
        try {
            const p = (typeof activeProfile === 'function') ? activeProfile() : null;
            return p?.year || window.activeYear || null;
        } catch { return null; }
    }
    function isAvailable() {
        const year = _activeYear();
        return ESC.ALLOWED_YEARS.includes(year);
    }

    // ========== Recolhe disciplinas + exercícios do ano ativo ==========
    function _yearSubjects(year) {
        const subs = (window.SUBJECTS_BY_YEAR && window.SUBJECTS_BY_YEAR[year]) || {};
        return Object.keys(subs).map(key => ({
            key,
            name: subs[key].name,
            color: subs[key].color,
            icon: subs[key].icon,
            scene: ESC.SCENE[key] || { icon: subs[key].icon, tagline: 'Sala enigma' }
        }));
    }
    function _exercisesForSubject(year, subjectKey, difficulty) {
        const pool = (window.EXERCISES_BY_YEAR && window.EXERCISES_BY_YEAR[year]) || [];
        const filtered = pool.filter(e => {
            if (e.s !== subjectKey) return false;
            if (e.type !== 'mc') return false; // só MC no v310
            if (!Array.isArray(e.opts) || e.opts.length < 2) return false;
            if (typeof e.ans !== 'number') return false;
            // Filtro de dificuldade: tolerante. Se ex não tem diff, considera 2.
            const d = (e.diff === 1 || e.diff === 2 || e.diff === 3) ? e.diff : 2;
            // Aceita dificuldade exata OU adjacente (1 abaixo) para encher o banco
            return d <= difficulty + 1 && d >= Math.max(1, difficulty - 1);
        });
        return filtered;
    }

    // ========== Construir partida ==========
    function _buildGame(duration, difficulty) {
        const year = _activeYear();
        const subs = _yearSubjects(year);
        const cfg = ESC.DURATIONS[duration];
        const qPerRoom = cfg.qPerRoom;
        const rooms = [];
        for (const sub of subs) {
            const allEx = _exercisesForSubject(year, sub.key, difficulty);
            if (allEx.length < 1) continue; // disciplina sem exercícios → skip
            // Baralhar e pegar qPerRoom (se houver poucos, pega todos)
            const questions = _shuffle(allEx).slice(0, qPerRoom);
            // Baralhar opções dentro de cada pergunta para evitar sempre ans=0
            const shuffledQs = questions.map(e => _shuffleMCOpts(e));
            rooms.push({
                subject: sub.key,
                name: sub.name,
                color: sub.color,
                icon: sub.icon,
                sceneIcon: sub.scene.icon,
                tagline: sub.scene.tagline,
                questions: shuffledQs,
                currentQ: 0,
                roomScore: 0,
                roomCorrect: 0,
                roomFirstTry: 0,
                hintShown: false,
                wrongTries: 0,
                hintUsed: false,
                selectedIdx: null
            });
        }
        if (rooms.length === 0) return null;
        const totalQ = rooms.reduce((s, r) => s + r.questions.length, 0);
        return {
            year, duration, difficulty,
            rooms, currentRoom: 0,
            timeLeft: cfg.time, timeTotal: cfg.time,
            score: 0, totalAnswered: 0, correctAnswers: 0,
            firstTryCorrect: 0, hintsUsed: 0,
            totalQ, startedAt: _now(),
            timerInterval: null,
            ended: false
        };
    }
    function _shuffleMCOpts(e) {
        // Faz uma cópia para não mutar o original. Baralha opções e atualiza ans.
        const idx = e.opts.map((_, i) => i);
        for (let i = idx.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [idx[i], idx[j]] = [idx[j], idx[i]];
        }
        return Object.assign({}, e, {
            opts: idx.map(i => e.opts[i]),
            ans: idx.indexOf(e.ans)
        });
    }

    // ========== Selecção (start screen) ==========
    let _sel = { duration: 30, difficulty: 2 };
    function showSelection() {
        if (!isAvailable()) {
            const yr = _activeYear();
            if (typeof showToast === 'function') {
                showToast(yr ? `Escape Room disponível para anos 2, 5 e 6 (perfil ${yr}.º)` : 'Cria um perfil primeiro');
            }
            return;
        }
        const year = _activeYear();
        const subs = _yearSubjects(year);
        const subsWithEx = subs.filter(s => _exercisesForSubject(year, s.key, _sel.difficulty).length > 0);
        if (subsWithEx.length === 0) {
            if (typeof showToast === 'function') showToast('Sem exercícios suficientes para escape room');
            return;
        }
        _renderOverlayShell();
        _renderStart(subsWithEx);
    }
    window.openEscapeRoom = showSelection;

    function _renderOverlayShell() {
        document.getElementById('escape-overlay')?.remove();
        const o = document.createElement('div');
        o.id = 'escape-overlay';
        o.innerHTML = `
            <div class="esc-bg"></div>
            <div class="esc-particles" id="esc-particles"></div>
            <div id="esc-content"></div>
        `;
        document.body.appendChild(o);
        _spawnParticles();
        document.body.style.overflow = 'hidden';
    }

    function _spawnParticles() {
        const pc = document.getElementById('esc-particles');
        if (!pc) return;
        const colors = ['#22d3ee', '#ec4899', '#a78bfa', '#a3e635', '#fbbf24'];
        for (let i = 0; i < 30; i++) {
            const p = document.createElement('div');
            p.className = 'esc-particle';
            const s = Math.random() * 7 + 3;
            p.style.width = p.style.height = s + 'px';
            p.style.background = colors[i % colors.length];
            p.style.left = Math.random() * 100 + '%';
            p.style.animationDuration = (Math.random() * 15 + 10) + 's';
            p.style.animationDelay = (Math.random() * 10) + 's';
            pc.appendChild(p);
        }
    }

    function _renderStart(subs) {
        const content = document.getElementById('esc-content');
        if (!content) return;
        const year = _activeYear();
        const yearLabel = ({2: '2.º ano', 5: '5.º ano', 6: '6.º ano'})[year] || (year + '.º');
        const durationsHtml = Object.keys(ESC.DURATIONS).map(d => {
            const cfg = ESC.DURATIONS[d];
            const active = String(_sel.duration) === d ? ' active' : '';
            return `<button class="esc-opt${active}" data-dur="${d}">${cfg.label}<span class="esc-opt-sub">${cfg.sub}</span></button>`;
        }).join('');
        const diffHtml = [1,2,3].map(d => {
            const labels = { 1: 'Fácil', 2: 'Médio', 3: 'Difícil' };
            const active = _sel.difficulty === d ? ' active' : '';
            return `<button class="esc-opt${active}" data-diff="${d}">${labels[d]}<span class="esc-opt-sub">${'★'.repeat(d)}</span></button>`;
        }).join('');
        const roomChips = subs.map(s => `<span class="esc-room-chip" style="--ch-color:${s.color}">${_esc(s.name)}</span>`).join('');

        content.innerHTML = `
            <div class="esc-start">
                <button class="esc-btn-close" id="esc-close-start" aria-label="Fechar">×</button>
                <div class="esc-tagline">${yearLabel} · Escape Room</div>
                <div class="esc-title">ESCAPA!</div>
                <p class="esc-subtitle">Estás trancado(a) numa série de salas, uma por cada disciplina. Responde corretamente para destrancar a porta e escapar antes do tempo acabar.</p>
                <div class="esc-card">
                    <h3>⏱ Duração</h3>
                    <div class="esc-opts" id="esc-dur-opts">${durationsHtml}</div>
                </div>
                <div class="esc-card">
                    <h3>🎯 Dificuldade</h3>
                    <div class="esc-opts" id="esc-diff-opts">${diffHtml}</div>
                </div>
                <div class="esc-card">
                    <h3>🚪 ${subs.length} ${subs.length === 1 ? 'sala' : 'salas'}</h3>
                    <div class="esc-rooms-preview">${roomChips}</div>
                </div>
                <button class="esc-btn-start" id="esc-btn-go">▶ Entrar</button>
                <div class="esc-warning">+100 pts à 1.ª · −15 pista · −20 erro. Acabar a tempo desbloqueia bónus.</div>
            </div>
        `;
        // Bind selection
        content.querySelectorAll('#esc-dur-opts .esc-opt').forEach(b => {
            b.addEventListener('click', () => {
                _sel.duration = parseInt(b.dataset.dur, 10);
                content.querySelectorAll('#esc-dur-opts .esc-opt').forEach(x => x.classList.toggle('active', x === b));
            });
        });
        content.querySelectorAll('#esc-diff-opts .esc-opt').forEach(b => {
            b.addEventListener('click', () => {
                _sel.difficulty = parseInt(b.dataset.diff, 10);
                content.querySelectorAll('#esc-diff-opts .esc-opt').forEach(x => x.classList.toggle('active', x === b));
                // Re-renderiza para atualizar lista de salas com a nova dificuldade
                const newSubs = _yearSubjects(_activeYear()).filter(s => _exercisesForSubject(_activeYear(), s.key, _sel.difficulty).length > 0);
                if (newSubs.length > 0) _renderStart(newSubs);
            });
        });
        document.getElementById('esc-btn-go').addEventListener('click', () => _startGame());
        document.getElementById('esc-close-start').addEventListener('click', () => _closeOverlay());
    }

    function _closeOverlay() {
        document.getElementById('escape-overlay')?.remove();
        document.body.style.overflow = '';
        if (game?.timerInterval) clearInterval(game.timerInterval);
        game = null;
    }
    window.closeEscapeRoom = _closeOverlay;

    // ========== Iniciar partida ==========
    function _startGame() {
        game = _buildGame(_sel.duration, _sel.difficulty);
        if (!game) {
            if (typeof showToast === 'function') showToast('Sem exercícios suficientes');
            return;
        }
        _renderHUD();
        _renderRoom();
        _startTimer();
    }

    function _renderHUD() {
        const content = document.getElementById('esc-content');
        const dotsHtml = game.rooms.map((_, i) => `<span class="esc-dot${i === 0 ? ' active' : ''}"></span>`).join('');
        content.innerHTML = `
            <div class="esc-hud">
                <div class="esc-hud-left">
                    <div class="esc-badge"><i class="fas fa-clock"></i> <span id="esc-timer" class="esc-timer">${_fmtTime(game.timeLeft)}</span></div>
                    <div class="esc-badge"><i class="fas fa-star"></i> <span id="esc-score" class="esc-score">0</span> pts</div>
                    <div class="esc-badge"><i class="fas fa-list-check"></i> <span id="esc-progress" class="esc-progress">0 / ${game.totalQ}</span></div>
                </div>
                <div class="esc-hud-right">
                    <div class="esc-dots" id="esc-dots">${dotsHtml}</div>
                    <button class="esc-btn-exit" id="esc-btn-exit"><i class="fas fa-door-open"></i> Sair</button>
                </div>
            </div>
            <div class="esc-stage" id="esc-stage"></div>
        `;
        document.getElementById('esc-btn-exit').addEventListener('click', () => {
            if (confirm('Sair do escape room? Perdes o progresso desta partida.')) _closeOverlay();
        });
    }

    function _fmtTime(s) {
        const m = Math.floor(s / 60);
        const ss = s % 60;
        return `${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
    }

    function _startTimer() {
        if (game.timerInterval) clearInterval(game.timerInterval);
        game.timerInterval = setInterval(() => {
            if (!game || game.ended) return;
            game.timeLeft--;
            const tEl = document.getElementById('esc-timer');
            if (tEl) {
                tEl.textContent = _fmtTime(game.timeLeft);
                if (game.timeLeft <= 60) tEl.classList.add('warn');
            }
            if (game.timeLeft <= 0) {
                clearInterval(game.timerInterval);
                _endGame(false);
            }
        }, 1000);
    }

    // ========== Renderizar sala atual ==========
    function _renderRoom() {
        const stage = document.getElementById('esc-stage');
        if (!stage) return;
        const room = game.rooms[game.currentRoom];
        if (!room) { _endGame(true); return; }
        const q = room.questions[room.currentQ];
        if (!q) { _advanceRoom(); return; }

        const optsHtml = q.opts.map((opt, i) => `
            <button class="esc-ans" data-idx="${i}">
                <span class="esc-ans-key">${String.fromCharCode(65 + i)}</span>${_esc(opt)}
            </button>
        `).join('');

        const ctx = q.exp ? `<div class="esc-q-context">${_renderMd(q.exp).slice(0, 240)}</div>` : '';

        stage.innerHTML = `
            <div class="esc-room" style="--room-color:${room.color}">
                <div class="esc-room-head">
                    <span class="esc-room-icon"><i class="fas ${room.icon}"></i></span>
                    <div>
                        <div class="esc-room-title">Sala ${game.currentRoom + 1} · ${_esc(room.name)}</div>
                        <div class="esc-room-sub">${_esc(room.tagline)} · ${_esc(q.t || '')}</div>
                    </div>
                    <div class="esc-q-counter">${room.currentQ + 1}/${room.questions.length}</div>
                </div>
                <div class="esc-scene">
                    <span class="esc-scene-orbit"></span>
                    <i class="esc-scene-icon fas ${room.sceneIcon}"></i>
                </div>
                <div class="esc-question">
                    ${_renderMd(q.q)}
                </div>
                <div class="esc-answers" id="esc-answers">
                    ${optsHtml}
                </div>
                <div class="esc-feedback" id="esc-feedback"></div>
                <div class="esc-hint" id="esc-hint"></div>
                <div class="esc-room-foot">
                    <button class="esc-btn ghost" id="esc-hint-btn"><i class="fas fa-lightbulb"></i> Pista (−15 pts)</button>
                    <button class="esc-btn next" id="esc-next-btn" disabled>${_nextLabel()} →</button>
                </div>
            </div>
        `;
        document.getElementById('esc-stage').scrollTop = 0;
        document.querySelectorAll('#esc-answers .esc-ans').forEach(btn => {
            btn.addEventListener('click', () => _handleAnswer(parseInt(btn.dataset.idx, 10)));
        });
        document.getElementById('esc-hint-btn').addEventListener('click', () => _useHint());
        document.getElementById('esc-next-btn').addEventListener('click', () => _next());

        // Reset transient room state
        room.wrongTries = 0;
        room.hintUsed = false;
        room.selectedIdx = null;
    }

    function _nextLabel() {
        const room = game.rooms[game.currentRoom];
        const isLastQinRoom = room.currentQ + 1 >= room.questions.length;
        const isLastRoom = game.currentRoom + 1 >= game.rooms.length;
        if (isLastQinRoom && isLastRoom) return '🔓 Escapar';
        if (isLastQinRoom) return 'Próxima sala';
        return 'Próxima';
    }

    function _handleAnswer(idx) {
        const room = game.rooms[game.currentRoom];
        const q = room.questions[room.currentQ];
        const ansEls = document.querySelectorAll('#esc-answers .esc-ans');
        const correct = q.ans;
        const fb = document.getElementById('esc-feedback');
        const nextBtn = document.getElementById('esc-next-btn');
        const isLocked = ansEls[0]?.classList.contains('locked-all');

        if (room.selectedIdx !== null && room.selectedIdx === correct) return; // já acertou
        if (idx === correct) {
            ansEls[idx].classList.add('right');
            ansEls.forEach(b => b.classList.add('locked', 'locked-all'));
            room.selectedIdx = idx;
            let pts = 100;
            if (room.hintUsed) pts -= 30;
            pts -= room.wrongTries * 20;
            pts = Math.max(20, pts);
            if (!room.hintUsed && room.wrongTries === 0) {
                game.firstTryCorrect++;
                room.roomFirstTry++;
            }
            game.score += pts;
            game.correctAnswers++;
            game.totalAnswered++;
            room.roomScore += pts;
            room.roomCorrect++;
            fb.className = 'esc-feedback ok show';
            fb.innerHTML = `✅ <b>Correto!</b> +${pts} pts. Porta destrancada.`;
            nextBtn.disabled = false;
            _flash();
            _updateHUD();
        } else {
            ansEls[idx].classList.add('wrong', 'locked');
            room.wrongTries++;
            game.score = Math.max(0, game.score - 20);
            fb.className = 'esc-feedback err show';
            fb.innerHTML = `❌ Errou. −20 pts. Tenta outra opção ou usa a pista.`;
            _updateHUD();
        }
    }

    function _useHint() {
        const room = game.rooms[game.currentRoom];
        const q = room.questions[room.currentQ];
        if (room.hintUsed) return;
        room.hintUsed = true;
        game.hintsUsed++;
        game.score = Math.max(0, game.score - 15);
        const hint = document.getElementById('esc-hint');
        // Usa o exp do exercício como pista (já existe no banco)
        const text = q.exp || q.solution || 'Pensa na regra principal deste tópico.';
        hint.innerHTML = `💡 <strong>Pista:</strong> ${_renderMd(text)}`;
        hint.classList.add('show');
        _updateHUD();
    }

    function _next() {
        if (!game) return;
        const room = game.rooms[game.currentRoom];
        if (room.currentQ + 1 < room.questions.length) {
            room.currentQ++;
            _renderRoom();
            return;
        }
        _advanceRoom();
    }

    function _advanceRoom() {
        const dots = document.querySelectorAll('#esc-dots .esc-dot');
        dots[game.currentRoom]?.classList.remove('active');
        dots[game.currentRoom]?.classList.add('done');
        game.currentRoom++;
        if (game.currentRoom >= game.rooms.length) {
            _endGame(true);
            return;
        }
        dots[game.currentRoom]?.classList.add('active');
        _renderRoom();
    }

    function _updateHUD() {
        const sEl = document.getElementById('esc-score');
        if (sEl) sEl.textContent = game.score;
        const pEl = document.getElementById('esc-progress');
        if (pEl) pEl.textContent = `${game.totalAnswered} / ${game.totalQ}`;
    }

    function _flash() {
        // Pequena animação CSS já tratada pelas classes .right; nada a fazer aqui.
    }

    // ========== Fim do jogo ==========
    function _endGame(escaped) {
        if (!game || game.ended) return;
        game.ended = true;
        if (game.timerInterval) clearInterval(game.timerInterval);
        const elapsed = game.timeTotal - game.timeLeft;
        const acc = game.totalAnswered > 0 ? Math.round((game.correctAnswers / game.totalAnswered) * 100) : 0;
        let grade = '—';
        if (!escaped) grade = 'RIP';
        else if (game.score >= 1300) grade = '20';
        else if (game.score >= 1100) grade = '18';
        else if (game.score >= 900)  grade = '15';
        else if (game.score >= 700)  grade = '12';
        else if (game.score >= 500)  grade = '10';
        else grade = '&lt;10';

        // Persistir best score
        try { _saveBest(escaped, elapsed); } catch (e) { console.warn('[esc] save best', e); }

        let title, msg, cls = '';
        if (!escaped) {
            cls = 'fail';
            title = '⏱ TEMPO ESGOTADO';
            msg = `Ficaste preso(a) na Sala ${game.currentRoom + 1}. Não desistas — tenta outra vez!`;
        } else {
            if (game.score >= 1300) title = '🏆 ESCAPISTA LENDÁRIO';
            else if (game.score >= 1000) title = '🎓 MUITO BOM!';
            else if (game.score >= 700) title = '🎉 ESCAPASTE!';
            else title = '🚪 Saíste por pouco…';
            msg = `Resolveste ${game.correctAnswers}/${game.totalAnswered} enigmas. Pontuação: ${game.score} pts.`;
        }
        const breakdownHtml = game.rooms.map(r => {
            const ok = r.roomCorrect;
            const total = r.questions.length;
            const pct = total > 0 ? Math.round((ok / total) * 100) : 0;
            return `<div class="esc-breakdown-row">
                <span class="esc-breakdown-icon" style="background:${r.color}"><i class="fas ${r.icon}"></i></span>
                <span class="esc-breakdown-name">${_esc(r.name)}</span>
                <span style="color:var(--esc-muted);font-size:11px">${ok}/${total} · ${pct}%</span>
                <span class="esc-breakdown-score">+${r.roomScore}</span>
            </div>`;
        }).join('');

        const content = document.getElementById('esc-content');
        const endHtml = `
            <div class="esc-end ${cls}">
                <div class="esc-end-card">
                    <div class="esc-end-title">${title}</div>
                    <p class="esc-end-msg">${_esc(msg)}</p>
                    <div class="esc-stats">
                        <div class="esc-stat"><div class="esc-stat-val">${game.score}</div><div class="esc-stat-lbl">Pontuação</div></div>
                        <div class="esc-stat"><div class="esc-stat-val">${_fmtTime(elapsed)}</div><div class="esc-stat-lbl">Tempo</div></div>
                        <div class="esc-stat"><div class="esc-stat-val">${acc}%</div><div class="esc-stat-lbl">Acerto</div></div>
                        <div class="esc-stat"><div class="esc-stat-val">${grade}</div><div class="esc-stat-lbl">Nota</div></div>
                    </div>
                    <div class="esc-breakdown">${breakdownHtml}</div>
                    <div style="display:flex;gap:10px;justify-content:center;margin-top:18px;flex-wrap:wrap">
                        <button class="esc-btn ghost" id="esc-btn-again" style="padding:12px 22px">↻ Outra vez</button>
                        <button class="esc-btn next" id="esc-btn-quit" style="padding:12px 28px"><i class="fas fa-house"></i>&nbsp;&nbsp;Voltar</button>
                    </div>
                </div>
            </div>
        `;
        // Mantém o HUD, só adiciona o end overlay por cima
        const endWrap = document.createElement('div');
        endWrap.innerHTML = endHtml;
        document.getElementById('escape-overlay').appendChild(endWrap.firstElementChild);
        document.getElementById('esc-btn-again').addEventListener('click', () => {
            document.querySelector('#escape-overlay .esc-end')?.remove();
            _startGame();
        });
        document.getElementById('esc-btn-quit').addEventListener('click', () => _closeOverlay());
    }

    function _saveBest(escaped, elapsed) {
        if (typeof state === 'undefined' || !state) return;
        state.escapeBest = state.escapeBest || {};
        const year = game.year;
        const dur = game.duration;
        state.escapeBest[year] = state.escapeBest[year] || {};
        const prev = state.escapeBest[year][dur];
        const candidate = {
            score: game.score,
            accuracy: game.totalAnswered > 0 ? game.correctAnswers / game.totalAnswered : 0,
            time: elapsed,
            escaped,
            difficulty: game.difficulty,
            date: new Date().toISOString().slice(0,10)
        };
        if (!prev || candidate.score > prev.score) {
            state.escapeBest[year][dur] = candidate;
        }
        if (typeof saveState === 'function') saveState();
    }

    // Render do cartão na home — chamado por renderHome após render normal
    function renderHomeCard() {
        if (!isAvailable()) return;
        // Procura o container da home (#tab-home) e insere o cartão (idempotente)
        const tab = document.getElementById('tab-home');
        if (!tab) return;
        let card = document.getElementById('escape-home-card');
        if (!card) {
            card = document.createElement('div');
            card.id = 'escape-home-card';
            card.className = 'escape-home-card';
            card.innerHTML = `
                <div class="escape-home-icon"><i class="fas fa-door-open"></i></div>
                <div class="escape-home-text">
                    <div class="escape-home-title">🔓 Escape Room</div>
                    <div class="escape-home-sub">Salas das tuas disciplinas · timer · pontuação</div>
                </div>
                <div class="escape-home-arrow"><i class="fas fa-chevron-right"></i></div>
            `;
            card.addEventListener('click', () => showSelection());
            // Inserir depois do streak-hero se existir, senão no fim
            const streak = tab.querySelector('.streak-hero');
            if (streak && streak.parentNode === tab) streak.insertAdjacentElement('afterend', card);
            else tab.appendChild(card);
        }
        // Se houver best score, mostrá-lo
        const year = _activeYear();
        const best = state?.escapeBest?.[year];
        if (best) {
            const max = Object.values(best).reduce((m, v) => v.score > (m?.score || 0) ? v : m, null);
            if (max) {
                let footer = card.querySelector('.escape-home-best');
                if (!footer) {
                    footer = document.createElement('div');
                    footer.className = 'escape-home-best';
                    footer.style.cssText = 'font-size:0.72rem;opacity:0.8;margin-top:4px;font-weight:600';
                    card.querySelector('.escape-home-text').appendChild(footer);
                }
                footer.textContent = `🏆 Melhor: ${max.score} pts`;
            }
        }
    }
    window.renderEscapeHomeCard = renderHomeCard;

})();

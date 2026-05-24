// EscolaPlay — Mascote "Pip": SVG animado com GSAP.
// Personagem próprio (sem dependência de assets externos). Respira, pisca,
// salta de alegria, fica triste. Cada instância gere os seus próprios tweens.
(function () {
    'use strict';

    const SVG = `
<svg class="pip-svg" viewBox="0 0 100 122" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="pipBody" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fde68a"/><stop offset="1" stop-color="#f59e0b"/>
    </linearGradient>
    <linearGradient id="pipHat" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4ade80"/><stop offset="1" stop-color="#16a34a"/>
    </linearGradient>
  </defs>
  <ellipse cx="50" cy="115" rx="26" ry="5" fill="rgba(0,0,0,0.12)"/>
  <g class="pip-root">
    <ellipse class="pip-foot" cx="39" cy="106" rx="8" ry="6" fill="#ea9a0b"/>
    <ellipse class="pip-foot" cx="61" cy="106" rx="8" ry="6" fill="#ea9a0b"/>
    <g class="pip-arms">
      <ellipse class="pip-arm-l" cx="19" cy="76" rx="7" ry="11" fill="#fbbf24"/>
      <ellipse class="pip-arm-r" cx="81" cy="76" rx="7" ry="11" fill="#fbbf24"/>
    </g>
    <g class="pip-body">
      <rect x="22" y="44" width="56" height="62" rx="28" fill="url(#pipBody)"/>
    </g>
    <path class="pip-hat" d="M50 20 C39 20 29 28 32 42 C42 42 58 42 68 42 C71 28 61 20 50 20 Z" fill="url(#pipHat)"/>
    <circle cx="42" cy="32" r="3" fill="#bbf7d0"/>
    <circle cx="57" cy="30" r="2.4" fill="#bbf7d0"/>
    <g class="pip-eyes">
      <ellipse cx="40" cy="64" rx="10" ry="12" fill="#fff"/>
      <ellipse cx="60" cy="64" rx="10" ry="12" fill="#fff"/>
      <circle class="pip-pupil" cx="41" cy="66" r="4.6" fill="#1f2937"/>
      <circle class="pip-pupil" cx="59" cy="66" r="4.6" fill="#1f2937"/>
    </g>
    <ellipse cx="30" cy="78" rx="5" ry="3" fill="rgba(244,114,182,0.55)"/>
    <ellipse cx="70" cy="78" rx="5" ry="3" fill="rgba(244,114,182,0.55)"/>
    <path class="pip-mouth-smile" d="M43 82 Q50 89 57 82" stroke="#1f2937" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <path class="pip-mouth-frown" d="M43 87 Q50 80 57 87" stroke="#1f2937" stroke-width="2.6" fill="none" stroke-linecap="round" style="display:none"/>
    <ellipse class="pip-mouth-open" cx="50" cy="85" rx="5.5" ry="6.5" fill="#7f1d1d" style="display:none"/>
  </g>
</svg>`;

    function createMascot(container, opts) {
        opts = opts || {};
        // Modo avatar: usa a imagem do perfil (Disney/Stranger/...) animada.
        if (opts.avatarHtml) return createAvatarMascot(container, opts);
        const size = opts.size || 84;
        container.innerHTML = SVG;
        const root = container.querySelector('.pip-svg');
        if (!root) return null;
        root.style.width = size + 'px';
        root.style.height = (size * 1.22) + 'px';
        root.style.display = 'block';
        const q = (s) => root.querySelector(s);
        const pupils = root.querySelectorAll('.pip-pupil');
        const g = window.gsap;

        const mouths = {
            smile: q('.pip-mouth-smile'),
            frown: q('.pip-mouth-frown'),
            open:  q('.pip-mouth-open')
        };
        function setMouth(type) {
            for (const k in mouths) if (mouths[k]) mouths[k].style.display = (k === type) ? '' : 'none';
        }

        let idleTweens = [];
        function startIdle() {
            if (!g) return;
            idleTweens.push(g.to(q('.pip-body'), { scaleY: 1.05, transformOrigin: '50% 100%', duration: 1.5, yoyo: true, repeat: -1, ease: 'sine.inOut' }));
            idleTweens.push(g.to(q('.pip-root'), { rotation: 2.5, transformOrigin: '50% 100%', duration: 2.4, yoyo: true, repeat: -1, ease: 'sine.inOut' }));
            scheduleBlink();
        }
        function scheduleBlink() {
            if (!g) return;
            g.delayedCall(g.utils.random(2.4, 5.5), () => {
                if (!root.isConnected) return;
                g.to(pupils, { scaleY: 0.1, transformOrigin: '50% 50%', duration: 0.08, yoyo: true, repeat: 1, onComplete: scheduleBlink });
            });
        }

        function react(mood) {
            if (!g) { setMouth(mood === 'sad' ? 'frown' : 'smile'); return; }
            const r = q('.pip-root');
            if (mood === 'happy' || mood === 'cheer') {
                setMouth('open');
                const jump = mood === 'cheer' ? -26 : -14;
                g.fromTo(r, { y: 0 }, { y: jump, duration: 0.26, ease: 'power2.out', yoyo: true, repeat: 1, onComplete: () => setMouth('smile') });
                g.fromTo(r, { scale: 1 }, { scale: mood === 'cheer' ? 1.14 : 1.06, transformOrigin: '50% 100%', duration: 0.28, yoyo: true, repeat: 1 });
                g.fromTo(q('.pip-arm-l'), { rotation: 0 }, { rotation: -40, transformOrigin: '50% 100%', duration: 0.3, yoyo: true, repeat: 1 });
                g.fromTo(q('.pip-arm-r'), { rotation: 0 }, { rotation: 40, transformOrigin: '50% 100%', duration: 0.3, yoyo: true, repeat: 1 });
            } else if (mood === 'sad') {
                setMouth('frown');
                g.fromTo(r, { x: 0 }, { x: -4, duration: 0.06, yoyo: true, repeat: 5, onComplete: () => setMouth('smile') });
                g.fromTo(pupils, { y: 0 }, { y: 2.5, duration: 0.3, yoyo: true, repeat: 1 });
            }
        }

        function destroy() {
            idleTweens.forEach(t => { try { t.kill(); } catch {} });
            idleTweens = [];
        }

        // Pip "fala": TTS + lip-sync (boca abre/fecha enquanto o audio toca)
        let _flap = null, _talkBob = null;
        function _startTalk() {
            let open = false;
            _flap = setInterval(() => { open = !open; setMouth(open ? 'open' : 'smile'); }, 150);
            if (g) _talkBob = g.to(q('.pip-root'), { y: -3, duration: 0.22, yoyo: true, repeat: -1, ease: 'sine.inOut' });
        }
        function _stopTalk() {
            if (_flap) { clearInterval(_flap); _flap = null; }
            if (_talkBob) { _talkBob.kill(); _talkBob = null; if (g) g.set(q('.pip-root'), { y: 0 }); }
            setMouth('smile');
        }
        function speak(text, lang) {
            if (!text) return;
            // Usa o router central (Gemini neural p/ EN se houver key; senao sistema)
            if (typeof window.speakEN === 'function') {
                window.speakEN(text, lang || 'pt-PT', { onStart: _startTalk, onEnd: _stopTalk });
                return;
            }
            if (!('speechSynthesis' in window)) return;
            const synth = window.speechSynthesis;
            try { synth.cancel(); } catch {}
            const u = new SpeechSynthesisUtterance(text);
            u.lang = lang || 'pt-PT';
            u.rate = 0.96; u.pitch = 1.05;
            u.onstart = _startTalk; u.onend = _stopTalk; u.onerror = _stopTalk;
            try { synth.speak(u); } catch { _stopTalk(); }
        }

        setMouth('smile');
        startIdle();
        // Tocar no Pip → fala uma frase (se opts.phrases definido)
        if (opts.talkOnTap && Array.isArray(opts.phrases) && opts.phrases.length) {
            root.style.cursor = 'pointer';
            root.addEventListener('click', (ev) => {
                ev.stopPropagation();
                const ph = opts.phrases[Math.floor(Math.random() * opts.phrases.length)];
                react('happy');
                speak(ph.text, ph.lang);
            });
        }
        return { el: root, react, destroy, speak };
    }

    // ===== Mascote baseado no avatar do perfil (imagem) =====
    function createAvatarMascot(container, opts) {
        const size = opts.size || 84;
        const g = window.gsap;
        container.innerHTML = `
          <div class="pip-avatar" style="position:relative;width:${size}px;height:${size}px">
            <div class="pip-av-shadow" style="position:absolute;left:50%;bottom:-6px;transform:translateX(-50%);width:${size*0.7}px;height:6px;border-radius:50%;background:rgba(0,0,0,0.18);filter:blur(1px)"></div>
            <div class="pip-av-img" style="width:${size}px;height:${size}px;border-radius:50%;overflow:hidden;box-shadow:0 6px 16px rgba(0,0,0,0.22);border:3px solid #fff;background:#fff">${opts.avatarHtml}</div>
            <div class="pip-av-bubble" style="position:absolute;top:-14px;right:-10px;background:#fff;border-radius:14px;padding:4px 8px;box-shadow:0 4px 12px rgba(0,0,0,0.2);display:none;align-items:center;gap:3px">
              <span class="pip-dot" style="width:5px;height:5px;border-radius:50%;background:#0891b2;display:inline-block"></span>
              <span class="pip-dot" style="width:5px;height:5px;border-radius:50%;background:#0891b2;display:inline-block"></span>
              <span class="pip-dot" style="width:5px;height:5px;border-radius:50%;background:#0891b2;display:inline-block"></span>
            </div>
          </div>`;
        const root = container.querySelector('.pip-avatar');
        const img = container.querySelector('.pip-av-img');
        const bubble = container.querySelector('.pip-av-bubble');
        const dots = container.querySelectorAll('.pip-dot');
        let idleTweens = [], talkTween = null, dotTween = null;

        function startIdle() {
            if (!g) return;
            idleTweens.push(g.to(root, { y: -5, rotation: 1.5, duration: 2.4, yoyo: true, repeat: -1, ease: 'sine.inOut', transformOrigin: '50% 100%' }));
        }
        function react(mood) {
            if (!g) return;
            if (mood === 'happy') {
                g.fromTo(root, { y: 0 }, { y: -16, duration: 0.26, ease: 'power2.out', yoyo: true, repeat: 1 });
            } else if (mood === 'cheer') {
                g.fromTo(root, { y: 0 }, { y: -28, duration: 0.3, ease: 'power2.out', yoyo: true, repeat: 1 });
                g.fromTo(img, { rotation: -8 }, { rotation: 8, duration: 0.12, yoyo: true, repeat: 5, onComplete: () => g.set(img, { rotation: 0 }) });
            } else if (mood === 'sad') {
                g.fromTo(root, { x: 0 }, { x: -5, duration: 0.06, yoyo: true, repeat: 5, onComplete: () => g.set(root, { x: 0 }) });
                g.fromTo(img, { rotation: 0 }, { rotation: -10, duration: 0.3, yoyo: true, repeat: 1 });
            }
        }
        function _startTalk() {
            if (bubble) bubble.style.display = 'inline-flex';
            if (g) {
                talkTween = g.to(img, { scale: 1.06, duration: 0.18, yoyo: true, repeat: -1, ease: 'sine.inOut', transformOrigin: '50% 100%' });
                dotTween = g.fromTo(dots, { y: 0, opacity: 0.4 }, { y: -3, opacity: 1, duration: 0.3, yoyo: true, repeat: -1, stagger: 0.12, ease: 'sine.inOut' });
            }
        }
        function _stopTalk() {
            if (bubble) bubble.style.display = 'none';
            if (talkTween) { talkTween.kill(); talkTween = null; }
            if (dotTween) { dotTween.kill(); dotTween = null; }
            if (g) g.set(img, { scale: 1 });
        }
        function speak(text, lang) {
            if (!text) return;
            if (typeof window.speakEN === 'function') {
                window.speakEN(text, lang || 'pt-PT', { onStart: _startTalk, onEnd: _stopTalk });
                return;
            }
            if (!('speechSynthesis' in window)) return;
            try {
                window.speechSynthesis.cancel();
                const u = new SpeechSynthesisUtterance(text);
                u.lang = lang || 'pt-PT'; u.rate = 0.96;
                u.onstart = _startTalk; u.onend = _stopTalk; u.onerror = _stopTalk;
                window.speechSynthesis.speak(u);
            } catch { _stopTalk(); }
        }
        function destroy() { idleTweens.forEach(t => { try { t.kill(); } catch {} }); idleTweens = []; _stopTalk(); }

        startIdle();
        if (opts.talkOnTap && Array.isArray(opts.phrases) && opts.phrases.length) {
            root.style.cursor = 'pointer';
            root.addEventListener('click', (ev) => {
                ev.stopPropagation();
                const ph = opts.phrases[Math.floor(Math.random() * opts.phrases.length)];
                react('happy');
                speak(ph.text, ph.lang);
            });
        }
        return { el: root, react, destroy, speak };
    }

    window.Mascot = { create: createMascot };
})();

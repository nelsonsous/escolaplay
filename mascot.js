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

        setMouth('smile');
        startIdle();
        return { el: root, react, destroy };
    }

    window.Mascot = { create: createMascot };
})();

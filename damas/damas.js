// Damas — damas clássicas portuguesas contra o computador. Aplicação à parte
// (instalável: manifesto, ícones e service worker próprios nesta pasta).
//
// Regras da Federação Portuguesa de Damas:
//  · tabuleiro 8×8, 12 pedras de cada lado; o canto inferior direito de
//    cada jogador é casa de jogo; começam as brancas;
//  · a pedra anda uma casa na diagonal, só para a frente, e também só
//    captura para a frente;
//  · a pedra que chega (e para) na última linha é coroada dama; a dama anda
//    quantas casas quiser na diagonal e captura à distância;
//  · tomar é obrigatório: o maior número de peças (lei da quantidade) e, em
//    igualdade, o maior número de damas (lei da qualidade);
//  · numa tomada múltipla as peças só saem no fim do lance e nenhuma é saltada
//    duas vezes;
//  · perde quem fica sem peças ou sem lances; empata-se com 20 lances de
//    cada lado sem capturas nem movimentos de pedras, ou com a mesma posição
//    repetida 3 vezes.
//
// A IA (alfa-beta com aprofundamento iterativo e tabela de transposição)
// corre num Web Worker criado a partir do próprio motor, para a interface
// não congelar enquanto o computador pensa.

(function () {
    'use strict';

    // =====================================================================
    // MOTOR — regras + IA. Tem de ser autónomo (nada de fora desta função):
    // é serializado com toString() para correr dentro do Web Worker.
    // =====================================================================
    function damasEngine() {
        // Casas: índice linha*8+coluna, linha 0 = topo (lado das pretas).
        // Casas de jogo: (linha+coluna) par → o canto inferior direito de cada
        // jogador é casa de jogo. Peças: 1 pedra branca, 2 dama branca,
        // -1 pedra preta, -2 dama preta. Lado: 1 brancas, -1 pretas.
        const DARK = [];
        for (let sq = 0; sq < 64; sq++) if ((((sq >> 3) + (sq & 7)) & 1) === 0) DARK.push(sq);
        const DR = [-1, -1, 1, 1], DC = [-1, 1, -1, 1];
        const RAY = []; // RAY[casa][direção] = casas por ordem, até à borda
        for (let sq = 0; sq < 64; sq++) {
            const rays = [];
            for (let d = 0; d < 4; d++) {
                const out = [];
                for (let r = (sq >> 3) + DR[d], c = (sq & 7) + DC[d]; r >= 0 && r < 8 && c >= 0 && c < 8; r += DR[d], c += DC[d]) out.push(r * 8 + c);
                rays.push(out);
            }
            RAY.push(rays);
        }
        const FWD_W = [0, 1], FWD_B = [2, 3]; // brancas sobem, pretas descem
        const NONE = [];
        const own = (p, side) => p !== 0 && (p > 0) === (side > 0);
        const lastRow = (sq, side) => (sq >> 3) === (side > 0 ? 0 : 7);

        function initialBoard() {
            const b = new Int8Array(64);
            for (const sq of DARK) { const r = sq >> 3; if (r < 3) b[sq] = -1; else if (r > 4) b[sq] = 1; }
            return b;
        }

        // ---------- Geração de lances ----------
        // Lance: { from, to, path (casas pisadas), caps (casas tomadas),
        //          cv (peças tomadas), nk (damas tomadas), piece, promote }
        function mkMove(b, path, caps, nk, piece, promote) {
            const cv = new Array(caps.length);
            for (let i = 0; i < caps.length; i++) cv[i] = b[caps[i]];
            return { from: path[0], to: path[path.length - 1], path: path.slice(), caps: caps.slice(), cv, nk, piece, promote };
        }
        // As peças tomadas ficam no tabuleiro até ao fim do lance: bloqueiam
        // e não podem ser saltadas outra vez.
        function manJumps(b, side, sq, path, caps, nk, piece, out) {
            const dirs = side > 0 ? FWD_W : FWD_B;
            let more = false;
            for (let k = 0; k < 2; k++) {
                const ray = RAY[sq][dirs[k]];
                if (ray.length < 2) continue;
                const over = ray[0], v = b[over];
                if (v === 0 || own(v, side) || b[ray[1]] !== 0 || caps.indexOf(over) >= 0) continue;
                more = true;
                path.push(ray[1]); caps.push(over);
                manJumps(b, side, ray[1], path, caps, nk + (v === 2 || v === -2 ? 1 : 0), piece, out);
                path.pop(); caps.pop();
            }
            if (!more && caps.length) out.push(mkMove(b, path, caps, nk, piece, lastRow(sq, side)));
        }
        function kingJumps(b, side, sq, path, caps, nk, piece, out) {
            let more = false;
            for (let d = 0; d < 4; d++) {
                const ray = RAY[sq][d];
                let i = 0;
                while (i < ray.length && b[ray[i]] === 0) i++;
                if (i >= ray.length - 1) continue;
                const over = ray[i], v = b[over];
                if (own(v, side) || b[ray[i + 1]] !== 0 || caps.indexOf(over) >= 0) continue;
                caps.push(over);
                const nk2 = nk + (v === 2 || v === -2 ? 1 : 0);
                for (let j = i + 1; j < ray.length && b[ray[j]] === 0; j++) {
                    more = true;
                    path.push(ray[j]);
                    kingJumps(b, side, ray[j], path, caps, nk2, piece, out);
                    path.pop();
                }
                caps.pop();
            }
            if (!more && caps.length) out.push(mkMove(b, path, caps, nk, piece, false));
        }
        function captures(b, side) {
            const out = [];
            for (let i = 0; i < 32; i++) {
                const sq = DARK[i], p = b[sq];
                if (!own(p, side)) continue;
                b[sq] = 0; // a peça sai da casa de partida (pode voltar a passar por ela)
                if (p === side) manJumps(b, side, sq, [sq], [], 0, p, out);
                else kingJumps(b, side, sq, [sq], [], 0, p, out);
                b[sq] = p;
            }
            if (out.length < 2) return out;
            // Lei da quantidade e, em igualdade, lei da qualidade (mais damas).
            let n = 0, k = 0;
            for (const m of out) if (m.caps.length > n) n = m.caps.length;
            for (const m of out) if (m.caps.length === n && m.nk > k) k = m.nk;
            // Caminhos diferentes com o mesmo resultado contam como um só lance.
            const seen = new Set(), res = [];
            for (const m of out) {
                if (m.caps.length !== n || m.nk !== k) continue;
                const key = (m.from * 64 + m.to) + ':' + m.caps.slice().sort((x, y) => x - y).join(',');
                if (!seen.has(key)) { seen.add(key); res.push(m); }
            }
            return res;
        }
        function quiet(b, side) {
            const out = [], dirs = side > 0 ? FWD_W : FWD_B;
            for (let i = 0; i < 32; i++) {
                const sq = DARK[i], p = b[sq];
                if (!own(p, side)) continue;
                if (p === side) {
                    for (let k = 0; k < 2; k++) {
                        const to = RAY[sq][dirs[k]][0];
                        if (to !== undefined && b[to] === 0) out.push({ from: sq, to, path: [sq, to], caps: NONE, cv: NONE, nk: 0, piece: p, promote: lastRow(to, side) });
                    }
                } else {
                    for (let d = 0; d < 4; d++) {
                        const ray = RAY[sq][d];
                        for (let j = 0; j < ray.length && b[ray[j]] === 0; j++) out.push({ from: sq, to: ray[j], path: [sq, ray[j]], caps: NONE, cv: NONE, nk: 0, piece: p, promote: false });
                    }
                }
            }
            return out;
        }
        function legalMoves(b, side) {
            const c = captures(b, side);
            return c.length ? c : quiet(b, side);
        }
        function make(b, m) {
            b[m.from] = 0;
            for (let i = 0; i < m.caps.length; i++) b[m.caps[i]] = 0;
            b[m.to] = m.promote ? m.piece * 2 : m.piece;
        }
        function unmake(b, m) {
            b[m.to] = 0;
            for (let i = 0; i < m.caps.length; i++) b[m.caps[i]] = m.cv[i];
            b[m.from] = m.piece;
        }

        // Chave compacta de uma posição (lado a jogar + 32 casas de jogo).
        const ENC = { '-2': 'B', '-1': 'b', '0': '.', '1': 'w', '2': 'W' };
        const DEC = { B: -2, b: -1, '.': 0, w: 1, W: 2 };
        function keyOf(b, side) {
            let s = side > 0 ? 'w' : 'b';
            for (let i = 0; i < 32; i++) s += ENC[b[DARK[i]]];
            return s;
        }
        function fromKey(k) {
            const b = new Int8Array(64);
            for (let i = 0; i < 32; i++) b[DARK[i]] = DEC[k[i + 1]] || 0;
            return { board: b, side: k[0] === 'b' ? -1 : 1 };
        }

        // ---------- Avaliação (do ponto de vista das brancas) ----------
        const MAN = 100, KING = 300;
        const ADV = [0, 1, 3, 6, 10, 16, 25, 0];   // pedras: bónus por linhas avançadas
        const CEN = new Int8Array(64), DIAG = new Int8Array(64);
        for (const sq of DARK) {
            const r = sq >> 3, c = sq & 7;
            CEN[sq] = (r >= 3 && r <= 4 && c >= 2 && c <= 5) ? 6 : (r >= 2 && r <= 5 && c >= 1 && c <= 6) ? 2 : 0;
            DIAG[sq] = r === c ? 12 : 0; // a grande diagonal ("rio") é a melhor casa para uma dama
        }
        function evaluate(b) {
            let s = 0, wm = 0, bm = 0, wk = 0, bk = 0;
            for (let i = 0; i < 32; i++) {
                const sq = DARK[i], p = b[sq];
                if (p === 0) continue;
                const r = sq >> 3;
                if (p === 1) { wm++; s += ADV[7 - r] + CEN[sq] + (r === 7 ? 5 : 0); }
                else if (p === -1) { bm++; s -= ADV[r] + CEN[sq] + (r === 0 ? 5 : 0); }
                else if (p === 2) { wk++; s += DIAG[sq]; }
                else { bk++; s -= DIAG[sq]; }
            }
            const w = wm * MAN + wk * KING, k = bm * MAN + bk * KING;
            s += w - k;
            // Quem está à frente ganha com as trocas: simplificar aproxima a vitória.
            if (w !== k) s += Math.round((w - k) * 500 / (w + k + 100));
            return s;
        }

        // ---------- Pesquisa ----------
        // Chaves Zobrist (duas de 32 bits: índice + confirmação), xorshift fixo.
        let rs = 0x2545F491;
        const rnd = () => { rs ^= rs << 13; rs ^= rs >>> 17; rs ^= rs << 5; return rs | 0; };
        const ZA = new Int32Array(320), ZB = new Int32Array(320); // (peça+2)*64+casa
        for (let i = 0; i < 320; i++) { ZA[i] = rnd(); ZB[i] = rnd(); }
        const SIDE_A = rnd(), SIDE_B = rnd();
        function hashOf(b, side, Z, sideKey) {
            let h = side < 0 ? sideKey : 0;
            for (let i = 0; i < 32; i++) { const sq = DARK[i], p = b[sq]; if (p) h ^= Z[(p + 2) * 64 + sq]; }
            return h;
        }
        function hashMove(h, m, Z, sideKey) {
            h ^= Z[(m.piece + 2) * 64 + m.from] ^ Z[((m.promote ? m.piece * 2 : m.piece) + 2) * 64 + m.to] ^ sideKey;
            for (let i = 0; i < m.caps.length; i++) h ^= Z[(m.cv[i] + 2) * 64 + m.caps[i]];
            return h;
        }

        const WIN = 100000, INF = 1000000, MAXPLY = 64;
        const TT_SIZE = 1 << 18, TT_MASK = TT_SIZE - 1;
        let ttLock = null, ttDepth, ttFlag, ttScore, ttMove;
        const S = { nodes: 0, deadline: 0, stop: false, noise: 0, seed: 0, hist: new Int32Array(4096), k1: new Int16Array(MAXPLY + 2), k2: new Int16Array(MAXPLY + 2) };

        function leaf(b, side, hA) {
            let e = evaluate(b);
            // Ruído determinístico por posição (coerente dentro da pesquisa): dá
            // variedade às partidas e enfraquece os níveis mais fáceis.
            if (S.noise) e += ((Math.imul(hA ^ S.seed, 0x9E3779B1) >>> 0) % (2 * S.noise + 1)) - S.noise;
            return side > 0 ? e : -e;
        }
        function order(moves, ply, ttm) {
            const k1 = S.k1[ply], k2 = S.k2[ply];
            for (let i = 0; i < moves.length; i++) {
                const m = moves[i], key = m.from * 64 + m.to;
                let o = S.hist[key];
                if (key === ttm) o += 1 << 29;
                else if (m.promote) o += 1 << 27;
                else if (key === k1) o += 1 << 26;
                else if (key === k2) o += 1 << 25;
                m.o = o;
            }
            moves.sort((x, y) => y.o - x.o);
        }
        function negamax(b, side, depth, alpha, beta, ply, hA, hB) {
            if ((++S.nodes & 1023) === 0 && Date.now() > S.deadline) S.stop = true;
            if (S.stop) return 0;
            const moves = legalMoves(b, side);
            if (moves.length === 0) return ply - WIN; // sem lances (ou sem peças): perde
            if (ply >= MAXPLY) return leaf(b, side, hA);
            // Tomadas são obrigatórias: com tomada pendente a pesquisa continua
            // (quiescência natural) em vez de avaliar uma posição instável.
            if (depth <= 0 && moves[0].caps.length === 0) return leaf(b, side, hA);
            const idx = hA & TT_MASK;
            let ttm = -1;
            if (ttFlag[idx] && ttLock[idx] === hB) {
                ttm = ttMove[idx];
                if (ttDepth[idx] >= depth) {
                    let s = ttScore[idx];
                    if (s > WIN - 1000) s -= ply; else if (s < 1000 - WIN) s += ply;
                    const f = ttFlag[idx];
                    if (f === 1 || (f === 2 && s >= beta) || (f === 3 && s <= alpha)) return s;
                }
            }
            if (moves.length > 1) order(moves, ply, ttm);
            const nd = moves.length === 1 ? depth : depth - 1; // lance forçado não gasta profundidade
            const a0 = alpha;
            let best = -INF, bestM = moves[0];
            for (let i = 0; i < moves.length; i++) {
                const m = moves[i];
                make(b, m);
                const s = -negamax(b, -side, nd, -beta, -alpha, ply + 1, hashMove(hA, m, ZA, SIDE_A), hashMove(hB, m, ZB, SIDE_B));
                unmake(b, m);
                if (S.stop) return 0;
                if (s > best) { best = s; bestM = m; }
                if (s > alpha) alpha = s;
                if (alpha >= beta) {
                    if (m.caps.length === 0) {
                        const key = m.from * 64 + m.to;
                        if (S.k1[ply] !== key) { S.k2[ply] = S.k1[ply]; S.k1[ply] = key; }
                        if (S.hist[key] < (1 << 24)) S.hist[key] += depth > 0 ? depth * depth : 1;
                    }
                    break;
                }
            }
            let st = best;
            if (st > WIN - 1000) st += ply; else if (st < 1000 - WIN) st -= ply;
            ttLock[idx] = hB; ttScore[idx] = st; ttMove[idx] = bestM.from * 64 + bestM.to;
            ttDepth[idx] = depth < -100 ? -100 : depth > 100 ? 100 : depth;
            ttFlag[idx] = best <= a0 ? 3 : best >= beta ? 2 : 1;
            return best;
        }

        // Níveis: profundidade máxima, tempo (ms), ruído na avaliação e
        // probabilidade de um lance ao calhas.
        const LEVELS = {
            1: { depth: 2, time: 300, noise: 60, random: 0.25 },
            2: { depth: 4, time: 500, noise: 18, random: 0.04 },
            3: { depth: 9, time: 900, noise: 5, random: 0 },
            4: { depth: 40, time: 2400, noise: 2, random: 0 }
        };
        const pack = m => ({ from: m.from, to: m.to, path: m.path.slice(), caps: m.caps.slice() });

        // req: { board (64), side, level, time?, seed?, seen?: { chave: vezes } }
        function think(req) {
            const t0 = Date.now();
            const b = Int8Array.from(req.board), side = req.side > 0 ? 1 : -1;
            const L = LEVELS[req.level] || LEVELS[2];
            const moves = legalMoves(b, side);
            if (!moves.length) return { move: null };
            if (moves.length === 1) return { move: pack(moves[0]), score: 0, depth: 0, nodes: 0, ms: 0, forced: true };
            if (L.random && Math.random() < L.random) return { move: pack(moves[(Math.random() * moves.length) | 0]), score: 0, depth: 0, nodes: 0, ms: 0, random: true };
            if (!ttLock) {
                ttLock = new Int32Array(TT_SIZE); ttDepth = new Int8Array(TT_SIZE); ttFlag = new Uint8Array(TT_SIZE);
                ttScore = new Int32Array(TT_SIZE); ttMove = new Int16Array(TT_SIZE);
            } else ttFlag.fill(0);
            S.hist.fill(0); S.k1.fill(-1); S.k2.fill(-1);
            S.nodes = 0; S.stop = false;
            S.noise = req.noise != null ? req.noise : L.noise;
            S.seed = (req.seed | 0) ^ ((Math.random() * 0x7fffffff) | 0);
            const budget = req.time || L.time, maxDepth = req.depth || L.depth;
            S.deadline = t0 + budget;
            const soft = t0 + budget * 0.45;
            // Repetições: um lance que repete a posição pela 3.ª vez é empate;
            // quem está a ganhar evita repetir, para não deitar a vitória fora.
            const seen = req.seen || {};
            for (const m of moves) { make(b, m); m.rep = seen[keyOf(b, -side)] || 0; unmake(b, m); }
            const hA = hashOf(b, side, ZA, SIDE_A), hB = hashOf(b, side, ZB, SIDE_B);
            let best = moves[0], bestScore = 0, done = 0;
            for (let depth = 1; depth <= maxDepth; depth++) {
                let alpha = -INF, iterBest = null, iterScore = -INF;
                for (const m of moves) {
                    make(b, m);
                    let s = m.rep >= 2 ? 0 : -negamax(b, -side, depth - 1, -INF, -alpha, 1, hashMove(hA, m, ZA, SIDE_A), hashMove(hB, m, ZB, SIDE_B));
                    unmake(b, m);
                    if (S.stop) break;
                    if (m.rep === 1 && s > 0) s = Math.max(0, s - 15);
                    if (s > iterScore) { iterScore = s; iterBest = m; }
                    if (s > alpha) alpha = s;
                }
                if (S.stop) {
                    // Iteração incompleta: só se aproveita se já bateu o melhor anterior.
                    if (iterBest && iterBest !== moves[0]) { best = iterBest; bestScore = iterScore; }
                    break;
                }
                best = iterBest; bestScore = iterScore; done = depth;
                moves.splice(moves.indexOf(best), 1); moves.unshift(best);
                if (Math.abs(bestScore) > WIN - 1000 || Date.now() > soft) break;
            }
            return { move: pack(best), score: side > 0 ? bestScore : -bestScore, depth: done, nodes: S.nodes, ms: Date.now() - t0 };
        }

        return { DARK, RAY, initialBoard, legalMoves, make, unmake, keyOf, fromKey, evaluate, think, lastRow, LEVELS };
    }

    const E = damasEngine();

    // =====================================================================
    // IA num Web Worker (a partir do próprio motor). Se o browser não deixar
    // criar o worker, a pesquisa corre na página, com o mesmo resultado.
    // =====================================================================
    let worker = null, workerUrl = null, workerBroken = false, pending = null, reqSeq = 0;
    function killWorker() {
        if (worker) { try { worker.terminate(); } catch (e) {} worker = null; }
        if (workerUrl) { try { URL.revokeObjectURL(workerUrl); } catch (e) {} workerUrl = null; }
    }
    function settle(p, res) {
        clearTimeout(p.timer);
        if (pending === p) pending = null;
        p.resolve(res || { move: null });
    }
    function runLocal(p) {
        setTimeout(() => { let r; try { r = E.think(p.req); } catch (e) { r = { move: null }; } settle(p, r); }, 20);
    }
    function getWorker() {
        if (worker || workerBroken) return worker;
        try {
            const src = 'var E=(' + damasEngine.toString() + ')();self.onmessage=function(e){var d=e.data||{},r;' +
                'try{r=E.think(d)}catch(x){r={move:null,error:String(x&&x.message||x)}}r.id=d.id;self.postMessage(r)};';
            workerUrl = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
            worker = new Worker(workerUrl);
            worker.onmessage = (e) => { const d = e.data || {}; if (pending && d.id === pending.id) settle(pending, d); };
            worker.onerror = (e) => {
                try { e.preventDefault(); } catch (x) {}
                const p = pending; pending = null;
                killWorker(); workerBroken = true;
                if (p) { clearTimeout(p.timer); runLocal(p); }
            };
        } catch (e) { killWorker(); workerBroken = true; }
        return worker;
    }
    function askEngine(req) {
        if (pending) { clearTimeout(pending.timer); pending = null; killWorker(); } // um pedido de cada vez
        const id = ++reqSeq;
        return new Promise(resolve => {
            const p = { id, req, resolve, timer: 0 };
            const w = getWorker();
            if (!w) { runLocal(p); return; }
            pending = p;
            // Salvaguarda: worker calado demasiado tempo → pensa na página.
            p.timer = setTimeout(() => { if (pending === p) { pending = null; killWorker(); runLocal(p); } }, (req.time || 2400) + 5000);
            try { w.postMessage(Object.assign({ id }, req)); }
            catch (e) { clearTimeout(p.timer); pending = null; killWorker(); workerBroken = true; runLocal(p); }
        });
    }
    function cancelEngine() {
        if (pending) { clearTimeout(pending.timer); pending = null; killWorker(); }
    }

    // =====================================================================
    // APLICAÇÃO
    // =====================================================================
    const STORE_KEY = 'damas_v1';        // estatísticas e preferências
    const GAME_KEY = 'damas_v1_game';    // partida a meio
    const MIN_THINK = 450; // ms — o computador nunca responde "instantaneamente"
    const LEVEL_INFO = {
        1: { name: 'Fácil', emoji: '🙂', sub: 'Para aprender' },
        2: { name: 'Médio', emoji: '🤔', sub: 'Pensa uns lances à frente' },
        3: { name: 'Difícil', emoji: '😤', sub: 'Joga a sério' },
        4: { name: 'Mestre', emoji: '🧠', sub: 'Dá tudo o que tem' }
    };
    const TIPS = [
        'Mantém as peças juntas: uma peça sozinha é fácil de tomar.',
        'Guarda as pedras da tua última linha: impedem o adversário de fazer damas.',
        'Antes de mexer, vê se deixas uma tomada ao adversário.',
        'Às vezes vale a pena dar uma peça para depois tomar duas.',
        'Uma dama na grande diagonal controla o tabuleiro todo.',
        'As peças no centro têm mais caminhos do que as da borda.',
        'Quando estás à frente, troca peças: fica mais fácil ganhar.',
        'Usa a Pista 💡 quando não souberes o que jogar.'
    ];
    const CROWN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7.5l4.6 4.2L12 4.5l4.4 7.2L21 7.5 19 19H5z"/><rect x="5" y="19.6" width="14" height="2" rx="1"/></svg>';
    const ICONS = {
        back: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
        soundOn: '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
        soundOff: '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M22 9l-6 6M16 9l6 6"/>',
        help: '<circle cx="12" cy="12" r="9.5"/><path d="M9.2 9.2a2.9 2.9 0 0 1 5.6 1c0 2-2.8 2.4-2.8 4.3"/><path d="M12 17.6v.1"/>',
        undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
        hint: '<path d="M9 18h6M10 21.5h4"/><path d="M12 2.5a6.5 6.5 0 0 0-3.8 11.8c.5.4.8 1 .8 1.7V17h6v-1c0-.7.3-1.3.8-1.7A6.5 6.5 0 0 0 12 2.5z"/>',
        plus: '<path d="M12 5v14M5 12h14"/>',
        play: '<path d="M8 5.5v13l10.5-6.5z"/>',
        chevron: '<path d="M9 6l6 6-6 6"/>',
        install: '<path d="M12 3.5v11M7.5 10l4.5 4.5 4.5-4.5M5 20.5h14"/>'
    };
    const icon = name => `<svg class="dm-ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
    const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const sqName = sq => 'abcdefgh'[sq & 7] + (8 - (sq >> 3));
    const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);
    const $ = id => document.getElementById(id);

    let G = null;         // partida
    let ui = null;        // referências do ecrã de jogo (null fora dele)
    let screen = '';      // 'setup' | 'game'
    let toastTimer = 0, confirmTimer = 0, installEvt = null;

    // ---------- Gravação (localStorage; fica em memória se estiver bloqueado) ----------
    let mem = null;
    function store() {
        if (mem) return mem;
        let d = null;
        try { d = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) {}
        if (!d || typeof d !== 'object') d = {};
        if (!d.stats || typeof d.stats !== 'object') d.stats = {};
        if (!d.prefs || typeof d.prefs !== 'object') d.prefs = {};
        return (mem = d);
    }
    function persist() { try { localStorage.setItem(STORE_KEY, JSON.stringify(store())); } catch (e) {} }
    function saveGame() {
        try {
            if (!G || G.over || G.plies === 0) { localStorage.removeItem(GAME_KEY); return; }
            localStorage.setItem(GAME_KEY, JSON.stringify({ v: 1, k: E.keyOf(G.board, G.turn), h: G.human, lv: G.level, q: G.quiet, l: G.last, n: G.plies, s: G.seed, hist: G.hist }));
        } catch (e) {}
    }
    function loadGame() {
        try {
            const d = JSON.parse(localStorage.getItem(GAME_KEY) || 'null');
            if (!d || d.v !== 1 || typeof d.k !== 'string' || d.k.length !== 33) return null;
            const pos = E.fromKey(d.k);
            return mkGame({
                board: pos.board, turn: pos.side, human: d.h === -1 ? -1 : 1, level: LEVEL_INFO[d.lv] ? d.lv : 2,
                quiet: d.q | 0, last: d.l && Array.isArray(d.l.path) ? d.l : null, plies: d.n | 0, seed: d.s | 0,
                hist: Array.isArray(d.hist) ? d.hist.filter(x => x && typeof x.k === 'string' && x.k.length === 33) : []
            });
        } catch (e) { return null; }
    }
    function mkGame(o) {
        return Object.assign({
            board: E.initialBoard(), turn: 1, human: 1, level: 2, quiet: 0, last: null, plies: 0,
            seed: (Math.random() * 1e9) | 0, hist: [], over: null,
            token: 0, legal: null, sel: null, hintMove: null, anim: false, thinking: false, hinting: false
        }, o);
    }
    function snapshot() { return { k: E.keyOf(G.board, G.turn), q: G.quiet, l: G.last, n: G.plies }; }
    function restore(s) {
        const pos = E.fromKey(s.k);
        G.board = pos.board; G.turn = pos.side; G.quiet = s.q | 0; G.last = s.l || null; G.plies = s.n | 0;
    }
    function seenMap() {
        const m = {};
        for (const h of G.hist) m[h.k] = (m[h.k] || 0) + 1;
        const k = E.keyOf(G.board, G.turn);
        m[k] = (m[k] || 0) + 1;
        return m;
    }
    function record(level) {
        const s = store().stats[level] || {};
        return { w: s.w | 0, l: s.l | 0, d: s.d | 0 };
    }
    function recordText(level) {
        const r = record(level);
        if (!r.w && !r.l && !r.d) return 'Ainda não jogaste neste nível.';
        return `${plural(r.w, 'vitória', 'vitórias')} · ${plural(r.l, 'derrota', 'derrotas')} · ${plural(r.d, 'empate', 'empates')}`;
    }

    // ---------- Som (Web Audio, sem ficheiros) ----------
    let audioCtx = null;
    function getCtx() {
        if (audioCtx) return audioCtx;
        const C = window.AudioContext || window.webkitAudioContext;
        if (!C) return null;
        try { audioCtx = new C(); } catch (e) { return null; }
        return audioCtx;
    }
    function unlockAudio() { const c = store().prefs.mute ? null : getCtx(); if (c && c.state === 'suspended') c.resume().catch(() => {}); }
    function sound(kind) {
        if (store().prefs.mute) return;
        const ctx = getCtx();
        if (!ctx) return;
        try {
            if (ctx.state === 'suspended') ctx.resume();
            const t = ctx.currentTime;
            const tone = (f, at, dur, vol, type) => {
                const o = ctx.createOscillator(), g = ctx.createGain();
                o.type = type || 'sine'; o.frequency.setValueAtTime(f, t + at);
                g.gain.setValueAtTime(0.0001, t + at);
                g.gain.exponentialRampToValueAtTime(vol, t + at + 0.006);
                g.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
                o.connect(g); g.connect(ctx.destination);
                o.start(t + at); o.stop(t + at + dur + 0.03);
            };
            if (kind === 'move') { tone(330, 0, 0.08, 0.13, 'triangle'); tone(990, 0, 0.025, 0.03); }
            else if (kind === 'cap') { tone(220, 0, 0.11, 0.18, 'triangle'); tone(660, 0.012, 0.05, 0.06); }
            else if (kind === 'king') [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.07, 0.2, 0.08));
            else if (kind === 'win') [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.1, 0.32, 0.09));
            else if (kind === 'loss') [392, 330, 262].forEach((f, i) => tone(f, i * 0.16, 0.34, 0.08));
            else if (kind === 'draw') { tone(440, 0, 0.2, 0.07); tone(440, 0.18, 0.28, 0.07); }
            else if (kind === 'bad') tone(150, 0, 0.12, 0.07, 'square');
        } catch (e) {}
    }

    // ---------- Confettis (vitória) ----------
    function confetti() {
        if (reduceMotion) return;
        const cv = document.createElement('canvas');
        cv.className = 'dm-confetti';
        document.body.appendChild(cv);
        const ctx = cv.getContext('2d'), dpr = window.devicePixelRatio || 1, W = window.innerWidth, H = window.innerHeight;
        cv.width = W * dpr; cv.height = H * dpr;
        ctx.scale(dpr, dpr);
        const colors = ['#fbbf24', '#f472b6', '#22d3ee', '#a3e635', '#fb923c', '#fff7ed'];
        const parts = [];
        for (let i = 0; i < 150; i++) {
            const a = Math.random() * Math.PI * 2, v = 3 + Math.random() * 7;
            parts.push({ x: W / 2, y: H * 0.34, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 4, s: 4 + Math.random() * 6, c: colors[i % colors.length], r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3 });
        }
        const t0 = performance.now(), dur = 2400;
        (function frame(now) {
            const t = now - t0;
            ctx.clearRect(0, 0, W, H);
            ctx.globalAlpha = Math.max(0, 1 - t / dur);
            for (const p of parts) {
                p.vy += 0.16; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
                ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
                ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66);
                ctx.restore();
            }
            if (t < dur) requestAnimationFrame(frame); else cv.remove();
        })(t0);
    }

    // ---------- Topo, navegação e instalação ----------
    function body() { return $('dm-body'); }
    function updateTop() {
        const left = $('dm-left');
        if (left) left.innerHTML = screen === 'game'
            ? `<button type="button" class="dm-ibtn" data-act="menu" aria-label="Voltar ao menu">${icon('back')}</button>`
            : '<span class="dm-logo" aria-hidden="true"></span>';
        updateSoundBtn();
    }
    function updateSoundBtn() {
        const b = $('dm-sound');
        if (!b) return;
        const mute = !!store().prefs.mute;
        b.innerHTML = icon(mute ? 'soundOff' : 'soundOn');
        b.setAttribute('aria-label', mute ? 'Ligar o som' : 'Desligar o som');
        b.setAttribute('aria-pressed', mute ? 'false' : 'true');
    }
    function toggleSound() {
        const pr = store().prefs;
        pr.mute = !pr.mute;
        persist();
        updateSoundBtn();
        if (!pr.mute) { unlockAudio(); sound('move'); }
    }
    // O jogo tem uma entrada própria no histórico: o botão/gesto "voltar"
    // do telemóvel leva do tabuleiro ao menu, em vez de fechar a app.
    function goGame() {
        if (!(history.state && history.state.dm === 'game')) { try { history.pushState({ dm: 'game' }, ''); } catch (e) {} }
        showGame();
    }
    function goMenu() {
        if (history.state && history.state.dm === 'game') { try { history.back(); return; } catch (e) {} }
        showSetup();
    }
    function onPop(e) {
        closeDialog();
        if (e.state && e.state.dm === 'game') {
            if (G) showGame();
            else { try { history.replaceState({ dm: 'menu' }, ''); } catch (x) {} showSetup(); }
        } else if (screen !== 'setup') showSetup();
    }
    function isStandalone() {
        return !!((window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true);
    }
    function isIOS() {
        return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    }
    function installHtml() {
        if (isStandalone()) return '';
        if (installEvt) return `<button type="button" class="dm-install-btn" data-act="install">${icon('install')}<span>Instalar a app no ecrã principal</span></button>`;
        if (isIOS()) return '<p class="dm-install-tip">Para a teres como app: toca em <b>Partilhar</b> e depois em <b>Adicionar ao ecrã principal</b>.</p>';
        return '';
    }
    function refreshInstall() { const el = $('dm-install'); if (el) el.innerHTML = installHtml(); }
    async function doInstall() {
        const ev = installEvt;
        if (!ev) return;
        installEvt = null;
        try { ev.prompt(); await ev.userChoice; } catch (e) {}
        refreshInstall();
    }

    function onKey(e) {
        if (e.key === 'Escape' && document.querySelector('.dm-dlg')) { e.preventDefault(); closeDialog(); }
    }
    function onClick(e) {
        const sqEl = e.target.closest('[data-sq]');
        if (sqEl && ui && ui.board.contains(sqEl)) { onSquare(+sqEl.dataset.sq); return; }
        const a = e.target.closest('[data-act]');
        if (!a || a.disabled) return;
        const v = +a.dataset.v;
        switch (a.dataset.act) {
            case 'menu': case 'new': goMenu(); break;
            case 'sound': toggleSound(); break;
            case 'rules': showRules(); break;
            case 'install': doInstall(); break;
            case 'level': store().prefs.level = v; persist(); refreshSetup(); break;
            case 'color': store().prefs.human = v; persist(); refreshSetup(); break;
            case 'start': startFromSetup(a); break;
            case 'resume': goGame(); break;
            case 'undo': undo(); break;
            case 'hint': hint(); break;
            case 'again': closeDialog(); G = mkGame({ level: G.level, human: G.human }); saveGame(); showGame(); break;
            case 'view': closeDialog(); break;
            case 'setup': closeDialog(); goMenu(); break;
            case 'end': showEnd(); break;
            case 'dlg-close': closeDialog(); break;
        }
    }
    function toast(msg) {
        const t = $('dm-toast');
        if (!t) return;
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
    }

    // ---------- Diálogos ----------
    function showDialog(html, cls) {
        closeDialog();
        const app = $('app');
        if (!app) return;
        const d = document.createElement('div');
        d.className = 'dm-dlg' + (cls ? ' dm-dlg-' + cls : '');
        d.innerHTML = `<div class="dm-dlg-card" role="alertdialog" aria-modal="true">${html}</div>`;
        d.addEventListener('click', e => { if (e.target === d) closeDialog(); });
        app.appendChild(d);
        const f = d.querySelector('.dm-btn, button');
        if (f) try { f.focus({ preventScroll: true }); } catch (e) {}
    }
    function closeDialog() { const d = document.querySelector('.dm-dlg'); if (d) d.remove(); }
    function showRules() {
        showDialog(`
            <h2 class="dm-dlg-h">Regras</h2>
            <p class="dm-dlg-p">Damas clássicas portuguesas</p>
            <ul class="dm-rules">
                <li>Joga-se nas casas escuras. Começam as <b>brancas</b>.</li>
                <li>A <b>pedra</b> anda uma casa na diagonal, sempre para a frente — e também só toma para a frente.</li>
                <li>Ao chegar à última linha, a pedra passa a <b>dama</b> <span class="dm-rules-k">${CROWN}</span>: anda quantas casas quiser na diagonal, para a frente e para trás, e toma à distância.</li>
                <li><b>Tomar é obrigatório</b>, e tens de tomar o maior número de peças possível. Se houver empate, tomas as de maior valor (as damas).</li>
                <li>Numa tomada múltipla as peças só saem no fim e não se salta duas vezes a mesma peça.</li>
                <li>Ganha quem tomar todas as peças do adversário ou o deixar sem jogadas.</li>
                <li>Empata-se com 20 lances de cada lado sem tomadas nem movimentos de pedras, ou com a mesma posição repetida 3 vezes.</li>
            </ul>
            <p class="dm-dlg-tip">Toca numa peça e depois na casa de destino. Numa tomada múltipla podes tocar logo na casa final.</p>
            <button type="button" class="dm-btn dm-btn-go" data-act="dlg-close">Percebi</button>`, 'rules');
    }

    // ---------- Menu (nível e cor) ----------
    function miniBoardHtml() {
        const b = E.initialBoard();
        b[E.DARK[21]] = 0; b[E.DARK[17]] = 1; // um lance já feito (d3-c4), para dar vida
        let h = '';
        for (let sq = 0; sq < 64; sq++) {
            const dark = (((sq >> 3) + (sq & 7)) & 1) === 0, p = b[sq];
            h += `<span class="${dark ? 'd' : 'l'}${p > 0 ? ' w' : p < 0 ? ' b' : ''}"></span>`;
        }
        return `<div class="dm-mini" aria-hidden="true">${h}</div>`;
    }
    function showSetup() {
        if (G) { G.token++; G.thinking = false; G.hinting = false; }
        cancelEngine();
        ui = null;
        screen = 'setup';
        closeDialog();
        updateTop();
        const bd = body();
        if (!bd) return;
        const inProgress = !!(G && !G.over && G.plies > 0);
        const levels = [1, 2, 3, 4].map(v => {
            const li = LEVEL_INFO[v];
            return `<button type="button" class="dm-level" role="radio" data-act="level" data-v="${v}">
                <span class="dm-level-e" aria-hidden="true">${li.emoji}</span><span class="dm-level-n">${li.name}</span><span class="dm-level-s">${li.sub}</span></button>`;
        }).join('');
        bd.innerHTML = `
            <div class="dm-setup">
                <div class="dm-hero">
                    ${miniBoardHtml()}
                    <h1 class="dm-hero-title">Damas</h1>
                    <p class="dm-hero-sub">Regras portuguesas · contra o computador</p>
                </div>
                ${inProgress ? `<button type="button" class="dm-resume" data-act="resume">
                    <span class="dm-resume-i" aria-hidden="true">${icon('play')}</span>
                    <span class="dm-resume-t"><b>Continuar a partida</b><small>${LEVEL_INFO[G.level].emoji} ${LEVEL_INFO[G.level].name} · ${plural(Math.ceil(G.plies / 2), 'lance', 'lances')}</small></span>
                    ${icon('chevron')}</button>` : ''}
                <section class="dm-card">
                    <h2 class="dm-card-h" id="dm-lv-h">Nível</h2>
                    <div class="dm-levels" role="radiogroup" aria-labelledby="dm-lv-h">${levels}</div>
                    <div class="dm-record" id="dm-record"></div>
                </section>
                <section class="dm-card">
                    <h2 class="dm-card-h" id="dm-col-h">Jogas com</h2>
                    <div class="dm-colors" role="radiogroup" aria-labelledby="dm-col-h">
                        <button type="button" class="dm-color" role="radio" data-act="color" data-v="1"><span class="dm-disc w" aria-hidden="true"></span><span><b>Brancas</b><small>Começas tu</small></span></button>
                        <button type="button" class="dm-color" role="radio" data-act="color" data-v="-1"><span class="dm-disc b" aria-hidden="true"></span><span><b>Pretas</b><small>Começa o computador</small></span></button>
                    </div>
                </section>
                <button type="button" class="dm-btn dm-btn-go" data-act="start" id="dm-start">${inProgress ? 'Nova partida' : 'Jogar'}</button>
                <div class="dm-install" id="dm-install">${installHtml()}</div>
            </div>`;
        refreshSetup();
    }
    function setupChoice() {
        const pr = store().prefs;
        return { level: LEVEL_INFO[pr.level] ? pr.level : 2, human: pr.human === -1 ? -1 : 1 };
    }
    function refreshSetup() {
        const c = setupChoice();
        const bd = body();
        if (!bd) return;
        bd.querySelectorAll('.dm-level').forEach(b => { const on = +b.dataset.v === c.level; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
        bd.querySelectorAll('.dm-color').forEach(b => { const on = +b.dataset.v === c.human; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
        const r = $('dm-record');
        if (r) r.textContent = `${LEVEL_INFO[c.level].emoji} ${LEVEL_INFO[c.level].name}: ${recordText(c.level)}`;
    }
    function startFromSetup(btn) {
        const inProgress = !!(G && !G.over && G.plies > 0);
        if (inProgress && !btn.classList.contains('confirm')) {
            // Segunda confirmação: não deitar fora uma partida a meio por engano.
            btn.classList.add('confirm');
            btn.textContent = 'Toca outra vez: a partida a meio perde-se';
            clearTimeout(confirmTimer);
            confirmTimer = setTimeout(() => { if (btn.isConnected) { btn.classList.remove('confirm'); btn.textContent = 'Nova partida'; } }, 3500);
            return;
        }
        const c = setupChoice();
        G = mkGame({ level: c.level, human: c.human });
        saveGame();
        goGame();
    }

    // ---------- Ecrã de jogo ----------
    function showGame() {
        const bd = body();
        if (!bd || !G) return;
        closeDialog();
        screen = 'game';
        updateTop();
        const li = LEVEL_INFO[G.level];
        let sqs = '';
        for (let i = 0; i < 64; i++) {
            const sq = G.human > 0 ? i : 63 - i;
            sqs += ((((sq >> 3) + (sq & 7)) & 1) === 0)
                ? `<button type="button" class="dm-sq d" data-sq="${sq}"></button>`
                : '<div class="dm-sq l"></div>';
        }
        bd.innerHTML = `
            <div class="dm-game">
                <div class="dm-bar dm-bar-opp" id="dm-bar-opp">
                    <div class="dm-av dm-av-bot" aria-hidden="true">🤖</div>
                    <div class="dm-who"><b>Computador</b><small>${li.emoji} ${li.name} · ${G.human > 0 ? 'pretas' : 'brancas'}</small></div>
                    <div class="dm-think" aria-hidden="true"><i></i><i></i><i></i></div>
                    <div class="dm-caps" id="dm-caps-opp"></div>
                </div>
                <div class="dm-board-wrap">
                    <div class="dm-board" id="dm-board" role="group" aria-label="Tabuleiro">
                        <div class="dm-squares">${sqs}</div>
                        <div class="dm-pieces" id="dm-pieces"></div>
                    </div>
                </div>
                <div class="dm-bar dm-bar-me" id="dm-bar-me">
                    <div class="dm-av" aria-hidden="true"><span class="dm-disc ${G.human > 0 ? 'w' : 'b'}"></span></div>
                    <div class="dm-who"><b>Tu</b><small>${G.human > 0 ? 'Brancas' : 'Pretas'}</small></div>
                    <div class="dm-caps" id="dm-caps-me"></div>
                </div>
                <div class="dm-status" id="dm-status" aria-live="polite"></div>
                <div class="dm-actions">
                    <button type="button" class="dm-act" data-act="undo" id="dm-undo">${icon('undo')}<span>Desfazer</span></button>
                    <button type="button" class="dm-act" data-act="hint" id="dm-hint">${icon('hint')}<span>Pista</span></button>
                    <button type="button" class="dm-act" data-act="new">${icon('plus')}<span>Nova</span></button>
                </div>
            </div>`;
        ui = {
            board: $('dm-board'), pieces: $('dm-pieces'), status: $('dm-status'), els: {}, sqs: {}
        };
        ui.board.querySelectorAll('.dm-sq.d').forEach(el => { ui.sqs[el.dataset.sq] = el; });
        buildPieces();
        G.token++;
        G.anim = false; G.thinking = false; G.hinting = false; G.sel = null; G.hintMove = null;
        if (G.over) { G.legal = null; refresh(); return; }
        continueGame();
    }
    function placeEl(el, sq) {
        let r = sq >> 3, c = sq & 7;
        if (G.human < 0) { r = 7 - r; c = 7 - c; }
        el.style.transform = `translate(${c * 100}%, ${r * 100}%)`;
    }
    function pieceEl(sq, p) {
        const el = document.createElement('div');
        el.className = 'dm-pc ' + (p > 0 ? 'w' : 'b') + (p === 2 || p === -2 ? ' k' : '');
        el.innerHTML = '<i>' + CROWN + '</i>';
        placeEl(el, sq);
        return el;
    }
    function buildPieces() {
        if (!ui) return;
        ui.pieces.innerHTML = '';
        ui.els = {};
        for (const sq of E.DARK) {
            const p = G.board[sq];
            if (!p) continue;
            const el = pieceEl(sq, p);
            ui.pieces.appendChild(el);
            ui.els[sq] = el;
        }
    }
    // Acerta as peças do ecrã com o tabuleiro (depois de uma animação).
    function syncPieces() {
        if (!ui) return;
        for (const sq of E.DARK) {
            const p = G.board[sq];
            let el = ui.els[sq];
            const want = p > 0 ? 'w' : 'b';
            if (el && (!p || !el.classList.contains(want))) { el.remove(); delete ui.els[sq]; el = null; }
            if (!p) continue;
            if (!el) { el = pieceEl(sq, p); ui.pieces.appendChild(el); ui.els[sq] = el; }
            el.classList.toggle('k', p === 2 || p === -2);
        }
        Object.keys(ui.els).forEach(k => { if (!G.board[k]) { ui.els[k].remove(); delete ui.els[k]; } });
    }
    function canUndo() {
        if (!G || G.over || G.anim) return false;
        return G.hist.some(h => (h.k[0] === 'w' ? 1 : -1) === G.human);
    }
    function refresh() {
        if (!ui || !G) return;
        const s = G.sel, human = G.turn === G.human && !G.over && !G.anim && !G.thinking;
        const dest = new Set(), step = new Set(), trail = new Set(), targets = new Set(), must = new Set(), hint = new Set();
        if (human && s) {
            const k = s.path.length;
            for (const m of s.cands) {
                dest.add(m.to);
                if (m.path.length > k + 1) step.add(m.path[k]);
                m.caps.forEach(c => targets.add(c));
            }
            s.path.slice(1).forEach(q => trail.add(q));
        } else if (human && G.legal && G.legal.length && G.legal[0].caps.length) {
            G.legal.forEach(m => must.add(m.from));
        }
        if (human && G.hintMove) G.hintMove.path.forEach(q => hint.add(q));
        const last = new Set(G.last ? G.last.path : []);
        for (const sq of E.DARK) {
            const el = ui.sqs[sq];
            if (!el) continue;
            el.classList.toggle('last', last.has(sq) && !G.anim);
            el.classList.toggle('dest', dest.has(sq));
            el.classList.toggle('step', step.has(sq) && !dest.has(sq));
            el.classList.toggle('trail', trail.has(sq));
            el.classList.toggle('hint', hint.has(sq));
            const p = G.board[sq];
            const label = sqName(sq) + (p ? ', ' + (p === 1 ? 'pedra branca' : p === 2 ? 'dama branca' : p === -1 ? 'pedra preta' : 'dama preta') : ', vazia')
                + (dest.has(sq) ? ' — mover para aqui' : '');
            if (el.getAttribute('aria-label') !== label) el.setAttribute('aria-label', label);
        }
        Object.keys(ui.els).forEach(k => {
            const el = ui.els[k], sq = +k;
            el.classList.toggle('sel', !!(human && s && s.from === sq));
            el.classList.toggle('must', must.has(sq));
            el.classList.toggle('target', targets.has(sq));
        });
        // Barras: vez de jogar, a pensar, peças tomadas
        const opp = $('dm-bar-opp'), me = $('dm-bar-me');
        if (opp && me) {
            opp.classList.toggle('turn', !G.over && G.turn !== G.human);
            me.classList.toggle('turn', !G.over && G.turn === G.human);
            opp.classList.toggle('thinking', G.thinking);
            let nw = 0, nb = 0;
            for (const sq of E.DARK) { const p = G.board[sq]; if (p > 0) nw++; else if (p < 0) nb++; }
            const tookByHuman = 12 - (G.human > 0 ? nb : nw), tookByAi = 12 - (G.human > 0 ? nw : nb);
            capsHtml($('dm-caps-me'), tookByHuman, G.human > 0 ? 'b' : 'w');
            capsHtml($('dm-caps-opp'), tookByAi, G.human > 0 ? 'w' : 'b');
        }
        const st = statusInfo();
        if (st && ui.status) {
            if (ui.status.textContent !== st.t) ui.status.textContent = st.t;
            ui.status.className = 'dm-status' + (st.c ? ' ' + st.c : '') + (G.over ? ' link' : '');
            if (G.over) { ui.status.dataset.act = 'end'; ui.status.setAttribute('role', 'button'); ui.status.tabIndex = 0; }
            else { delete ui.status.dataset.act; ui.status.removeAttribute('role'); ui.status.removeAttribute('tabindex'); }
        }
        const u = $('dm-undo'), h = $('dm-hint');
        if (u) u.disabled = !canUndo();
        if (h) h.disabled = !human || G.hinting;
    }
    function capsHtml(el, n, color) {
        if (!el) return;
        const key = n + color;
        if (el.dataset.k === key) return;
        el.dataset.k = key;
        let h = '';
        for (let i = 0; i < Math.min(n, 12); i++) h += `<span class="dm-mini-pc ${color}"></span>`;
        el.innerHTML = n ? h + `<span class="dm-caps-n">${n}</span>` : '';
        el.setAttribute('aria-label', n ? plural(n, 'peça tomada', 'peças tomadas') : '');
    }
    function statusInfo() {
        if (G.over) {
            const r = G.over.result;
            return { t: (r === 'win' ? '🏆 Ganhaste! ' : r === 'loss' ? 'Ganhou o computador. ' : '🤝 Empate. ') + 'Toca aqui para ver o resultado.', c: r === 'win' ? 'good' : r === 'loss' ? 'bad' : '' };
        }
        if (G.thinking) return { t: 'O computador está a pensar…', c: 'dim' };
        if (G.anim) return null;
        if (G.turn !== G.human) return { t: '', c: '' };
        if (G.hinting) return { t: 'A procurar uma boa jogada…', c: 'dim' };
        if (G.hintMove) return { t: '💡 Sugestão: a peça e o caminho que piscam.', c: 'tip' };
        if (G.sel && G.sel.path.length > 1) return { t: 'Continua: toca na casa seguinte do caminho.', c: '' };
        const n = G.legal && G.legal.length ? G.legal[0].caps.length : 0;
        if (n) return { t: n > 1 ? `Tomada obrigatória: tens de tomar ${n} peças!` : 'Tomada obrigatória!', c: 'warn' };
        if (G.quiet >= 20) return { t: `A tua vez · empate daqui a ${plural(Math.ceil((40 - G.quiet) / 2), 'lance', 'lances')} sem tomadas`, c: '' };
        return { t: G.plies < 2 ? 'A tua vez: toca numa peça e depois na casa para onde a queres mover.' : 'A tua vez', c: '' };
    }

    // ---------- Fluxo da partida ----------
    function alive(token) { return !!(ui && screen === 'game' && G && token === G.token); }
    function continueGame() {
        if (!G || !ui) return;
        const end = checkEnd();
        if (end) { finish(end); return; }
        if (G.turn === G.human) {
            G.legal = E.legalMoves(G.board, G.turn);
            G.sel = null;
            refresh();
        } else aiTurn();
    }
    function checkEnd() {
        const legal = E.legalMoves(G.board, G.turn);
        const humanTurn = G.turn === G.human;
        if (!legal.length) {
            const hasPieces = E.DARK.some(sq => G.board[sq] !== 0 && (G.board[sq] > 0) === (G.turn > 0));
            return {
                result: humanTurn ? 'loss' : 'win',
                reason: hasPieces
                    ? (humanTurn ? 'Ficaste sem jogadas possíveis.' : 'O computador ficou sem jogadas possíveis.')
                    : (humanTurn ? 'O computador tomou-te todas as peças.' : 'Tomaste todas as peças do computador.')
            };
        }
        if (G.quiet >= 40) return { result: 'draw', reason: '20 lances de cada lado sem tomadas nem movimentos de pedras.' };
        const k = E.keyOf(G.board, G.turn);
        let n = 1;
        for (const h of G.hist) if (h.k === k) n++;
        if (n >= 3) return { result: 'draw', reason: 'A mesma posição repetiu-se 3 vezes.' };
        return null;
    }
    function finish(end) {
        G.over = end; G.thinking = false; G.sel = null; G.legal = null; G.hintMove = null;
        saveGame(); // apaga a partida gravada
        const st = store().stats;
        const s = st[G.level] || (st[G.level] = { w: 0, l: 0, d: 0 });
        const f = end.result === 'win' ? 'w' : end.result === 'loss' ? 'l' : 'd';
        s[f] = (s[f] | 0) + 1;
        persist();
        refresh();
        sound(end.result);
        if (end.result === 'win') setTimeout(confetti, 200);
        const token = G.token;
        setTimeout(() => { if (alive(token)) showEnd(); }, 700);
    }
    function showEnd() {
        if (!G || !G.over) return;
        const r = G.over, li = LEVEL_INFO[G.level], rec = record(G.level);
        const t = r.result === 'win' ? { e: '🏆', h: 'Ganhaste!' } : r.result === 'loss' ? { e: '😅', h: 'Desta vez ganhou o computador' } : { e: '🤝', h: 'Empate' };
        let extra = '';
        if (r.result === 'win' && G.level < 4 && rec.w >= 2) extra = `<p class="dm-dlg-tip">Estás a dominar o nível ${li.name}. Que tal experimentar o ${LEVEL_INFO[G.level + 1].name}?</p>`;
        else if (r.result === 'loss') extra = `<p class="dm-dlg-tip">💡 ${esc(TIPS[(Math.random() * TIPS.length) | 0])}</p>`;
        showDialog(`
            <div class="dm-end-emoji" aria-hidden="true">${t.e}</div>
            <h2 class="dm-dlg-h">${t.h}</h2>
            <p class="dm-dlg-p">${esc(r.reason)}</p>
            <div class="dm-end-rec"><span>${li.emoji} Nível ${li.name}</span><span>${recordText(G.level)}</span></div>
            ${extra}
            <button type="button" class="dm-btn dm-btn-go" data-act="again">Jogar outra vez</button>
            <div class="dm-dlg-row">
                <button type="button" class="dm-btn dm-btn-ghost" data-act="view">Ver tabuleiro</button>
                <button type="button" class="dm-btn dm-btn-ghost" data-act="setup">Mudar nível</button>
            </div>`, 'end');
    }
    function findMove(list, mv) {
        if (!mv) return null;
        const key = m => m.from + '>' + m.to + ':' + m.caps.slice().sort((a, b) => a - b).join(',');
        const k = key(mv);
        return list.find(m => key(m) === k) || null;
    }
    async function aiTurn() {
        const token = G.token;
        G.thinking = true; G.legal = null; G.sel = null;
        refresh();
        const t0 = Date.now();
        const res = await askEngine({ board: Array.from(G.board), side: G.turn, level: G.level, seed: G.seed + G.plies, seen: seenMap() });
        if (!alive(token)) return;
        const wait = MIN_THINK - (Date.now() - t0);
        if (wait > 0) await sleep(wait);
        if (!alive(token)) return;
        G.thinking = false;
        const legal = E.legalMoves(G.board, G.turn);
        const m = findMove(legal, res && res.move) || legal[0];
        if (!m) { continueGame(); return; }
        await playMove(m);
    }
    async function playMove(m) {
        const token = G.token;
        const mv = { from: m.from, to: m.to, path: m.path.slice(), caps: m.caps.slice(), promote: m.promote, piece: m.piece };
        // O estado muda já (e fica gravado); a animação é só visual.
        G.hist.push(snapshot());
        E.make(G.board, m);
        G.quiet = (mv.caps.length || mv.piece === 1 || mv.piece === -1) ? 0 : G.quiet + 1;
        G.last = { path: mv.path, caps: mv.caps };
        G.turn = -G.turn; G.plies++;
        G.sel = null; G.hintMove = null; G.legal = null; G.hinting = false;
        saveGame();
        G.anim = true;
        refresh();
        await animateMove(mv, token);
        if (!alive(token)) return;
        G.anim = false;
        syncPieces();
        continueGame();
    }
    async function animateMove(m, token) {
        const el = ui && ui.els[m.from];
        if (!el) return;
        const gen = ui;
        el.classList.remove('sel', 'must', 'target');
        el.classList.add('moving');
        for (let i = 1; i < m.path.length; i++) {
            const a = m.path[i - 1], b = m.path[i];
            const dist = Math.abs((b >> 3) - (a >> 3));
            const dur = reduceMotion ? 0 : Math.min(460, 150 + dist * 50);
            el.style.transitionDuration = dur + 'ms';
            placeEl(el, b);
            const capEl = m.caps.length ? gen.els[m.caps[i - 1]] : null;
            setTimeout(() => { sound(m.caps.length ? 'cap' : 'move'); if (capEl) capEl.classList.add('taken'); }, dur * 0.7);
            await sleep(dur + (i < m.path.length - 1 ? 70 : 10));
            if (ui !== gen || !alive(token)) return;
        }
        el.classList.remove('moving');
        el.style.transitionDuration = '';
        // As peças tomadas só saem no fim do lance.
        for (const c of m.caps) {
            const ce = gen.els[c];
            if (ce) { ce.classList.add('gone'); setTimeout(() => ce.remove(), 260); delete gen.els[c]; }
        }
        delete gen.els[m.from];
        gen.els[m.to] = el;
        if (m.promote) {
            el.classList.add('k', 'crowned');
            sound('king');
            setTimeout(() => el.classList.remove('crowned'), 800);
            await sleep(reduceMotion ? 0 : 280);
        }
    }

    // ---------- Jogadas do jogador ----------
    function sameEffect(list) {
        const key = m => m.to + ':' + m.caps.slice().sort((x, y) => x - y).join(',');
        const k0 = key(list[0]);
        return list.every(m => key(m) === k0);
    }
    function onSquare(sq) {
        if (!G || G.over || G.anim || G.thinking || G.turn !== G.human || !G.legal) return;
        const s = G.sel;
        if (s) {
            // Um ponto cheio (casa final) termina sempre o lance ali; as casas
            // intermédias (anel) servem para escolher o caminho, casa a casa.
            const k = s.path.length;
            const fin = s.cands.filter(m => m.to === sq);
            if (fin.length) {
                if (sameEffect(fin)) { playMove(fin[0]); return; }
                // Dois caminhos diferentes até à mesma casa: escolhe-se casa a casa.
                s.cands = fin;
                toast('Há mais de um caminho até aí: toca nas casas por onde a peça passa.');
                refresh(); return;
            }
            const step = s.cands.filter(m => m.path[k] === sq);
            if (step.length) {
                s.path.push(sq); s.cands = step;
                const done = step.filter(m => m.path.length === s.path.length);
                if (done.length) { playMove(done[0]); return; }
                if (sameEffect(step)) { playMove(step[0]); return; }
                refresh(); return;
            }
            if (sq === s.from || (s.path.length > 1 && sq === s.path[s.path.length - 1])) { G.sel = null; refresh(); return; }
        }
        const mine = G.legal.filter(m => m.from === sq);
        if (mine.length) {
            G.sel = { from: sq, path: [sq], cands: mine };
            if (G.hintMove && G.hintMove.from !== sq) G.hintMove = null;
            refresh(); return;
        }
        const v = G.board[sq];
        if (v && (v > 0) === (G.human > 0)) {
            sound('bad');
            if (G.legal[0] && G.legal[0].caps.length) {
                toast('A tomada é obrigatória: joga com uma das peças assinaladas.');
                if (G.sel) G.sel = null;
                refresh();
                ui.pieces.querySelectorAll('.dm-pc.must').forEach(el => { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); });
                return;
            }
            toast('Essa peça não se pode mexer agora.');
        }
        if (G.sel) { G.sel = null; refresh(); }
    }
    async function hint() {
        if (!G || G.over || G.anim || G.thinking || G.hinting || G.turn !== G.human) return;
        const token = G.token, plies = G.plies;
        G.hinting = true; G.hintMove = null;
        refresh();
        const res = await askEngine({ board: Array.from(G.board), side: G.turn, level: 3, time: 800, noise: 0, seen: seenMap() });
        if (!alive(token)) return;
        G.hinting = false;
        const m = G.plies === plies && G.turn === G.human && G.legal && findMove(G.legal, res && res.move);
        if (m) {
            G.hintMove = m;
            G.sel = { from: m.from, path: [m.from], cands: G.legal.filter(x => x.from === m.from) };
        }
        refresh();
    }
    function undo() {
        if (!canUndo()) return;
        G.token++; G.thinking = false; G.hinting = false;
        cancelEngine();
        let i = G.hist.length - 1;
        while (i >= 0 && (G.hist[i].k[0] === 'w' ? 1 : -1) !== G.human) i--;
        if (i < 0) return;
        restore(G.hist[i]);
        G.hist.length = i;
        G.sel = null; G.hintMove = null; G.anim = false;
        saveGame();
        buildPieces();
        toast('Lance desfeito');
        continueGame();
    }

    // ---------- Arranque ----------
    function registerSW() {
        if (!('serviceWorker' in navigator) || !/^(https:|http:\/\/(localhost|127\.0\.0\.1)[:/])/.test(location.href)) return;
        // Versão nova ativa → recarrega (a partida está gravada; retoma onde estava).
        let had = !!navigator.serviceWorker.controller;
        navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) location.reload(); had = true; });
        navigator.serviceWorker.register('sw.js').catch(() => {});
    }
    function init() {
        const app = $('app');
        if (!app) return;
        const rules = app.querySelector('[data-act="rules"]');
        if (rules) rules.innerHTML = icon('help');
        app.addEventListener('click', onClick);
        document.addEventListener('keydown', onKey);
        window.addEventListener('popstate', onPop);
        document.addEventListener('pointerdown', unlockAudio, { once: true, capture: true });
        window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; refreshInstall(); });
        window.addEventListener('appinstalled', () => { installEvt = null; refreshInstall(); });
        const saved = loadGame();
        const onGameEntry = !!(history.state && history.state.dm === 'game');
        if (saved) {
            G = saved;
            if (onGameEntry) showGame();
            else { try { history.replaceState({ dm: 'menu' }, ''); } catch (e) {} goGame(); }
        } else {
            try { history.replaceState({ dm: 'menu' }, ''); } catch (e) {}
            showSetup();
        }
        registerSW();
    }

    window.DamasGame = { engine: E };
    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
        else init();
    }
})();

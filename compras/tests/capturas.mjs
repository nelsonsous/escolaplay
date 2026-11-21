// Capturas da app a 390 px, com uma amostra dos dados reais (economo/amostra.mjs), para rever o layout de cada ecrã:
//   [CORES=dia] node compras/tests/capturas.mjs <amostra.json> <pasta> [parte do nome]   (CORES=dia: o iPhone em claro)
// A folha (fixa, rola por dentro) tira-se inteira: a janela cresce até à altura dela. Não é um teste (não corre no
// npm test): é a ferramenta das voltas de layout (17/11/2026).
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pw = require('playwright');
const { abrir } = await import('./servidor.mjs');
const { esquecerTipos } = await import('../proxy/src/sugerir.js');
const [, , ficheiro, pasta, so] = process.argv;
const real = JSON.parse(readFileSync(ficheiro, 'utf8'));
const s = await abrir();
const agora = new Date().toISOString();
const poe = (tabela, linhas, fix = (x) => x) => {
    for (const l0 of linhas) {
        const l = fix({ ...l0 });
        const cs = Object.keys(l);
        s.env.DB.sql.prepare(`INSERT OR REPLACE INTO ${tabela} (${cs.join(', ')}) VALUES (${cs.map(() => '?').join(', ')})`).run(...cs.map((c) => l[c]));
    }
};
s.env.DB.sql.exec('DELETE FROM preco; DELETE FROM tipo;');
poe('tipo', real.tipo);
poe('preco', real.preco, (l) => ({ ...l, visto: agora }));
poe('vinho_nota', real.nota);
poe('produtor_artigo', real.prod, (l) => ({ ...l, visto: agora }));
poe('preco_historico', real.hist);
esquecerTipos();
const br = await pw.chromium.launch();
const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'pt-PT', colorScheme: process.env.CORES === 'dia' ? 'light' : 'dark' });
const a = await ctx.newPage();
const erros = [];
a.on('pageerror', (e) => erros.push(e.message));
a.on('console', (m) => { if (m.type() === 'error') erros.push('console: ' + m.text()); });
const tira = async (nome, inteira = true) => {
    if (so && !nome.includes(so)) return;
    await a.waitForTimeout(350);
    // a folha é fixa e rola por dentro: para a ver inteira, a janela cresce até à altura dela
    const alt = await a.evaluate(() => { const c = document.querySelector('#folha .cartao'); return c ? c.scrollHeight + 80 : 0; });
    if (alt > 844) { await a.setViewportSize({ width: 390, height: Math.min(alt, 6000) }); await a.waitForTimeout(200); }
    await a.screenshot({ path: `${pasta}/${nome}.png`, fullPage: inteira && !alt });
    if (alt > 844) await a.setViewportSize({ width: 390, height: 844 });
    console.log('✓', nome, alt || '');
};
await a.goto(s.url());
await a.waitForFunction(() => localStorage.getItem('compras:chave'));
const chave = await a.evaluate(() => localStorage.getItem('compras:chave'));
await tira('01-lista-vazia');
// um talão do SPAR, para o «Costumas comprar»
const casa = s.env.DB.sql.prepare('SELECT id FROM casa LIMIT 1').get().id;
s.env.DB.sql.prepare('INSERT INTO talao (id, casa, loja, dia, total, doc, linhas, criado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run('t1', casa, 'spar', agora.slice(0, 10), 384, 'FS1',
    JSON.stringify([{ t: 'Água SPAR Nascente 6 lt', q: 1, cent: 86 }, { t: 'Mini Pizza York Cheddar un', q: 1, cent: 199 }, { t: 'Pão C/ Chouriço un', q: 1, cent: 99 }]), agora);
const junta = async (texto, chip, nome, antes) => {
    await a.fill('[data-onda="junta"]', texto);
    await a.waitForSelector(`#sug .chip:has-text("${chip}")`);
    if (nome === '02') await tira('02-sugestoes', false);
    await a.click(`#sug .chip:has-text("${chip}") >> nth=0`);
    await a.waitForSelector('#folha [data-onda="juntat:0"]');
    if (antes) await antes();
    if (nome) await tira(nome);
    await a.click('#folha [data-onda="juntat:0"]');
    await a.waitForFunction(() => !document.querySelector('#folha .cartao'));
};
await junta('leite', 'Leite', '03-folha-leite');
await junta('agua', 'Água sem gás', '04-folha-agua');
await junta('vinho', 'Vinho tinto', '05-folha-vinho');
await junta('carne picada', 'Carne picada', '06-folha-carne-picada');
await junta('rolos', 'Rolos de cozinha', null);
await junta('azeite', 'Azeite', '07-folha-azeite');
await junta('bacalhau', 'Bacalhau', '08-folha-bacalhau');
await a.fill('[data-onda="junta"]', 'pilhas, 2 detergente da loiça');
await a.click('[data-onda="juntar"], button:has-text("Juntar")');
await a.waitForTimeout(600);
await a.reload();
await a.waitForSelector('.item');
await tira('10-lista');
await a.click('.item .texto >> nth=0');
await a.waitForSelector('#folha .cartao');
await tira('11-folha-reabrir');
await a.click('#folha .fechar');
await a.click('.item .texto:has-text("pilhas")');
await a.waitForSelector('#folha .cartao');
await a.waitForTimeout(500);
await tira('12-folha-sem-tipo');
await a.click('#folha .fechar');
await a.click('.item .caixa >> nth=0');
await a.waitForTimeout(400);
await a.click('#abas button >> nth=1');
await a.waitForTimeout(500);
await tira('20-mais-barato');
const ir = a.locator('.cadeias .ir >> nth=0');
if (await ir.count()) { await ir.click(); await a.waitForTimeout(500); await tira('21-lista-na-loja'); await a.click('[data-onda="loja:9"]'); }
await a.click('#abas button >> nth=2');
await a.waitForTimeout(700);
await tira('30-casa');
await a.click('#abas button >> nth=0');
const sec = a.locator('button:has-text("Ver por secções")');
if (await sec.count()) { await sec.click(); await a.waitForTimeout(500); await tira('40-seccoes'); }
console.log('erros:', JSON.stringify(erros));
await br.close(); await s.fechar();
process.exit(0);

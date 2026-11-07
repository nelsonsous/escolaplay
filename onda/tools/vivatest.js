const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const [w, scheme, wait] of [[1280, 'light', 16000], [400, 'dark', 9000]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, colorScheme: scheme });
    const p = await ctx.newPage(); const errs = [];
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push(String(e)));
    await p.goto(process.argv[2] + '/_test.html'); await p.waitForTimeout(wait);
    const r = await p.evaluate(() => ({
      over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      forma: document.getElementById('ro-forma').textContent, res: document.getElementById('ro-res').textContent, fps: document.getElementById('ro-fps').textContent,
      tabela: [...document.querySelectorAll('#formas tr')].map(tr => [...tr.children].map(td => td.textContent).join(' | ')),
      vig: document.getElementById('vig').textContent,
      testes: document.querySelectorAll('#testes li:not(.vazio)').length,
      diario: [...document.querySelectorAll('#diario li')].reverse().map(li => li.textContent.slice(0, 170)),
    }));
    console.log(JSON.stringify({ w, scheme, ...r, errs }, null, 1));
    if (w === 1280) {
      await p.fill('#src', (await p.inputValue('#src')).replace('= k 0', '= k 1')); await p.waitForTimeout(6500);
      const d2 = await p.evaluate(() => [...document.querySelectorAll('#diario li')].slice(0, 4).map(li => li.textContent.slice(0, 120)));
      console.log('apos editar:', JSON.stringify(d2, null, 1));
    }
    await ctx.close();
  }
  await b.close();
})();

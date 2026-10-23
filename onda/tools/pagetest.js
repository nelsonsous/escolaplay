const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const [w, scheme] of [[1280, 'light'], [400, 'dark']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, colorScheme: scheme });
    const p = await ctx.newPage(); const errs = [];
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push(String(e)));
    await p.goto(process.argv[2] + '/_test.html'); await p.waitForTimeout(2500);
    const r = await p.evaluate(() => ({ over: document.documentElement.scrollWidth - document.documentElement.clientWidth, status: document.getElementById('status').textContent, dev: document.getElementById('ro-dev').textContent, out: document.getElementById('out-size').textContent, files: document.querySelectorAll('#flist button').length, view: document.getElementById('vbody').textContent.slice(0, 30), bars: document.querySelectorAll('.crow').length, bg: getComputedStyle(document.body).backgroundColor, fg: getComputedStyle(document.body).color }));
    await p.click('#verify'); await p.waitForTimeout(1500);
    r.verify = await p.textContent('#vres');
    await p.fill('#src', ': px fffff>i x y t w h + 1 2.5\n: main >i 0'); await p.waitForTimeout(600);
    r.err = await p.textContent('#status');
    await p.click('#tab-c'); await p.selectOption('#ex', 'ondas'); await p.waitForTimeout(800);
    r.c = (await p.textContent('#out')).slice(0, 40).replace(/\n/g, ' '); r.status2 = await p.textContent('#status');
    console.log(JSON.stringify({ w, scheme, ...r, errs }, null, 1));
    await ctx.close();
  }
  await b.close();
})();

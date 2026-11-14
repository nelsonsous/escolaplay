// A casca: carrega o módulo e entrega-o ao anfitrião. A app está toda em app.onda; aqui só entra o que o browser
// não deixa fazer de outra maneira (carregar o WebAssembly, registar o service worker, saber que a página se escondeu).
(async () => {
    try {
        const r = await fetch('gerado/app.wasm?v=1');
        if (!r.ok) throw new Error(String(r.status));
        // prefixo: o nome das chaves desta app no armazém do browser
        window.app = OndaApp.criar(new Uint8Array(await r.arrayBuffer()), { prefixo: 'ginastica:' });
    } catch (e) {
        document.querySelector('#ecra').innerHTML = '<p class="vazio">Não foi possível abrir a app.</p>';
        return;
    }
    // a página deixou de se ver (outra app, o ecrã bloqueado): a sessão pára, e continua quando a pessoa quiser
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') window.app.chamar('clique', window.app.escrever('esconde:0'));
    });
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js');
})();

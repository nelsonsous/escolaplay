// A casca: carrega o módulo e entrega-o ao anfitrião. A app está toda em app.onda; aqui só entra o que o browser
// não deixa fazer de outra maneira (carregar o WebAssembly, registar o service worker, o teclado).
(async () => {
    try {
        const r = await fetch('gerado/app.wasm?v=1');
        if (!r.ok) throw new Error(String(r.status));
        // prefixo: o nome das chaves desta app no armazém do browser (muda-o ao copiar o molde)
        window.app = OndaApp.criar(new Uint8Array(await r.arrayBuffer()), { prefixo: 'molde:' });
    } catch (e) {
        document.querySelector('#lista').innerHTML = '<p class="vazio">Não foi possível abrir a app.</p>';
        return;
    }
    // Esc fecha a folha (um evento que não vem de um elemento com data-onda)
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') window.app.chamar('clique', window.app.escrever('fecha:0')); });
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js');
})();

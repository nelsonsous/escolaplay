// EscolaPlay — Conteúdo SECRETO cifrado.
// Cada entrada é um blob AES-GCM. O texto claro só é acessível com a
// password correta inserida em runtime (long-press na versão). Sem
// password isto é gibberish; o GitHub público mostra apenas estes
// blobs ininteligíveis.
//
// Para CRIAR / ATUALIZAR blobs, abre encrypt-tool.html localmente
// no browser, cifra o teu conteúdo, e substitui a array abaixo.
//
// Formato de cada blob:
// {
//   id:    'pack-id',           // identificador interno
//   label: 'Dica visível',      // hint mostrado se errar (opcional)
//   ct:    'base64',            // ciphertext + tag GCM
//   salt:  'base64',            // salt do PBKDF2 (16 bytes)
//   iv:    'base64',            // nonce GCM (12 bytes)
//   iters: 250000               // iterações PBKDF2
// }
//
// Conteúdo decifrado (plaintext) deve ser JSON com forma:
// {
//   year: 5,                                  // ano onde injetar
//   subjects:   { key: { name, icon, color } },
//   curriculum: { key: ['Topic1', ...] },
//   periods:    { key: { 'Topic1': 1, ... } },
//   lessons:    { 'key/Topic1': { title, body } },
//   exercises:  [ { id, s, t, type, q, ... } ]
// }

const SECRET_PACKS = [
    // (vazio por defeito — adiciona blobs gerados em encrypt-tool.html)
];
if (typeof window !== 'undefined') window.SECRET_PACKS = SECRET_PACKS;

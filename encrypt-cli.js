#!/usr/bin/env node
// EscolaPlay — CLI para cifrar conteúdo secreto sem abrir o browser.
// Produz o mesmo formato que encrypt-tool.html (compatível com Web Crypto
// AES-256-GCM + PBKDF2-SHA256, 250k iters).
//
// Uso:
//   node encrypt-cli.js <input.json> [pack-id] [label]
//   cat content.json | node encrypt-cli.js - [pack-id] [label]
//
// Exemplos:
//   node encrypt-cli.js my-secret.json sap-en "SAP English"
//   node encrypt-cli.js my-secret.json sap-en
//   echo '{"year":5,"subjects":{"x":{"name":"X","icon":"fa-key","color":"#0070f3"}}}' | node encrypt-cli.js -
//
// Flag opcional:
//   --write    Em vez de imprimir o blob, INSERE no array SECRET_PACKS de
//              content_secret.js (ficheiro no mesmo diretório do script).
//
// A password é pedida interativamente (oculta no terminal). Nunca é
// guardada — se a perderes, o blob é irrecuperável.

const crypto   = require('crypto');
const fs       = require('fs');
const path     = require('path');

const ITERS = 250000;

function help() {
    console.log('Uso: node encrypt-cli.js <input.json|-> [pack-id] [label] [--write]');
    console.log('Exemplo: node encrypt-cli.js my-secret.json sap-en "SAP English"');
    console.log('Lê stdin: cat conteudo.json | node encrypt-cli.js -');
    console.log('--write: insere o blob no array SECRET_PACKS de content_secret.js');
}

function promptPassword(prompt) {
    return new Promise((resolve, reject) => {
        const stdin = process.stdin;
        if (!stdin.isTTY) {
            // Sem TTY (a ler de pipe?) — não dá para pedir password interativa
            const envPw = process.env.ESCOLAPLAY_PWD;
            if (envPw) return resolve(envPw);
            return reject(new Error('Sem TTY interativo. Define ESCOLAPLAY_PWD ou corre num terminal.'));
        }
        process.stdout.write(prompt);
        stdin.setRawMode(true);
        stdin.resume();
        stdin.setEncoding('utf8');
        let buf = '';
        const onData = (ch) => {
            ch = String(ch);
            if (ch === '') { stdin.setRawMode(false); stdin.pause(); process.stdout.write('\n'); reject(new Error('Cancelado.')); return; }
            if (ch === '\r' || ch === '\n') {
                stdin.setRawMode(false);
                stdin.pause();
                stdin.removeListener('data', onData);
                process.stdout.write('\n');
                resolve(buf);
                return;
            }
            if (ch === '' || ch === '') { // backspace
                if (buf.length) buf = buf.slice(0, -1);
                return;
            }
            buf += ch;
        };
        stdin.on('data', onData);
    });
}

async function readPlaintext(arg) {
    if (arg === '-') {
        return await new Promise((resolve, reject) => {
            let data = '';
            process.stdin.setEncoding('utf8');
            process.stdin.on('data', (c) => data += c);
            process.stdin.on('end', () => resolve(data));
            process.stdin.on('error', reject);
        });
    }
    return fs.readFileSync(arg, 'utf8');
}

function insertIntoSecretFile(blob, filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error('content_secret.js não encontrado em ' + filePath);
    }
    let txt = fs.readFileSync(filePath, 'utf8');
    // Insere o blob antes do `];` que fecha o array SECRET_PACKS.
    // Heurística simples: procurar o último `]` antes de `if (typeof window`.
    const marker = '\n];';
    const ix = txt.lastIndexOf(marker);
    if (ix < 0) throw new Error('Não encontrei o fecho do array SECRET_PACKS.');
    const formatted = '    ' + JSON.stringify(blob, null, 4).replace(/\n/g, '\n    ') + ',\n';
    // Verifica se já existe um pack com este id e remove
    const idMarker = '"id": "' + blob.id + '"';
    if (txt.includes(idMarker)) {
        console.error('⚠️  Já existe pack com id "' + blob.id + '". Vai substituir o anterior.');
        // Remove bloco antigo: procura "{" antes do id e "}," depois
        const startIx = txt.lastIndexOf('{', txt.indexOf(idMarker));
        const endIx   = txt.indexOf('},', txt.indexOf(idMarker)) + 2;
        if (startIx >= 0 && endIx > startIx) {
            txt = txt.slice(0, startIx).replace(/\s*$/, '') + '\n' + txt.slice(endIx);
        }
    }
    const newTxt = txt.slice(0, txt.lastIndexOf(marker)) + '\n' + formatted + txt.slice(txt.lastIndexOf(marker));
    fs.writeFileSync(filePath, newTxt);
}

async function main() {
    const args = process.argv.slice(2);
    if (!args.length || args[0] === '-h' || args[0] === '--help') { help(); process.exit(args.length ? 0 : 1); }

    const writeMode = args.includes('--write');
    const positional = args.filter(a => a !== '--write');
    const input  = positional[0];
    const packId = positional[1] || 'pack-' + Date.now().toString(36);
    const label  = positional[2] || '';

    const plaintext = await readPlaintext(input);
    // Validar JSON antes de cifrar
    try { JSON.parse(plaintext); }
    catch (e) { console.error('ERR: input não é JSON válido:', e.message); process.exit(1); }

    const password = await promptPassword('🔑 Password: ');
    if (!password) { console.error('ERR: password vazia.'); process.exit(1); }
    if (password.length < 6) console.error('⚠️  Password curta — recomendado mínimo 8 chars.');

    const salt = crypto.randomBytes(16);
    const iv   = crypto.randomBytes(12);
    const key  = crypto.pbkdf2Sync(password, salt, ITERS, 32, 'sha256');

    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ct1 = cipher.update(plaintext, 'utf8');
    const ct2 = cipher.final();
    const tag = cipher.getAuthTag(); // 16 bytes
    // WebCrypto AES-GCM espera ciphertext + tag concatenados → respeitar formato
    const ct  = Buffer.concat([ct1, ct2, tag]);

    const blob = {
        id: packId,
        ...(label ? { label } : {}),
        ct:    ct.toString('base64'),
        salt:  salt.toString('base64'),
        iv:    iv.toString('base64'),
        iters: ITERS
    };

    if (writeMode) {
        const target = path.join(path.dirname(__filename), 'content_secret.js');
        insertIntoSecretFile(blob, target);
        console.error('✓ Blob inserido em ' + target + ' (pack "' + packId + '").');
    } else {
        console.error('✓ Blob gerado para o pack "' + packId + '" (' + blob.ct.length + ' chars). Copia ↓');
        console.error('');
        // Imprime ASCII formatado pronto a copiar para content_secret.js
        const formatted = '    ' + JSON.stringify(blob, null, 4).replace(/\n/g, '\n    ') + ',';
        console.log(formatted);
    }
}

main().catch(e => { console.error('ERR:', e.message); process.exit(1); });

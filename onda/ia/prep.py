# Prepara um modelo Qwen2/Qwen2.5 (Hugging Face) para o motor em Onda (ia/qwen.onda). Corre uma vez.
# Le config.json, tokenizer.json e os cabecalhos dos model*.safetensors (um ou varios ficheiros) (so a biblioteca padrao do Python) e escreve
# um ficheiro de texto com numeros: a configuracao, a lista dos tensores (pela ordem do ficheiro), o vocabulario
# (os bytes de cada token) e as fusoes do BPE (por ordem de prioridade). Os pesos ficam no safetensors original.
# Uso: python3 ia/prep.py pasta-do-modelo > pasta-do-modelo/qwen.prep
# (os safetensors vao depois para o motor pela mesma ordem: a dos nomes)
import json, struct, sys, os, re

d = sys.argv[1]
cfg = json.load(open(os.path.join(d, 'config.json')))
tok = json.load(open(os.path.join(d, 'tokenizer.json'), encoding='utf-8'))
import glob
shards = sorted(glob.glob(os.path.join(d, 'model*.safetensors')))
out = []
w = out.append

# configuracao (a 1.a linha marca o formato: o ia/ia refaz os ficheiros antigos)
w('#prep-dois')
H, L, NH, NKV, FF = cfg['hidden_size'], cfg['num_hidden_layers'], cfg['num_attention_heads'], cfg['num_key_value_heads'], cfg['intermediate_size']
w('%d %d %d %d %d %d %d %d' % (H, L, NH, NKV, FF, cfg['vocab_size'], int(cfg['rope_theta']), 1 if cfg.get('tie_word_embeddings') else 0))
# mais: epsilon do RMSNorm (x 1e9), RoPE escalado do Llama 3 (tipo, fator, baixa, alta x 1000, contexto original),
# tokens especiais (<|im_start|>, <|im_end|>, outro fim, inicio do texto) e se e um Qwen (para as instrucoes por omissao)
rs = cfg.get('rope_scaling') or {}
l3 = 1 if rs.get('rope_type') == 'llama3' else 0
esp = {a['content']: a['id'] for a in tok.get('added_tokens', [])}
tc = {}
try: tc = json.load(open(os.path.join(d, 'tokenizer_config.json')))
except Exception: pass
ct = tc.get('chat_template', '')
if isinstance(ct, list): ct = ' '.join(x.get('template', '') for x in ct)
bos = esp.get(tc.get('bos_token') or '', 0) if 'bos_token' in ct else 0
eos2 = esp.get('<|endoftext|>', esp.get('<|eot_id|>', esp.get('<|end_of_text|>', 0)))
w('%d %d %d %d %d %d %d %d %d %d %d' % (round(cfg.get('rms_norm_eps', 1e-6) * 1e9), l3, round(rs.get('factor', 1) * 1000),
  round(rs.get('low_freq_factor', 1) * 1000), round(rs.get('high_freq_factor', 4) * 1000),
  rs.get('original_max_position_embeddings', 8192), esp['<|im_start|>'], esp['<|im_end|>'], eos2, bos,
  1 if cfg.get('model_type') == 'qwen2' else 0))
# tensores: tipo, camada, inicio (bytes, a partir do inicio dos dados), linhas, colunas
kinds = {'input_layernorm.weight': 0, 'self_attn.q_proj.weight': 1, 'self_attn.q_proj.bias': 2,
         'self_attn.k_proj.weight': 3, 'self_attn.k_proj.bias': 4, 'self_attn.v_proj.weight': 5,
         'self_attn.v_proj.bias': 6, 'self_attn.o_proj.weight': 7, 'post_attention_layernorm.weight': 8,
         'mlp.gate_proj.weight': 9, 'mlp.up_proj.weight': 10, 'mlp.down_proj.weight': 11}
w('%d' % len(shards))
for sf in shards:
    f = open(sf, 'rb')
    hl = struct.unpack('<Q', f.read(8))[0]
    hdr = json.loads(f.read(hl))
    ts = []
    for name, t in hdr.items():
        if name == '__metadata__': continue
        assert t['dtype'] == 'BF16', (name, t['dtype'])
        sh = t['shape']; r = sh[0]; c = sh[1] if len(sh) > 1 else 1
        s, e = t['data_offsets']
        m = re.match(r'model\.layers\.(\d+)\.(.*)', name)
        if m: k, l = kinds[m.group(2)], int(m.group(1))
        elif name == 'model.embed_tokens.weight': k, l = 20, 0
        elif name == 'model.norm.weight': k, l = 21, 0
        elif name == 'lm_head.weight': k, l = 22, 0
        else: raise SystemExit('tensor desconhecido: ' + name)
        ts.append((s, k, l, r, c))
    ts.sort()
    w('%d %d' % (8 + hl, len(ts)))
    for s, k, l, r, c in ts: w('%d %d %d %d %d' % (k, l, s, r, c))

# vocabulario: bytes de cada token (os tokens normais vem na codificacao byte-a-unicode do GPT-2)
bs = list(range(ord('!'), ord('~') + 1)) + list(range(ord('¡'), ord('¬') + 1)) + list(range(ord('®'), ord('ÿ') + 1))
cs = bs[:]; n = 0
for b in range(256):
    if b not in bs: bs.append(b); cs.append(256 + n); n += 1
u2b = {chr(c): b for b, c in zip(bs, cs)}
vocab = {}
for s, i in tok['model']['vocab'].items(): vocab[i] = bytes(u2b[ch] for ch in s)
special = set()
for a in tok.get('added_tokens', []):
    vocab[a['id']] = a['content'].encode('utf-8'); special.add(a['id'])
V = max(vocab) + 1
w('%d' % V)
for i in range(V):
    b = vocab.get(i, b'')
    w(('%d %d ' % (1 if i in special else 0, len(b))) + ' '.join(str(x) for x in b))

# fusoes: id da esquerda, id da direita, id do resultado (a ordem e a prioridade)
ids = tok['model']['vocab']
mg = tok['model']['merges']
w('%d' % len(mg))
for m in mg:
    a, b = m.split(' ', 1) if isinstance(m, str) else m
    w('%d %d %d' % (ids[a], ids[b], ids[a + b]))
w('FIM')
sys.stdout.write('\n'.join(out) + '\n')

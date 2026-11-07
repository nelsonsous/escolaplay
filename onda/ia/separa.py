# Usado pelo ia/ensina: mostra no ecra o progresso do treino e guarda o que vem depois da marca "\1ONDALORA\n"
# (o LoRA aprendido) no ficheiro dado. Uso: motor --treina ... | python3 ia/separa.py saida.lora
import sys
marca = b'\x01ONDALORA\n'
ent, sai = sys.stdin.buffer, sys.stdout.buffer
buf = b''
while True:
    b = ent.read1(65536)
    if not b: break
    buf += b
    i = buf.find(marca)
    if i >= 0:
        sai.write(buf[:i]); sai.flush()
        with open(sys.argv[1] + '.part', 'wb') as f:
            f.write(buf[i:])
            while True:
                b = ent.read(1 << 20)
                if not b: break
                f.write(b)
        import os
        os.replace(sys.argv[1] + '.part', sys.argv[1])
        sys.exit(0)
    k = max(0, len(buf) - len(marca))
    sai.write(buf[:k]); sai.flush(); buf = buf[k:]
sai.write(buf)
sys.exit('ia: o treino nao terminou (nao veio o LoRA)')

#!/usr/bin/env python3
"""Gera src/9mat.onda: a matematica da Onda escrita em Onda (porte fiel do fdlibm, o mesmo algoritmo do Math do V8).

As constantes entram pelo padrao de bits (Bw alto baixo), que o compilador dobra numa constante exata:
assim nao dependem da leitura de literais decimais longos, que so e exata no C e no JavaScript.
Uso: python3 tools/gerar_mat.py  (escreve src/9mat.onda)
"""
import os, re, struct

def bits(v):
    b = struct.unpack('>Q', struct.pack('>d', v))[0]
    return b >> 32, b & 0xFFFFFFFF

# constantes do fdlibm (valor decimal e bits indicados na fonte original, conferidos abaixo)
K = {
  'S1': (-1.66666666666666324348e-01, 0xBFC55555, 0x55555549),
  'S2': (8.33333333332248946124e-03, 0x3F811111, 0x1110F8A6),
  'S3': (-1.98412698298579493134e-04, 0xBF2A01A0, 0x19C161D5),
  'S4': (2.75573137070700676789e-06, 0x3EC71DE3, 0x57B1FE7D),
  'S5': (-2.50507602534068634195e-08, 0xBE5AE5E6, 0x8A2B9CEB),
  'S6': (1.58969099521155010221e-10, 0x3DE5D93A, 0x5ACFD57C),
  'C1': (4.16666666666666019037e-02, 0x3FA55555, 0x5555554C),
  'C2': (-1.38888888888741095749e-03, 0xBF56C16C, 0x16C15177),
  'C3': (2.48015872894767294178e-05, 0x3EFA01A0, 0x19CB1590),
  'C4': (-2.75573143513906633035e-07, 0xBE927E4F, 0x809C52AD),
  'C5': (2.08757232129817482790e-09, 0x3E21EE9E, 0xBDB4B1C4),
  'C6': (-1.13596475577881948265e-11, 0xBDA8FAE9, 0xBE8838D4),
  'INVPIO2': (6.36619772367581382433e-01, 0x3FE45F30, 0x6DC9C883),
  'PIO2': (1.5707963267948966, 0x3FF921FB, 0x54442D18),
  'PIO2_1': (1.57079632673412561417e+00, 0x3FF921FB, 0x54400000),
  'PIO2_1T': (6.07710050650619224932e-11, 0x3DD0B461, 0x1A626331),
  'PIO2_2': (6.07710050630396597660e-11, 0x3DD0B461, 0x1A600000),
  'PIO2_2T': (2.02226624879595063154e-21, 0x3BA3198A, 0x2E037073),
  'PIO2_3': (2.02226624871116645580e-21, 0x3BA3198A, 0x2E000000),
  'PIO2_3T': (8.47842766036889956997e-32, 0x397B839A, 0x252049C1),
  'O_THR': (7.09782712893383973096e+02, 0x40862E42, 0xFEFA39EF),
  'U_THR': (-7.45133219101941108420e+02, 0xC0874910, 0xD52D3051),
  'LN2HI': (6.93147180369123816490e-01, 0x3FE62E42, 0xFEE00000),
  'LN2HIN': (-6.93147180369123816490e-01, 0xBFE62E42, 0xFEE00000),
  'LN2LO': (1.90821492927058770002e-10, 0x3DEA39EF, 0x35793C76),
  'LN2LON': (-1.90821492927058770002e-10, 0xBDEA39EF, 0x35793C76),
  'INVLN2': (1.44269504088896338700e+00, 0x3FF71547, 0x652B82FE),
  'P1': (1.66666666666666019037e-01, 0x3FC55555, 0x5555553E),
  'P2': (-2.77777777770155933842e-03, 0xBF66C16C, 0x16BEBD93),
  'P3': (6.61375632143793436117e-05, 0x3F11566A, 0xAF25DE2C),
  'P4': (-1.65339022054652515390e-06, 0xBEBBBD41, 0xC5D26BF1),
  'P5': (4.13813679705723846039e-08, 0x3E663769, 0x72BEA4D0),
  'E': (2.718281828459045, 0x4005BF0A, 0x8B145769),
  'HUGE': (1.0e+300, None, None),
  'TWOM1000': (9.33263618503218878990e-302, 0x01700000, 0x00000000),
  'TWO1023': (8.988465674311579539e307, 0x7FE00000, 0x00000000),
  'TWO54': (1.80143985094819840000e+16, 0x43500000, 0x00000000),
  'LG1': (6.666666666666735130e-01, 0x3FE55555, 0x55555593),
  'LG2': (3.999999999940941908e-01, 0x3FD99999, 0x9997FA04),
  'LG3': (2.857142874366239149e-01, 0x3FD24924, 0x94229359),
  'LG4': (2.222219843214978396e-01, 0x3FCC71C5, 0x1D8E78AF),
  'LG5': (1.818357216161805012e-01, 0x3FC74664, 0x96CB03DE),
  'LG6': (1.531383769920937332e-01, 0x3FC39A09, 0xD078C69F),
  'LG7': (1.479819860511658591e-01, 0x3FC2F112, 0xDF3E5244),
  'THIRD': (0.33333333333333333, 0x3FD55555, 0x55555555),
}
for n, (v, h, l) in K.items():
    hh, ll = bits(v)
    if h is not None:
        assert (hh, ll) == (h, l), (n, hex(hh), hex(ll))
    K[n] = (v, hh, ll)

# reducao de x (pi/4 < |x| <= 2^19 pi/2) para n e y0 + y1 (e_rem_pio2.c), partilhada pelo seno e pelo coseno
REDUZ = '''
    { = t Ab x
      = n I + * t $INVPIO2 0.5
      = fn F n
      = r - t * fn $PIO2_1
      = w * fn $PIO2_1T
      ? && < n 32 != ix Bh * fn $PIO2
        { = y0 - r w 0 }
        { = j >> ix 20
          = y0 - r w
          = i - j & >> Bh y0 20 0x7FF
          ? > i 16
            { = t r
              = w * fn $PIO2_2
              = r - t w
              = w - * fn $PIO2_2T - - t r w
              = y0 - r w
              = i - j & >> Bh y0 20 0x7FF
              ? > i 49
                { = t r
                  = w * fn $PIO2_3
                  = r - t w
                  = w - * fn $PIO2_3T - - t r w
                  = y0 - r w 0 } 0 } 0 }
      = y1 - - r y0 w
      ? < hx 0 { = y0 * -1.0 y0 = y1 * -1.0 y1 = n - 0 n } 0 }'''

PERTO = '''
    { ? > hx 0
        { = z - x $PIO2_1
          ? != ix 0x3FF921FB
            { = y0 - z $PIO2_1T = y1 - - z y0 $PIO2_1T }
            { = z - z $PIO2_2 = y0 - z $PIO2_2T = y1 - - z y0 $PIO2_2T }
          = n 1 }
        { = z + x $PIO2_1
          ? != ix 0x3FF921FB
            { = y0 + z $PIO2_1T = y1 + - z y0 $PIO2_1T }
            { = z + z $PIO2_2 = y0 + z $PIO2_2T = y1 + - z y0 $PIO2_2T }
          = n -1 } }'''

SRC = '''# matematica da Onda em Onda (fdlibm): igual ao bit em C, WebAssembly e x86, e igual ao Math do JavaScript
: _mks ffi>f x y iy {
  = ix & Bh x 0x7fffffff
  ? && < ix 0x3e400000 == I x 0 x
  { = z * x x
    = v * z x
    = r + $S2 * z + $S3 * z + $S4 * z + $S5 * z $S6
    ? == iy 0 + x * v + $S1 * z r - x - - * z - * 0.5 y * v r y * v $S1 } }
: _mkc ff>f x y {
  = ix & Bh x 0x7fffffff
  ? && < ix 0x3e400000 == I x 0 1.0
  { = z * x x
    = r * z + $C1 * z + $C2 * z + $C3 * z + $C4 * z + $C5 * z $C6
    ? < ix 0x3FD33333 - 1.0 - * 0.5 z - * z r * x y
    { = qx ? > ix 0x3fe90000 0.28125 Bw - ix 0x00200000 0
      = hz - * 0.5 z qx
      = a - 1.0 qx
      - a - hz - * z r * x y } } }
: _sn f>f x {
  = hx Bh x
  = ix & hx 0x7fffffff
  ? <= ix 0x3FE921FB _mks x 0.0 0
  ? >= ix 0x7FF00000 - x x
  ? > ix 0x413921FB Sn x
  { = n 0
    = y0 0.0
    = y1 0.0
    ? < ix 0x4002D97C $PERTO $REDUZ
    = m & n 3
    ? == m 0 _mks y0 y1 1 ? == m 1 _mkc y0 y1 ? == m 2 * -1.0 _mks y0 y1 1 * -1.0 _mkc y0 y1 } }
: _cs f>f x {
  = hx Bh x
  = ix & hx 0x7fffffff
  ? <= ix 0x3FE921FB _mkc x 0.0
  ? >= ix 0x7FF00000 - x x
  ? > ix 0x413921FB Cs x
  { = n 0
    = y0 0.0
    = y1 0.0
    ? < ix 0x4002D97C $PERTO $REDUZ
    = m & n 3
    ? == m 0 _mkc y0 y1 ? == m 1 * -1.0 _mks y0 y1 1 ? == m 2 * -1.0 _mkc y0 y1 _mks y0 y1 1 } }
: _xp f>f x {
  = hx Bh x
  = xsb & >> hx 31 1
  = ax & hx 0x7fffffff
  ? && >= ax 0x7FF00000 != | & ax 0xfffff Bl x 0 + x x
  ? >= ax 0x7FF00000 ? == xsb 0 x 0.0
  ? && >= ax 0x40862E42 > x $O_THR * $HUGE $HUGE
  ? && >= ax 0x40862E42 < x $U_THR * $TWOM1000 $TWOM1000
  ? < ax 0x3E300000 + 1.0 x
  ? == x 1.0 $E
  { = k 0
    = hi 0.0
    = lo 0.0
    = y x
    ? > ax 0x3FD62E42
      { ? < ax 0x3FF0A2B2
          { = hi - x ? xsb $LN2HIN $LN2HI
            = lo ? xsb $LN2LON $LN2LO
            = k - - 1 xsb xsb }
          { = k I + * $INVLN2 x ? xsb -0.5 0.5
            = t F k
            = hi - x * t $LN2HI
            = lo * t $LN2LO 0 }
        = y - hi lo 0 } 0
    = t * y y
    = twopk ? >= k -1021 Bw + 0x3FF00000 << k 20 0 Bw + 0x3FF00000 << + k 1000 20 0
    = c - y * t + $P1 * t + $P2 * t + $P3 * t + $P4 * t $P5
    ? == k 0 - 1.0 - / * y c - c 2.0 y
    { = yy - 1.0 - - lo / * y c - 2.0 c hi
      ? >= k -1021 ? == k 1024 * * yy 2.0 $TWO1023 * yy twopk * * yy twopk $TWOM1000 } } }
: _lg f>f x0 {
  = x x0
  = hx Bh x
  = lx Bl x
  = k 0
  ? && < hx 0x00100000 == | & hx 0x7fffffff lx 0 / * -1.0 $TWO54 0.0
  ? && < hx 0x00100000 < hx 0 / - x x 0.0
  { ? < hx 0x00100000 { = k - k 54 = x * x $TWO54 = hx Bh x } 0
    ? >= hx 0x7FF00000 + x x
    { = k + k - >> hx 20 1023
      = hx & hx 0x000FFFFF
      = i & + hx 0x95F64 0x100000
      = x Bw | hx ^ i 0x3FF00000 Bl x
      = k + k >> i 20
      = f - x 1.0
      ? < & 0x000FFFFF + 2 hx 3
        { ? == f 0.0
            ? == k 0 0.0 { = dk F k + * dk $LN2HI * dk $LN2LO }
            { = rv * * f f - 0.5 * $THIRD f
              ? == k 0 - f rv { = dk F k - * dk $LN2HI - - rv * dk $LN2LO f } } }
        { = s / f + 2.0 f
          = dk F k
          = z * s s
          = i - hx 0x6147A
          = w * z z
          = j - 0x6B851 hx
          = t1 * w + $LG2 * w + $LG4 * w $LG6
          = t2 * z + $LG1 * w + $LG3 * w + $LG5 * w $LG7
          = i | i j
          = rv + t2 t1
          ? > i 0
            { = hfsq * * 0.5 f f
              ? == k 0 - f - hfsq * s + hfsq rv - * dk $LN2HI - - hfsq + * s + hfsq rv * dk $LN2LO f }
            ? == k 0 - f * s - f rv - * dk $LN2HI - - * s - f rv * dk $LN2LO f } } } }
'''

def expand(s):
    s = s.replace('$PERTO', PERTO.strip()).replace('$REDUZ', REDUZ.strip())
    def k(m):
        v, h, l = K[m.group(1)]
        return 'Bw 0x%08X 0x%08X' % (h, l)
    return re.sub(r'\$([A-Z0-9_]+)', k, s)

out = expand(SRC)
assert '"' not in out and '\\' not in out
d = os.path.join(os.path.dirname(__file__), '..', 'src', '9mat.onda')
with open(d, 'w', encoding='utf-8') as f:
    f.write('# gerado por tools/gerar_mat.py: a matematica (seno, coseno, exp, log) escrita em Onda, acrescentada quando o programa a usa\n')
    f.write(': wmat >i "' + out + '"\n')
print('escrito', os.path.normpath(d), len(out), 'bytes')

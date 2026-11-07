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
  'ATANHI0': (4.63647609000806093515e-01, 0x3FDDAC67, 0x0561BB4F),
  'ATANHI1': (7.85398163397448278999e-01, 0x3FE921FB, 0x54442D18),
  'ATANHI2': (9.82793723247329054082e-01, 0x3FEF730B, 0xD281F69B),
  'ATANHI3': (1.57079632679489655800e+00, 0x3FF921FB, 0x54442D18),
  'ATANLO0': (2.26987774529616870924e-17, 0x3C7A2B7F, 0x222F65E2),
  'ATANLO1': (3.06161699786838301793e-17, 0x3C81A626, 0x33145C07),
  'ATANLO2': (1.39033110312309984516e-17, 0x3C700788, 0x7AF0CBBD),
  'ATANLO3': (6.12323399573676603587e-17, 0x3C91A626, 0x33145C07),
  'AT0': (3.33333333333329318027e-01, 0x3FD55555, 0x5555550D),
  'AT1': (-1.99999999998764832476e-01, 0xBFC99999, 0x9998EBC4),
  'AT2': (1.42857142725034663711e-01, 0x3FC24924, 0x920083FF),
  'AT3': (-1.11111104054623557880e-01, 0xBFBC71C6, 0xFE231671),
  'AT4': (9.09088713343650656196e-02, 0x3FB745CD, 0xC54C206E),
  'AT5': (-7.69187620504482999495e-02, 0xBFB3B0F2, 0xAF749A6D),
  'AT6': (6.66107313738753120669e-02, 0x3FB10D66, 0xA0D03D51),
  'AT7': (-5.83357013379057348645e-02, 0xBFADDE2D, 0x52DEFD9A),
  'AT8': (4.97687799461593236017e-02, 0x3FA97B4B, 0x24760DEB),
  'AT9': (-3.65315727442169155270e-02, 0xBFA2B444, 0x2C6A6C2F),
  'AT10': (1.62858201153657823623e-02, 0x3F90AD3A, 0xE322DA11),
  'PIO4': (7.8539816339744827900e-01, 0x3FE921FB, 0x54442D18),
  'PI': (3.1415926535897931160e+00, 0x400921FB, 0x54442D18),
  'PILO': (1.2246467991473531772e-16, 0x3CA1A626, 0x33145C07),
  'TINY': (1.0e-300, None, None),
  'DP_H1': (5.84962487220764160156e-01, 0x3FE2B803, 0x40000000),
  'DP_L1': (1.35003920212974897128e-08, 0x3E4CFDEB, 0x43CFD006),
  'TWO53': (9007199254740992.0, 0x43400000, 0x00000000),
  'L1': (5.99999999999994648725e-01, 0x3FE33333, 0x33333303),
  'L2': (4.28571428578550184252e-01, 0x3FDB6DB6, 0xDB6FABFF),
  'L3': (3.33333329818377432918e-01, 0x3FD55555, 0x518F264D),
  'L4': (2.72728123808534006489e-01, 0x3FD17460, 0xA91D4101),
  'L5': (2.30660745775561754067e-01, 0x3FCD864A, 0x93C9DB65),
  'L6': (2.06975017800338417784e-01, 0x3FCA7E28, 0x4A454EEF),
  'LN2P': (6.93147180559945286227e-01, 0x3FE62E42, 0xFEFA39EF),
  'LN2P_H': (6.93147182464599609375e-01, 0x3FE62E43, 0x00000000),
  'LN2P_L': (-1.90465429995776804525e-09, 0xBE205C61, 0x0CA86C39),
  'OVT': (8.0085662595372944372e-17, None, None),
  'CP': (9.61796693925975554329e-01, 0x3FEEC709, 0xDC3A03FD),
  'CP_H': (9.61796700954437255859e-01, 0x3FEEC709, 0xE0000000),
  'CP_L': (-7.02846165095275826516e-09, 0xBE3E2FE0, 0x145B01F5),
  'IVLN2_H': (1.44269502162933349609e+00, 0x3FF71547, 0x60000000),
  'IVLN2_L': (1.92596299112661746887e-08, 0x3E54AE0B, 0xF85DDF44),
  'TWOM54': (5.5511151231257827e-17, 0x3C900000, 0x00000000),
}
# um nome repetido no dicionario apagaria a primeira constante sem aviso (aconteceu com LG2): recusa-se
_nomes = re.findall(r"^  '([A-Z0-9_]+)':", open(__file__, encoding='utf-8').read(), re.M)
assert len(_nomes) == len(set(_nomes)), sorted(n for n in set(_nomes) if _nomes.count(n) > 1)
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
: _mat f>f x0 {
  = x x0
  = hx Bh x
  = ix & hx 0x7fffffff
  ? >= ix 0x44100000
    ? || > ix 0x7ff00000 && == ix 0x7ff00000 != Bl x 0 + x x
    ? > hx 0 + $ATANHI3 $ATANLO3 - * -1.0 $ATANHI3 $ATANLO3
  ? < ix 0x3e400000 x
  { = id -1
    ? >= ix 0x3fdc0000
      { = x Ab x
        ? < ix 0x3ff30000
          ? < ix 0x3fe60000 { = id 0 = x / - * 2.0 x 1.0 + 2.0 x } { = id 1 = x / - x 1.0 + x 1.0 }
          ? < ix 0x40038000 { = id 2 = x / - x 1.5 + 1.0 * 1.5 x } { = id 3 = x / -1.0 x } } 0.0
    = z * x x
    = w * z z
    = s1 * z + $AT0 * w + $AT2 * w + $AT4 * w + $AT6 * w + $AT8 * w $AT10
    = s2 * w + $AT1 * w + $AT3 * w + $AT5 * w + $AT7 * w $AT9
    ? < id 0 - x * x + s1 s2
    { = ah ? == id 0 $ATANHI0 ? == id 1 $ATANHI1 ? == id 2 $ATANHI2 $ATANHI3
      = al ? == id 0 $ATANLO0 ? == id 1 $ATANLO1 ? == id 2 $ATANLO2 $ATANLO3
      = z - ah - - * x + s1 s2 al x
      ? < hx 0 * -1.0 z z } } }
: _at ff>f y x {
  ? || != x x != y y + x y
  { = hx Bh x
    = ix & hx 0x7fffffff
    = lx Bl x
    = hy Bh y
    = iy & hy 0x7fffffff
    = ly Bl y
    ? == | - hx 0x3ff00000 lx 0 _mat y
    { = m | & >> hy 31 1 & >> hx 30 2
      ? == | iy ly 0 ? < m 2 y ? == m 2 + $PI $TINY - * -1.0 $PI $TINY
      ? == | ix lx 0 ? < hy 0 - * -1.0 $PIO2 $TINY + $PIO2 $TINY
      ? == ix 0x7ff00000
        ? == iy 0x7ff00000
          ? == m 0 + $PIO4 $TINY ? == m 1 - * -1.0 $PIO4 $TINY ? == m 2 + * 3.0 $PIO4 $TINY - * -3.0 $PIO4 $TINY
          ? == m 0 0.0 ? == m 1 * -1.0 0.0 ? == m 2 + $PI $TINY - * -1.0 $PI $TINY
      ? == iy 0x7ff00000 ? < hy 0 - * -1.0 $PIO2 $TINY + $PIO2 $TINY
      { = k >> - iy ix 20
        = z 0.0
        ? > k 60 { = z + $PIO2 * 0.5 $PILO = m & m 1 }
          ? && < hx 0 < k -60 { = z 0.0 0 } { = z _mat Ab / y x 0 }
        ? == m 0 z ? == m 1 * -1.0 z ? == m 2 - $PI - z $PILO - - z $PILO $PI } } } }
: _msc fi>f z n ? >= n -1022 * z Bw + 0x3FF00000 << n 20 0 * * z Bw + 0x3FF00000 << + n 54 20 0 $TWOM54
: _pw ff>f x y {
  = hx Bh x
  = lx Bl x
  = hy Bh y
  = ly Bl y
  = ix & hx 0x7fffffff
  = iy & hy 0x7fffffff
  ? == | iy ly 0 1.0
  ? || || > ix 0x7ff00000 && == ix 0x7ff00000 != lx 0 || > iy 0x7ff00000 && == iy 0x7ff00000 != ly 0 + x y
  { = yisint 0
    = k 0
    = j 0
    ? < hx 0
      ? >= iy 0x43400000 = yisint 2
      ? >= iy 0x3ff00000 ? == Fl y y ? == Fl * 0.5 y * 0.5 y = yisint 2 = yisint 1 0 0
      0
    = ax Ab x
    ? && == ly 0 == iy 0x7ff00000
      ? == | - ix 0x3ff00000 lx 0 - y y ? >= ix 0x3ff00000 ? >= hy 0 y 0.0 ? < hy 0 * -1.0 y 0.0
    ? && == ly 0 == iy 0x3ff00000 ? < hy 0 / 1.0 x x
    ? && == ly 0 == hy 0x40000000 * x x
    ? && && == ly 0 == hy 0x3fe00000 >= hx 0 Sq x
    ? && == lx 0 || || == ix 0x7ff00000 == ix 0 == ix 0x3ff00000
      { = z ax
        ? < hy 0 = z / 1.0 z 0.0
        ? < hx 0 ? == | - ix 0x3ff00000 yisint 0 = z / - z z - z z ? == yisint 1 = z * -1.0 z 0.0 0.0
        z }
    { = n + >> hx 31 1
      ? == | n yisint 0 / - x x - x x
      { = s ? == | n - yisint 1 0 -1.0 1.0
        ? && > iy 0x43f00000 <= ix 0x3fefffff ? < hy 0 * $HUGE $HUGE * $TINY $TINY
        ? && > iy 0x43f00000 >= ix 0x3ff00000 ? > hy 0 * $HUGE $HUGE * $TINY $TINY
        ? && > iy 0x41e00000 < ix 0x3fefffff ? < hy 0 * * s $HUGE $HUGE * * s $TINY $TINY
        ? && > iy 0x41e00000 > ix 0x3ff00000 ? > hy 0 * * s $HUGE $HUGE * * s $TINY $TINY
        { = t1 0.0
          = t2 0.0
          ? > iy 0x41e00000
            { = t - ax 1.0
              = w * * t t - 0.5 * t - $THIRD * t 0.25
              = u * $IVLN2_H t
              = v - * t $IVLN2_L * w $INVLN2
              = t1 Bw Bh + u v 0
              = t2 - v - t1 u 0 }
            { = n 0
              ? < ix 0x00100000 { = ax * ax $TWO53 = n - n 53 = ix Bh ax } 0
              = n + n - >> ix 20 0x3ff
              = j & ix 0x000fffff
              = ix | j 0x3ff00000
              = k 0
              ? <= j 0x3988E = k 0 ? < j 0xBB67A = k 1 { = k 0 = n + n 1 = ix - ix 0x00100000 }
              = ax Bw ix Bl ax
              = bk ? k 1.5 1.0
              = u - ax bk
              = v / 1.0 + ax bk
              = ss * u v
              = sh Bw Bh ss 0
              = th Bw + + | >> ix 1 0x20000000 0x00080000 << k 18 0
              = tl - ax - th bk
              = sl * v - - u * sh th * sh tl
              = s2 * ss ss
              = r * * s2 s2 + $L1 * s2 + $L2 * s2 + $L3 * s2 + $L4 * s2 + $L5 * s2 $L6
              = r + r * sl + sh ss
              = s2 * sh sh
              = th Bw Bh + + 3.0 s2 r 0
              = tl - r - - th 3.0 s2
              = u * sh th
              = v + * sl th * tl ss
              = ph Bw Bh + u v 0
              = pl - v - ph u
              = zh * $CP_H ph
              = zl + + * $CP_L ph * pl $CP ? k $DP_L1 0.0
              = t F n
              = dh ? k $DP_H1 0.0
              = t1 Bw Bh + + + zh zl dh t 0
              = t2 - zl - - - t1 t dh zh 0 }
          = y1 Bw Bh y 0
          = pl + * - y y1 t1 * y t2
          = ph * y1 t1
          = z + pl ph
          = j Bh z
          = i Bl z
          = ovf && >= j 0x40900000 || || != j 0x40900000 != i 0 > + pl $OVT - z ph
          = unf && < j 0x40900000 && >= & j 0x7fffffff 0x4090cc00 || || != j -1064252416 != i 0 <= pl - z ph
          ? ovf * * s $HUGE $HUGE
          ? unf * * s $TINY $TINY
          { = i & j 0x7fffffff
            = k - >> i 20 0x3ff
            = n 0
            ? > i 0x3fe00000
              { = n + j >> 0x00100000 + k 1
                = k - >> & n 0x7fffffff 20 0x3ff
                = t Bw & n ^ >> 0x000fffff k -1 0
                = n >> | & n 0x000fffff 0x00100000 - 20 k
                ? < j 0 = n - 0 n 0
                = ph - ph t 0 } 0
            = t Bw Bh + pl ph 0
            = u * t $LN2P_H
            = v + * - pl - t ph $LN2P * t $LN2P_L
            = z + u v
            = w - v - z u
            = t * z z
            = t1 - z * t + $P1 * t + $P2 * t + $P3 * t + $P4 * t $P5
            = r - / * z t1 - t1 2.0 + w * z w
            = z - 1.0 - r z
            = j + Bh z << n 20
            = z ? <= >> j 20 0 _msc z n Bw j Bl z
            * s z } } } } } }
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
    f.write('# gerado por tools/gerar_mat.py: a matematica (seno, coseno, exp, log, atan2, pow) escrita em Onda, acrescentada quando o programa a usa\n')
    f.write(': wmat >i "' + out + '"\n')
print('escrito', os.path.normpath(d), len(out), 'bytes')
sj = os.path.join(os.path.dirname(__file__), '..', 'web', 'significado.js')
t = open(sj, encoding='utf-8').read()
i = t.index('  // <mat>\n'); j = t.index('  // </mat>\n')
lit = out.replace('\n', '\\n')
t = t[:i] + '  // <mat>\n  const MAT = "' + lit + '";\n' + t[j:]
open(sj, 'w', encoding='utf-8').write(t)
print('escrito', os.path.normpath(sj))

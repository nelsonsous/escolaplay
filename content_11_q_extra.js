// ============================================================
// 11.º ANO — FÍSICO-QUÍMICA A — Química
// Exercícios COMPLEXOS (nível secundário, dif. 2 e 3 maioritariamente).
// Schema: { id, s, t, type, diff, q, opts/items/pairs, ans, exp,
//           material?, solution?, hint? }
// ============================================================

const EXERCISES_11_Q_EXTRA = [
  // =====================================================
  // 1) EQUILÍBRIO QUÍMICO — CONCEITO E Kc
  // =====================================================
  { id:'11qe1', s:'quimica', t:'Equilíbrio químico — conceito e Kc', type:'mc', diff:2,
    q:'⚗️ Considera o equilíbrio: N₂(g) + 3 H₂(g) ⇌ 2 NH₃(g). Qual a expressão CORRECTA de Kc?',
    opts:['Kc = [NH₃]² / ([N₂]·[H₂]³)','Kc = [N₂]·[H₂]³ / [NH₃]²','Kc = 2[NH₃] / ([N₂] + 3[H₂])','Kc = [NH₃] / ([N₂]·[H₂])'],
    ans:0,
    exp:'Kc = produtos elevados aos coeficientes / reagentes elevados aos coeficientes.',
    material:'Para aA + bB ⇌ cC + dD: Kc = [C]ᶜ·[D]ᵈ / ([A]ᵃ·[B]ᵇ).' },

  { id:'11qe2', s:'quimica', t:'Equilíbrio químico — conceito e Kc', type:'tf', diff:2,
    q:'⚗️ Sólidos puros e líquidos puros NÃO entram na expressão de Kc.',
    ans:true,
    exp:'A sua "concentração" é constante e por convenção é absorvida no valor de Kc.' },

  { id:'11qe3', s:'quimica', t:'Equilíbrio químico — conceito e Kc', type:'mc', diff:2,
    q:'⚗️ Para o equilíbrio CaCO₃(s) ⇌ CaO(s) + CO₂(g), a expressão correcta de Kc é:',
    opts:['Kc = [CO₂]','Kc = [CaO]·[CO₂] / [CaCO₃]','Kc = [CaCO₃] / ([CaO]·[CO₂])','Kc = [CaO]·[CO₂]'],
    ans:0,
    exp:'Sólidos não entram. Só fica o gás CO₂.' },

  { id:'11qe4', s:'quimica', t:'Equilíbrio químico — conceito e Kc', type:'mc', diff:3,
    q:'⚗️ Num reactor de 2,0 dm³ atingiu-se o equilíbrio H₂(g) + I₂(g) ⇌ 2 HI(g) com 0,40 mol de H₂, 0,40 mol de I₂ e 2,40 mol de HI. Qual o valor de Kc?',
    opts:['36','12','144','9'],
    ans:0,
    exp:'[H₂]=[I₂]=0,20 mol/dm³; [HI]=1,20 mol/dm³. Kc = (1,20)² / (0,20·0,20) = 1,44/0,04 = 36.',
    solution:'Concentrações em mol/dm³ → divide cada quantidade por V=2 → Kc=[HI]²/([H₂][I₂])=(1,2)²/(0,2·0,2)=36.' },

  { id:'11qe5', s:'quimica', t:'Equilíbrio químico — conceito e Kc', type:'mc', diff:3,
    q:'⚗️ Para uma reacção em equilíbrio com Kc = 4,0 × 10⁻⁵, podemos concluir que:',
    opts:['o equilíbrio favorece os produtos','o equilíbrio favorece os reagentes','o equilíbrio é igualmente distribuído','a reacção é instantânea'],
    ans:1,
    exp:'Kc << 1 → muito poucos produtos no equilíbrio → favorece os reagentes.' },

  { id:'11qe6', s:'quimica', t:'Equilíbrio químico — conceito e Kc', type:'mc', diff:3,
    q:'⚗️ Se a reacção directa tem Kc = 50, qual o valor de Kc para a reacção INVERSA?',
    opts:['50','1/50 = 0,02','−50','2500'],
    ans:1,
    exp:'Kc(inverso) = 1 / Kc(directo) = 1/50 = 0,02.' },

  { id:'11qe7', s:'quimica', t:'Equilíbrio químico — conceito e Kc', type:'mc', diff:3,
    q:'⚗️ Para a reacção 2 SO₂(g) + O₂(g) ⇌ 2 SO₃(g), Kc = 100 a determinada T. Se multiplicarmos a equação por 1/2 (SO₂ + ½ O₂ ⇌ SO₃), o novo Kc é:',
    opts:['10','100','50','10000'],
    ans:0,
    exp:'Quando a equação é multiplicada por n, o novo Kc é Kc^n. Aqui n=1/2 → Kc^(1/2)=√100=10.' },

  { id:'11qe8', s:'quimica', t:'Equilíbrio químico — conceito e Kc', type:'tf', diff:2,
    q:'⚗️ Kc depende apenas da temperatura.',
    ans:true,
    exp:'Pressão, concentração ou catalisadores NÃO alteram Kc. Apenas T altera Kc.' },

  { id:'11qe9', s:'quimica', t:'Equilíbrio químico — conceito e Kc', type:'order', diff:2,
    q:'⚗️ Ordena por valor crescente de Kc (mais reagentes → mais produtos no equilíbrio):',
    items:['Kc = 1,0×10⁻⁸','Kc = 0,5','Kc = 25','Kc = 1,0×10⁶'],
    ans:'1,2,3,4',
    exp:'10⁻⁸ < 0,5 < 25 < 10⁶.' },

  { id:'11qe10', s:'quimica', t:'Equilíbrio químico — conceito e Kc', type:'mc', diff:3,
    q:'⚗️ No equilíbrio N₂O₄(g) ⇌ 2 NO₂(g) num recipiente de 1,0 L: 0,30 mol N₂O₄ e 0,60 mol NO₂. Kc =?',
    opts:['1,2','0,6','2,0','0,15'],
    ans:0,
    exp:'Kc = [NO₂]² / [N₂O₄] = (0,60)² / 0,30 = 0,36/0,30 = 1,2.' },

  // =====================================================
  // 2) Qc E PRINCÍPIO DE LE CHÂTELIER
  // =====================================================
  { id:'11qe11', s:'quimica', t:'Quociente de reacção e princípio de Le Châtelier', type:'mc', diff:2,
    q:'⚗️ Num sistema com Qc < Kc, a reacção evolui:',
    opts:['no sentido directo (forma mais produtos)','no sentido inverso (forma mais reagentes)','está em equilíbrio','não evolui'],
    ans:0,
    exp:'Qc < Kc → faltam produtos → reacção avança no sentido directo até Qc = Kc.' },

  { id:'11qe12', s:'quimica', t:'Quociente de reacção e princípio de Le Châtelier', type:'mc', diff:2,
    q:'⚗️ Num sistema com Qc > Kc, a reacção evolui:',
    opts:['no sentido directo','no sentido inverso','permanece igual','depende da temperatura'],
    ans:1,
    exp:'Qc > Kc → excesso de produtos → reacção recua para regenerar reagentes.' },

  { id:'11qe13', s:'quimica', t:'Quociente de reacção e princípio de Le Châtelier', type:'mc', diff:3,
    q:'🔬 Para H₂(g) + I₂(g) ⇌ 2 HI(g) com Kc = 50. Mistura inicial: [H₂]=[I₂]=0,20 mol/dm³, [HI]=2,0 mol/dm³. Em que sentido evolui?',
    opts:['Sentido directo (forma HI)','Sentido inverso (forma H₂ e I₂)','Já está em equilíbrio','Sem dados suficientes'],
    ans:1,
    exp:'Qc = (2,0)² / (0,20·0,20) = 4/0,04 = 100. Como Qc(100) > Kc(50) → sentido inverso.',
    solution:'Calcula Qc=[HI]²/([H₂][I₂])=100. Compara com Kc=50: Qc>Kc → reacção inversa.' },

  { id:'11qe14', s:'quimica', t:'Quociente de reacção e princípio de Le Châtelier', type:'mc', diff:2,
    q:'🌡️ Reacção EXOTÉRMICA em equilíbrio. Aumenta-se a temperatura. O que acontece?',
    opts:['Equilíbrio desloca-se no sentido directo; Kc aumenta','Equilíbrio desloca-se no sentido inverso; Kc diminui','Não há alteração','Kc aumenta mas o equilíbrio não se desloca'],
    ans:1,
    exp:'Para exotérmica, calor é "produto". Aumentar T → contraria adicionando calor → desloca para reagentes; Kc diminui.' },

  { id:'11qe15', s:'quimica', t:'Quociente de reacção e princípio de Le Châtelier', type:'mc', diff:2,
    q:'🌡️ Reacção ENDOTÉRMICA em equilíbrio. Baixar a temperatura faz com que:',
    opts:['Equilíbrio se desloque para produtos; Kc aumenta','Equilíbrio se desloque para reagentes; Kc diminui','Equilíbrio não muda','Kc não muda'],
    ans:1,
    exp:'Endotérmica: calor é "reagente". Baixar T = remover calor → desloca para reagentes (que repõem o "calor" perdido); Kc diminui.' },

  { id:'11qe16', s:'quimica', t:'Quociente de reacção e princípio de Le Châtelier', type:'mc', diff:3,
    q:'⚗️ Para N₂(g) + 3 H₂(g) ⇌ 2 NH₃(g), aumentar a PRESSÃO (diminuir o volume) faz o equilíbrio:',
    opts:['Deslocar-se para a direita (mais NH₃)','Deslocar-se para a esquerda (mais N₂ e H₂)','Não muda','Depende de Kc'],
    ans:0,
    exp:'Reagentes: 4 moles gasosas. Produtos: 2 moles gasosas. Aumentar P → desloca para o lado com MENOS moles gasosas → produtos.' },

  { id:'11qe17', s:'quimica', t:'Quociente de reacção e princípio de Le Châtelier', type:'tf', diff:2,
    q:'🧪 Adicionar um catalisador desloca o equilíbrio no sentido directo.',
    ans:false,
    exp:'O catalisador acelera AMBOS os sentidos por igual. NÃO desloca o equilíbrio nem altera Kc.' },

  { id:'11qe18', s:'quimica', t:'Quociente de reacção e princípio de Le Châtelier', type:'mc', diff:2,
    q:'⚗️ A H₂(g) + I₂(g) ⇌ 2 HI(g) (mesmo nº de moles gasosas em ambos os lados). Aumentar a pressão:',
    opts:['Desloca para produtos','Desloca para reagentes','Não desloca o equilíbrio','Aumenta Kc'],
    ans:2,
    exp:'Quando o nº de moles gasosas é igual nos dois lados, a pressão NÃO desloca o equilíbrio.' },

  { id:'11qe19', s:'quimica', t:'Quociente de reacção e princípio de Le Châtelier', type:'mc', diff:3,
    q:'🔬 Em 2 NO(g) + O₂(g) ⇌ 2 NO₂(g) (exotérmica). Quais condições favorecem mais NO₂?',
    opts:['↑ T e ↓ P','↓ T e ↑ P','↑ T e ↑ P','↓ T e ↓ P'],
    ans:1,
    exp:'Exotérmica → ↓T desloca para produtos. 3 mol gasosas → 2 mol gasosas → ↑P desloca para produtos. Logo: ↓T + ↑P.' },

  { id:'11qe20', s:'quimica', t:'Quociente de reacção e princípio de Le Châtelier', type:'mc', diff:2,
    q:'⚗️ Para H₂(g) + I₂(g) ⇌ 2 HI(g) em equilíbrio, retira-se H₂ do sistema. O que acontece?',
    opts:['Desloca para reagentes (forma mais H₂ e I₂)','Desloca para produtos (forma mais HI)','Não há alteração','Kc diminui'],
    ans:0,
    exp:'Remover reagente → contraria formando mais reagente → reacção inversa.' },

  // =====================================================
  // 3) ÁCIDO-BASE — pH E Kw
  // =====================================================
  { id:'11qe21', s:'quimica', t:'Equilíbrio ácido-base — pH e Kw', type:'mc', diff:2,
    q:'🧪 A 25 °C, qual o valor de Kw?',
    opts:['1,0 × 10⁻⁷','1,0 × 10⁻¹⁴','1,0 × 10⁷','7'],
    ans:1,
    exp:'Kw = [H₃O⁺]·[OH⁻] = 1,0 × 10⁻¹⁴ a 25 °C.' },

  { id:'11qe22', s:'quimica', t:'Equilíbrio ácido-base — pH e Kw', type:'mc', diff:2,
    q:'🧪 Solução com [H₃O⁺] = 1,0 × 10⁻⁴ mol/dm³. pH =?',
    opts:['4','10','14','−4'],
    ans:0,
    exp:'pH = −log(10⁻⁴) = 4.' },

  { id:'11qe23', s:'quimica', t:'Equilíbrio ácido-base — pH e Kw', type:'mc', diff:2,
    q:'🧪 A 25 °C, uma solução tem pOH = 9. Qual o pH?',
    opts:['5','9','14','7'],
    ans:0,
    exp:'pH + pOH = 14 → pH = 14 − 9 = 5.' },

  { id:'11qe24', s:'quimica', t:'Equilíbrio ácido-base — pH e Kw', type:'mc', diff:2,
    q:'🧪 A 25 °C, uma solução com pH = 9 é:',
    opts:['Ácida','Neutra','Básica','Amfotérica'],
    ans:2,
    exp:'pH > 7 a 25 °C → básica.' },

  { id:'11qe25', s:'quimica', t:'Equilíbrio ácido-base — pH e Kw', type:'mc', diff:3,
    q:'🧪 [OH⁻] de uma solução com pH = 3 (a 25 °C) é:',
    opts:['1,0 × 10⁻³ mol/dm³','1,0 × 10⁻¹¹ mol/dm³','1,0 × 10⁻⁷ mol/dm³','3 mol/dm³'],
    ans:1,
    exp:'[H₃O⁺] = 10⁻³. Kw = [H₃O⁺][OH⁻] = 10⁻¹⁴ → [OH⁻] = 10⁻¹⁴ / 10⁻³ = 10⁻¹¹.' },

  { id:'11qe26', s:'quimica', t:'Equilíbrio ácido-base — pH e Kw', type:'tf', diff:2,
    q:'🧪 Diluir um ácido faz com que o seu pH aumente (aproxima-se de 7).',
    ans:true,
    exp:'Diluir ácido → diminui [H₃O⁺] → pH aumenta. Mas nunca passa de 7.' },

  { id:'11qe27', s:'quimica', t:'Equilíbrio ácido-base — pH e Kw', type:'mc', diff:3,
    q:'🧪 50 mL de solução de HCl 0,10 mol/dm³ são diluídos a 500 mL. Qual o pH final? (HCl é ácido forte)',
    opts:['1','2','3','7'],
    ans:1,
    exp:'Diluição 10×: nova [HCl] = 0,010 mol/dm³. HCl é forte → [H₃O⁺]=0,010. pH = −log(0,010) = 2.',
    solution:'C₁V₁=C₂V₂ → 0,10·50=C₂·500 → C₂=0,010 mol/dm³. pH=−log(0,010)=2.' },

  { id:'11qe28', s:'quimica', t:'Equilíbrio ácido-base — pH e Kw', type:'mc', diff:3,
    q:'🧪 Solução de NaOH com pH = 12. [NaOH] inicial =?  (NaOH é base forte)',
    opts:['0,012 mol/dm³','0,01 mol/dm³','12 mol/dm³','1×10⁻¹² mol/dm³'],
    ans:1,
    exp:'pOH = 14−12 = 2. [OH⁻] = 10⁻². Como NaOH é forte, [NaOH]=[OH⁻]=0,01 mol/dm³.' },

  { id:'11qe29', s:'quimica', t:'Equilíbrio ácido-base — pH e Kw', type:'mc', diff:2,
    q:'🧪 Diminui-se a temperatura de uma solução neutra de água pura. Como evolui o pH neutro?',
    opts:['Continua exactamente 7','Aumenta acima de 7','Diminui abaixo de 7','Depende do volume'],
    ans:1,
    exp:'Auto-ionização da água é endotérmica. ↓T → menos ionização → menor [H₃O⁺] → pH neutro >7.' },

  { id:'11qe30', s:'quimica', t:'Equilíbrio ácido-base — pH e Kw', type:'order', diff:2,
    q:'🧪 Ordena de mais ácido para mais básico (a 25 °C):',
    items:['pH = 1','pH = 4','pH = 7','pH = 11'],
    ans:'1,2,3,4',
    exp:'pH menor = mais ácido.' },

  // =====================================================
  // 4) Ka, Kb — ÁCIDOS/BASES FORTES E FRACOS
  // =====================================================
  { id:'11qe31', s:'quimica', t:'Ácidos e bases fortes e fracos — Ka e Kb', type:'mc', diff:2,
    q:'🧪 Qual destes é um ácido FRACO?',
    opts:['HCl','HNO₃','CH₃COOH (ácido acético)','HClO₄'],
    ans:2,
    exp:'CH₃COOH ioniza-se parcialmente — é um ácido fraco. Os outros três são fortes.' },

  { id:'11qe32', s:'quimica', t:'Ácidos e bases fortes e fracos — Ka e Kb', type:'mc', diff:2,
    q:'🧪 Para HA + H₂O ⇌ A⁻ + H₃O⁺, a expressão de Ka é:',
    opts:['[A⁻][H₃O⁺] / [HA]','[HA] / ([A⁻][H₃O⁺])','[A⁻] + [H₃O⁺]','[HA][H₂O] / [A⁻][H₃O⁺]'],
    ans:0,
    exp:'Ka = produtos/reagentes (excluindo H₂O líquida).' },

  { id:'11qe33', s:'quimica', t:'Ácidos e bases fortes e fracos — Ka e Kb', type:'mc', diff:2,
    q:'🧪 Quanto MAIOR for Ka:',
    opts:['Mais fraco é o ácido','Mais forte é o ácido','Maior é o pH','O ácido não se ioniza'],
    ans:1,
    exp:'Ka grande → ioniza-se mais → ácido mais forte.' },

  { id:'11qe34', s:'quimica', t:'Ácidos e bases fortes e fracos — Ka e Kb', type:'mc', diff:3,
    q:'🧪 Ácido A: Ka = 1,8×10⁻⁵. Ácido B: Ka = 2,5×10⁻³. Qual é o mais forte e qual a base conjugada mais forte?',
    opts:['B é mais forte; A⁻ é base conjugada mais forte','A é mais forte; B⁻ é base conjugada mais forte','B é mais forte; B⁻ é base conjugada mais forte','São igualmente fortes'],
    ans:0,
    exp:'Ka maior (B) → ácido mais forte. Ácido mais forte tem base conjugada mais FRACA → A⁻ (vinda do ácido mais fraco) é a base conjugada mais forte.' },

  { id:'11qe35', s:'quimica', t:'Ácidos e bases fortes e fracos — Ka e Kb', type:'mc', diff:3,
    q:'🧪 Ácido HF tem pKa = 3,17. O seu Ka é aproximadamente:',
    opts:['6,8 × 10⁻⁴','3,17 × 10⁻⁵','1,0 × 10⁻³','1,0 × 10⁻¹⁴'],
    ans:0,
    exp:'Ka = 10^(−pKa) = 10^(−3,17) ≈ 6,8×10⁻⁴.' },

  { id:'11qe36', s:'quimica', t:'Ácidos e bases fortes e fracos — Ka e Kb', type:'mc', diff:3,
    q:'🧪 O par conjugado da amónia (NH₃) é:',
    opts:['NH₂⁻','NH₄⁺','OH⁻','NH₃·H₂O'],
    ans:1,
    exp:'NH₃ + H₂O ⇌ NH₄⁺ + OH⁻. Ácido conjugado de NH₃ é NH₄⁺.' },

  { id:'11qe37', s:'quimica', t:'Ácidos e bases fortes e fracos — Ka e Kb', type:'mc', diff:3,
    q:'🧪 Para o ião acetato CH₃COO⁻, Kb = 5,6×10⁻¹⁰. Qual o Ka do ácido acético (a 25 °C)?',
    opts:['1,8 × 10⁻⁵','5,6 × 10⁻⁴','1,0 × 10⁻⁷','1,0 × 10⁻¹⁴'],
    ans:0,
    exp:'Ka·Kb = Kw → Ka = 10⁻¹⁴ / 5,6×10⁻¹⁰ ≈ 1,8×10⁻⁵.' },

  { id:'11qe38', s:'quimica', t:'Ácidos e bases fortes e fracos — Ka e Kb', type:'mc', diff:3,
    q:'🧪 Solução 0,10 mol/dm³ de ácido fraco HA com Ka = 1,0×10⁻⁵. Qual o pH aproximado? (assume x << 0,10)',
    opts:['1','3','5','7'],
    ans:1,
    exp:'Ka = x²/0,10 → x² = 10⁻⁶ → x = 10⁻³ → pH = 3.',
    solution:'Ka = [H₃O⁺]²/[HA] (aprox.) → [H₃O⁺]=√(Ka·C)=√(10⁻⁵·0,1)=√(10⁻⁶)=10⁻³ → pH=3.' },

  { id:'11qe39', s:'quimica', t:'Ácidos e bases fortes e fracos — Ka e Kb', type:'tf', diff:3,
    q:'🧪 A relação Ka·Kb = Kw aplica-se SEMPRE a um par ácido-base CONJUGADO.',
    ans:true,
    exp:'É uma relação fundamental válida para qualquer par conjugado, a 25 °C onde Kw=10⁻¹⁴.' },

  { id:'11qe40', s:'quimica', t:'Ácidos e bases fortes e fracos — Ka e Kb', type:'mc', diff:2,
    q:'🧪 Numa solução de NH₃, a base conjugada do H₂O é:',
    opts:['H₃O⁺','OH⁻','NH₄⁺','NH₃·H₂O'],
    ans:1,
    exp:'H₂O cede H⁺ → torna-se OH⁻ (base conjugada).' },

  // =====================================================
  // 5) TAMPÃO E TITULAÇÕES
  // =====================================================
  { id:'11qe41', s:'quimica', t:'Soluções tampão e titulações ácido-base', type:'mc', diff:2,
    q:'🧪 Uma solução TAMPÃO típica é constituída por:',
    opts:['Ácido forte + base forte','Ácido fraco + sua base conjugada','Água destilada','Sal neutro em água'],
    ans:1,
    exp:'Tampão = ácido fraco + base conjugada (ou base fraca + ácido conjugado).' },

  { id:'11qe42', s:'quimica', t:'Soluções tampão e titulações ácido-base', type:'mc', diff:3,
    q:'🧪 Tampão com ácido acético (Ka=1,8×10⁻⁵) e acetato em concentrações iguais. pH ≈?',
    opts:['4,74','5,74','7,00','9,26'],
    ans:0,
    exp:'pH = pKa + log(1) = pKa = −log(1,8×10⁻⁵) ≈ 4,74. (Henderson-Hasselbalch)' },

  { id:'11qe43', s:'quimica', t:'Soluções tampão e titulações ácido-base', type:'mc', diff:3,
    q:'🧪 No ponto de equivalência de ácido FORTE + base FORTE, o pH é (a 25 °C):',
    opts:['Maior que 7','Igual a 7','Menor que 7','Depende das concentrações'],
    ans:1,
    exp:'A reacção produz apenas sal neutro + água → pH = 7.' },

  { id:'11qe44', s:'quimica', t:'Soluções tampão e titulações ácido-base', type:'mc', diff:3,
    q:'🧪 No ponto de equivalência de ácido FRACO + base FORTE, o pH é:',
    opts:['= 7','> 7','< 7','depende do indicador'],
    ans:1,
    exp:'O sal formado tem ânion básico (base conjugada do ácido fraco) → hidrolisa → pH > 7.' },

  { id:'11qe45', s:'quimica', t:'Soluções tampão e titulações ácido-base', type:'mc', diff:3,
    q:'🧪 Titula-se 25,0 mL de HCl 0,10 mol/dm³ com NaOH 0,10 mol/dm³. Volume de NaOH no ponto de equivalência?',
    opts:['12,5 mL','25,0 mL','50,0 mL','100,0 mL'],
    ans:1,
    exp:'n(HCl) = 0,025·0,10 = 2,5×10⁻³ mol. n(NaOH) = mesmo → V(NaOH) = 2,5×10⁻³/0,10 = 0,025 L = 25 mL.' },

  { id:'11qe46', s:'quimica', t:'Soluções tampão e titulações ácido-base', type:'mc', diff:2,
    q:'🧪 Um indicador ácido-base muda de cor numa zona de pH específica. A fenolftaleína vira-se cor-de-rosa a:',
    opts:['pH ≈ 1-2','pH ≈ 4-5','pH ≈ 8-10','pH ≈ 13-14'],
    ans:2,
    exp:'A zona de viragem da fenolftaleína é ≈ 8,3 a 10,0 (incolor → cor-de-rosa).' },

  { id:'11qe47', s:'quimica', t:'Soluções tampão e titulações ácido-base', type:'mc', diff:3,
    q:'🧪 Ao tampão acético/acetato adiciona-se uma pequena quantidade de NaOH. O que acontece?',
    opts:['pH aumenta drasticamente','pH baixa drasticamente','pH praticamente não muda','Solução fica neutra'],
    ans:2,
    exp:'É a função do tampão: o ácido acético consome o OH⁻ adicionado mantendo pH ~ constante.' },

  { id:'11qe48', s:'quimica', t:'Soluções tampão e titulações ácido-base', type:'tf', diff:2,
    q:'🧪 Numa titulação, o ponto de equivalência ocorre quando moles de ácido = moles de base.',
    ans:true,
    exp:'Por definição. Pode ou não coincidir com pH=7 (depende da força do ácido/base).' },

  { id:'11qe49', s:'quimica', t:'Soluções tampão e titulações ácido-base', type:'mc', diff:3,
    q:'🧪 Pretende-se um tampão com pH = 5,0. Qual ácido fraco escolher (Ka)?',
    opts:['HF (Ka=6,8×10⁻⁴)','Ácido benzoico (Ka=6,3×10⁻⁵)','Ácido cianídrico (Ka=6,2×10⁻¹⁰)','Ácido sulfúrico (forte)'],
    ans:1,
    exp:'pH ≈ pKa para tampões com [HA]≈[A⁻]. pKa(benzoico) ≈ 4,2; mais próximo de 5 do que os outros (e ajustável com razão de concentrações).' },

  { id:'11qe50', s:'quimica', t:'Soluções tampão e titulações ácido-base', type:'mc', diff:3,
    q:'🧪 Aplicando a equação de Henderson-Hasselbalch a um tampão com [base conjugada]/[ácido] = 10:',
    opts:['pH = pKa','pH = pKa + 1','pH = pKa − 1','pH = pKa + 10'],
    ans:1,
    exp:'pH = pKa + log(10) = pKa + 1.' },

  // =====================================================
  // 6) SOLUBILIDADE E Ks
  // =====================================================
  { id:'11qe51', s:'quimica', t:'Solubilidade e produto de solubilidade (Ks)', type:'mc', diff:2,
    q:'🧪 Para AgCl(s) ⇌ Ag⁺(aq) + Cl⁻(aq), a expressão de Ks é:',
    opts:['Ks = [Ag⁺][Cl⁻]','Ks = [AgCl]/[Ag⁺][Cl⁻]','Ks = [Ag⁺]+[Cl⁻]','Ks = [AgCl]'],
    ans:0,
    exp:'O sólido AgCl não entra na expressão de Ks.' },

  { id:'11qe52', s:'quimica', t:'Solubilidade e produto de solubilidade (Ks)', type:'mc', diff:3,
    q:'🧪 Solubilidade de AgCl é s = 1,3×10⁻⁵ mol/dm³. Ks =?',
    opts:['1,3×10⁻⁵','1,7×10⁻¹⁰','1,7×10⁻¹⁵','2,6×10⁻⁵'],
    ans:1,
    exp:'AgCl 1:1 → Ks = s² = (1,3×10⁻⁵)² ≈ 1,7×10⁻¹⁰.' },

  { id:'11qe53', s:'quimica', t:'Solubilidade e produto de solubilidade (Ks)', type:'mc', diff:3,
    q:'🧪 Para Ag₂CrO₄: Ag₂CrO₄(s) ⇌ 2 Ag⁺ + CrO₄²⁻. A expressão de Ks é:',
    opts:['Ks = [Ag⁺][CrO₄²⁻]','Ks = [Ag⁺]²[CrO₄²⁻]','Ks = 2[Ag⁺][CrO₄²⁻]','Ks = [Ag⁺]² + [CrO₄²⁻]'],
    ans:1,
    exp:'Coeficientes na expressão entram como expoentes: Ks = [Ag⁺]²·[CrO₄²⁻].' },

  { id:'11qe54', s:'quimica', t:'Solubilidade e produto de solubilidade (Ks)', type:'mc', diff:3,
    q:'🧪 Para Ag₂CrO₄ com s = 1,0×10⁻⁴ mol/dm³, Ks =?',
    opts:['1,0×10⁻⁴','1,0×10⁻⁸','4,0×10⁻¹²','4,0×10⁻⁸'],
    ans:2,
    exp:'[Ag⁺]=2s=2×10⁻⁴; [CrO₄²⁻]=s=10⁻⁴. Ks=(2×10⁻⁴)²·(10⁻⁴)=4×10⁻⁸·10⁻⁴=4×10⁻¹².' },

  { id:'11qe55', s:'quimica', t:'Solubilidade e produto de solubilidade (Ks)', type:'mc', diff:3,
    q:'🧪 Misturam-se soluções e Q > Ks. O que acontece?',
    opts:['Solução não saturada — não há precipitação','Sistema em equilíbrio','Forma-se precipitado','Sal dissolve completamente'],
    ans:2,
    exp:'Q > Ks → excesso → forma-se precipitado até Q = Ks.' },

  { id:'11qe56', s:'quimica', t:'Solubilidade e produto de solubilidade (Ks)', type:'mc', diff:3,
    q:'🧪 Adiciona-se NaCl a uma solução saturada de AgCl. A solubilidade do AgCl:',
    opts:['Aumenta','Não muda','Diminui (efeito do ião comum)','Anula-se'],
    ans:2,
    exp:'O Cl⁻ comum desloca o equilíbrio AgCl ⇌ Ag⁺ + Cl⁻ no sentido inverso → menos AgCl dissolvido.' },

  { id:'11qe57', s:'quimica', t:'Solubilidade e produto de solubilidade (Ks)', type:'tf', diff:3,
    q:'🧪 O CaCO₃ é mais solúvel em solução ácida do que em água pura.',
    ans:true,
    exp:'CO₃²⁻ é base fraca → reage com H⁺. Remove-se CO₃²⁻ do equilíbrio → mais CaCO₃ dissolve (Le Châtelier).' },

  { id:'11qe58', s:'quimica', t:'Solubilidade e produto de solubilidade (Ks)', type:'mc', diff:2,
    q:'🧪 Quando uma solução está SATURADA:',
    opts:['Q < Ks','Q = Ks','Q > Ks','Não há equilíbrio'],
    ans:1,
    exp:'Saturada = em equilíbrio com o sólido → Q = Ks.' },

  { id:'11qe59', s:'quimica', t:'Solubilidade e produto de solubilidade (Ks)', type:'order', diff:3,
    q:'🧪 Ordena por SOLUBILIDADE crescente (todos sais 1:1):',
    items:['Ks = 1,0×10⁻¹⁵','Ks = 1,0×10⁻¹⁰','Ks = 1,0×10⁻⁵','Ks = 1,0×10⁻²'],
    ans:'1,2,3,4',
    exp:'Para 1:1, s=√Ks. Ks maior → solubilidade maior.' },

  { id:'11qe60', s:'quimica', t:'Solubilidade e produto de solubilidade (Ks)', type:'mc', diff:3,
    q:'🧪 Misturam-se 50 mL de Pb(NO₃)₂ 0,02 mol/dm³ com 50 mL de KI 0,02 mol/dm³. Ks(PbI₂)=7,1×10⁻⁹. Há precipitação?',
    opts:['Sim, Q > Ks','Não, Q < Ks','Não, Q = Ks','Não há dados suficientes'],
    ans:0,
    exp:'Diluição: [Pb²⁺]=0,01; [I⁻]=0,01. Q=[Pb²⁺][I⁻]²=0,01·(0,01)²=10⁻⁶. Q(10⁻⁶) > Ks(7,1×10⁻⁹) → precipita.' },

  // =====================================================
  // 7) OXIDAÇÃO-REDUÇÃO
  // =====================================================
  { id:'11qe61', s:'quimica', t:'Equilíbrio de oxidação-redução', type:'mc', diff:2,
    q:'⚡ A oxidação corresponde a:',
    opts:['Ganho de electrões e diminuição do n.o.','Perda de electrões e aumento do n.o.','Ganho de protões','Perda de massa'],
    ans:1,
    exp:'Oxidação = perde electrões → n.o. aumenta.' },

  { id:'11qe62', s:'quimica', t:'Equilíbrio de oxidação-redução', type:'mc', diff:2,
    q:'⚡ Numa reacção redox, o agente oxidante:',
    opts:['Cede electrões e é oxidado','Aceita electrões e é reduzido','Cede electrões e é reduzido','Não participa em transferência de electrões'],
    ans:1,
    exp:'Agente oxidante OXIDA outro → ele próprio aceita electrões → é reduzido.' },

  { id:'11qe63', s:'quimica', t:'Equilíbrio de oxidação-redução', type:'mc', diff:2,
    q:'⚡ Número de oxidação do oxigénio em H₂O é:',
    opts:['+1','−1','−2','0'],
    ans:2,
    exp:'O em compostos comuns tem n.o. = −2 (excepto peróxidos e OF₂).' },

  { id:'11qe64', s:'quimica', t:'Equilíbrio de oxidação-redução', type:'mc', diff:3,
    q:'⚡ Número de oxidação do enxofre em SO₄²⁻:',
    opts:['+2','+4','+6','−2'],
    ans:2,
    exp:'4·(−2) + n.o.(S) = −2 → n.o.(S) = +6.' },

  { id:'11qe65', s:'quimica', t:'Equilíbrio de oxidação-redução', type:'mc', diff:3,
    q:'⚡ Número de oxidação do crómio em K₂Cr₂O₇:',
    opts:['+3','+5','+6','+7'],
    ans:2,
    exp:'2·(+1) + 2·n.o.(Cr) + 7·(−2) = 0 → 2·n.o.(Cr) = +12 → n.o.(Cr) = +6.' },

  { id:'11qe66', s:'quimica', t:'Equilíbrio de oxidação-redução', type:'mc', diff:3,
    q:'⚡ Na reacção Zn + 2 HCl → ZnCl₂ + H₂, qual é o agente OXIDANTE?',
    opts:['Zn','HCl (o ião H⁺)','ZnCl₂','H₂'],
    ans:1,
    exp:'H⁺ recebe electrões e forma H₂ → é reduzido → é o agente oxidante. Zn perde electrões (oxida-se).' },

  { id:'11qe67', s:'quimica', t:'Equilíbrio de oxidação-redução', type:'mc', diff:2,
    q:'⚡ Em H₂O₂ (peróxido), o n.o. do oxigénio é:',
    opts:['−2','−1','+1','0'],
    ans:1,
    exp:'Excepção: nos peróxidos o n.o. do O é −1.' },

  { id:'11qe68', s:'quimica', t:'Equilíbrio de oxidação-redução', type:'tf', diff:2,
    q:'⚡ Numa reacção redox, o número total de electrões cedidos é igual ao número de electrões recebidos.',
    ans:true,
    exp:'É a base do balanceamento de equações redox.' },

  { id:'11qe69', s:'quimica', t:'Equilíbrio de oxidação-redução', type:'mc', diff:3,
    q:'⚡ Em Cl₂ + 2 KBr → 2 KCl + Br₂, qual a espécie OXIDADA?',
    opts:['Cl₂','Br⁻','K⁺','KCl'],
    ans:1,
    exp:'Br⁻ (n.o. −1) → Br₂ (n.o. 0): perdeu electrões → oxidou-se. Cl₂ (0) → Cl⁻ (−1): reduziu-se.' },

  { id:'11qe70', s:'quimica', t:'Equilíbrio de oxidação-redução', type:'mc', diff:2,
    q:'⚡ Número de oxidação do azoto em NH₃:',
    opts:['−3','+3','−5','+5'],
    ans:0,
    exp:'3·(+1) + n.o.(N) = 0 → n.o.(N) = −3.' },

  // =====================================================
  // 8) PILHAS E POTENCIAIS DE ELÉCTRODO
  // =====================================================
  { id:'11qe71', s:'quimica', t:'Pilhas e potenciais de eléctrodo', type:'mc', diff:2,
    q:'🔋 Numa pilha electroquímica (galvânica):',
    opts:['Ânodo é positivo; cátodo é negativo','Ânodo é negativo (oxidação); cátodo é positivo (redução)','Ambos são neutros','Depende da concentração'],
    ans:1,
    exp:'Pilha (espontânea): ânodo (−) onde oxida, cátodo (+) onde reduz. (Em electrólise é o oposto.)' },

  { id:'11qe72', s:'quimica', t:'Pilhas e potenciais de eléctrodo', type:'mc', diff:2,
    q:'🔋 A função da PONTE SALINA numa pilha é:',
    opts:['Conduzir os electrões entre eléctrodos','Manter a neutralidade eléctrica das soluções','Aumentar a tensão da pilha','Catalisar a reacção'],
    ans:1,
    exp:'A ponte salina permite migração de iões para evitar acumulação de carga em cada compartimento.' },

  { id:'11qe73', s:'quimica', t:'Pilhas e potenciais de eléctrodo', type:'mc', diff:3,
    q:'🔋 Pilha de Daniell: Zn|Zn²⁺ ‖ Cu²⁺|Cu. E°(Zn²⁺/Zn)=−0,76 V; E°(Cu²⁺/Cu)=+0,34 V. E°pilha?',
    opts:['+0,42 V','+1,10 V','−1,10 V','−0,42 V'],
    ans:1,
    exp:'E°pilha = E°cátodo − E°ânodo = +0,34 − (−0,76) = +1,10 V.' },

  { id:'11qe74', s:'quimica', t:'Pilhas e potenciais de eléctrodo', type:'mc', diff:3,
    q:'🔋 Numa pilha Zn/Cu, o eléctrodo de zinco é o:',
    opts:['Cátodo (positivo)','Ânodo (negativo)','Eléctrodo neutro','Indicador de pH'],
    ans:1,
    exp:'Zn tem E° menor → cede electrões mais facilmente → oxida-se → ÂNODO (−).' },

  { id:'11qe75', s:'quimica', t:'Pilhas e potenciais de eléctrodo', type:'tf', diff:2,
    q:'🔋 Uma pilha funciona espontaneamente se E°pilha > 0.',
    ans:true,
    exp:'E°pilha > 0 ↔ ΔG < 0 → reacção espontânea.' },

  { id:'11qe76', s:'quimica', t:'Pilhas e potenciais de eléctrodo', type:'mc', diff:3,
    q:'🔋 Dois metais: A com E°=+0,80 V, B com E°=−0,44 V. Numa pilha A/B, qual é o ânodo?',
    opts:['A','B','Não funciona','Depende da concentração'],
    ans:1,
    exp:'Metal com E° MENOR é mais redutor → cede electrões → ânodo. B (−0,44) < A (+0,80) → B é o ânodo.' },

  { id:'11qe77', s:'quimica', t:'Pilhas e potenciais de eléctrodo', type:'mc', diff:3,
    q:'🔋 Da série electroquímica, qual o metal MAIS facilmente corroído (mais redutor)?',
    opts:['Au (E°=+1,50 V)','Cu (E°=+0,34 V)','Fe (E°=−0,44 V)','Mg (E°=−2,37 V)'],
    ans:3,
    exp:'E° mais negativo → mais redutor → mais facilmente oxidado → corrói-se preferencialmente. Mg.' },

  { id:'11qe78', s:'quimica', t:'Pilhas e potenciais de eléctrodo', type:'mc', diff:3,
    q:'🔋 Para proteger o ferro da corrosão usa-se "protecção catódica" com zinco. Porquê?',
    opts:['O Zn é mais nobre','Zn tem E° mais negativo → oxida-se preferencialmente em vez do Fe','Zn é mais barato','Zn não conduz corrente'],
    ans:1,
    exp:'E°(Zn)=−0,76 V < E°(Fe)=−0,44 V → Zn é mais redutor → corrói-se em vez do Fe (ânodo de sacrifício).' },

  { id:'11qe79', s:'quimica', t:'Pilhas e potenciais de eléctrodo', type:'mc', diff:3,
    q:'🔋 Dada a pilha: Mg | Mg²⁺ ‖ Ag⁺ | Ag, com E°(Mg²⁺/Mg)=−2,37 V e E°(Ag⁺/Ag)=+0,80 V. E°pilha =?',
    opts:['+1,57 V','+3,17 V','−3,17 V','+2,37 V'],
    ans:1,
    exp:'E°pilha = E°cátodo − E°ânodo = +0,80 − (−2,37) = +3,17 V.' },

  { id:'11qe80', s:'quimica', t:'Pilhas e potenciais de eléctrodo', type:'order', diff:3,
    q:'🔋 Ordena por poder REDUTOR crescente (do menos para o mais redutor):',
    items:['Au (E°=+1,50 V)','Cu (E°=+0,34 V)','Fe (E°=−0,44 V)','K (E°=−2,93 V)'],
    ans:'1,2,3,4',
    exp:'E° mais positivo → menos redutor. Au < Cu < Fe < K (mais redutor).' }
];

if (typeof window !== 'undefined') {
    window.EXERCISES_11_Q_EXTRA = EXERCISES_11_Q_EXTRA;
}

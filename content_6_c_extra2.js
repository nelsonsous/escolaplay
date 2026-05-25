// EscolaPlay - Top-up 6.º ano - Ciências da Natureza (UAU! Vida 6 — Areal)
// Reforço: Sistema imunitário (15). Exercícios de plantas movidos para content_6_c_extra3.js (categorias de teste do 3.º período).
const EXERCISES_6_C_EXTRA2 = [
    // ============================================================
    // TÓPICO A — SISTEMA IMUNITÁRIO (15)
    // ============================================================

    // diff 1 (6)
    { id:'6ce2_001', s:'ciencias', t:'Sistema imunitário', type:'mc', diff:1,
      q:'🛡️ Qual é a primeira barreira de defesa do corpo contra micróbios?',
      opts:['Os pulmões','A pele','O coração','O fígado'], ans:1,
      exp:'A pele é a primeira barreira física que impede a entrada de micróbios.' },

    { id:'6ce2_002', s:'ciencias', t:'Sistema imunitário', type:'mc', diff:1,
      q:'🧫 Como se chamam as células do sangue que combatem infeções?',
      opts:['Glóbulos vermelhos','Plaquetas','Glóbulos brancos','Hemácias'], ans:2,
      exp:'Os glóbulos brancos, ou leucócitos, defendem o organismo dos agentes infecciosos.' },

    { id:'6ce2_003', s:'ciencias', t:'Sistema imunitário', type:'tf', diff:1,
      q:'As lágrimas e a saliva também ajudam a defender o nosso corpo.',
      opts:['Verdadeiro','Falso'], ans:0,
      exp:'Verdadeiro. As lágrimas, a saliva e as mucosas contêm substâncias que destroem micróbios.' },

    { id:'6ce2_004', s:'ciencias', t:'Sistema imunitário', type:'mc', diff:1,
      q:'💉 Para que servem as vacinas?',
      opts:['Para curar todas as doenças','Para preparar o corpo a defender-se de uma doença','Para aumentar a febre','Para alimentar os glóbulos brancos'], ans:1,
      exp:'A vacina ensina o sistema imunitário a reconhecer e combater um agente, criando defesas (anticorpos).' },

    { id:'6ce2_005', s:'ciencias', t:'Sistema imunitário', type:'fill', diff:1,
      q:'Os ___ são produzidos pelo corpo para combater agentes invasores específicos.',
      opts:['anticorpos','antibióticos','antigénios','antídotos'], ans:["anticorpos"],
      exp:'Os anticorpos são proteínas produzidas pelos linfócitos para combater antigénios.' },

    { id:'6ce2_006', s:'ciencias', t:'Sistema imunitário', type:'mc', diff:1,
      q:'🍋 Que líquido do estômago ajuda a destruir micróbios engolidos com a comida?',
      opts:['Água','Suco gástrico','Saliva','Bílis'], ans:1,
      exp:'O suco gástrico do estômago é muito ácido e destrói grande parte dos micróbios ingeridos.' },

    // diff 2 (6)
    { id:'6ce2_007', s:'ciencias', t:'Sistema imunitário', type:'mc', diff:2,
      q:'🦠 Como se chama a substância estranha que provoca uma resposta do sistema imunitário?',
      opts:['Antigénio','Anticorpo','Hormona','Enzima'], ans:0,
      exp:'O antigénio é a substância (vírus, bactéria...) que ativa a defesa imunitária.' },

    { id:'6ce2_008', s:'ciencias', t:'Sistema imunitário', type:'mc', diff:2,
      q:'🤧 O que é uma alergia?',
      opts:['Uma infeção viral','Uma reação exagerada do sistema imunitário a algo inofensivo','Uma falta de defesas','Uma doença bacteriana'], ans:1,
      exp:'Numa alergia, o sistema imunitário reage de forma exagerada a algo que normalmente não causaria problema (pólen, pó, alimentos...).' },

    { id:'6ce2_009', s:'ciencias', t:'Sistema imunitário', type:'tf', diff:2,
      q:'A imunidade adquirida é a que se desenvolve ao longo da vida, por exemplo após uma vacina ou doença.',
      opts:['Verdadeiro','Falso'], ans:0,
      exp:'Verdadeiro. A imunidade adquirida desenvolve-se com a exposição a antigénios ou através de vacinas.' },

    { id:'6ce2_010', s:'ciencias', t:'Sistema imunitário', type:'mc', diff:2,
      q:'🧬 Que doença ataca diretamente o sistema imunitário, enfraquecendo as defesas do corpo?',
      opts:['Gripe','SIDA','Sarampo','Varicela'], ans:1,
      exp:'A SIDA, causada pelo vírus VIH, destrói células do sistema imunitário, deixando o corpo vulnerável.' },

    { id:'6ce2_011', s:'ciencias', t:'Sistema imunitário', type:'fill', diff:2,
      q:'A imunidade ___ é aquela com que já nascemos (pele, mucosas, glóbulos brancos).',
      opts:['natural','adquirida','passiva','artificial'], ans:["natural"],
      exp:'A imunidade natural é a que existe desde o nascimento; a adquirida desenvolve-se ao longo da vida.' },

    { id:'6ce2_012', s:'ciencias', t:'Sistema imunitário', type:'mc', diff:2,
      q:'💪 Quando recuperas de uma doença como a varicela, normalmente...',
      opts:['Apanha-la sempre que te expões','Ficas imune a essa doença','Ficas mais frágil','Tornas-te portador para sempre'], ans:1,
      exp:'O corpo guarda memória do antigénio através dos linfócitos, criando imunidade duradoura.' },

    // diff 3 (3)
    { id:'6ce2_013', s:'ciencias', t:'Sistema imunitário', type:'mc', diff:3,
      q:'🔬 Quando recebemos anticorpos prontos (por exemplo do leite materno), trata-se de imunidade...',
      opts:['Ativa adquirida','Passiva','Natural inata','Artificial ativa'], ans:1,
      exp:'É imunidade passiva: recebem-se anticorpos já formados, sem o corpo os produzir.' },

    { id:'6ce2_014', s:'ciencias', t:'Sistema imunitário', type:'tf', diff:3,
      q:'Tomar antibióticos sempre que estamos constipados é a melhor forma de defesa do organismo.',
      opts:['Verdadeiro','Falso'], ans:1,
      exp:'Falso. Os antibióticos só atuam contra bactérias, não contra vírus (como o da constipação), e usá-los em excesso causa resistências.' },

    { id:'6ce2_015', s:'ciencias', t:'Sistema imunitário', type:'mc', diff:3,
      q:'🩸 Onde são produzidos a maior parte dos glóbulos brancos?',
      opts:['Coração','Medula óssea','Pulmões','Estômago'], ans:1,
      exp:'A medula óssea, no interior dos ossos, produz glóbulos brancos, vermelhos e plaquetas.' },
];
if (typeof window !== 'undefined') window.EXERCISES_6_C_EXTRA2 = EXERCISES_6_C_EXTRA2;

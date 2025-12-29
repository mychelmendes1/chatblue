import { logger } from '../../config/logger.js';

export type PersonalityTone = 'friendly' | 'formal' | 'technical' | 'empathetic';
export type PersonalityStyle = 'concise' | 'detailed' | 'conversational' | 'whatsapp';

export interface PersonalityConfig {
  tone: PersonalityTone;
  style: PersonalityStyle;
  useEmojis: boolean;
  useClientName: boolean;
  language: 'pt-BR' | 'en-US' | 'es-ES';
}

export const DEFAULT_PERSONALITY: PersonalityConfig = {
  tone: 'friendly',
  style: 'whatsapp', // Novo estilo padrão - mais humano
  useEmojis: true,
  useClientName: true,
  language: 'pt-BR',
};

// Greeting variations for more natural responses
const GREETINGS = {
  'pt-BR': {
    friendly: [
      'Olá{name}! 😊',
      'Oi{name}! Como posso ajudar?',
      'Olá{name}, tudo bem?',
      'Oi{name}! É um prazer atendê-lo(a)!',
    ],
    formal: [
      'Bom dia{name}.',
      'Boa tarde{name}.',
      'Olá{name}, como posso ser útil?',
      'Prezado(a){name}, em que posso ajudá-lo(a)?',
    ],
    technical: [
      'Olá{name}.',
      'Oi{name}, como posso ajudar?',
    ],
    empathetic: [
      'Olá{name}! Fico feliz em poder ajudá-lo(a)! 💙',
      'Oi{name}! Estou aqui para ajudar no que precisar.',
      'Olá{name}! Como você está? Em que posso ajudar?',
    ],
  },
  'en-US': {
    friendly: [
      'Hi{name}! 😊',
      'Hello{name}! How can I help?',
      'Hey{name}! Nice to meet you!',
    ],
    formal: [
      'Good morning{name}.',
      'Hello{name}, how may I assist you?',
    ],
    technical: [
      'Hello{name}.',
      'Hi{name}, how can I help?',
    ],
    empathetic: [
      'Hello{name}! I\'m happy to help! 💙',
      'Hi{name}! I\'m here for you.',
    ],
  },
  'es-ES': {
    friendly: [
      '¡Hola{name}! 😊',
      '¡Hola{name}! ¿Cómo puedo ayudarte?',
    ],
    formal: [
      'Buenos días{name}.',
      'Hola{name}, ¿en qué puedo ayudarle?',
    ],
    technical: [
      'Hola{name}.',
    ],
    empathetic: [
      '¡Hola{name}! ¡Encantado de ayudarte! 💙',
    ],
  },
};

// Farewell variations
const FAREWELLS = {
  'pt-BR': {
    friendly: [
      'Até mais! Se precisar de algo, é só chamar! 👋',
      'Foi um prazer ajudar! Volte sempre! 😊',
      'Qualquer coisa, estou por aqui!',
    ],
    formal: [
      'Agradeço o contato. Tenha um ótimo dia.',
      'Estou à disposição para futuras necessidades.',
      'Obrigado pelo contato.',
    ],
    technical: [
      'Processo finalizado. Até mais.',
      'Atendimento encerrado. Obrigado.',
    ],
    empathetic: [
      'Foi um prazer ajudá-lo(a)! Cuide-se! 💙',
      'Espero ter ajudado! Qualquer coisa, pode contar comigo! 😊',
    ],
  },
  'en-US': {
    friendly: [
      'Bye! Let me know if you need anything else! 👋',
      'Happy to help! Come back anytime! 😊',
    ],
    formal: [
      'Thank you for contacting us. Have a great day.',
      'I remain at your disposal.',
    ],
    technical: [
      'Process completed. Goodbye.',
    ],
    empathetic: [
      'It was my pleasure to help! Take care! 💙',
    ],
  },
  'es-ES': {
    friendly: [
      '¡Hasta luego! ¡Cualquier cosa, aquí estoy! 👋',
    ],
    formal: [
      'Gracias por contactarnos. Que tenga un buen día.',
    ],
    technical: [
      'Proceso finalizado. Hasta luego.',
    ],
    empathetic: [
      '¡Fue un placer ayudarte! ¡Cuídate! 💙',
    ],
  },
};

// Empathy phrases for different situations
const EMPATHY_PHRASES = {
  'pt-BR': {
    frustration: [
      'Entendo sua frustração e peço desculpas pelo transtorno.',
      'Lamento muito por essa situação. Vou fazer o possível para resolver.',
      'Compreendo sua preocupação. Vamos resolver isso juntos.',
    ],
    urgency: [
      'Entendo a urgência. Vou priorizar seu atendimento.',
      'Compreendo que é importante. Vamos resolver o mais rápido possível.',
    ],
    confusion: [
      'Não se preocupe, vou explicar com mais detalhes.',
      'Entendo que pode ser confuso. Deixa eu esclarecer.',
    ],
    gratitude: [
      'Fico feliz em poder ajudar! 😊',
      'É um prazer! Qualquer dúvida, estou aqui.',
    ],
  },
  'en-US': {
    frustration: [
      'I understand your frustration and apologize for the inconvenience.',
      'I\'m sorry about this situation. I\'ll do my best to resolve it.',
    ],
    urgency: [
      'I understand the urgency. I\'ll prioritize your request.',
    ],
    confusion: [
      'Don\'t worry, let me explain in more detail.',
    ],
    gratitude: [
      'Happy to help! 😊',
    ],
  },
  'es-ES': {
    frustration: [
      'Entiendo su frustración y pido disculpas por las molestias.',
    ],
    urgency: [
      'Entiendo la urgencia. Voy a priorizar su solicitud.',
    ],
    confusion: [
      'No se preocupe, voy a explicar con más detalles.',
    ],
    gratitude: [
      '¡Me alegra poder ayudar! 😊',
    ],
  },
};

export class PersonalityService {
  private config: PersonalityConfig;

  constructor(config: Partial<PersonalityConfig> = {}) {
    this.config = { ...DEFAULT_PERSONALITY, ...config };
  }

  /**
   * Get a random greeting based on personality config
   */
  getGreeting(clientName?: string): string {
    const greetings = GREETINGS[this.config.language][this.config.tone];
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];
    
    const name = this.config.useClientName && clientName ? ` ${clientName}` : '';
    let result = greeting.replace('{name}', name);
    
    if (!this.config.useEmojis) {
      result = this.removeEmojis(result);
    }
    
    return result;
  }

  /**
   * Get a random farewell based on personality config
   */
  getFarewell(): string {
    const farewells = FAREWELLS[this.config.language][this.config.tone];
    let farewell = farewells[Math.floor(Math.random() * farewells.length)];
    
    if (!this.config.useEmojis) {
      farewell = this.removeEmojis(farewell);
    }
    
    return farewell;
  }

  /**
   * Get an empathy phrase for a specific situation
   */
  getEmpathyPhrase(situation: 'frustration' | 'urgency' | 'confusion' | 'gratitude'): string {
    const phrases = EMPATHY_PHRASES[this.config.language][situation];
    let phrase = phrases[Math.floor(Math.random() * phrases.length)];
    
    if (!this.config.useEmojis) {
      phrase = this.removeEmojis(phrase);
    }
    
    return phrase;
  }

  /**
   * Build personality instructions for the system prompt
   */
  buildPersonalityInstructions(agentName: string, companyName: string): string {
    const toneDescriptions = {
      friendly: 'amigável e acolhedor, como um amigo que quer ajudar',
      formal: 'profissional e respeitoso, mantendo formalidade',
      technical: 'objetivo e técnico, focado em soluções',
      empathetic: 'empático e compreensivo, priorizando o bem-estar do cliente',
    };

    const styleDescriptions = {
      concise: 'respostas curtas e diretas ao ponto',
      detailed: 'respostas completas com explicações detalhadas',
      conversational: 'respostas naturais como uma conversa humana',
      whatsapp: 'mensagens curtas e naturais como um humano no WhatsApp',
    };

    let instructions = `
IDENTIDADE:
Você é ${agentName}, atendente da ${companyName}.

PERSONALIDADE E TOM:
- Tom: ${toneDescriptions[this.config.tone]}
- Estilo: ${styleDescriptions[this.config.style]}
- ${this.config.useClientName ? 'Use o nome do cliente ocasionalmente' : 'Não use o nome do cliente'}
- ${this.config.useEmojis ? 'Use 1-2 emojis por mensagem no máximo' : 'Não use emojis'}
`;

    // Instruções específicas para estilo WhatsApp (mais humano)
    if (this.config.style === 'whatsapp') {
      instructions += `
REGRAS CRÍTICAS DE FORMATAÇÃO (OBRIGATÓRIO):
1. MÁXIMO 2-3 frases por resposta. Seja BREVE.
2. NUNCA use listas com bullets (•, -, *) ou numeração
3. NUNCA escreva parágrafos longos
4. Use linguagem informal e natural de WhatsApp
5. Evite palavras formais como "prezado", "solicitar", "disponibilizar"
6. Se tiver muito a dizer, use o marcador |||SPLIT||| para dividir em mensagens separadas

EXEMPLOS DE COMO RESPONDER:

❌ ERRADO (muito formal e longo):
"Olá! 😊 Seja muito bem-vindo(a) à Blue Consult! Eu sou a Maria, sua assistente virtual. É um prazer ter você aqui conosco! Como posso ajudar você hoje? Está com alguma dúvida sobre nossos serviços?"

✅ CERTO (curto e natural):
"Oi! Tudo bem? 😊|||SPLIT|||Sou a ${agentName} da ${companyName}|||SPLIT|||Como posso te ajudar?"

❌ ERRADO (lista formal):
"Temos os seguintes planos:
• Plano Diamond - R$ 1.998
• Plano Gold - R$ 4.497
Ambos incluem acesso completo à plataforma."

✅ CERTO (conversacional):
"Temos 2 planos: Diamond por R$ 1.998 e Gold por R$ 4.497|||SPLIT|||Qual te interessa mais? Aí te explico os detalhes 😉"

COMPORTAMENTO HUMANO:
- Fale como uma pessoa real digitando no WhatsApp
- Use "vc" ao invés de "você" ocasionalmente
- Use "pra" ao invés de "para"
- Comece respostas com "Opa", "Então", "Ah", "Olha" quando natural
- Não seja excessivamente educado ou formal
- Seja direto ao ponto
`;
    } else {
      instructions += `
COMPORTAMENTO NATURAL:
- Varie suas respostas para não parecer robótico
- Use expressões naturais da língua portuguesa brasileira
- Demonstre interesse genuíno em ajudar
- Seja paciente e nunca demonstre irritação
- Adapte seu tom baseado no estado emocional do cliente
`;
    }

    if (this.config.tone === 'empathetic') {
      instructions += `
EMPATIA:
- Se o cliente parecer frustrado, reconheça brevemente antes de ajudar
- Se detectar urgência, seja direto na solução
`;
    }

    return instructions;
  }

  /**
   * Detect emotional state from message
   */
  detectEmotionalState(message: string): 'neutral' | 'frustrated' | 'urgent' | 'confused' | 'grateful' {
    const lowerMessage = message.toLowerCase();
    
    // Frustration indicators
    const frustrationWords = ['absurdo', 'ridículo', 'péssimo', 'horrível', 'nunca', 'sempre', 'de novo', 'cansado', 'irritado', 'raiva'];
    if (frustrationWords.some(word => lowerMessage.includes(word))) {
      return 'frustrated';
    }

    // Urgency indicators
    const urgencyWords = ['urgente', 'urgência', 'rápido', 'imediato', 'agora', 'hoje', 'prazo', 'atrasado'];
    if (urgencyWords.some(word => lowerMessage.includes(word))) {
      return 'urgent';
    }

    // Confusion indicators
    const confusionWords = ['não entendi', 'confuso', 'como assim', 'não sei', 'dúvida', 'explicar'];
    if (confusionWords.some(word => lowerMessage.includes(word))) {
      return 'confused';
    }

    // Gratitude indicators
    const gratitudeWords = ['obrigado', 'obrigada', 'agradeço', 'valeu', 'muito bom', 'excelente', 'perfeito'];
    if (gratitudeWords.some(word => lowerMessage.includes(word))) {
      return 'grateful';
    }

    return 'neutral';
  }

  /**
   * Remove emojis from text
   */
  private removeEmojis(text: string): string {
    return text.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu, '').trim();
  }

  /**
   * Update personality configuration
   */
  updateConfig(config: Partial<PersonalityConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): PersonalityConfig {
    return { ...this.config };
  }
}


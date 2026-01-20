/**
 * Traduz erros da API do Meta (WhatsApp Business) para português
 */

// Mapeamento de erros conhecidos do Meta para mensagens em português
const META_ERROR_TRANSLATIONS: Record<string, string> = {
  // Erros de janela de 24h
  'Re-engagement message': '⚠️ Mensagem fora da janela de 24h. O contato não enviou mensagem nas últimas 24 horas. Use um template aprovado para iniciar a conversa.',
  'Re-engagement messages require an approved template': '⚠️ Mensagem fora da janela de 24h. Use um template aprovado para reengajar o contato.',
  
  // Erros de ecossistema/spam
  'This message was not delivered to maintain healthy ecosystem engagement': '⚠️ Mensagem bloqueada pelo WhatsApp para manter a qualidade do ecossistema. Possíveis causas: template não aprovado, excesso de mensagens ou baixa qualidade do número.',
  
  // Erros de template
  'Template not found': '⚠️ Template não encontrado. Verifique se o nome do template está correto e se ele foi aprovado no Meta Business.',
  'Template is not approved': '⚠️ Template ainda não aprovado. Aguarde a aprovação do Meta ou use outro template.',
  'Template has been paused': '⚠️ Template pausado pelo Meta. Verifique a qualidade do template no Business Manager.',
  'Template has been disabled': '⚠️ Template desativado. O template foi removido ou desabilitado.',
  
  // Erros de número/contato
  'Recipient phone number not in allowed list': '⚠️ Número não está na lista de permitidos. Em modo sandbox, adicione o número na lista de teste.',
  'Invalid WhatsApp number': '⚠️ Número do WhatsApp inválido. Verifique se o número está correto e tem WhatsApp.',
  'Phone number not found': '⚠️ Número de telefone não encontrado.',
  'User has blocked the number': '⚠️ O contato bloqueou este número.',
  'User is not a WhatsApp user': '⚠️ Este número não possui WhatsApp.',
  
  // Erros de rate limit
  'Rate limit hit': '⚠️ Limite de envio atingido. Aguarde alguns minutos antes de enviar mais mensagens.',
  'Too many requests': '⚠️ Muitas requisições. Aguarde antes de tentar novamente.',
  'Message rate limit reached': '⚠️ Limite de mensagens por minuto atingido.',
  
  // Erros de mídia
  'Media download failed': '⚠️ Falha ao baixar mídia. O arquivo pode estar corrompido ou inacessível.',
  'Media upload failed': '⚠️ Falha ao enviar mídia. Tente novamente ou use um arquivo menor.',
  'Unsupported media type': '⚠️ Tipo de mídia não suportado pelo WhatsApp.',
  'Media file too large': '⚠️ Arquivo muito grande. O WhatsApp tem limites de tamanho para mídias.',
  
  // Erros de autenticação
  'Access token has expired': '⚠️ Token de acesso expirado. Reconecte a conta do WhatsApp Business.',
  'Invalid access token': '⚠️ Token de acesso inválido. Verifique as credenciais da conexão.',
  'Permission denied': '⚠️ Permissão negada. A conta não tem permissão para esta ação.',
  
  // Erros gerais
  'Message failed to send': '⚠️ Falha ao enviar mensagem. Tente novamente.',
  'Unknown error': '⚠️ Erro desconhecido ao enviar mensagem.',
  'Service temporarily unavailable': '⚠️ Serviço temporariamente indisponível. Tente novamente em instantes.',
  'Internal error': '⚠️ Erro interno do WhatsApp. Tente novamente.',
};

/**
 * Traduz uma mensagem de erro do Meta para português
 */
export function translateMetaError(errorMessage: string): string {
  // Verificar tradução exata
  if (META_ERROR_TRANSLATIONS[errorMessage]) {
    return META_ERROR_TRANSLATIONS[errorMessage];
  }
  
  // Verificar se contém alguma parte conhecida
  for (const [key, translation] of Object.entries(META_ERROR_TRANSLATIONS)) {
    if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
      return translation;
    }
  }
  
  // Traduzir erros com código numérico do Meta
  if (errorMessage.includes('(#')) {
    const codeMatch = errorMessage.match(/\(#(\d+)\)/);
    if (codeMatch) {
      const errorCode = codeMatch[1];
      const translatedByCode = translateMetaErrorCode(errorCode);
      if (translatedByCode) {
        return translatedByCode;
      }
    }
  }
  
  // Retornar mensagem genérica com o erro original
  return `⚠️ Erro ao enviar mensagem: ${errorMessage}`;
}

/**
 * Traduz códigos de erro específicos do Meta
 */
function translateMetaErrorCode(code: string): string | null {
  const errorCodes: Record<string, string> = {
    '130429': '⚠️ Limite de mensagens atingido. Aguarde antes de enviar mais.',
    '131026': '⚠️ Mensagem fora da janela de 24h. Use um template aprovado.',
    '131047': '⚠️ Mensagem fora da janela de 24h. O contato precisa enviar uma mensagem primeiro.',
    '131051': '⚠️ Tipo de mensagem não suportado.',
    '131052': '⚠️ Mídia não encontrada ou expirada.',
    '131053': '⚠️ Formato de mídia não suportado.',
    '132000': '⚠️ Limite de templates por dia atingido.',
    '132001': '⚠️ Template não encontrado.',
    '132005': '⚠️ Parâmetros do template incorretos.',
    '132007': '⚠️ Problema de formatação do template.',
    '132012': '⚠️ Template pausado por baixa qualidade.',
    '132015': '⚠️ Template desativado.',
    '133000': '⚠️ Problema com a conta do WhatsApp Business.',
    '133004': '⚠️ Conta em modo sandbox. Adicione o número na lista de teste.',
    '133010': '⚠️ Conta restrita. Verifique o status no Business Manager.',
    '135000': '⚠️ Erro genérico. Tente novamente.',
    '368': '⚠️ Conta temporariamente bloqueada por violação de políticas.',
    '80007': '⚠️ Limite de taxa de envio atingido.',
  };
  
  return errorCodes[code] || null;
}

/**
 * Verifica se o erro é relacionado à janela de 24h
 */
export function isWindowError(errorMessage: string): boolean {
  const windowErrors = [
    're-engagement',
    'window',
    '131026',
    '131047',
    '24 hour',
    '24h',
  ];
  
  const lowerError = errorMessage.toLowerCase();
  return windowErrors.some(e => lowerError.includes(e));
}

/**
 * Obtém uma sugestão de ação baseada no erro
 */
export function getErrorSuggestion(errorMessage: string): string | null {
  if (isWindowError(errorMessage)) {
    return 'Dica: Use a opção "Enviar Template" para reengajar o contato fora da janela de 24h.';
  }
  
  if (errorMessage.toLowerCase().includes('template')) {
    return 'Dica: Verifique o status do template no Meta Business Manager.';
  }
  
  if (errorMessage.toLowerCase().includes('rate') || errorMessage.toLowerCase().includes('limit')) {
    return 'Dica: Aguarde alguns minutos antes de tentar novamente.';
  }
  
  return null;
}


/**
 * Funções puras de casamento (match) das automações de comentário do Instagram.
 * Sem dependência de banco/rede para poder ser testado isoladamente.
 */

export type CommentMatchMode = 'contains' | 'exact' | 'regex';

export type CommentMediaType = 'FEED' | 'REELS' | 'AD' | 'LIVE' | 'STORY' | string;

/** Campos da automação usados no casamento (subconjunto do model Prisma). */
export interface MatchableAutomation {
  mediaIds: string[];
  mediaTypes: string[];
  keywords: string[];
  matchMode: string;
  excludeReplies: boolean;
}

/** Dados do comentário usados no casamento. */
export interface CommentMatchInput {
  text?: string | null;
  mediaId?: string | null;
  /** media_product_type vindo do webhook (FEED, REELS, AD...) */
  mediaProductType?: string | null;
  adId?: string | null;
  parentId?: string | null;
  field?: 'comments' | 'live_comments';
}

export type CommentMatchReason =
  | 'matched'
  | 'media_not_targeted'
  | 'media_type_not_targeted'
  | 'is_reply'
  | 'keyword_not_matched'
  | 'invalid_regex';

export interface CommentMatchResult {
  matched: boolean;
  reason: CommentMatchReason;
  /** palavra-chave que casou (quando houver) */
  keyword?: string;
}

/** Normaliza texto: minúsculas, sem acentos (NFD), espaços nas pontas removidos. */
export function normalizeText(input: string | null | undefined): string {
  return (input ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Tipo de mídia normalizado: LIVE (campo live_comments) > AD (ad_id presente) >
 * media_product_type em maiúsculas (FEED, REELS...). Padrão FEED.
 */
export function normalizeMediaType(input: CommentMatchInput): CommentMediaType {
  if (input.field === 'live_comments') return 'LIVE';
  if (input.adId) return 'AD';
  const t = (input.mediaProductType || '').toUpperCase().trim();
  if (t === 'REEL') return 'REELS';
  return t || 'FEED';
}

/** Testa o texto contra as palavras-chave segundo o modo. */
export function matchKeywords(
  text: string | null | undefined,
  keywords: string[],
  matchMode: string
): { matched: boolean; keyword?: string; invalidRegex?: boolean } {
  const cleanKeywords = (keywords || []).filter((k) => typeof k === 'string' && k.trim() !== '');
  if (cleanKeywords.length === 0) return { matched: true };

  const mode = (matchMode || 'contains') as CommentMatchMode;

  if (mode === 'regex') {
    // Regex roda sobre o texto original e também sobre o normalizado (sem acentos)
    const raw = text ?? '';
    const norm = normalizeText(raw);
    let invalid = 0;
    for (const k of cleanKeywords) {
      try {
        const re = new RegExp(k, 'i');
        if (re.test(raw) || re.test(norm)) return { matched: true, keyword: k };
      } catch {
        invalid++;
      }
    }
    return { matched: false, invalidRegex: invalid === cleanKeywords.length };
  }

  const normText = normalizeText(text);
  for (const k of cleanKeywords) {
    const nk = normalizeText(k);
    if (!nk) continue;
    if (mode === 'exact') {
      if (normText === nk) return { matched: true, keyword: k };
    } else if (normText.includes(nk)) {
      return { matched: true, keyword: k };
    }
  }
  return { matched: false };
}

/** Verifica se um comentário casa com uma automação (função pura). */
export function matchAutomation(
  automation: MatchableAutomation,
  input: CommentMatchInput
): CommentMatchResult {
  const mediaIds = automation.mediaIds || [];
  if (mediaIds.length > 0 && (!input.mediaId || !mediaIds.includes(input.mediaId))) {
    return { matched: false, reason: 'media_not_targeted' };
  }

  const mediaTypes = (automation.mediaTypes || []).map((t) => t.toUpperCase());
  if (mediaTypes.length > 0 && !mediaTypes.includes(normalizeMediaType(input))) {
    return { matched: false, reason: 'media_type_not_targeted' };
  }

  if (automation.excludeReplies && input.parentId) {
    return { matched: false, reason: 'is_reply' };
  }

  const kw = matchKeywords(input.text, automation.keywords, automation.matchMode);
  if (!kw.matched) {
    return { matched: false, reason: kw.invalidRegex ? 'invalid_regex' : 'keyword_not_matched' };
  }

  return { matched: true, reason: 'matched', keyword: kw.keyword };
}

/** Substitui placeholders {{nome}} e {{link}} (case-insensitive). */
export function applyPlaceholders(
  template: string,
  vars: { nome?: string | null; link?: string | null }
): string {
  return (template || '')
    .replace(/\{\{\s*nome\s*\}\}/gi, vars.nome ?? '')
    .replace(/\{\{\s*link\s*\}\}/gi, vars.link ?? '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/** Início do dia atual no fuso America/Sao_Paulo (UTC-3, sem horário de verão desde 2019). */
export function startOfDaySaoPaulo(now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now); // YYYY-MM-DD
  return new Date(`${parts}T00:00:00-03:00`);
}

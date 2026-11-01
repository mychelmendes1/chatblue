import { describe, it, expect } from 'vitest';
import {
  matchAutomation,
  matchKeywords,
  normalizeText,
  normalizeMediaType,
  applyPlaceholders,
  startOfDaySaoPaulo,
  type MatchableAutomation,
} from './comment-automation.matching';

const base: MatchableAutomation = {
  mediaIds: [],
  mediaTypes: [],
  keywords: [],
  matchMode: 'contains',
  excludeReplies: true,
};

const auto = (over: Partial<MatchableAutomation>): MatchableAutomation => ({ ...base, ...over });

describe('normalizeText', () => {
  it('remove acentos, caixa e espaços das pontas', () => {
    expect(normalizeText('  PREÇO Ação  ')).toBe('preco acao');
    expect(normalizeText(undefined)).toBe('');
  });
});

describe('matchKeywords', () => {
  it('sem palavras-chave casa qualquer texto', () => {
    expect(matchKeywords('qualquer coisa', [], 'contains').matched).toBe(true);
    expect(matchKeywords('', ['', '  '], 'contains').matched).toBe(true);
  });

  it('contains ignora acentos e caixa nos dois lados', () => {
    expect(matchKeywords('Qual o PRECO?', ['preço'], 'contains')).toMatchObject({ matched: true, keyword: 'preço' });
    expect(matchKeywords('quero a promoção', ['PROMOCAO'], 'contains').matched).toBe(true);
    expect(matchKeywords('olá', ['link'], 'contains').matched).toBe(false);
  });

  it('contains casa qualquer uma das palavras', () => {
    expect(matchKeywords('me manda o link', ['eu quero', 'link'], 'contains')).toMatchObject({
      matched: true,
      keyword: 'link',
    });
  });

  it('exact exige igualdade (normalizada)', () => {
    expect(matchKeywords('  EU QUERO ', ['eu quero'], 'exact').matched).toBe(true);
    expect(matchKeywords('Eu Quéro', ['eu quero'], 'exact').matched).toBe(true);
    expect(matchKeywords('eu quero muito', ['eu quero'], 'exact').matched).toBe(false);
  });

  it('regex case-insensitive, também sobre texto sem acento', () => {
    expect(matchKeywords('QUERO o eBook', ['^quero\\b'], 'regex').matched).toBe(true);
    expect(matchKeywords('preço?', ['preco'], 'regex').matched).toBe(true);
    expect(matchKeywords('nada', ['^quero'], 'regex').matched).toBe(false);
  });

  it('regex inválida não lança erro', () => {
    expect(matchKeywords('abc', ['(abc'], 'regex')).toMatchObject({ matched: false, invalidRegex: true });
    expect(matchKeywords('abc', ['(abc', 'ab'], 'regex').matched).toBe(true);
  });
});

describe('normalizeMediaType', () => {
  it('LIVE para live_comments, AD com ad_id, senão media_product_type', () => {
    expect(normalizeMediaType({ field: 'live_comments', mediaProductType: 'FEED' })).toBe('LIVE');
    expect(normalizeMediaType({ adId: '123', mediaProductType: 'FEED' })).toBe('AD');
    expect(normalizeMediaType({ mediaProductType: 'reels' })).toBe('REELS');
    expect(normalizeMediaType({})).toBe('FEED');
  });
});

describe('matchAutomation', () => {
  it('casa qualquer comentário com automação aberta', () => {
    expect(matchAutomation(base, { text: 'oi', mediaId: 'm1' })).toEqual({
      matched: true,
      reason: 'matched',
      keyword: undefined,
    });
  });

  it('excludeReplies ignora respostas (parent_id)', () => {
    expect(matchAutomation(base, { text: 'oi', parentId: 'c0' })).toMatchObject({
      matched: false,
      reason: 'is_reply',
    });
    expect(matchAutomation(auto({ excludeReplies: false }), { text: 'oi', parentId: 'c0' }).matched).toBe(true);
  });

  it('filtra por mediaIds', () => {
    const a = auto({ mediaIds: ['m1', 'm2'] });
    expect(matchAutomation(a, { text: 'x', mediaId: 'm2' }).matched).toBe(true);
    expect(matchAutomation(a, { text: 'x', mediaId: 'm3' })).toMatchObject({ reason: 'media_not_targeted' });
    expect(matchAutomation(a, { text: 'x' })).toMatchObject({ reason: 'media_not_targeted' });
  });

  it('filtra por mediaTypes', () => {
    const reels = auto({ mediaTypes: ['REELS'] });
    expect(matchAutomation(reels, { text: 'x', mediaProductType: 'REELS' }).matched).toBe(true);
    expect(matchAutomation(reels, { text: 'x', mediaProductType: 'FEED' })).toMatchObject({
      reason: 'media_type_not_targeted',
    });

    const ads = auto({ mediaTypes: ['AD'] });
    expect(matchAutomation(ads, { text: 'x', mediaProductType: 'FEED', adId: 'ad1' }).matched).toBe(true);
    expect(matchAutomation(ads, { text: 'x', mediaProductType: 'FEED' }).matched).toBe(false);

    const live = auto({ mediaTypes: ['LIVE'] });
    expect(matchAutomation(live, { text: 'x', field: 'live_comments' }).matched).toBe(true);
    expect(matchAutomation(live, { text: 'x', field: 'comments' }).matched).toBe(false);
  });

  it('aplica palavras-chave depois dos filtros de mídia', () => {
    const a = auto({ keywords: ['eu quero'], matchMode: 'contains', mediaTypes: ['FEED'] });
    expect(matchAutomation(a, { text: 'EU QUERO!', mediaProductType: 'FEED' })).toMatchObject({
      matched: true,
      keyword: 'eu quero',
    });
    expect(matchAutomation(a, { text: 'legal', mediaProductType: 'FEED' })).toMatchObject({
      reason: 'keyword_not_matched',
    });
  });
});

describe('applyPlaceholders', () => {
  it('substitui {{nome}} e {{link}}', () => {
    expect(applyPlaceholders('Oi {{nome}}, segue: {{link}}', { nome: '@ana', link: 'https://x.com' })).toBe(
      'Oi @ana, segue: https://x.com'
    );
    expect(applyPlaceholders('Oi {{ NOME }} tudo bem', { nome: '' })).toBe('Oi tudo bem');
  });
});

describe('startOfDaySaoPaulo', () => {
  it('retorna 03:00 UTC do dia em São Paulo', () => {
    // 01:30 UTC de 02/11 ainda é 01/11 em São Paulo
    expect(startOfDaySaoPaulo(new Date('2026-11-02T01:30:00Z')).toISOString()).toBe('2026-11-01T03:00:00.000Z');
  });
});

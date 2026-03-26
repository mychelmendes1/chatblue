/**
 * Janela após envio da pesquisa: mensagens do cliente não reabrem o ticket automaticamente.
 * Duração configurável via POST_SURVEY_QUIET_HOURS (padrão 12).
 */
export function getPostSurveyQuietWindowMs(): number {
  const h = Number(process.env.POST_SURVEY_QUIET_HOURS);
  const hours = Number.isFinite(h) && h > 0 ? h : 12;
  return hours * 60 * 60 * 1000;
}

export function isWithinPostSurveyQuietWindow(
  surveySentAt: Date | null | undefined
): boolean {
  if (!surveySentAt) return false;
  return Date.now() - new Date(surveySentAt).getTime() < getPostSurveyQuietWindowMs();
}

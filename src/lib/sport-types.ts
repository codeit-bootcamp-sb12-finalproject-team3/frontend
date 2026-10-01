const SPORT_TYPE_LABELS: Record<string, string> = {
  BASEBALL: '야구',
  SOCCER: '축구',
  BASKETBALL: '농구',
  VOLLEYBALL: '배구',
};

export const getSportTypeCode = (value: string): string | undefined => {
  const normalized = value.trim().toUpperCase();
  if (normalized in SPORT_TYPE_LABELS) return normalized;
  return Object.keys(SPORT_TYPE_LABELS).find((code) => SPORT_TYPE_LABELS[code] === value.trim());
};

export const getSportTypeLabel = (code: string, fallbackName?: string): string =>
  SPORT_TYPE_LABELS[getSportTypeCode(code) ?? ''] ?? fallbackName ?? code;

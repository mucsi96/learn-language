const SPLIT_PATTERN = /\s?[,/(-]/;
const GERMAN_ARTICLES = new Set(['der', 'die', 'das', 'ein', 'eine', 'einen', 'einem', 'einer', 'eines']);
const HUNGARIAN_ARTICLES = new Set(['a', 'az', 'egy']);

function removeSpecialCharacters(text: string): string {
  const decomposed = text.normalize('NFD');
  const withoutDiacritics = decomposed.replace(/[\u0300-\u036f]/g, '');
  return withoutDiacritics.replace(/[^a-z-]/g, '');
}

function normalizeWord(word: string, articles: Set<string>): string {
  let normalized = word.split(SPLIT_PATTERN)[0].trim().toLowerCase();
  const parts = normalized.split(/\s+/);
  if (parts.length > 1 && articles.has(parts[0])) {
    normalized = parts.slice(1).join('-');
  } else {
    normalized = normalized.replace(/\s+/g, '-');
  }
  return removeSpecialCharacters(normalized);
}

export function generateMultilingualWordId(germanWord: string, hungarianWord: string): string {
  const germanPart = normalizeWord(germanWord, GERMAN_ARTICLES);
  const hungarianPart = normalizeWord(hungarianWord, HUNGARIAN_ARTICLES);
  return `${germanPart}-${hungarianPart}`;
}

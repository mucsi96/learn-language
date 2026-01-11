const GERMAN_ARTICLES = ['der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem', 'einer', 'eines'];

const SPECIAL_CHAR_MAP: Record<string, string> = {
  'ä': 'ae',
  'ö': 'oe',
  'ü': 'ue',
  'ß': 'ss',
  'á': 'a',
  'é': 'e',
  'í': 'i',
  'ó': 'o',
  'ú': 'u',
  'ő': 'o',
  'ű': 'u',
};

function normalizeWord(word: string): string {
  const parts = word.trim().toLowerCase().split(/\s+/);
  const wordsWithoutArticle = GERMAN_ARTICLES.includes(parts[0])
    ? parts.slice(1)
    : parts;

  return wordsWithoutArticle
    .join('-')
    .split('')
    .map(char => SPECIAL_CHAR_MAP[char] || char)
    .join('')
    .replace(/[^a-z-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function generateCardId(germanWord: string, hungarianTranslation: string): string {
  const normalizedGerman = normalizeWord(germanWord);
  const normalizedHungarian = normalizeWord(hungarianTranslation);

  if (!normalizedGerman) {
    return normalizedHungarian || 'unknown';
  }

  if (!normalizedHungarian) {
    return normalizedGerman;
  }

  return `${normalizedGerman}-${normalizedHungarian}`;
}

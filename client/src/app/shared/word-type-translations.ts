/**
 * Hungarian translations for word types
 */
export interface WordTypeTranslation {
  type: string;
  translation: string;
  color: string;
}

export const WORD_TYPES = [
  'VERB',
  'ADJECTIVE',
  'ADVERB',
  'PRONOUN',
  'PREPOSITION',
  'CONJUNCTION',
  'INTERJECTION',
  'ARTICLE',
  'NUMERAL',
  'DETERMINER',
  'NOUN'
];

export const WORD_TYPE_TRANSLATIONS: WordTypeTranslation[] = [
  { type: 'VERB', translation: 'Ige', color: '#4caf50' },         // Green
  { type: 'ADJECTIVE', translation: 'Melléknév', color: '#2196f3' }, // Blue
  { type: 'ADVERB', translation: 'Határozószó', color: '#9c27b0' }, // Purple
  { type: 'PRONOUN', translation: 'Névmás', color: '#ff9800' },     // Orange
  { type: 'PREPOSITION', translation: 'Elöljárószó', color: '#795548' }, // Brown
  { type: 'CONJUNCTION', translation: 'Kötőszó', color: '#607d8b' }, // Blue-Gray
  { type: 'INTERJECTION', translation: 'Indulatszó', color: '#ff5722' }, // Deep Orange
  { type: 'ARTICLE', translation: 'Névelő', color: '#ffc107' },     // Amber
  { type: 'NUMERAL', translation: 'Számnév', color: '#03a9f4' },    // Light Blue
  { type: 'DETERMINER', translation: 'Determináns', color: '#673ab7' }, // Deep Purple
  { type: 'NOUN', translation: 'Főnév', color: '#e91e63' }          // Pink
];

/**
 * Get the Hungarian translation for a word type
 * @param type The word type
 * @returns The Hungarian translation
 */
export function getWordTypeTranslation(type: string): string {
  return WORD_TYPE_TRANSLATIONS.find(wt => wt.type === type)?.translation ?? type;
}

/**
 * Get the word type for a Hungarian translation
 * @param translation The Hungarian translation
 * @returns The word type
 */
export function getWordTypeFromTranslation(translation: string): string {
  return WORD_TYPE_TRANSLATIONS.find(wt => wt.translation === translation)?.type ?? translation;
}

/**
 * Get the color for a word type
 * @param type The word type
 * @returns The color code
 */
export function getWordTypeColor(type: string): string {
  return WORD_TYPE_TRANSLATIONS.find(wt => wt.type === type)?.color ?? '#9e9e9e';
}

/**
 * Get the word type information
 * @param type The word type
 * @returns The word type information
 */
export function getWordTypeInfo(type: string): WordTypeTranslation | undefined {
  return WORD_TYPE_TRANSLATIONS.find(wt => wt.type === type);
}

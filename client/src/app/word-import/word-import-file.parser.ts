import { WordImportWord } from './word-import.types';

export type WordImportParseResult =
  | { status: 'valid'; words: WordImportWord[] }
  | { status: 'invalid'; error: string };

const MAX_REPORTED_ERRORS = 5;
const MAX_SENTENCES = 5;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

function validateWord(item: unknown, index: number): string[] {
  const label = `Word ${index + 1}`;

  if (typeof item !== 'object' || item === null || Array.isArray(item)) {
    return [`${label}: expected an object.`];
  }

  const record = item as Record<string, unknown>;
  const sentences = record['sentences'];

  return [
    ...(isNonEmptyString(record['lemma'])
      ? []
      : [`${label}: "lemma" must be a non-empty string.`]),
    ...(typeof record['count'] === 'number'
      ? []
      : [`${label}: "count" must be a number.`]),
    ...(Array.isArray(sentences) &&
    sentences.every((sentence) => typeof sentence === 'string')
      ? []
      : [`${label}: "sentences" must be an array of strings.`]),
  ];
}

function toWord(record: Record<string, unknown>): WordImportWord {
  const wordType = isNonEmptyString(record['word_type'])
    ? record['word_type'].trim()
    : '';
  const article = isNonEmptyString(record['article'])
    ? record['article'].trim()
    : '';

  return {
    lemma: (record['lemma'] as string).trim(),
    ...(wordType ? { wordType } : {}),
    ...(article ? { article } : {}),
    occurrenceCount: record['count'] as number,
    examples: (record['sentences'] as string[])
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 0)
      .slice(0, MAX_SENTENCES),
  };
}

function extractWordList(parsed: unknown): unknown[] | null {
  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (typeof parsed === 'object' && parsed !== null) {
    const words = (parsed as Record<string, unknown>)['words'];
    return Array.isArray(words) ? words : null;
  }

  return null;
}

export function parseWordImportFile(text: string): WordImportParseResult {
  const parsed = ((): unknown | Error => {
    try {
      return JSON.parse(text) as unknown;
    } catch (error) {
      return error as Error;
    }
  })();

  if (parsed instanceof Error) {
    return { status: 'invalid', error: `Invalid JSON: ${parsed.message}` };
  }

  const items = extractWordList(parsed);

  if (!items) {
    return {
      status: 'invalid',
      error: 'Expected an object with a "words" array.',
    };
  }

  if (items.length === 0) {
    return { status: 'invalid', error: 'The word list is empty.' };
  }

  const errors = items.flatMap(validateWord);

  if (errors.length > 0) {
    return {
      status: 'invalid',
      error: [
        ...errors.slice(0, MAX_REPORTED_ERRORS),
        ...(errors.length > MAX_REPORTED_ERRORS
          ? [`… and ${errors.length - MAX_REPORTED_ERRORS} more problems.`]
          : []),
      ].join('\n'),
    };
  }

  return {
    status: 'valid',
    words: items.map((item) => toWord(item as Record<string, unknown>)),
  };
}

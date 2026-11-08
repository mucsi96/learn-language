import { z } from 'zod';
import { request } from '../../api/http';

const wordSchema = z.object({
  lemma: z.string(),
  wordType: z.string().nullish(),
  article: z.string().nullish(),
  occurrenceCount: z.number(),
  examples: z.array(z.string()),
});
export const candidateSchema = wordSchema.extend({ id: z.number() });
const statsSchema = z.object({ pendingCount: z.number(), knownCount: z.number(), cardCount: z.number() });
export const queueSchema = z.object({ candidates: z.array(candidateSchema), stats: statsSchema });
export const stageSchema = z.object({
  totalWords: z.number(),
  stagedCount: z.number(),
  alreadyKnownCount: z.number(),
  existingCardCount: z.number(),
  duplicateCount: z.number(),
  stats: statsSchema,
});
export type Candidate = z.infer<typeof candidateSchema>;
export type Decision = 'known' | 'card';
export const triagePath = (sourceId: string) => `/api/source/${encodeURIComponent(sourceId)}/word-import`;
const pendingWrites = new Map<string, Promise<void>>();
export const flushTriage = (path: string) => pendingWrites.get(path) ?? Promise.resolve();
export function enqueueTriage(path: string, operation: () => Promise<void>) {
  const next = flushTriage(path).then(operation);
  const settled = next.catch(() => undefined);
  pendingWrites.set(path, settled);
  void settled.then(() => {
    if (pendingWrites.get(path) === settled) pendingWrites.delete(path);
  });
  return next;
}

const analyzerWord = z.object({
  lemma: z.string().trim().min(1),
  count: z.number(),
  sentences: z.array(z.string()),
  word_type: z.unknown().optional(),
  article: z.unknown().optional(),
});
export function parseWords(text: string) {
  const parsed: unknown = (() => {
    try {
      return JSON.parse(text) as unknown;
    } catch (cause) {
      throw new Error(`Invalid JSON: ${cause instanceof Error ? cause.message : String(cause)}`, { cause });
    }
  })();
  const list = z
    .union([z.array(z.unknown()), z.object({ words: z.array(z.unknown()) }).transform((value) => value.words)])
    .safeParse(parsed);
  if (!list.success) throw new Error('Expected an object with a "words" array.');
  if (!list.data.length) throw new Error('The word list is empty.');
  const results = list.data.map((item) => analyzerWord.safeParse(item));
  const messages: Record<string, string> = {
    lemma: '"lemma" must be a non-empty string.',
    count: '"count" must be a number.',
    sentences: '"sentences" must be an array of strings.',
  };
  const errors = results.flatMap((result, index) =>
    result.success
      ? []
      : [
          ...new Set(
            result.error.issues.map(
              (issue) =>
                `Word ${index + 1}: ${issue.path.length ? messages[String(issue.path[0])] : 'expected an object.'}`
            )
          ),
        ]
  );
  if (errors.length)
    throw new Error(
      [...errors.slice(0, 5), ...(errors.length > 5 ? [`… and ${errors.length - 5} more problems.`] : [])].join('\n')
    );
  return results.map((result) => {
    if (!result.success) throw result.error;
    const word = result.data;
    return {
      lemma: word.lemma,
      occurrenceCount: word.count,
      ...(typeof word.word_type === 'string' && word.word_type.trim() ? { wordType: word.word_type.trim() } : {}),
      ...(typeof word.article === 'string' && word.article.trim() ? { article: word.article.trim() } : {}),
      examples: word.sentences
        .map((sentence) => sentence.trim())
        .filter(Boolean)
        .slice(0, 5),
    };
  });
}

export async function stageWords(sourceId: string, text: string) {
  const words = parseWords(text);
  const response = await request(triagePath(sourceId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ words }),
  });
  return stageSchema.parse(await response.json());
}

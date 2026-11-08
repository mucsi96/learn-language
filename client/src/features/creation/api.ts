import { z } from 'zod';
import { ApiError, getJson, request } from '../../api/http';
import { environmentSchema, cardTypeSchema } from '../../api/schemas';

export const environment = () => getJson('/api/environment', environmentSchema);
export const isBillingError = (error: unknown) =>
  error instanceof ApiError &&
  z.object({ code: z.literal('PROVIDER_BILLING_REQUIRED') }).safeParse(error.detail).success;
export async function post<T>(path: string, body: unknown, schema: z.ZodType<T>, headers?: HeadersInit): Promise<T> {
  const response = await request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  return schema.parse(await response.json());
}
export async function modelCall<T>(
  operation: string,
  call: (model: string, headers: Record<string, string>) => Promise<T>
) {
  const config = await environment();
  const enabled = config.enabledModelsByOperation[operation];
  const primary = config.primaryModelByOperation[operation];
  if (!primary || !enabled?.includes(primary))
    throw new Error(`No primary model enabled for operation type: ${operation}`);
  const headers = { 'X-Operation-ID': crypto.randomUUID() };
  const results = await Promise.allSettled(
    config.chatModels
      .filter((model) => enabled.includes(model.modelName))
      .map(async (model) => ({ model: model.modelName, response: await call(model.modelName, headers) }))
  );
  const successes = results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
  const result = successes.find((value) => value.model === primary) ?? successes[0];
  if (result) return result;
  const failures = results.flatMap((result) => (result.status === 'rejected' ? [result.reason as unknown] : []));
  throw failures.find(isBillingError) ?? failures[0] ?? new Error('All models failed');
}
export const rectangleSchema = z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() });
export type Rectangle = z.infer<typeof rectangleSchema>;
export const pageSchema = z.object({
  number: z.number(),
  sourceId: z.string(),
  sourceName: z.string(),
  sourceType: z.string(),
  cardTypes: z.array(cardTypeSchema),
  formatType: z.string().nullish(),
  hasImage: z.boolean().nullish(),
  documentId: z.number().nullish(),
  pageCount: z.number().nullish(),
  documents: z.array(z.object({ id: z.number(), fileName: z.string() })).nullish(),
  width: z.number(),
  height: z.number(),
  spans: z.array(
    z.object({
      text: z.string(),
      font: z.string().optional(),
      fontSize: z.union([z.string(), z.number()]).optional(),
      color: z.string().optional(),
      bbox: rectangleSchema,
      searchTerm: z.string().nullish(),
    })
  ),
  extractionRegions: z.array(rectangleSchema).optional(),
});
export const suggestionSchema = z.object({
  id: z.string().trim().min(1),
  frontText: z.string().trim().min(1),
  backText: z.string().trim().min(1),
  topic: z.string().trim().optional(),
  category: z.string().trim().optional(),
});
export const suggestionsSchema = z.array(suggestionSchema).min(1);
export const usageSchema = z.object({ imageUsageToday: z.number(), audioUsageToday: z.number() });
export const idSchema = z.object({ id: z.string(), exists: z.boolean(), warning: z.boolean().optional() });
export const duplicateSchema = z.object({ newId: z.string(), existingId: z.string(), reason: z.string() });
export type Duplicate = z.infer<typeof duplicateSchema>;
export type Candidate = {
  id: string;
  exists: boolean;
  warning?: boolean;
  error?: string;
  extractionModel?: string;
  word?: string;
  forms?: string[];
  examples?: string[];
  sentence?: string;
  hint?: string;
  frontText?: string;
  backText?: string;
  topic?: string;
  category?: string;
  selectionRegions?: Region[];
};
export type CardType = z.infer<typeof cardTypeSchema>;
export type Region = Rectangle & { pageNumber: number };
const translationSchema = z.object({ translation: z.string(), examples: z.array(z.string()) });
export async function extractCandidates(sourceId: string, type: CardType, regions: Region[]): Promise<Candidate[]> {
  if (type === 'simple') throw new Error('Import simple cards from JSON');
  if (type === 'vocabulary') {
    const result = await modelCall('extraction', (model, headers) =>
      post(
        `/api/source/${sourceId}/extract/words`,
        { regions, model },
        z.object({
          words: z.array(z.object({ word: z.string(), forms: z.array(z.string()), examples: z.array(z.string()) })),
        }),
        headers
      )
    );
    return Promise.all(
      result.response.words.map(async (word) => {
        try {
          const translation = await modelCall('translation', (model, headers) =>
            post(
              `/api/translate/hu?model=${encodeURIComponent(model)}`,
              { word: word.word, examples: word.examples },
              translationSchema,
              headers
            )
          );
          return {
            ...word,
            ...(await post(
              '/api/word-id',
              { germanWord: word.word, hungarianTranslation: translation.response.translation, sourceId },
              idSchema
            )),
            extractionModel: result.model,
            selectionRegions: regions,
          };
        } catch (error) {
          if (isBillingError(error)) throw error;
          return {
            ...word,
            id: `error-${word.word}`,
            exists: false,
            extractionModel: result.model,
            selectionRegions: regions,
            error: 'Hungarian translation failed',
          };
        }
      })
    );
  }
  const result = await modelCall('extraction', (model, headers) =>
    post(
      `/api/source/${sourceId}/extract/${type === 'grammar' ? 'grammar' : 'sentences'}`,
      { regions, model },
      z.object({ sentences: z.array(z.string()) }),
      headers
    )
  );
  return Promise.all(
    result.response.sentences.map(async (sentence) => ({
      sentence,
      ...(await post('/api/sentence-id', { germanSentence: sentence, sourceId }, idSchema)),
      extractionModel: result.model,
      selectionRegions: regions,
    }))
  );
}
export async function detectDuplicates(sourceId: string, newIds: string[]): Promise<Duplicate[]> {
  const config = await environment();
  const primary = config.primaryModelByOperation.duplicate_detection;
  if (!primary || !config.enabledModelsByOperation.duplicate_detection?.includes(primary) || !newIds.length) return [];
  return (
    await modelCall('duplicate_detection', (model, headers) =>
      post(
        `/api/duplicate-detection?model=${encodeURIComponent(model)}`,
        { newIds, sourceId },
        z.object({ duplicates: z.array(duplicateSchema) }),
        headers
      )
    )
  ).response.duplicates;
}
export async function upload(path: string, file: File) {
  const body = new FormData();
  body.append('file', file);
  const response = await request(path, { method: 'POST', body });
  return z
    .object({ documentId: z.number().optional(), pageNumber: z.number().optional() })
    .parse(await response.json());
}

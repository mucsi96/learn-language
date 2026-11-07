import { z } from 'zod';

export const namedSchema = z.object({ id: z.string(), name: z.string() });
export const partnerSchema = z.object({ id: z.number(), name: z.string() });
export const cardTypeSchema = z.enum(['vocabulary', 'speech', 'grammar', 'simple']);
export const stateSchema = z.enum(['NEW', 'LEARNING', 'REVIEW', 'RELEARNING']);
export const sourceSchema = namedSchema.extend({
  sourceType: z.enum(['pdf', 'images', 'ebookDictionary', 'json', 'wordTriage', 'audioCollection']),
  collectionPath: z.string().nullish(),
  startPage: z.number().nullable(),
  pageCount: z.number().nullish(),
  cardCount: z.number(),
  draftCardCount: z.number(),
  flaggedCardCount: z.number(),
  unhealthyCardCount: z.number(),
  suggestedKnownCardCount: z.number(),
  pendingWordImportCount: z.number(),
  stateCounts: z.record(z.string(), z.number()),
  readinessCounts: z.record(z.string(), z.number()),
  languageLevel: z.string().nullable(),
  cardTypes: z.array(cardTypeSchema),
  formatType: z.string().nullish(),
  cardLimit: z.number().nullish(),
  newCardLimit: z.number().nullish(),
  typingPractice: z.boolean(),
  aiLanguage: z.enum(['hungarian', 'english']),
  learningPartnerId: z.number().nullable(),
  groupId: z.string().nullable(),
});
export type Source = z.infer<typeof sourceSchema>;
export const dueCountSchema = z.object({ sourceId: z.string(), state: stateSchema, count: z.number() });
export const userSchema = z.object({
  email: z.string(),
  preferredUsername: z.string().optional(),
  additionalClaims: z.object({ name: z.string().optional() }).optional(),
});
const codeSchema = z.object({ code: z.string(), displayName: z.string() });
export const environmentSchema = z.object({
  imageRateLimitPerMinute: z.number(),
  audioRateLimitPerMinute: z.number(),
  imageMaxConcurrentRequests: z.number(),
  audioMaxConcurrentRequests: z.number(),
  imageDailyLimit: z.number(),
  audioDailyLimit: z.number(),
  frontAudioDisabled: z.boolean(),
  chatModels: z.array(z.object({ modelName: z.string(), provider: z.string() })),
  imageModels: z.array(z.object({ id: z.string(), displayName: z.string(), imageCount: z.number() })),
  audioModels: z.array(
    z.object({ id: z.string(), displayName: z.string(), default: z.boolean(), provider: z.string() })
  ),
  voices: z.array(
    z.object({
      id: z.string(),
      displayName: z.string(),
      languages: z.array(z.object({ name: z.string() })),
      category: z.string().nullable(),
      provider: z.string(),
    })
  ),
  supportedLanguages: z.array(codeSchema),
  enabledModelsByOperation: z.record(z.string(), z.array(z.string())),
  primaryModelByOperation: z.record(z.string(), z.string()),
  operationTypes: z.array(codeSchema),
  allOperationTypes: z.array(codeSchema),
  languageLevels: z.array(codeSchema),
  sourceFormatTypes: z.array(codeSchema),
  sourceTypes: z.array(codeSchema),
});

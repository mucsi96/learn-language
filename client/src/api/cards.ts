import { z } from 'zod';
import { cardTypeSchema, stateSchema } from './schemas';

const utcTimestampSchema = z.string()
  .transform((value) => /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`)
  .pipe(z.coerce.date());

export const audioSchema = z.looseObject({
  id: z.string(),
  voice: z.string().nullish(),
  model: z.string().nullish(),
  language: z.string().nullish(),
  text: z.string().nullish(),
  selected: z.boolean().nullish(),
});
export const exampleSchema = z.looseObject({
  de: z.string().nullish(),
  hu: z.string().nullish(),
  en: z.string().nullish(),
  ch: z.string().nullish(),
  isSelected: z.boolean().nullish(),
  images: z
    .array(z.looseObject({ id: z.string(), isFavorite: z.boolean().nullish(), model: z.string().nullish() }))
    .nullish(),
});
export const cardDataSchema = z.looseObject({
  word: z.string().nullish(),
  type: z.string().nullish(),
  gender: z.string().nullish(),
  translation: z.record(z.string(), z.string().nullable()).nullish(),
  forms: z.array(z.string()).nullish(),
  examples: z.array(exampleSchema).nullish(),
  audio: z.array(audioSchema).nullish(),
  audioVoice: z.string().nullish(),
  translationModel: z.string().nullish(),
  classificationModel: z.string().nullish(),
  extractionModel: z.string().nullish(),
  grammarTopic: z.string().nullish(),
  hint: z.string().nullish(),
  frontText: z.string().nullish(),
  backText: z.string().nullish(),
  topic: z.string().nullish(),
  category: z.string().nullish(),
});
export const cardSchema = z.object({
  id: z.string(),
  source: z.object({
    id: z.string(),
    name: z.string().optional(),
    startPage: z.number().nullish(),
    cardTypes: z.array(cardTypeSchema).optional(),
    typingPractice: z.boolean().optional(),
    aiLanguage: z.string().optional(),
  }),
  sourcePageNumber: z.number(),
  type: cardTypeSchema,
  data: cardDataSchema,
  readiness: z.enum(['DRAFT', 'IN_REVIEW', 'REVIEWED', 'READY', 'KNOWN']),
  due: utcTimestampSchema,
  stability: z.number(),
  difficulty: z.number(),
  elapsedDays: z.number(),
  scheduledDays: z.number(),
  learningSteps: z.number(),
  reps: z.number(),
  lapses: z.number(),
  state: stateSchema,
  lastReview: utcTimestampSchema.nullish(),
  flagged: z.boolean(),
});
export type Card = z.infer<typeof cardSchema>;
export type CardData = z.infer<typeof cardDataSchema>;

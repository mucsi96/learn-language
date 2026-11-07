import { z } from 'zod';
import { request } from '../../api/http';

export const progressSchema = z.object({
  position: z.number().nonnegative(),
  duration: z.number().nonnegative(),
  completed: z.boolean(),
});
export const progressWriteSchema = progressSchema.extend({
  sessionId: z.string(),
  sequence: z.number().int().positive(),
});
export const contentSchema = z.object({
  id: z.string(),
  metadata: z.object({
    title: z.string(),
    number: z.number().nullable(),
    durationSeconds: z.number().nullable(),
    languageLevel: z.string().nullable(),
    transcriptUrl: z.string().nullable(),
    matchError: z.string().nullable(),
  }),
  status: z.enum(['unprepared', 'queued', 'processing', 'prepared', 'failed']),
  error: z.string().nullable(),
  transcript: z.string().nullable(),
  unlocked: z.boolean(),
  progress: progressSchema.nullable(),
  words: z.array(
    z.object({
      key: z.string(),
      status: z.enum(['missing', 'not_ready', 'unreviewed', 'satisfied']),
      cardIds: z.array(z.string()),
      word: z.object({
        lemma: z.string(),
        wordType: z.string(),
        article: z.string(),
        forms: z.array(z.string()),
        examples: z.array(z.string()),
        surfaceForms: z.array(z.string()),
      }),
    })
  ),
});
export const playbackSchema = z.object({
  sessionId: z.string(),
  mediaUrl: z.string().nullable(),
  audioRevision: z.string(),
  progress: progressSchema,
});
export type ContentItem = z.infer<typeof contentSchema>;
export type Playback = z.infer<typeof playbackSchema>;
export type ProgressWrite = z.infer<typeof progressWriteSchema>;
export const contentPath = (sourceId: string, contentId?: string) =>
  `/api/source/${encodeURIComponent(sourceId)}/content${contentId ? `/${encodeURIComponent(contentId)}` : ''}`;
export const formatPosition = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
export async function openPlayback(path: string, signal: AbortSignal) {
  const response = await request(`${path}/playback`, { method: 'POST', signal });
  const playback = playbackSchema.parse(await response.json());
  if (!playback.mediaUrl) throw new Error('Audio is unavailable. Try opening the player again.');
  const url = new URL(playback.mediaUrl, window.location.origin);
  if (url.origin !== window.location.origin || !['http:', 'https:'].includes(url.protocol))
    throw new Error('Audio must use the authenticated same-origin media endpoint.');
  return { ...playback, mediaUrl: url.href };
}

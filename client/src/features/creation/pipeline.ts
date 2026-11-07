import { useSyncExternalStore } from 'react';
import { z } from 'zod';
import { audioSchema, cardSchema, type Card, type CardData } from '../../api/cards';
import { getJson, sendJson } from '../../api/http';
import { environment, isBillingError, modelCall, post, usageSchema, type Candidate, type CardType } from './api';

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const pools: Record<string, { starts: number[]; active: number }> = {};
async function waitForPool(kind: 'image' | 'audio'): Promise<void> {
  const config = await environment();
  const pool = pools[kind];
  const rate = config[kind === 'image' ? 'imageRateLimitPerMinute' : 'audioRateLimitPerMinute'];
  const concurrent = config[kind === 'image' ? 'imageMaxConcurrentRequests' : 'audioMaxConcurrentRequests'];
  const starts = pool?.starts.filter((time) => time > Date.now() - 60000) ?? [];
  if ((rate > 0 && starts.length >= rate) || (pool && concurrent > 0 && pool.active >= concurrent)) {
    await delay(rate > 0 && starts.length >= rate ? Math.max(1, starts[0] + 60000 - Date.now()) : 200);
    return waitForPool(kind);
  }
}
async function limited<T>(kind: 'image' | 'audio', work: () => Promise<T>): Promise<T> {
  const config = await environment();
  const rate = config[kind === 'image' ? 'imageRateLimitPerMinute' : 'audioRateLimitPerMinute'];
  const concurrent = config[kind === 'image' ? 'imageMaxConcurrentRequests' : 'audioMaxConcurrentRequests'];
  const acquire = async (): Promise<void> => {
    const current = pools[kind] ?? { starts: [], active: 0 };
    const starts = current.starts.filter((time) => time > Date.now() - 60000);
    if ((rate > 0 && starts.length >= rate) || (concurrent > 0 && current.active >= concurrent)) {
      await delay(rate > 0 && starts.length >= rate ? Math.max(1, starts[0] + 60000 - Date.now()) : 200);
      return acquire();
    }
    pools[kind] = { starts: [...starts, Date.now()], active: current.active + 1 };
  };
  await acquire();
  try {
    return await work();
  } finally {
    pools[kind] = { ...pools[kind], active: pools[kind].active - 1 };
  }
}

async function waitForImage(id: string, attempt = 0): Promise<void> {
  const job = await getJson(
    `/api/image/${id}/status`,
    z.object({ status: z.enum(['pending', 'processing', 'completed', 'failed']), error: z.string().nullish() })
  );
  if (job.status === 'completed') return;
  if (job.status === 'failed') {
    window.dispatchEvent(new Event('ai-operation-failed'));
    throw new Error(job.error ?? 'Image generation failed');
  }
  if (attempt >= 600) throw new Error('Image generation timed out');
  await delay(1000);
  return waitForImage(id, attempt + 1);
}
export async function generateImages(
  input: string,
  context?: string,
  onToolsRequested: () => void = () => {},
  tolerateFailures = false
) {
  const config = await environment();
  const models = config.imageModels.flatMap((model) => Array.from({ length: model.imageCount }, () => model));
  if (!models.length) {
    onToolsRequested();
    return [];
  }
  const usage = await getJson('/api/model-usage-logs/daily-usage', usageSchema);
  if (config.imageDailyLimit > 0 && usage.imageUsageToday + models.length > config.imageDailyLimit)
    throw new Error('Daily image limit reached');
  const descriptionResult = await post(
    '/api/image/descriptions',
    { input, context, count: models.length },
    z.object({ descriptions: z.array(z.string().trim().min(1)).length(models.length) })
  ).catch((error) => {
    if (!tolerateFailures || isBillingError(error)) throw error;
    return null;
  });
  if (!descriptionResult) {
    onToolsRequested();
    return [];
  }
  const { descriptions } = descriptionResult;
  const pending = models.map((model, index) =>
    limited('image', async () => {
      const image = await post(
        '/api/image',
        { input, model: model.id, description: descriptions[index] },
        z.object({ id: z.string(), model: z.string() })
      );
      await waitForImage(image.id);
      return image;
    })
  );
  onToolsRequested();
  const results = await Promise.allSettled(pending);
  const errors = results.flatMap((result) => (result.status === 'rejected' ? [result.reason as unknown] : []));
  const billing = errors.find(isBillingError);
  if (billing) throw billing;
  if (!tolerateFailures && errors.length) throw errors[0];
  return results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
}

const translateSentence = (sentence: string, language: string) =>
  modelCall('translation', (model, headers) =>
    post(
      `/api/translate-sentence/${language}?model=${encodeURIComponent(model)}`,
      { sentence },
      z.object({ translation: z.string() }),
      headers
    )
  );
export async function enrichCardData(
  type: CardType,
  data: CardData,
  progress: (step: string) => void = () => {},
  onToolsRequested: () => void = () => {}
): Promise<CardData> {
  if (type === 'simple') {
    onToolsRequested();
    return data;
  }
  if (type !== 'vocabulary') {
    const sentence = data.examples?.[0]?.de;
    if (!sentence) throw new Error('Card data is missing required sentence');
    if (type === 'grammar') onToolsRequested();
    progress('Translating sentence');
    const hu = await translateSentence(sentence, 'hu');
    const en = type === 'speech' ? await translateSentence(sentence, 'en') : undefined;
    progress('Generating images');
    const images = type === 'speech' ? await generateImages(sentence, undefined, onToolsRequested, true) : undefined;
    return {
      ...data,
      translationModel: hu.model,
      examples: [
        {
          ...data.examples?.[0],
          de: sentence,
          hu: hu.response.translation,
          ...(en ? { en: en.response.translation } : {}),
          isSelected: true,
          ...(images ? { images: [...(data.examples?.[0]?.images ?? []), ...images] } : {}),
        },
        ...(data.examples?.slice(1) ?? []),
      ],
    };
  }
  if (!data.word) throw new Error('Card data is missing required word');
  const word = data.word;
  progress('Detecting word type');
  const classification = await modelCall('classification', (model, headers) =>
    post(`/api/word-type?model=${encodeURIComponent(model)}`, { word }, z.object({ type: z.string() }), headers)
  );
  const gender =
    classification.response.type === 'NOUN'
      ? (
          await modelCall('classification', (model, headers) =>
            post(`/api/gender?model=${encodeURIComponent(model)}`, { word }, z.object({ gender: z.string() }), headers)
          )
        ).response.gender
      : undefined;
  const examples = (data.examples ?? []).map((example) => {
    if (!example.de) throw new Error('Missing German example');
    return example.de;
  });
  progress('Translating to multiple languages');
  const translations = await Promise.all(
    ['hu', 'en', 'ch'].map(async (language) => ({
      language,
      ...(await modelCall('translation', (model, headers) =>
        post(
          `/api/translate/${language}?model=${encodeURIComponent(model)}`,
          { word, examples },
          z.object({ translation: z.string(), examples: z.array(z.string()) }),
          headers
        )
      )),
    }))
  );
  progress('Generating images');
  if (!examples.length) onToolsRequested();
  const enrichedExamples = await Promise.all(
    examples.map(async (de, index) => ({
      ...data.examples?.[index],
      de,
      ...Object.fromEntries(
        translations.map((result) => {
          const text = result.response.examples[index];
          if (text === undefined) throw new Error('Missing translated example');
          return [result.language, text];
        })
      ),
      isSelected: data.examples?.some((example) => example.isSelected) ? data.examples[index].isSelected : index === 0,
      images: [
        ...(data.examples?.[index]?.images ?? []),
        ...(await generateImages(de, undefined, onToolsRequested, true)),
      ],
    }))
  );
  return {
    ...data,
    type: classification.response.type,
    classificationModel: classification.model,
    gender,
    translationModel: translations[0].model,
    translation: {
      ...data.translation,
      ...Object.fromEntries(translations.map((result) => [result.language, result.response.translation])),
    },
    examples: enrichedExamples,
  };
}

export function draftData(item: Candidate, type: CardType, grammarTopic?: string): CardData {
  if (type === 'simple')
    return { frontText: item.frontText, backText: item.backText, topic: item.topic, category: item.category };
  if (type === 'vocabulary')
    return {
      word: item.word,
      forms: item.forms,
      examples: item.examples?.map((de) => ({ de })),
      extractionModel: item.extractionModel,
    };
  return { examples: [{ de: item.sentence }], extractionModel: item.extractionModel, grammarTopic, hint: item.hint };
}
export async function createDraft(sourceId: string, pageNumber: number, type: CardType, id: string, data: CardData) {
  await sendJson('/api/card', 'POST', {
    id,
    sourceId,
    sourcePageNumber: pageNumber,
    type,
    data,
    readiness: 'DRAFT',
    due: new Date().toISOString(),
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    learningSteps: 0,
    reps: 0,
    lapses: 0,
    state: 'NEW',
  });
}

export type AudioItem = { text: string; language: string; context?: string; singleWord?: boolean; isFront?: boolean };
export function getAudioItems(card: Pick<Card, 'type' | 'data'>, frontAudioDisabled = false): AudioItem[] {
  const example =
    card.type === 'vocabulary' ? card.data.examples?.find((item) => item.isSelected) : card.data.examples?.[0];
  const item = (
    text: string | null | undefined,
    language: string,
    isFront = false,
    singleWord = false,
    context?: string | null
  ): AudioItem[] => (text ? [{ text, language, isFront, singleWord, ...(context ? { context } : {}) }] : []);
  const items =
    card.type === 'simple'
      ? []
      : card.type === 'grammar'
        ? item(example?.de?.replace(/\[([^\]]+)\]/g, '$1'), 'de')
        : [
            ...(card.type === 'vocabulary'
              ? [
                  ...item(card.data.word, 'de', false, true, example?.de),
                  ...item(card.data.translation?.hu, 'hu', true, true, example?.hu),
                ]
              : []),
            ...item(example?.de, 'de'),
            ...item(example?.hu, 'hu', true),
          ];
  return items.filter((value) => !frontAudioDisabled || !value.isFront);
}
const voiceSchema = z.object({
  id: z.number(),
  voiceId: z.string(),
  model: z.string(),
  language: z.string(),
  isEnabled: z.boolean(),
});
export async function generateCardAudio(
  card: Card,
  index = 0,
  progress: (step: string) => void = () => {},
  onToolsRequested: () => void = () => {}
) {
  const [config, voices] = await Promise.all([
    environment(),
    getJson('/api/voice-configurations/enabled', z.array(voiceSchema)),
  ]);
  const items = getAudioItems(card, config.frontAudioDisabled);
  const missing = items.filter((item) => !voices.some((voice) => voice.isEnabled && voice.language === item.language));
  if (missing.length)
    throw new Error(
      `No enabled voice configurations for languages: ${[...new Set(missing.map((item) => item.language))].join(', ')}`
    );
  const retained = (card.data.audio ?? []).filter((audio) => items.some((item) => item.text === audio.text));
  const needed = items.filter((item) => !retained.some((audio) => audio.text === item.text));
  const usage = await getJson('/api/model-usage-logs/daily-usage', usageSchema);
  if (config.audioDailyLimit > 0 && usage.audioUsageToday + needed.length > config.audioDailyLimit)
    throw new Error('Daily audio limit reached');
  progress('Generating audio');
  const pending = needed.map((item) =>
    limited('audio', async () => {
      const options = voices.filter((voice) => voice.isEnabled && voice.language === item.language);
      const voice = options[index % options.length];
      return post(
        '/api/audio',
        {
          input: item.text,
          language: item.language,
          context: item.context,
          singleWord: item.singleWord,
          selected: true,
          voice: voice.voiceId,
          model: voice.model,
        },
        audioSchema
      );
    })
  );
  onToolsRequested();
  const results = await Promise.allSettled(pending);
  const errors = results.flatMap((result) => (result.status === 'rejected' ? [result.reason as unknown] : []));
  if (errors.length) throw errors.find(isBillingError) ?? errors[0];
  const generated = results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
  await sendJson(`/api/card/${card.id}`, 'PUT', {
    data: { ...card.data, audio: [...retained, ...generated] },
    readiness: 'READY',
  });
  await Promise.allSettled(
    (card.data.audio ?? [])
      .filter((audio) => !retained.includes(audio))
      .map((audio) => sendJson(`/api/audio/${audio.id}`, 'DELETE'))
  );
}

export type Progress = { label: string; status: 'pending' | 'in-progress' | 'completed' | 'error'; tooltip: string };
export type PipelineResult = { total: number; succeeded: number; failed: number; errors: string[] };
type Job = { isProcessing: boolean; progress: Progress[]; result?: PipelineResult; kind?: 'image' | 'audio' };
const store: { value: Job; listeners: Set<() => void> } = {
  value: { isProcessing: false, progress: [] },
  listeners: new Set(),
};
const publish = (value: Job) => {
  store.value = value;
  store.listeners.forEach((listener) => listener());
};
const subscribe = (listener: () => void) => {
  store.listeners.add(listener);
  return () => {
    store.listeners.delete(listener);
  };
};
export function useCreationJob() {
  return useSyncExternalStore(subscribe, () => store.value);
}
async function checkBudget(kind: 'image' | 'audio', needed: number) {
  if (!needed) return;
  const [config, usage] = await Promise.all([environment(), getJson('/api/model-usage-logs/daily-usage', usageSchema)]);
  const limit = config[kind === 'image' ? 'imageDailyLimit' : 'audioDailyLimit'];
  const used = usage[kind === 'image' ? 'imageUsageToday' : 'audioUsageToday'];
  if (limit > 0 && used + needed > limit)
    throw new Error(`Daily ${kind} limit reached (${used}/${limit} used, ${needed} needed)`);
}
async function checkImageBudget(cards: { type: CardType; data: CardData }[]) {
  const config = await environment();
  const perExample = config.imageModels.reduce((sum, model) => sum + model.imageCount, 0);
  const examples = cards.reduce(
    (sum, card) =>
      sum + (card.type === 'vocabulary' ? (card.data.examples?.length ?? 0) : card.type === 'speech' ? 1 : 0),
    0
  );
  await checkBudget('image', perExample * examples);
}
async function withPreparing(kind: 'image' | 'audio', work: () => Promise<PipelineResult>): Promise<PipelineResult> {
  if (store.value.isProcessing) throw new Error('A creation job is already running');
  publish({ kind, isProcessing: true, progress: [] });
  try { return await work(); }
  catch (error) {
    publish({ ...store.value, isProcessing: false, result: { total: 0, succeeded: 0, failed: 0, errors: [error instanceof Error ? error.message : String(error)] } });
    throw error;
  }
}
export async function runCreationPipeline(
  tasks: {
    label: string;
    execute: (progress: (step: string) => void, onToolsRequested: () => void) => Promise<void>;
  }[],
  kind: 'image' | 'audio' = 'image',
  prepared = false
): Promise<PipelineResult> {
  if (store.value.isProcessing && !prepared) throw new Error('A creation job is already running');
  publish({
    kind,
    isProcessing: true,
    progress: tasks.map((task) => ({ label: task.label, tooltip: 'Queued', status: 'pending' })),
  });
  const update = (index: number, status: Progress['status'], tooltip: string) =>
    publish({
      ...store.value,
      progress: store.value.progress.map((entry, i) => (i === index ? { ...entry, status, tooltip } : entry)),
    });
  const launched = await tasks.reduce<Promise<Promise<PromiseSettledResult<void>>[]>>(async (previous, task, index) => {
    const pending = await previous;
    const ready = { resolve: () => {} };
    const toolsRequested = new Promise<void>((resolve) => {
      ready.resolve = resolve;
    });
    const work = (async (): Promise<PromiseSettledResult<void>> => {
      try {
        await waitForPool(kind);
        update(index, 'in-progress', 'Starting');
        await task.execute((step) => update(index, 'in-progress', step), ready.resolve);
        update(index, 'completed', 'Done');
        return { status: 'fulfilled', value: undefined };
      } catch (error) {
        update(index, 'error', error instanceof Error ? error.message : String(error));
        return { status: 'rejected', reason: error };
      } finally {
        ready.resolve();
      }
    })();
    await toolsRequested;
    return [...pending, work];
  }, Promise.resolve([]));
  const results = await Promise.all(launched);
  const errors = results.flatMap((result) =>
    result.status === 'rejected' ? [result.reason instanceof Error ? result.reason.message : String(result.reason)] : []
  );
  const result = { total: results.length, succeeded: results.length - errors.length, failed: errors.length, errors };
  publish({ ...store.value, isProcessing: false, result });
  return result;
}
export async function enrichDraftCards(cardIds: string[]) {
  return withPreparing('image', async () => {
  const cards = await Promise.all(cardIds.map((id) => getJson(`/api/card/${id}`, cardSchema)));
  await checkImageBudget(cards);
  return runCreationPipeline(
    cards.map((card) => ({
      label: card.data.word ?? card.data.examples?.[0]?.de ?? card.id,
      execute: async (progress, onToolsRequested) => {
        const data = await enrichCardData(card.type, card.data, progress, onToolsRequested);
        await sendJson(`/api/card/${card.id}`, 'PUT', {
          data,
          readiness: card.type === 'simple' ? 'READY' : 'IN_REVIEW',
        });
      },
    })), 'image', true
  );
  });
}
export async function createAudioInBatch(cards: Card[]) {
  return withPreparing('audio', async () => {
  const [config, voices] = await Promise.all([
    environment(),
    getJson('/api/voice-configurations/enabled', z.array(voiceSchema)),
  ]);
  const needed = cards.flatMap((card) =>
    getAudioItems(card, config.frontAudioDisabled).filter(
      (item) => !card.data.audio?.some((audio) => audio.text === item.text)
    )
  );
  const missing = [
    ...new Set(
      needed
        .filter((item) => !voices.some((voice) => voice.isEnabled && voice.language === item.language))
        .map((item) => item.language)
    ),
  ];
  if (missing.length) throw new Error(`No enabled voice configurations for languages: ${missing.join(', ')}`);
  await checkBudget('audio', needed.length);
  return runCreationPipeline(
    cards.map((card, index) => ({
      label: card.data.word ?? card.data.examples?.[0]?.de ?? card.id,
      execute: (progress, onToolsRequested) => generateCardAudio(card, index, progress, onToolsRequested),
    })),
    'audio', true
  );
  });
}
export async function createCardsInBulk(
  sourceId: string,
  pageNumber: number,
  type: CardType,
  items: Candidate[],
  grammarTopic?: string,
  onDraftCreated?: (id: string) => void
) {
  return withPreparing('image', async () => {
  await checkImageBudget(
    items.filter((item) => !item.exists).map((item) => ({ type, data: draftData(item, type, grammarTopic) }))
  );
  return runCreationPipeline(
    items
      .filter((item) => !item.exists)
      .map((item) => ({
        label: item.word ?? item.sentence ?? item.frontText ?? item.id,
        execute: async (progress, onToolsRequested) => {
          const data = draftData(item, type, grammarTopic);
          await createDraft(sourceId, pageNumber, type, item.id, data);
          onDraftCreated?.(item.id);
          const enriched = await enrichCardData(type, data, progress, onToolsRequested);
          await sendJson(`/api/card/${item.id}`, 'PUT', {
            data: enriched,
            readiness: type === 'simple' ? 'READY' : 'IN_REVIEW',
          });
        },
      })), 'image', true
  );
  });
}

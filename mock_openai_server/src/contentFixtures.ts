import { Router } from 'express';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createAssistantResponse } from './utils';

export const contentFixtures = Router();
const state = {
  requests: [] as string[], vocabularyInputs: [] as string[], vocabularyPrompts: [] as string[], failVocabulary: false,
  sourceFailure: '' as string,
  dictionaryInputs: [] as { highlightedWord: string; sentence: string; bookTitle: string }[],
  dictionaryPrompts: [] as string[], failExamples: false,
};
const record = (name: string) => { state.requests = [...state.requests, name]; };

export const resetContentFixtures = () => {
  state.requests = [];
  state.vocabularyInputs = [];
  state.vocabularyPrompts = [];
  state.failVocabulary = false;
  state.sourceFailure = '';
  state.dictionaryInputs = [];
  state.dictionaryPrompts = [];
  state.failExamples = false;
};

const collections: Record<string, Record<string, string>> = {
  'stories/deutsch-lernen-durch-hoeren-a1-a2/': { '209-brezel': 'Brezel', '294-zwillinge': 'Zwillinge', '007-neue-geschichte': 'Neue Geschichte' },
  'other-stories/': { '209-brezel': 'Ein gutes Haus' },
};
const audio = readFileSync(join(__dirname, 'story.mp3'));
const transcript = (prefix: string, folder: string) => Buffer.from(`${state.sourceFailure === 'changed' && folder === '209-brezel' ? 'Frische Brezel' : collections[prefix][folder]}\n\nWir sehen ein Haus. Wir sehen ein Haus.\n`);

contentFixtures.get('/learn-language', (req, res) => {
  const prefix = String(req.query.prefix);
  const titles = collections[prefix] ?? {};
  record('blob-list');
  if (state.sourceFailure === 'unavailable') {
    res.status(403).type('application/xml').send('<Error><Code>AuthorizationFailure</Code><Message>Storage unavailable</Message></Error>');
    return;
  }
  const folders = Object.keys(titles).filter(folder => req.query.marker ? folder === '007-neue-geschichte' : folder !== '007-neue-geschichte');
  const names = folders.flatMap(folder => ['text.txt', 'audio.mp3'].map(file => `${prefix}${folder}/${file}`))
    .filter(name => state.sourceFailure !== 'empty' && !(state.sourceFailure === 'changed' && name.includes('/294-zwillinge/')))
    .filter(name => !(state.sourceFailure === 'missing-audio' && name.endsWith('209-brezel/audio.mp3')));
  res.type('application/xml').send(`<?xml version="1.0" encoding="utf-8"?>
    <EnumerationResults ServiceEndpoint="http://localhost:3070/content-fixtures" ContainerName="learn-language">
      <Prefix>${prefix}</Prefix><Blobs>${names.map(name => `<Blob><Name>${name}</Name><Properties>
      <Last-Modified>Sat, 07 Nov 2026 00:00:00 GMT</Last-Modified><Etag>"fixture"</Etag>
       <Content-Length>${name.endsWith('.mp3') ? audio.length : transcript(prefix, name.slice(prefix.length).split('/')[0]).length}</Content-Length>
      <BlobType>BlockBlob</BlobType></Properties></Blob>`).join('')}</Blobs>
      <NextMarker>${req.query.marker ? '' : 'page2'}</NextMarker></EnumerationResults>`);
});

contentFixtures.get(/^\/learn-language\/(.+)$/, (req, res) => {
  const parts = req.params[0].split('/');
  const folder = parts.at(-2)!;
  const file = parts.at(-1)!;
  const prefix = `${parts.slice(0, -2).join('/')}/`;
  if (!collections[prefix]?.[folder] || !['text.txt', 'audio.mp3'].includes(file)) {
    res.sendStatus(404); return;
  }
  record(file === 'audio.mp3' ? 'audio' : `text:${folder}`);
  const data = file === 'audio.mp3' ? audio : transcript(prefix, folder);
  res.set('ETag', '"fixture"').set('Last-Modified', 'Sat, 07 Nov 2026 00:00:00 GMT')
    .type(file === 'audio.mp3' ? 'audio/mpeg' : 'text/plain').send(data);
});

contentFixtures.get('/stats', (req, res) => res.json(state));
contentFixtures.post('/fail-vocabulary', (req, res) => {
  state.failVocabulary = req.body.fail === true;
  res.json({});
});

contentFixtures.post('/source-failure', (req, res) => {
  state.sourceFailure = req.body.failure;
  res.json({});
});

contentFixtures.post('/fail-examples', (req, res) => {
  state.failExamples = req.body.fail === true;
  res.json({});
});

export const contentResponse = (messages: { content: unknown }[], model: string): unknown | null => {
  const system = String(messages[0]?.content);
  const user = String(messages[1]?.content);
  if (system.includes('German language dictionary lookup assistant')) {
    const input = JSON.parse(user);
    state.dictionaryInputs = [...state.dictionaryInputs, input];
    state.dictionaryPrompts = [...state.dictionaryPrompts, system];
    const examples: Record<string, { translation: string; germanExample: string; translatedExample: string; forms: string[] }> = {
      Haus: { translation: 'a ház', germanExample: 'Das Haus ist klein.', translatedExample: 'A ház kicsi.', forms: ['die Häuser'] },
      gut: { translation: 'jó', germanExample: 'Das Essen ist gut.', translatedExample: 'Az étel jó.', forms: ['besser', 'am besten'] },
      'auf jeden Fall': { translation: 'mindenképpen', germanExample: 'Ich komme auf jeden Fall.', translatedExample: 'Mindenképpen eljövök.', forms: [] },
      Bank: system.includes('CEFR A1 level')
        ? { translation: 'a pad', germanExample: 'Ich sitze auf der Bank.', translatedExample: 'A padon ülök.', forms: ['die Bänke'] }
        : { translation: 'a pad', germanExample: 'Nach dem Spaziergang ruhe ich mich auf einer Bank aus.', translatedExample: 'A séta után megpihenek egy padon.', forms: ['die Bänke'] },
    };
    const example = examples[input.highlightedWord];
    if (!example) throw new Error(`No dictionary example fixture for ${input.highlightedWord}`);
    return createAssistantResponse({ normalizedWord: input.highlightedWord, ...example,
      ...(state.failExamples ? { germanExample: '' } : {}),
    });
  }
  if (system.includes('CONTENT_VOCABULARY_V1')) {
    record('vocabulary');
    state.vocabularyInputs = [...state.vocabularyInputs, user];
    state.vocabularyPrompts = [...state.vocabularyPrompts, system];
    if (state.failVocabulary) throw new Error('Vocabulary fixture failed');
    if (user === 'Hallo! Wie geht es euch?') return createAssistantResponse({ words: [] });
    if (user.includes('Meine Freundin ist Ärztin.')) {
      return createAssistantResponse({ words: [
        { lemma: 'Freund', wordType: 'noun', article: 'der', forms: ['die Freunde'], examples: ['Meine Freundin ist Ärztin.'], surfaceForms: ['Freundin'] },
        { lemma: 'Freund', wordType: 'noun', article: 'der', forms: ['die Freunde'], examples: ['Mein Freund ist Lehrer.'], surfaceForms: ['Freund'] },
        { lemma: 'Arzt', wordType: 'noun', article: 'der', forms: ['die Ärzte'], examples: ['Meine Freundin ist Ärztin.'], surfaceForms: ['Ärztin'] },
        { lemma: 'Lehrer', wordType: 'noun', article: 'der', forms: ['die Lehrer'], examples: ['Mein Freund ist Lehrer.'], surfaceForms: ['Lehrer'] },
      ] });
    }
    return createAssistantResponse({ words: [
      { lemma: 'sehen', wordType: 'verb', article: '', forms: ['sieht', 'sah', 'hat gesehen'], examples: ['Wir sehen ein Haus.'], surfaceForms: ['sehen'] },
      { lemma: 'Haus', wordType: 'noun', article: 'das', forms: ['die Häuser'], examples: ['Wir sehen ein Haus.'], surfaceForms: ['Haus'] },
    ] });
  }
  return null;
};

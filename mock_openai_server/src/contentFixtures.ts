import { Router } from 'express';
import { createAssistantResponse } from './utils';

export const contentFixtures = Router();
const state = { requests: [] as string[], vocabularyInputs: [] as string[], failVocabulary: false };
const record = (name: string) => { state.requests = [...state.requests, name]; };

export const resetContentFixtures = () => {
  state.requests = [];
  state.vocabularyInputs = [];
  state.failVocabulary = false;
};

contentFixtures.get('/a1-index', (req, res) => {
  record('index');
  res.type('html').send(`<h6>Geschichten auf Deutsch | A1-A2</h6>
    ${['Brezel', 'Zwillinge', 'Neue Geschichte'].map(title => `<section><h6>${title}</h6>
      <p>Geschichte zum Lesen &amp; Hören</p><a href="/content-fixtures/geschichten-a1-a2-g01">Button</a></section>`).join('')}`);
});

contentFixtures.get('/geschichten-a1-a2-g01', (req, res) => {
  record('story-page');
  res.type('html').send(`<section><h1>Brezel</h1>
    <div class="VideoPlayer__root" aria-label="Unreliable copied player label"></div>
    <a href="/content-fixtures/wrong.pdf">PDF</a><a href="/content-fixtures/wrong.mp3">Audio</a>
    <h2>Wir sehen ein Haus.</h2><p>Wir sehen ein Haus.</p>
    <h2>Vokabeln</h2><p>Gespenst = ghost</p><p>Das Gespenst fliegt.</p>
    <h2>Fragen</h2><p>Wo ist die Marmelade?</p></section>
    <section><h1>Unlisted story</h1><div class="VideoPlayer__root" aria-label="Another video"></div><p>Unrelated content.</p></section>`);
});

contentFixtures.get('/story.txt', (req, res) => {
  record('text');
  res.type('text/plain').send('Ein gutes Haus\nWir sehen ein Haus.');
});

contentFixtures.get('/stats', (req, res) => res.json(state));
contentFixtures.post('/fail-vocabulary', (req, res) => {
  state.failVocabulary = req.body.fail === true;
  res.json({});
});

export const contentResponse = (messages: { content: unknown }[]): unknown | null => {
  const system = String(messages[0]?.content);
  const user = String(messages[1]?.content);
  if (system.includes('CONTENT_STORY_ISOLATION_V1')) {
    record('isolation');
    return createAssistantResponse({ titleMatches: true, storyBlockIds: user.split('\n')
      .filter(line => line.endsWith(' | Wir sehen ein Haus.')).map(line => line.split(' | ')[0]) });
  }
  if (system.includes('CONTENT_VOCABULARY_V1')) {
    record('vocabulary');
    state.vocabularyInputs = [...state.vocabularyInputs, user];
    if (state.failVocabulary) throw new Error('Vocabulary fixture failed');
    return createAssistantResponse({ words: [
      { lemma: 'wir', wordType: 'pronoun', article: '', forms: [], examples: ['Wir sehen ein Haus.'], surfaceForms: ['Wir'] },
      { lemma: 'sehen', wordType: 'verb', article: '', forms: ['sieht', 'sah', 'hat gesehen'], examples: ['Wir sehen ein Haus.'], surfaceForms: ['sehen'] },
      { lemma: 'ein', wordType: 'article', article: '', forms: [], examples: ['Wir sehen ein Haus.'], surfaceForms: ['ein'] },
      { lemma: 'Haus', wordType: 'noun', article: 'das', forms: ['die Häuser'], examples: ['Wir sehen ein Haus.'], surfaceForms: ['Haus'] },
    ] });
  }
  return null;
};

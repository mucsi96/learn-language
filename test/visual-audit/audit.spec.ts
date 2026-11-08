import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { createCard, createSource, createSourceGroup, createKnownWord, createLearningPartner, createGrammarTopic,
  setupDefaultChatModelSettings, setupDefaultImageModelSettings, uploadMockImage, yellowImage,
  createModelUsageLog, createVoiceConfiguration, withDbConnection, selectRegion, createChatModelSetting } from '../utils';

const baseline = process.env.AUDIT_VERSION === 'baseline';
const dist = process.env.AUDIT_DIST;
const root = process.env.AUDIT_OUTPUT;
if (!dist || !root || !process.env.AUDIT_VERSION) throw new Error('Set AUDIT_DIST, AUDIT_OUTPUT and AUDIT_VERSION');
const capture = async (page: Page, name: string) => {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  const folder = `${root}/screens/${process.env.AUDIT_VERSION}/${page.viewportSize()!.width}`;
  await mkdir(folder, { recursive: true });
  await page.screenshot({ path: `${folder}/${name}.png`, fullPage: true, animations: 'disabled' });
  await writeFile(`${folder}/${name}.json`, JSON.stringify(await page.evaluate(() => ({
    width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
    text: document.body.innerText,
    overflow: [...document.querySelectorAll('button,input,textarea,select,[role="dialog"],table')].filter(e => {
      const r = e.getBoundingClientRect(); return r.width && (r.left < -1 || r.right > innerWidth + 1);
    }).map(e => ({ tag: e.tagName, text: e.getAttribute('aria-label') ?? e.textContent?.slice(0,100) })),
  })), null, 2));
};

test.beforeEach(async ({ page }) => {
  await page.route('http://localhost:8170/**', async route => {
    const url = new URL(route.request().url());
    if (['/api/', '/oauth2/', '/_telemetry/'].some(prefix => url.pathname.startsWith(prefix))) return route.fallback();
    const file = route.request().isNavigationRequest() ? 'index.html' : decodeURIComponent(url.pathname).slice(1);
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png' }[extname(file)];
    try { await route.fulfill({ body: await readFile(join(dist, file)), contentType: mime }); }
    catch { await route.fallback(); }
  });
  await setupDefaultChatModelSettings();
  await setupDefaultImageModelSettings();
});

const cardData = () => ({ word: 'abfahren', type: 'VERB', forms: ['fährt ab', 'fuhr ab', 'abgefahren'],
  translation: { hu: 'elindulni', en: 'to leave', ch: 'abfahre' },
  examples: [{ de: 'Wir fahren um zwölf Uhr ab.', hu: 'Tizenkét órakor indulunk.', en: 'We leave at twelve.', ch: 'Mir fahred am zwölfi ab.', isSelected: true,
    images: [{ id: uploadMockImage(yellowImage), isFavorite: true }] }] });

test('dashboard and source management', async ({ page }) => {
  await page.goto('/'); await capture(page, 'home-empty');
  await createCard({ cardId: 'audit-card', sourceId: 'goethe-a1', sourcePageNumber: 9, data: cardData() });
  await page.reload(); await capture(page, 'home-due');
  await page.getByRole('button', { name: 'Profile menu' }).click(); await capture(page, 'profile-menu');
  await page.goto('/sources'); await capture(page, 'sources');
  await page.getByRole('button', { name: 'Add Source', exact: true }).click(); await capture(page, 'source-add');
  await (baseline ? page.getByRole('combobox', { name: 'Source Type' }) : page.getByRole('button', { name: /Source Type$/ })).click();
  await capture(page, 'source-type-options'); await page.keyboard.press('Escape');
});

['voices', 'data-models', 'image-models', 'known-words', 'learning-partners', 'source-groups', 'grammar-topics', 'api-tokens', 'daily-sessions'].forEach(section => {
  test(`settings ${section}`, async ({ page }) => {
    await page.goto(`/settings/${section}`); await capture(page, `settings-${section}-empty`);
    if (section === 'known-words') await createKnownWord('das Haus', 'ház');
    if (section === 'learning-partners') await createLearningPartner({ name: 'Anna' });
    if (section === 'source-groups') await createSourceGroup({ name: 'German vocabulary' });
    if (section === 'grammar-topics') await createGrammarTopic({ name: 'Present tense' });
    if (['known-words', 'learning-partners', 'source-groups', 'grammar-topics'].includes(section)) {
      await page.reload(); await capture(page, `settings-${section}-populated`);
    }
    const add = page.getByRole('button', { name: /^(Add|Create)/ }).first();
    if (await add.count() && await add.isEnabled()) {
      await add.click(); await capture(page, `settings-${section}-add`);
    }
  });
});

['vocabulary', 'grammar', 'speech', 'simple'].forEach(type => {
  test(`study and editor ${type}`, async ({ page }) => {
    await createSource({ id: 'audit-source', name: 'German practice', sourceType: 'JSON', languageLevel: 'A1', cardTypes: [type.toUpperCase()] });
    await createCard({ cardId: 'audit-card', sourceId: 'audit-source', sourcePageNumber: 1, cardType: type.toUpperCase(), data: {
      ...cardData(), frontText: '# Question\n\nTranslate **I am learning German**.\n\n```typescript\nconst language = "German";\n```', backText: 'Ich lerne Deutsch.', category: 'Language', topic: 'Everyday speech', hint: 'lernen / ich', grammarTopic: 'Present tense',
      ...(type === 'grammar' ? { examples: [{ de: 'Ich [lerne] Deutsch.', hu: 'Németet tanulok.', isSelected: true }] } : {}),
    } });
    await page.goto('/sources/audit-source/study'); await capture(page, `study-${type}-welcome`);
    await page.getByRole('button', { name: 'Start study session', exact: true }).click();
    await expect(page.getByRole('article', { name: 'Flashcard' })).toBeVisible();
    await capture(page, `study-${type}-front`);
    if (baseline) await page.getByRole('article', { name: 'Flashcard' }).click();
    else await page.getByRole('button', { name: 'Reveal answer' }).click();
    await capture(page, `study-${type}-back`);
    await page.getByRole('button', { name: 'Card actions' }).click(); await capture(page, `study-${type}-actions`);
    await page.goto('/sources/audit-source/page/1/cards/audit-card'); await capture(page, `editor-${type}`);
  });
});

test('tables and review', async ({ page }) => {
  await page.goto('/sources/goethe-a1/cards'); await capture(page, 'cards-empty');
  await createCard({ cardId: 'audit-card', sourceId: 'goethe-a1', sourcePageNumber: 9, readiness: 'IN_REVIEW', data: cardData() });
  await page.reload(); await capture(page, 'cards-populated');
  await page.goto('/in-review-cards'); await capture(page, 'review-populated');
  await page.goto('/model-usage'); await capture(page, 'model-usage-empty');
});

test('creation pages', async ({ page }) => {
  await page.goto('/sources/goethe-a1/page/9'); await capture(page, 'pdf-page');
  await page.goto('/sources/speech-a1/page/1'); await capture(page, 'photo-page');
  await createSource({ id: 'audit-json', name: 'JSON practice', sourceType: 'JSON', languageLevel: 'A1', cardTypes: ['SIMPLE'] });
  await page.goto('/sources/audit-json/json'); await capture(page, 'json-page');
  await page.getByRole('button', { name: 'Import JSON', exact: true }).click(); await capture(page, 'json-import-dialog');
});

test('word triage', async ({ page }) => {
  await createSource({ id: 'audit-triage', name: 'Vocabulary triage', sourceType: 'WORD_TRIAGE', languageLevel: 'A1', cardTypes: ['VOCABULARY'] });
  await page.goto('/sources/audit-triage/word-import'); await capture(page, 'triage-empty');
  await page.getByLabel('Word list JSON file').setInputFiles({ name: 'words.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ words: [{ lemma: 'Geschichte', pos: 'NOUN', word_type: 'noun', article: 'die', count: 25, sentences: ['Die Geschichte ist lang.'] }] })) });
  await expect(page.getByRole('heading', { name: 'Geschichte', exact: true })).toBeVisible(); await capture(page, 'triage-front');
  await page.getByRole('heading', { name: 'Geschichte', exact: true }).click(); await capture(page, 'triage-back');
  await page.getByRole('button', { name: 'I know this word' }).click();
  await expect(page.getByRole('heading', { name: 'Triage complete' })).toBeVisible(); await capture(page, 'triage-complete');
});

['PDF Document', 'Image Collection', 'JSON', 'Audio Collection', 'Word Triage', 'Ebook Dictionary'].forEach(type => {
  test(`source form ${type}`, async ({ page }) => {
    await page.goto('/sources');
    await page.getByRole('button', { name: 'Add Source', exact: true }).click();
    await (baseline ? page.getByRole('combobox', { name: 'Source Type' }) : page.getByRole('button', { name: /Source Type$/ })).click();
    await page.getByRole('option', { name: type, exact: true }).click();
    await capture(page, `source-form-${type.replaceAll(' ', '-')}`);
  });
});

test('source edit and delete', async ({ page }) => {
  await page.goto('/sources');
  await page.getByRole('button', { name: 'Actions for Goethe A1' }).click(); await capture(page, 'source-actions');
  await page.getByRole('menuitem', { name: 'Edit', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('Goethe A1');
  await capture(page, 'source-edit');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Actions for Goethe A1' }).click();
  await page.getByRole('menuitem', { name: 'Delete', exact: true }).click(); await capture(page, 'source-delete');
});

test('study dialogs and completion', async ({ page }) => {
  await createCard({ cardId: 'audit-card', sourceId: 'goethe-a1', data: cardData(), state: 'REVIEW', reps: 5, stability: 5, difficulty: 5 });
  await page.goto('/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();
  await page.getByRole('article', { name: 'Flashcard' }).click();
  await page.getByRole('button', { name: 'Card actions' }).click();
  await page.getByRole('menuitem', { name: 'Ask AI' }).click(); await capture(page, 'chat-empty');
  await page.getByRole('textbox', { name: 'Ask a question' }).fill('Miért der Zug?');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByText(/Ez azért helyes/)).toBeVisible(); await capture(page, 'chat-response');
  if (baseline || process.env.AUDIT_VERSION === 'repaired') await page.keyboard.press('Escape');
  else await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Card actions' }).click();
  await page.getByRole('menuitem', { name: 'Voice Selection' }).click(); await capture(page, 'voice-selection');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Correct', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'All caught up!' })).toBeVisible(); await capture(page, 'study-complete');
});

test('usage log states', async ({ page }) => {
  await createModelUsageLog({ modelName: 'gpt-5.6-sol', modelType: 'CHAT', operationType: 'TRANSLATION', operationId: 'audit-op', inputTokens: 150, outputTokens: 50, costUsd: 0.0025, processingTimeMs: 1200, responseContent: '{"translation": "das Haus"}' });
  await page.goto('/model-usage'); await capture(page, 'usage-populated');
  await page.getByRole('gridcell', { name: 'gpt-5.6-sol', exact: true }).click(); await capture(page, 'usage-expanded');
  await page.getByRole('tab', { name: 'Model Summary', exact: true }).click(); await capture(page, 'usage-summary');
});

test('voice preview and options', async ({ page }) => {
  await createCard({ cardId: 'audit-card', sourceId: 'goethe-a1', data: cardData() });
  await createVoiceConfiguration({ voiceId: 'JBFqnCBsd6RMkjVDRZzb', model: 'eleven_v4', language: 'de', displayName: 'George', isEnabled: true });
  await page.goto('/settings/voices'); await capture(page, 'voices-populated-preview');
  await page.getByRole('button', { name: 'Add voice', exact: true }).click();
  await (baseline ? page.getByRole('combobox', { name: 'Voice', exact: true }) : page.getByRole('button', { name: /Voice$/ })).click(); await capture(page, 'voice-options');
});

test('audio collection pages', async ({ page, apiHeaders }) => {
  await withDbConnection(client => client.query('DELETE FROM learn_language.chat_model_settings'));
  await createChatModelSetting({ modelName: 'gpt-5.5', operationType: 'TRANSLATION', isEnabled: true, isPrimary: true });
  await createChatModelSetting({ modelName: 'gpt-5.5', operationType: 'EXTRACTION', isEnabled: true, isPrimary: true });
  const created = await page.request.post('/api/source', { headers: apiHeaders, data: { id: 'stories', name: 'Stories', sourceType: 'audioCollection', languageLevel: 'A2', formatType: 'flowingText', collectionPath: 'stories/deutsch-lernen-durch-hoeren-a1-a2/', cardTypes: ['vocabulary'] } });
  expect(created.ok()).toBe(true);
  await page.goto('/sources/stories/content'); await capture(page, 'stories-catalogue');
  await page.getByRole('link', { name: 'Brezel', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Listening prerequisites' })).toBeVisible(); await capture(page, 'stories-prerequisites');
  await page.goto('/sources/stories/listen'); await capture(page, 'listening-locked');
  await Promise.all(['sehen', 'Haus'].map(word => createCard({ cardId: `story-${word}`, sourceId: 'stories', reps: 2, data: { word, type: 'NOUN', translation: { hu: word } } })));
  await page.reload(); await page.getByRole('link', { name: 'Brezel', exact: true }).click();
  await page.getByRole('button', { name: 'Listen', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled();
  await capture(page, 'listening-player');
});

test('extraction and duplicate review', async ({ page }) => {
  test.skip(baseline && page.viewportSize()!.width === 390, 'Pre-migration mobile PDF selection does not expose Confirm selection');
  await createChatModelSetting({ modelName: 'gemini-3.1-pro-preview', operationType: 'DUPLICATE_DETECTION', isEnabled: true, isPrimary: true });
  await createCard({ cardId: 'abfahren-elhagyni', sourceId: 'goethe-a1', sourcePageNumber: 9, data: { word: 'abfahren', type: 'VERB', translation: { hu: 'elhagyni', en: 'to leave', ch: 'abfahren' }, forms: [], examples: [] } });
  await page.goto('/sources/goethe-a1/page/9');
  await selectRegion(page, 'aber', 'Vor der Abfahrt rufe ich an.'); await capture(page, 'pdf-selection');
  await page.getByRole('button', { name: 'Confirm selection' }).click();
  await expect(page.getByRole('button', { name: 'Create cards in bulk' })).toBeVisible(); await capture(page, 'pdf-extracted');
  await page.getByRole('button', { name: 'Create cards in bulk' }).click();
  await expect(page.getByRole('heading', { name: 'Potential Duplicates' })).toBeVisible(); await capture(page, 'duplicates-dialog');
  await page.getByRole('button', { name: 'Continue with bulk creation' }).click();
  await expect(page.getByRole('heading', { name: 'Creating Cards' })).toBeVisible(); await capture(page, 'creation-progress');
});

test('editor image dialogs', async ({ page }) => {
  await createCard({ cardId: 'audit-card', sourceId: 'goethe-a1', sourcePageNumber: 9, data: cardData() });
  await page.goto('/sources/goethe-a1/page/9/cards/audit-card');
  await page.getByRole('button', { name: 'Add image with context' }).click(); await capture(page, 'image-context-dialog');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('img', { name: 'Wir fahren um zwölf Uhr ab.', exact: true }).click({ position: { x: 2, y: 2 } }); await capture(page, 'image-preview-dialog');
});

test('empty review and study completion', async ({ page }) => {
  await page.goto('/in-review-cards');
  await capture(page, 'review-empty');
  await page.goto('/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();
  await expect(page.getByRole('heading', { name: 'All caught up!' })).toBeVisible();
  await capture(page, 'study-empty');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Continue study session' })).toBeVisible();
  await capture(page, 'study-resume');
});

test('JSON validation states', async ({ page }) => {
  await createSource({ id: 'audit-json', name: 'JSON practice', sourceType: 'JSON', languageLevel: 'A1', cardTypes: ['SIMPLE'] });
  await page.goto('/sources/audit-json/json');
  await page.getByRole('button', { name: 'Import JSON', exact: true }).click();
  await page.getByRole('textbox', { name: 'Cards JSON' }).fill('{invalid');
  await capture(page, 'json-invalid');
  await page.getByRole('textbox', { name: 'Cards JSON' }).fill(JSON.stringify([{ id: 'example', frontText: 'Question', backText: 'Answer' }]));
  await capture(page, 'json-valid');
});

test('study without image and flagged card', async ({ page }) => {
  await createCard({ cardId: 'audit-card', sourceId: 'goethe-a1', flagged: true, data: {
    word: 'Haus', type: 'NOUN', gender: 'NEUTER', translation: { hu: 'ház', en: 'house' }, forms: ['Häuser'],
    examples: [{ de: 'Das Haus ist groß.', hu: 'A ház nagy.', isSelected: true }],
  } });
  await page.goto('/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();
  const card = page.getByRole('article', { name: 'Flashcard' });
  await expect(card).toBeVisible();
  await capture(page, 'study-no-image-front');
  await card.click();
  await capture(page, 'study-no-image-back');
  await page.getByRole('button', { name: 'Card actions' }).click();
  await capture(page, 'study-flagged-actions');
});

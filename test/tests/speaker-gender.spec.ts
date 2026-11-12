import { test, expect } from '../fixtures';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createCard, createChatModelSetting, createImageModelSetting, createVoiceConfiguration, getVoiceConfigurations, getModelUsageLogs, withDbConnection } from '../utils';

test('migration renames legacy hints without changing card content or scheduling', async ({ page, request, apiHeaders }) => {
  await page.goto('/');
  const examples = [
    { de: 'Ich bin Mutter.', voiceGenderHint: 'female', images: [{ id: 'kept-image', isFavorite: true }] },
    { de: 'Ich bin Vater.', voiceGenderHint: 'male' },
    { de: 'Hallo!', voiceGenderHint: null },
    { de: 'Meine Mutter kommt.' },
    { de: 'Ich bin Mutter.', voiceGenderHint: 'male', speakerGenderHint: 'female' },
  ];
  await createCard({ cardId: 'legacy-hints', sourceId: 'goethe-a1', data: { word: 'Mutter', examples }, readiness: 'READY', reps: 5 });
  await createCard({ cardId: 'empty-examples', sourceId: 'goethe-a1', data: { examples: [] } });
  await createCard({ cardId: 'no-examples', sourceId: 'goethe-a1', data: { word: 'Haus' } });
  const sql = await readFile(join(__dirname, '../../server/src/main/resources/db/changelog/speaker-gender-hint.sql'), 'utf8');
  await withDbConnection(async db => {
    const before = (await db.query('SELECT * FROM learn_language.cards ORDER BY id')).rows;
    await db.query(sql);
    const after = (await db.query('SELECT * FROM learn_language.cards ORDER BY id')).rows;
    expect(after).toEqual(before.map(card => card.id !== 'legacy-hints' ? card : {
      ...card,
      data: { ...card.data, examples: [
        { de: 'Ich bin Mutter.', speakerGenderHint: 'female', images: [{ id: 'kept-image', isFavorite: true }] },
        { de: 'Ich bin Vater.', speakerGenderHint: 'male' },
        { de: 'Hallo!', speakerGenderHint: null },
        { de: 'Meine Mutter kommt.' },
        { de: 'Ich bin Mutter.', speakerGenderHint: 'female' },
      ] },
    }));
    await db.query(sql);
    expect((await db.query('SELECT * FROM learn_language.cards ORDER BY id')).rows).toEqual(after);
  });
  const response = await request.get('/api/card/legacy-hints', { headers: apiHeaders });
  expect(response.ok()).toBe(true);
  expect((await response.json()).data.examples[0].speakerGenderHint).toBe('female');
});

test('legacy voice requires an explicit gender and retains its configuration', async ({ page, request, apiHeaders }) => {
  const id = await createVoiceConfiguration({ voiceId: 'test-voice-de', model: 'eleven_v3', language: 'de', gender: null });
  const enabled = () => request.get('/api/voice-configurations/enabled', { headers: apiHeaders });
  expect(await (await enabled()).json()).toEqual([]);
  await page.goto('/settings/voices');
  await expect(page.getByText('Select before generating audio')).toBeVisible();
  await page.getByLabel('Voice gender').click();
  await page.getByRole('option', { name: 'Female', exact: true }).click();
  await expect.poll(async () => (await getVoiceConfigurations())[0].gender).toBe('female');
  await page.reload();
  await expect(page.getByLabel('Voice gender')).toContainText('Female');
  expect(await (await enabled()).json()).toEqual([expect.objectContaining({ id, gender: 'female', model: 'eleven_v3', isEnabled: true })]);
});

test('voice API rejects missing and unsupported genders on create and update', async ({ page, request, apiHeaders }) => {
  await page.goto('/settings/voices');
  const data = { voiceId: 'test-voice-de', model: 'eleven_v3', language: 'de' };
  const id = await createVoiceConfiguration(data);
  await Promise.all([undefined, '', 'other'].map(async gender => {
    const options = { headers: apiHeaders, data: { ...data, gender } };
    expect((await request.post('/api/voice-configurations', options)).status()).toBe(400);
    expect((await request.put(`/api/voice-configurations/${id}`, options)).status()).toBe(400);
  }));
  expect((await getVoiceConfigurations())[0].gender).toBe('male');
});

[
  { type: 'GRAMMAR', source: 'grammar-a1', model: 'gemini-3.1-pro-preview' },
  { type: 'SPEECH', source: 'speech-a1', model: 'gpt-6.1-sol' },
  { type: 'VOCABULARY', source: 'goethe-a1', model: 'gpt-6.1-sol' },
].forEach(({ type, source, model }) => {
  test(`${type} completion persists explicit speaker hints and removes ambiguous hints`, async ({ page, request, apiHeaders }) => {
    await createChatModelSetting({ modelName: model, operationType: 'CLASSIFICATION', isEnabled: true, isPrimary: true });
    await createChatModelSetting({ modelName: 'gpt-6.1-sol', operationType: 'IMAGE_DESCRIPTION', isEnabled: true, isPrimary: true });
    await createImageModelSetting({ modelName: 'gpt-image-2-low', imageCount: 1 });
    const unknownVoice = await request.post(`/api/speaker-gender?model=${model}`, {
      headers: apiHeaders,
      data: { sentence: 'Meine Mutter kommt.' },
    });
    expect(unknownVoice.ok()).toBe(true);
    expect(await unknownVoice.json()).toEqual({});
    const sentences = [
      { de: 'Ich bin Mutter.', hu: 'Anya vagyok.', hint: 'female' },
      { de: 'Ich bin Vater.', hu: 'Apa vagyok.', hint: 'male' },
      { de: 'Meine Mutter kommt.', hu: 'Jön az anyám.', hint: undefined },
    ];
    await Promise.all(sentences.map((sentence, index) => createCard({
      cardId: `hint-${index}`, sourceId: source, cardType: type, readiness: 'DRAFT',
      data: {
        word: 'abfahren', translation: { hu: 'elindulni', en: 'depart', ch: 'abfahre' },
        examples: [{ de: sentence.de, hu: sentence.hu, en: 'Existing translation', ch: 'Existing translation', speakerGenderHint: 'male', images: [{ id: 'existing-image', isFavorite: true }] }],
      },
    })));
    await page.goto(`/sources/${source}/cards?filter=draft`);
    await page.getByRole('columnheader', { name: /Select all 3 cards/ }).getByRole('checkbox').click();
    await page.getByRole('button').filter({ hasText: 'Complete 3 cards' }).click();
    await expect(page.getByText('3 card(s) completed')).toBeVisible();
    await Promise.all(sentences.map(async (sentence, index) => {
      const response = await request.get(`/api/card/hint-${index}`, { headers: apiHeaders });
      expect(response.ok()).toBe(true);
      expect((await response.json()).data.examples[0].speakerGenderHint).toBe(sentence.hint);
      const example = await withDbConnection(async client =>
        (await client.query("SELECT data->'examples'->0 AS example FROM learn_language.cards WHERE id = $1", [`hint-${index}`])).rows[0].example
      );
      expect(Object.hasOwn(example, 'speakerGenderHint')).toBe(sentence.hint !== undefined);
      expect(Object.hasOwn(example, 'voiceGenderHint')).toBe(false);
      if (type !== 'GRAMMAR') {
        expect(example.images).toHaveLength(1);
        const logs = await getModelUsageLogs();
        const description = logs.find(log => log.operationType === 'IMAGE_DESCRIPTION'
          && log.responseContent?.includes(sentence.de));
        expect(description).toBeDefined();
        if (sentence.hint) {
          expect(description!.responseContent).toContain(`Speaker gender hint: ${sentence.hint}`);
        } else {
          expect(description!.responseContent).not.toContain('Speaker gender hint:');
        }
      }
    }));
  });
});

[
  { type: 'VOCABULARY', source: 'goethe-a1' },
  { type: 'SPEECH', source: 'speech-a1' },
  { type: 'GRAMMAR', source: 'grammar-a1' },
].forEach(({ type, source }) => {
  test(`${type} bulk audio honors sentence hints without changing word voices`, async ({ page }) => {
    await Promise.all(['de', 'hu'].map(async language => {
      await createVoiceConfiguration({ voiceId: 'test-voice-de', model: 'eleven_v3', language, gender: 'male' });
      await createVoiceConfiguration({ voiceId: 'test-voice-hu', model: 'eleven_v4', language, gender: 'female' });
    }));
    await createCard({
      cardId: 'hinted-audio', sourceId: source, cardType: type, sourcePageNumber: 1, readiness: 'REVIEWED',
      data: {
        word: 'Mutter', translation: { hu: 'anya' },
        examples: [{ de: 'Ich bin Mutter.', hu: 'Anya vagyok.', speakerGenderHint: 'female', isSelected: true }],
      },
    });
    const editUrl = `/sources/${source}/page/1/cards/hinted-audio`;
    const sentenceLabel = type === 'VOCABULARY' ? 'Example in German' : 'German sentence';
    await page.goto(editUrl);
    await expect(page.getByLabel(sentenceLabel, { exact: true })).toHaveValue('Ich bin Mutter.');
    const saved = page.waitForResponse(response => response.url().endsWith('/api/card/hinted-audio') && response.request().method() === 'PUT');
    await page.getByRole('button', { name: 'Update', exact: true }).click();
    expect((await saved).ok()).toBe(true);
    await page.goto('/in-review-cards');
    await page.getByRole('button', { name: 'Generate audio for cards' }).click();
    await expect(page.getByText('Audio generated successfully for 1 card!')).toBeVisible();
    const audio = await withDbConnection(async client =>
      (await client.query("SELECT data->'audio' AS audio FROM learn_language.cards WHERE id = 'hinted-audio'")).rows[0].audio
    );
    expect(audio).toHaveLength(type === 'VOCABULARY' ? 4 : type === 'SPEECH' ? 2 : 1);
    audio.forEach((entry: { text: string; voice: string; model: string }) => {
      const sentence = ['Ich bin Mutter.', 'Anya vagyok.'].includes(entry.text);
      expect(entry.voice).toBe(sentence ? 'test-voice-hu' : 'test-voice-de');
      expect(entry.model).toBe(sentence ? 'eleven_v4' : 'eleven_v3');
    });
    await page.goto(editUrl);
    await page.getByLabel(sentenceLabel, { exact: true }).fill('Ich gehe einkaufen.');
    const changed = page.waitForResponse(response => response.url().endsWith('/api/card/hinted-audio') && response.request().method() === 'PUT');
    await page.getByRole('button', { name: 'Update', exact: true }).click();
    expect((await changed).ok()).toBe(true);
    const example = await withDbConnection(async client =>
      (await client.query("SELECT data->'examples'->0 AS example FROM learn_language.cards WHERE id = 'hinted-audio'")).rows[0].example
    );
    expect(example.speakerGenderHint).toBeUndefined();
  });
});

test('bulk audio fails when matching voices are disabled instead of ignoring a hint', async ({ page }) => {
  await createVoiceConfiguration({ voiceId: 'test-voice-de', model: 'eleven_v3', language: 'de', gender: 'male' });
  await createVoiceConfiguration({ voiceId: 'test-voice-hu', model: 'eleven_v3', language: 'de', gender: 'female', isEnabled: false });
  await createCard({
    cardId: 'missing-voice', sourceId: 'grammar-a1', cardType: 'GRAMMAR', readiness: 'REVIEWED',
    data: { examples: [{ de: 'Ich bin Mutter.', hu: 'Anya vagyok.', speakerGenderHint: 'female', isSelected: true }] },
  });
  await page.goto('/in-review-cards');
  await page.getByRole('button', { name: 'Generate audio for cards' }).click();
  await expect(page.getByText('Failed to generate audio for 1 card. Check the console for details.')).toBeVisible();
  const card = await withDbConnection(async client =>
    (await client.query("SELECT readiness, data FROM learn_language.cards WHERE id = 'missing-voice'")).rows[0]
  );
  expect(card.readiness).toBe('REVIEWED');
  expect(card.data.audio).toBeUndefined();
});

[
  { type: 'VOCABULARY', source: 'goethe-a1', label: 'Example in German' },
  { type: 'SPEECH', source: 'speech-a1', label: 'German sentence' },
].forEach(({ type, source, label }) => {
  test(`${type} image generation uses the edited speaker with custom context`, async ({ page }) => {
    await createChatModelSetting({ modelName: 'gpt-6.1-sol', operationType: 'CLASSIFICATION', isEnabled: true, isPrimary: true });
    await createChatModelSetting({ modelName: 'gpt-6.1-sol', operationType: 'IMAGE_DESCRIPTION', isEnabled: true, isPrimary: true });
    await createImageModelSetting({ modelName: 'gpt-image-2-low', imageCount: 1 });
    await createCard({
      cardId: 'speaker-image', sourceId: source, cardType: type, sourcePageNumber: 1,
      data: { word: 'Mutter', examples: [{ de: 'Ich bin Mutter.', hu: 'Anya vagyok.', speakerGenderHint: 'female', isSelected: true }] },
    });
    await page.goto(`/sources/${source}/page/1/cards/speaker-image`);
    await page.getByLabel(label, { exact: true }).fill('Ich bin Vater.');
    const sceneRequest = page.waitForRequest(req => req.url().endsWith('/api/image/descriptions'));
    const imageRequest = page.waitForRequest(req => req.url().endsWith('/api/image') && req.method() === 'POST');
    await page.getByRole('button', { name: 'Add image with context' }).first().click();
    await page.getByRole('textbox', { name: 'Image generation context' }).fill('A sunny garden');
    await page.getByRole('button', { name: 'Generate', exact: true }).click();
    expect((await sceneRequest).postDataJSON()).toEqual({
      input: 'Ich bin Vater.', context: 'A sunny garden', count: 1, speakerGenderHint: 'male',
    });
    const description = (await imageRequest).postDataJSON().description;
    expect(description).toContain('Speaker gender hint: male');
    expect(description).toContain('Ich bin Vater.');
    expect(description).toContain('A sunny garden');
    await expect(page.getByRole('img')).toHaveCount(1);
  });
});

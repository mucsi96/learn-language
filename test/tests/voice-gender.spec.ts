import { test, expect } from '../fixtures';
import { createCard, createChatModelSetting, createVoiceConfiguration, getVoiceConfigurations, withDbConnection } from '../utils';

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
].forEach(({ type, source, model }) => {
  test(`${type} completion persists explicit speaker hints and removes ambiguous hints`, async ({ page, request, apiHeaders }) => {
    await createChatModelSetting({ modelName: model, operationType: 'CLASSIFICATION', isEnabled: true, isPrimary: true });
    const unknownVoice = await request.post(`/api/voice-gender?model=${model}`, {
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
      data: { examples: [{ de: sentence.de, hu: sentence.hu, en: 'Existing translation', ch: 'Existing translation', voiceGenderHint: 'male', images: [{ id: 'existing-image', isFavorite: true }] }] },
    })));
    await page.goto(`/sources/${source}/cards?filter=draft`);
    await page.getByRole('columnheader', { name: /Select all 3 cards/ }).getByRole('checkbox').click();
    await page.getByRole('button').filter({ hasText: 'Complete 3 cards' }).click();
    await expect(page.getByText('3 card(s) completed')).toBeVisible();
    await Promise.all(sentences.map(async (sentence, index) => {
      const response = await request.get(`/api/card/hint-${index}`, { headers: apiHeaders });
      expect(response.ok()).toBe(true);
      expect((await response.json()).data.examples[0].voiceGenderHint).toBe(sentence.hint);
      const example = await withDbConnection(async client =>
        (await client.query("SELECT data->'examples'->0 AS example FROM learn_language.cards WHERE id = $1", [`hint-${index}`])).rows[0].example
      );
      expect(Object.hasOwn(example, 'voiceGenderHint')).toBe(sentence.hint !== undefined);
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
        examples: [{ de: 'Ich bin Mutter.', hu: 'Anya vagyok.', voiceGenderHint: 'female', isSelected: true }],
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
    expect(example.voiceGenderHint).toBeUndefined();
  });
});

test('bulk audio fails when matching voices are disabled instead of ignoring a hint', async ({ page }) => {
  await createVoiceConfiguration({ voiceId: 'test-voice-de', model: 'eleven_v3', language: 'de', gender: 'male' });
  await createVoiceConfiguration({ voiceId: 'test-voice-hu', model: 'eleven_v3', language: 'de', gender: 'female', isEnabled: false });
  await createCard({
    cardId: 'missing-voice', sourceId: 'grammar-a1', cardType: 'GRAMMAR', readiness: 'REVIEWED',
    data: { examples: [{ de: 'Ich bin Mutter.', hu: 'Anya vagyok.', voiceGenderHint: 'female', isSelected: true }] },
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

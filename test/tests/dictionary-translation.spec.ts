import { test, expect } from '../fixtures';
import { setupDefaultChatModelSettings } from '../utils';

const API_BASE = 'http://localhost:8180/api';
const VALID_TOKEN = 'test-token';

const translationRequest = {
  bookTitle: 'Goethe A1 Wortliste',
  author: 'Goethe Institut',
  chapter: 'Kapitel 1',
  targetLanguage: 'en',
  sentence: 'Wir fahren um zwölf Uhr ab.',
  highlightedWord: 'abfahren',
};

test('returns 401 when no authorization header is provided', async () => {
  const response = await fetch(`${API_BASE}/dictionary/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(translationRequest),
  });

  expect(response.status).toBe(400);
});

test('returns 401 when invalid token is provided', async () => {
  const response = await fetch(`${API_BASE}/dictionary/translate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer wrong-token',
    },
    body: JSON.stringify(translationRequest),
  });

  expect(response.status).toBe(401);
});

test('translates a German word to English', async () => {
  await setupDefaultChatModelSettings();

  const response = await fetch(`${API_BASE}/dictionary/translate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${VALID_TOKEN}`,
    },
    body: JSON.stringify(translationRequest),
  });

  expect(response.status).toBe(200);

  const body = await response.json();

  expect(body.translatedWord).toBe('to depart');
  expect(body.definition).toBe(
    'To leave a place, especially at the start of a journey.'
  );
  expect(body.example).toBe('The train departs from platform 3.');
  expect(body.synonyms).toEqual(['to leave', 'to set off', 'to head out']);
  expect(body.etymology).toContain('abevarn');
  expect(body.paraphrase).toBe("We are leaving at twelve o'clock.");
});

test('translates a German word to Hungarian', async () => {
  await setupDefaultChatModelSettings();

  const response = await fetch(`${API_BASE}/dictionary/translate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${VALID_TOKEN}`,
    },
    body: JSON.stringify({ ...translationRequest, targetLanguage: 'hu' }),
  });

  expect(response.status).toBe(200);

  const body = await response.json();

  expect(body.translatedWord).toBe('elindulni');
  expect(body.definition).toContain('távozás');
  expect(body.synonyms).toEqual(['elutazni', 'útnak indulni', 'elmenni']);
  expect(body.etymology).toContain('abevarn');
  expect(body.paraphrase).toBe('Tizenkét órakor indulunk.');
});

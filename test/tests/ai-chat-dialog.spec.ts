import { test, expect } from '../fixtures';
import { createCard, createSource, setupDefaultChatModelSettings } from '../utils';
import { Page } from '@playwright/test';

async function createAbfahrenCard() {
  await createCard({
    cardId: 'abfahren-elindulni',
    sourceId: 'goethe-a1',
    sourcePageNumber: 9,
    data: {
      word: 'abfahren',
      type: 'VERB',
      gender: 'NEUTER',
      forms: ['fährt ab', 'fuhr ab', 'abgefahren'],
      translation: { en: 'to leave', hu: 'elindulni', ch: 'abfahra' },
      examples: [
        {
          de: 'Wann fährt der Zug ab?',
          hu: 'Mikor indul a vonat?',
          en: 'When does the train leave?',
          isSelected: true,
        },
      ],
    },
  });
}

async function openAiChat(page: Page) {
  await page.goto('/sources/goethe-a1/study');
  await page.getByRole('button', { name: 'Start study session' }).click();
  await page.getByRole('heading', { name: 'elindulni' }).click();
  await page.getByRole('button', { name: 'Card actions' }).click();
  await page.getByRole('menuitem', { name: 'Ask AI' }).click();
}

test('ask AI explains a card via text and highlights German words', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await createAbfahrenCard();

  await openAiChat(page);

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'abfahren' })).toBeVisible();

  await dialog
    .getByRole('textbox', { name: 'Ask a question' })
    .fill('Miért der Zug?');
  await dialog.getByRole('button', { name: 'Send' }).click();

  await expect(dialog.getByText('Miért der Zug?')).toBeVisible();
  await expect(dialog.getByText(/Ez azért helyes/)).toBeVisible();
  await expect(dialog.getByText('der Zug', { exact: true })).toHaveClass(/german/);
});

test('ask AI interacts in English when the source AI interaction language is English', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await createSource({
    id: 'english-ai',
    name: 'English AI',
    startPage: 9,
    languageLevel: 'A1',
    cardTypes: ['VOCABULARY'],
    formatType: 'WORD_LIST_WITH_FORMS_AND_EXAMPLES',
    aiLanguage: 'ENGLISH',
  });
  await createCard({
    cardId: 'abfahren-to-leave',
    sourceId: 'english-ai',
    sourcePageNumber: 9,
    data: {
      word: 'abfahren',
      type: 'VERB',
      gender: 'NEUTER',
      forms: ['fährt ab', 'fuhr ab', 'abgefahren'],
      translation: { en: 'to leave', hu: 'elindulni', ch: 'abfahra' },
      examples: [
        {
          de: 'Wann fährt der Zug ab?',
          hu: 'Mikor indul a vonat?',
          en: 'When does the train leave?',
          isSelected: true,
        },
      ],
    },
  });

  await page.goto('/sources/english-ai/study');
  await page.getByRole('button', { name: 'Start study session' }).click();
  await page.getByRole('heading', { name: 'elindulni' }).click();
  await page.getByRole('button', { name: 'Card actions' }).click();
  await page.getByRole('menuitem', { name: 'Ask AI' }).click();

  const dialog = page.getByRole('dialog');
  const questionInput = dialog.getByRole('textbox', { name: 'Ask a question' });
  await expect(questionInput).toHaveAttribute(
    'placeholder',
    'Ask something about the card...'
  );

  await questionInput.fill('Why der Zug?');
  await dialog.getByRole('button', { name: 'Send' }).click();

  await expect(dialog.getByText('Why der Zug?')).toBeVisible();
  await expect(dialog.getByText(/This is correct because/)).toBeVisible();
  await expect(dialog.getByText('der Zug', { exact: true })).toHaveClass(/german/);
});

[
  { mimeType: 'audio/webm;codecs=opus', extension: 'webm' },
  { mimeType: 'audio/mp4;codecs=mp4a.40.2', extension: 'mp4' },
].forEach(({ mimeType, extension }) => {
  test(`ask AI accepts ${extension} voice input, transcribes and answers`, async ({ page }) => {
    await setupDefaultChatModelSettings();
    await createAbfahrenCard();

    await page.addInitScript(({ mimeType }) => {
      const fakeTrack = { stop() {} };
      const fakeStream = { getTracks: () => [fakeTrack] };
      (navigator.mediaDevices as any).getUserMedia = async () => fakeStream;

      class FakeMediaRecorder {
        state = 'inactive';
        mimeType = mimeType;
        listeners: Record<string, (event: any) => void> = {};
        addEventListener(type: string, cb: (event: any) => void) {
          this.listeners[type] = cb;
        }
        start() {
          this.state = 'recording';
          setTimeout(() => {
            const blob = new Blob(['fake-audio'], { type: mimeType });
            this.listeners['dataavailable']?.({ data: blob });
          }, 10);
        }
        stop() {
          this.state = 'inactive';
          this.listeners['stop']?.({});
        }
      }
      (window as any).MediaRecorder = FakeMediaRecorder;

      class FakeAudioContext {
        state = 'running';
        createMediaStreamSource() {
          return { connect() {} };
        }
        createAnalyser() {
          return {
            fftSize: 2048,
            calls: 0,
            getByteTimeDomainData(buffer: Uint8Array) {
              this.calls += 1;
              buffer.fill(this.calls < 10 ? 200 : 128);
            },
          };
        }
        close() {
          this.state = 'closed';
        }
      }
      (window as any).AudioContext = FakeAudioContext;
    }, { mimeType });

    await openAiChat(page);

    const dialog = page.getByRole('dialog');
    const transcriptionRequest = page.waitForRequest((request) =>
      request.url().endsWith('/api/transcribe') && request.method() === 'POST'
    );
    await dialog.getByRole('button', { name: 'Speak' }).click();

    const upload = (await transcriptionRequest).postDataBuffer()!.toString();
    expect(upload).toContain(`filename="question.${extension}"`);
    expect(upload).toContain(`Content-Type: ${mimeType}`);

    await expect(
      dialog.getByText('Miért ez a helyes nyelvtani megoldás?')
    ).toBeVisible();
    await expect(dialog.getByText(/Ez azért helyes/)).toBeVisible();
  });
});

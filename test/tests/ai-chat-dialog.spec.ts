import { test, expect } from '../fixtures';
import { createCard, setupDefaultChatModelSettings } from '../utils';
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

test('ask AI accepts voice input, transcribes and answers', async ({ page }) => {
  await setupDefaultChatModelSettings();
  await createAbfahrenCard();

  await page.addInitScript(() => {
    const fakeTrack = { stop() {} };
    const fakeStream = { getTracks: () => [fakeTrack] };
    (navigator.mediaDevices as any).getUserMedia = async () => fakeStream;

    class FakeMediaRecorder {
      state = 'inactive';
      mimeType = 'audio/webm';
      listeners: Record<string, (event: any) => void> = {};
      addEventListener(type: string, cb: (event: any) => void) {
        this.listeners[type] = cb;
      }
      start() {
        this.state = 'recording';
        setTimeout(() => {
          const blob = new Blob(['fake-audio'], { type: 'audio/webm' });
          this.listeners['dataavailable']?.({ data: blob });
        }, 10);
      }
      stop() {
        this.state = 'inactive';
        this.listeners['stop']?.({});
      }
    }
    (window as any).MediaRecorder = FakeMediaRecorder;

    let calls = 0;
    class FakeAudioContext {
      state = 'running';
      createMediaStreamSource() {
        return { connect() {} };
      }
      createAnalyser() {
        return {
          fftSize: 2048,
          getByteTimeDomainData(buffer: Uint8Array) {
            calls += 1;
            buffer.fill(calls < 10 ? 200 : 128);
          },
        };
      }
      close() {
        this.state = 'closed';
      }
    }
    (window as any).AudioContext = FakeAudioContext;
  });

  await openAiChat(page);

  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Speak' }).click();

  await expect(
    dialog.getByText('Miért ez a helyes nyelvtani megoldás?')
  ).toBeVisible();
  await expect(dialog.getByText(/Ez azért helyes/)).toBeVisible();
});

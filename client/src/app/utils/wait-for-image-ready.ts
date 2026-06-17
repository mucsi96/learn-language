import { HttpClient } from '@angular/common/http';
import { ImageJobStatusResponse } from '../shared/types/image-generation.types';
import { fetchJson } from './fetchJson';

const POLL_INTERVAL_MS = 1000;
const MAX_ATTEMPTS = 600;

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const waitForImageReady = async (
  http: HttpClient,
  id: string
): Promise<{ description?: string }> => {
  const poll = async (attempt: number): Promise<{ description?: string }> => {
    const { status, error, description } = await fetchJson<ImageJobStatusResponse>(
      http,
      `/api/image/${id}/status`
    );

    if (status === 'completed') {
      return { description };
    }

    if (status === 'failed') {
      throw new Error(error ?? 'Image generation failed');
    }

    if (attempt >= MAX_ATTEMPTS) {
      throw new Error('Image generation timed out');
    }

    await delay(POLL_INTERVAL_MS);
    return poll(attempt + 1);
  };

  return poll(0);
};

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNotifications } from '@mucsi96/react-ui';
import { z } from 'zod';
import { request } from '../../api/http';

interface PreviewVoice {
  id: number;
  voiceId: string;
  model: string;
  language: string;
}

function play(blob: Blob, signal: AbortSignal): Promise<void> {
  signal.throwIfAborted();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      signal.removeEventListener('abort', abort);
      URL.revokeObjectURL(url);
    };
    const abort = () => {
      cleanup();
      reject(signal.reason);
    };
    audio.onended = () => {
      cleanup();
      resolve();
    };
    audio.onerror = () => {
      cleanup();
      reject(new Error('Audio playback failed'));
    };
    signal.addEventListener('abort', abort, { once: true });
    void audio.play().catch((error) => {
      cleanup();
      reject(error);
    });
  });
}

export function useVoicePreview() {
  const notifications = useNotifications();
  const [playing, setPlaying] = useState<number>();
  const active = useRef<{ voiceId: number; controller: AbortController } | null>(null);
  const cache = useRef<Record<string, Blob>>({});
  const stop = useCallback(() => {
    active.current?.controller.abort();
    active.current = null;
    setPlaying(undefined);
  }, []);

  useEffect(
    () => () => {
      active.current?.controller.abort();
    },
    []
  );

  const preview = async (voice: PreviewVoice, texts: string[]) => {
    const wasPlaying = active.current?.voiceId === voice.id;
    stop();
    if (wasPlaying) return;
    const controller = new AbortController();
    const { signal } = controller;
    active.current = { voiceId: voice.id, controller };
    setPlaying(voice.id);
    try {
      const clips = await texts.reduce<Promise<Blob[]>>(async (previous, text) => {
        const clips = await previous;
        signal.throwIfAborted();
        const key = JSON.stringify([voice.voiceId, voice.model, voice.language, text]);
        const cached = cache.current[key];
        if (cached) return [...clips, cached];
        const response = await request('/api/audio', {
          method: 'POST',
          signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: text, voice: voice.voiceId, model: voice.model, language: voice.language }),
        });
        const { id } = z.object({ id: z.string() }).parse(await response.json());
        const blob = await (await request(`/api/audio/${id}`, { signal })).blob();
        signal.throwIfAborted();
        cache.current = { ...Object.fromEntries(Object.entries(cache.current).slice(-99)), [key]: blob };
        return [...clips, blob];
      }, Promise.resolve([]));
      await clips.reduce(async (previous, blob) => {
        await previous;
        await play(blob, signal);
      }, Promise.resolve());
    } catch (error) {
      if (!signal.aborted) notifications.error(error instanceof Error ? error.message : 'Audio preview failed');
    } finally {
      if (active.current?.controller === controller) stop();
    }
  };

  return { playing, preview, stop };
}

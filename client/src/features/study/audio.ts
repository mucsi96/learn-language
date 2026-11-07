import { useEffect, useRef } from 'react';
import { request } from '../../api/http';
import type { Card } from '../../api/cards';

export function createPlayback() {
  const controller = new AbortController();
  const prepared = new Map<string, Promise<{ element: HTMLAudioElement; url: string }>>();
  const playback = { controller: new AbortController() };
  const pause = () => {
    playback.controller.abort();
    playback.controller = new AbortController();
  };
  const stop = () => {
    pause();
    controller.abort();
    prepared.forEach((promise) => {
      void promise.then(
        ({ element, url }) => {
          element.pause();
          element.removeAttribute('src');
          URL.revokeObjectURL(url);
        },
        () => {}
      );
    });
  };
  const prepare = (id: string) => {
    const existing = prepared.get(id);
    if (existing) return existing;
    const promise = request(`/api/audio/${id}`, { signal: controller.signal })
      .then((response) => response.blob())
      .then((blob) => {
        controller.signal.throwIfAborted();
        const url = URL.createObjectURL(blob);
        const element = new Audio(url);
        element.load();
        return { element, url };
      });
    prepared.set(id, promise);
    return promise;
  };
  const play = (ids: string[], cancellation: AbortSignal) => {
    pause();
    const signal = AbortSignal.any([cancellation, playback.controller.signal, controller.signal]);
    return ids.reduce(async (previous, id) => {
      await previous;
      signal.throwIfAborted();
      const { element } = await prepare(id);
      signal.throwIfAborted();
      await new Promise<void>((resolve, reject) => {
        const cleanup = () => {
          element.removeEventListener('ended', ended);
          element.removeEventListener('error', failed);
          signal.removeEventListener('abort', aborted);
        };
        const ended = () => {
          cleanup();
          resolve();
        };
        const failed = () => {
          cleanup();
          reject(new Error('Audio playback failed'));
        };
        const aborted = () => {
          element.pause();
          cleanup();
          reject(signal.reason);
        };
        element.addEventListener('ended', ended, { once: true });
        element.addEventListener('error', failed, { once: true });
        signal.addEventListener('abort', aborted, { once: true });
        element.currentTime = 0;
        void element.play().catch((error) => {
          cleanup();
          reject(error);
        });
      });
    }, Promise.resolve());
  };
  return { prepare, play, stop, pause };
}

export function useCardAudio(card: Card, texts: (string | null | undefined)[], enabled: boolean) {
  const playback = useRef<ReturnType<typeof createPlayback> | null>(null);
  const entries = JSON.stringify(card.data.audio?.filter((audio) => audio.selected && audio.text) ?? []);
  const sequence = JSON.stringify(
    enabled
      ? texts.flatMap((text) => {
          const audio = card.data.audio?.find((audio) => audio.selected && audio.text === text);
          return audio ? [audio.id] : [];
        })
      : []
  );
  useEffect(() => {
    const player = createPlayback();
    playback.current = player;
    const audios = JSON.parse(entries) as { id: string }[];
    audios.forEach((audio) => {
      void player.prepare(audio.id).catch(() => {});
    });
    const stop = () => player.pause();
    window.addEventListener('study-stop-audio', stop);
    return () => {
      window.removeEventListener('study-stop-audio', stop);
      player.stop();
    };
  }, [card.id, entries]);
  useEffect(() => {
    const controller = new AbortController();
    void playback.current?.play(JSON.parse(sequence) as string[], controller.signal).catch((error) => {
      if (!controller.signal.aborted) console.warn(error);
    });
    return () => controller.abort();
  }, [card.id, sequence, entries]);
}

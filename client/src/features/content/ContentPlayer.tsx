import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@mucsi96/react-ui';
import { ApiError, request } from '../../api/http';
import { contentPath, formatPosition, openPlayback, progressWriteSchema } from './api';
import type { ContentItem, Playback, ProgressWrite } from './api';
import styles from './Content.module.css';

type Snapshot = { position: number; duration: number; paused: boolean; completed: boolean };
const writes = new Map<string, Promise<void>>();
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'The operation failed. Please retry.';
const terminal = (error: unknown) => error instanceof ApiError && [401, 403, 409, 423].includes(error.status);
const readSnapshot = (audio: HTMLAudioElement | null): Snapshot | null =>
  audio && Number.isFinite(audio.duration) && audio.duration > 0
    ? { position: audio.currentTime, duration: audio.duration, paused: audio.paused, completed: audio.ended }
    : null;

function enqueue(path: string, operation: () => Promise<void>) {
  const next = (writes.get(path) ?? Promise.resolve()).then(operation);
  const settled = next.catch(() => undefined);
  writes.set(path, settled);
  void settled.then(() => {
    if (writes.get(path) === settled) writes.delete(path);
  });
  return next;
}

async function writeProgress(path: string, body: ProgressWrite, keepalive = false) {
  await request(`${path}/progress`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    keepalive,
  });
}

export function ContentPlayer({ sourceId, item }: { sourceId: string; item: ContentItem }) {
  const client = useQueryClient();
  const path = contentPath(sourceId, item.id);
  const localKey = `content-progress:${sourceId}:${item.id}`;
  const audio = useRef<HTMLAudioElement>(null);
  const session = useRef<Playback | null>(null);
  const sequence = useRef(0);
  const snapshot = useRef<Snapshot | null>(null);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const [playback, setPlayback] = useState<Playback | null>(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [paused, setPaused] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = useCallback(
    (keepalive = false) => {
      const current = readSnapshot(audio.current) ?? snapshot.current;
      const active = session.current;
      if (!current || !active) return;
      snapshot.current = current;
      sequence.current += 1;
      const body: ProgressWrite = {
        sessionId: active.sessionId,
        sequence: sequence.current,
        position: current.position,
        duration: current.duration,
        completed: current.completed,
      };
      const serialized = JSON.stringify(body);
      try {
        localStorage.setItem(localKey, serialized);
      } catch (cause) {
        if (mounted.current) setError(`Progress recovery could not be stored: ${errorMessage(cause)}`);
      }
      if (mounted.current) setSaved(false);
      void enqueue(path, async () => {
        await writeProgress(path, body, keepalive);
        if (localStorage.getItem(localKey) === serialized) localStorage.removeItem(localKey);
        void client.invalidateQueries({ queryKey: [contentPath(sourceId)] });
        if (!mounted.current || session.current?.sessionId !== body.sessionId || sequence.current !== body.sequence)
          return;
        setSaved(true);
        setError(null);
        client.setQueryData<ContentItem>([path], (previous) =>
          previous
            ? { ...previous, progress: { position: body.position, duration: body.duration, completed: body.completed } }
            : previous
        );
      }).catch((cause) => {
        if (!mounted.current || session.current?.sessionId !== body.sessionId) return;
        setError(`Progress could not be saved: ${errorMessage(cause)}`);
        if (terminal(cause)) {
          session.current = null;
          audio.current?.pause();
          setPlayback(null);
          setPaused(true);
        }
      });
    },
    [client, localKey, path, sourceId]
  );

  const update = useCallback(() => {
    const current = readSnapshot(audio.current);
    if (!current) return;
    snapshot.current = current;
    setPosition(current.position);
    setDuration(current.duration);
    setPaused(current.paused);
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = current.paused ? 'paused' : 'playing';
      navigator.mediaSession.setPositionState?.({
        duration: current.duration,
        position: Math.min(current.position, current.duration),
        playbackRate: audio.current?.playbackRate ?? 1,
      });
    }
  }, []);

  const toggle = useCallback(async () => {
    const element = audio.current;
    if (!element) return;
    if (!element.paused) element.pause();
    else
      try {
        await element.play();
      } catch (cause) {
        setError(errorMessage(cause));
      }
  }, []);

  const seek = useCallback(
    (value: number) => {
      const element = audio.current;
      if (!element || !Number.isFinite(element.duration)) return;
      element.currentTime = Math.max(0, Math.min(value, element.duration));
      update();
      save();
    },
    [save, update]
  );

  useEffect(() => {
    const element = audio.current;
    return () => {
      if (!element) return;
      snapshot.current = readSnapshot(element) ?? snapshot.current;
      save(true);
      element.pause();
    };
  }, [playback, save]);

  useEffect(() => {
    mounted.current = true;
    const visibility = () => {
      if (document.visibilityState === 'hidden') save(true);
    };
    const pagehide = () => save(true);
    const timer = window.setInterval(() => {
      if (audio.current && !audio.current.paused) save();
    }, 5000);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', pagehide);
    return () => {
      mounted.current = false;
      controller.current?.abort();
      save(true);
      session.current = null;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', pagehide);
      void client.invalidateQueries({ queryKey: [contentPath(sourceId)] });
    };
  }, [client, save, sourceId]);

  useEffect(() => {
    if (!playback || !('mediaSession' in navigator)) return;
    const media = navigator.mediaSession;
    media.metadata = new MediaMetadata({ title: item.metadata.title });
    const handlers: Partial<Record<MediaSessionAction, MediaSessionActionHandler>> = {
      play: () => {
        void audio.current?.play().catch((cause) => setError(errorMessage(cause)));
      },
      pause: () => audio.current?.pause(),
      seekto: (details) => {
        if (details.seekTime !== undefined) seek(details.seekTime);
      },
      seekbackward: (details) => seek((audio.current?.currentTime ?? 0) - (details.seekOffset ?? 10)),
      seekforward: (details) => seek((audio.current?.currentTime ?? 0) + (details.seekOffset ?? 10)),
      stop: () => {
        audio.current?.pause();
        save();
      },
    };
    const actions = Object.keys(handlers) as MediaSessionAction[];
    actions.forEach((action) => {
      try {
        media.setActionHandler(action, handlers[action]!);
      } catch {
        /* Browsers expose different Media Session actions. */
      }
    });
    return () => {
      actions.forEach((action) => {
        try {
          media.setActionHandler(action, null);
        } catch {
          /* Unsupported action. */
        }
      });
      media.metadata = null;
      media.playbackState = 'none';
      media.setPositionState?.();
    };
  }, [playback, item.metadata.title, save, seek]);

  const start = async (restart = false) => {
    if (controller.current) return;
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await enqueue(path, async () => {
        abort.signal.throwIfAborted();
        const pending = localStorage.getItem(localKey);
        if (pending) {
          const body = progressWriteSchema.parse(JSON.parse(pending));
          try {
            await writeProgress(path, body);
          } catch (cause) {
            if (!(cause instanceof ApiError) || cause.status !== 409) throw cause;
          }
          if (localStorage.getItem(localKey) === pending) localStorage.removeItem(localKey);
        }
        abort.signal.throwIfAborted();
        const result = await openPlayback(path, abort.signal);
        abort.signal.throwIfAborted();
        const next = restart ? { ...result, progress: { ...result.progress, position: 0, completed: false } } : result;
        sequence.current = 0;
        snapshot.current = null;
        session.current = next;
        setPosition(next.progress.position);
        setDuration(0);
        setPaused(true);
        setPlayback(next);
      });
    } catch (cause) {
      if (!abort.signal.aborted) setError(errorMessage(cause));
    } finally {
      controller.current = null;
      if (mounted.current) setBusy(false);
    }
  };

  return (
    <section className={styles.player} aria-label="Audio player">
      {!playback ? (
        <div className={styles.actions}>
          <Button
            isDisabled={busy}
            onPress={() => {
              void start();
            }}
          >
            {item.progress && !item.progress.completed && item.progress.position > 0
              ? `Continue from ${formatPosition(item.progress.position)}`
              : 'Listen'}
          </Button>
          {item.progress && item.progress.position > 0 && (
            <Button
              isDisabled={busy}
              onPress={() => {
                void start(true);
              }}
            >
              Start over
            </Button>
          )}
          {busy && <Button onPress={() => controller.current?.abort()}>Cancel</Button>}
        </div>
      ) : (
        <>
          <audio
            ref={audio}
            src={playback.mediaUrl ?? undefined}
            preload="metadata"
            aria-label="Episode audio"
            onLoadedMetadata={() => {
              const element = audio.current;
              if (!element || !Number.isFinite(element.duration) || element.duration <= 0) return;
              element.currentTime = Math.min(playback.progress.position, element.duration);
              update();
            }}
            onTimeUpdate={update}
            onPlay={update}
            onPause={() => {
              update();
              save();
            }}
            onEnded={() => {
              update();
              save();
            }}
            onError={() => {
              save();
              session.current = null;
              audio.current?.pause();
              setPlayback(null);
              setError('Audio could not be played. Try opening the player again.');
            }}
          />
          {duration > 0 && (
            <input
              type="range"
              aria-label="Playback position"
              min="0"
              max={duration}
              step="1"
              value={position}
              onInput={(event) => seek(Number(event.currentTarget.value))}
              onChange={() => undefined}
            />
          )}
          <div className={styles.actions}>
            <Button
              isDisabled={duration <= 0}
              onPress={() => {
                void toggle();
              }}
            >
              {paused ? 'Play' : 'Pause'}
            </Button>
            {duration > 0 && (
              <span>
                {formatPosition(position)} / {formatPosition(duration)}
              </span>
            )}
          </div>
          {saved && <p role="status">Listening progress saved</p>}
        </>
      )}
      {error && (
        <>
          <p role="alert">{error}</p>
          {playback && <Button onPress={() => save()}>Retry saving progress</Button>}
        </>
      )}
    </section>
  );
}

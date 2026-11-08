import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Button,
  Dialog,
  Menu,
  MenuItem,
  MenuPopover,
  MenuTrigger,
  LoadingArea,
  TextField,
} from '@mucsi96/react-ui';
import { z } from 'zod';
import { apiQuery, request, sendJson } from '../../api/http';
import { audioSchema, type Card } from '../../api/cards';
import { environmentSchema } from '../../api/schemas';
import { useAction } from '../../api/mutations';
import { QueryState } from '../../components/QueryState';
import { createPlayback } from './audio';
import { startRecording } from './recording';
import styles from './Study.module.css';

export function CardActions({
  card,
  path,
  disabled,
  onProcessed,
}: {
  card: Card;
  path: string;
  disabled: boolean;
  onProcessed: () => void;
}) {
  const [dialog, setDialog] = useState<'chat' | 'voice'>();
  const flag = useAction(() => sendJson(`/api/card/${card.id}`, 'PUT', { flagged: !card.flagged }));
  const skip = useAction(() => sendJson(`${path}/skip-card/${card.id}`, 'POST'), onProcessed);
  return (
    <>
      <div className={styles.actions}>
        <MenuTrigger>
          <Button variant="text" aria-label="Card actions" isDisabled={disabled}>
            ⋮
          </Button>
          <MenuPopover>
            <Menu aria-label="Card actions">
              <MenuItem onAction={() => skip.mutate()} isDisabled={skip.isPending}>
                Skip Card
              </MenuItem>
              <MenuItem onAction={() => setDialog('voice')}>Voice Selection</MenuItem>
              <MenuItem onAction={() => flag.mutate()}>{card.flagged ? 'Remove Flag' : 'Flag Card'}</MenuItem>
              <MenuItem onAction={() => setDialog('chat')}>Ask AI</MenuItem>
              <MenuItem href={`/sources/${card.source.id}/page/${card.sourcePageNumber}/cards/${card.id}`}>
                Edit Card
              </MenuItem>
            </Menu>
          </MenuPopover>
        </MenuTrigger>
      </div>
      {dialog === 'chat' && <Chat card={card} close={() => setDialog(undefined)} />}
      {dialog === 'voice' && (
        <VoiceSelection card={card} close={() => setDialog(undefined)} onProcessed={onProcessed} />
      )}
    </>
  );
}

function Chat({ card, close }: { card: Card; close: () => void }) {
  const environment = useQuery(apiQuery('/api/environment', environmentSchema));
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [draft, setDraft] = useState('');
  const [recording, setRecording] = useState(false);
  const question = useRef<HTMLDivElement>(null);
  const active = useRef<Awaited<ReturnType<typeof startRecording>> | null>(null);
  const lifetime = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    window.dispatchEvent(new Event('study-stop-audio'));
    return () => {
      controller.abort();
      active.current?.stop();
    };
  }, []);
  const send = async (text: string) => {
    const model = environment.data?.primaryModelByOperation.explanation;
    if (!model) throw new Error('No primary model configured for explanation');
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    const response = await request(`/api/card/${card.id}/explain?model=${encodeURIComponent(model)}`, {
      method: 'POST',
      signal: lifetime.current?.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: next }),
    });
    const result = z.object({ answer: z.string() }).parse(await response.json());
    setMessages([...next, { role: 'assistant', content: result.answer }]);
  };
  const submit = useMutation({ mutationFn: send });
  const microphone = useMutation({
    mutationFn: async () => {
      const current = await startRecording();
      if (lifetime.current?.signal.aborted) {
        current.stop();
        return;
      }
      active.current = current;
      setRecording(true);
      const blob = await current.result;
      setRecording(false);
      active.current = null;
      lifetime.current?.signal.throwIfAborted();
      const extension = ({ 'audio/webm': 'webm', 'audio/mp4': 'mp4', 'audio/ogg': 'ogg' } as Record<string, string>)[
        blob.type.split(';')[0]
      ];
      if (!extension) throw new Error(`Unsupported recording format: ${blob.type}`);
      const form = new FormData();
      form.append('file', blob, `question.${extension}`);
      const response = await request('/api/transcribe', {
        method: 'POST',
        body: form,
        signal: lifetime.current?.signal,
      });
      const { text } = z.object({ text: z.string() }).parse(await response.json());
      if (text.trim()) await send(text.trim());
    },
    onSettled: () => setRecording(false),
  });
  const busy = submit.isPending || microphone.isPending;
  return (
    <Dialog
      isOpen
      title={card.data.word ?? card.data.grammarTopic ?? (card.source.aiLanguage === 'english' ? 'Card' : 'Kártya')}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <div role="log" aria-label="Conversation" className={styles.conversation}>
        {messages.map((message, index) => (
          <div key={index} data-role={message.role} className={styles.chatMessage}>
            {message.role === 'assistant' ? <ChatResponse content={message.content} /> : message.content}
          </div>
        ))}
      </div>
      {(submit.error || microphone.error) && <p role="alert">{(submit.error ?? microphone.error)?.message}</p>}
      {busy && !recording && <LoadingArea label="Generating answer" />}
      <form
        className={styles.chatForm}
        onSubmit={(event) => {
          event.preventDefault();
          if (draft.trim() && !busy) {
            question.current?.querySelector('input')?.focus();
            submit.mutate(draft.trim());
            setDraft('');
          }
        }}
      >
        <TextField
          ref={question}
          label="Ask a question"
          placeholder={
            card.source.aiLanguage === 'english' ? 'Ask something about the card...' : 'Kérdezz valamit a kártyáról...'
          }
          value={draft}
          onChange={setDraft}
          isReadOnly={busy}
        />
        <Button
          type="button"
          aria-label={recording ? 'Stop recording' : 'Speak'}
          isPending={busy && !recording}
          onPress={() => (recording ? active.current?.stop() : microphone.mutate())}
        >
          {recording ? 'Stop recording' : 'Speak'}
        </Button>
        <Button type="submit" isDisabled={busy || !draft.trim()}>
          Send
        </Button>
        <Button variant="text" onPress={close}>
          Close
        </Button>
      </form>
    </Dialog>
  );
}

function ChatResponse({ content }: { content: string }) {
  return content.split(/\*\*(.+?)\*\*/g).map((text, index) =>
    index % 2 === 1 ? (
      <span key={index} lang="de" className={styles.german}>
        {text}
      </span>
    ) : (
      text
    )
  );
}

const voiceSchema = z.object({
  id: z.number(),
  voiceId: z.string(),
  voiceName: z.string().nullable(),
  model: z.string(),
  language: z.string(),
  displayName: z.string().nullable(),
});
type Voice = z.infer<typeof voiceSchema>;
type Audio = z.infer<typeof audioSchema>;

const voiceLabel = (voice: Voice) => voice.displayName ?? voice.voiceName ?? voice.voiceId;

function VoiceSelection({ card, close, onProcessed }: { card: Card; close: () => void; onProcessed: () => void }) {
  const voices = useQuery(apiQuery('/api/voice-configurations/enabled', z.array(voiceSchema)));
  const [audios, setAudios] = useState<Audio[]>(card.data.audio ?? []);
  const [playing, setPlaying] = useState<number>();
  const playback = useRef<{ player: ReturnType<typeof createPlayback>; controller: AbortController } | null>(null);
  const lifetime = useRef<AbortController | null>(null);
  const stop = () => {
    playback.current?.controller.abort();
    playback.current?.player.stop();
    setPlaying(undefined);
  };
  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    window.dispatchEvent(new Event('study-stop-audio'));
    return () => {
      controller.abort();
      playback.current?.controller.abort();
      playback.current?.player.stop();
    };
  }, []);
  const matches = (audio: Audio, voice: Voice) =>
    audio.voice === voice.voiceId && audio.model === voice.model && audio.language === voice.language;
  const generate = useMutation({
    mutationFn: async ({ voice, select }: { voice: Voice; select: boolean }) => {
      stop();
      const example = card.data.examples?.find((example) => example.isSelected);
      const texts =
        card.type === 'grammar'
          ? voice.language === 'de'
            ? [example?.de?.replace(/\[([^\]]+)\]/g, '$1')]
            : []
          : card.type === 'simple'
            ? []
            : [
                card.type === 'vocabulary'
                  ? voice.language === 'de'
                    ? card.data.word
                    : card.data.translation?.[voice.language]
                  : undefined,
                example?.[voice.language as 'hu' | 'de'],
              ];
      const existing = audios.filter((audio) => matches(audio, voice));
      const generated = await Promise.all(
        texts
          .filter((text): text is string => !!text)
          .filter((text) => !existing.some((audio) => audio.text === text))
          .map(async (text) => {
            const response = await request('/api/audio', {
              method: 'POST',
              signal: lifetime.current?.signal,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ input: text, voice: voice.voiceId, model: voice.model, language: voice.language }),
            });
            const { id } = z.object({ id: z.string() }).parse(await response.json());
            return { id, voice: voice.voiceId, model: voice.model, language: voice.language, text, selected: false };
          })
      );
      lifetime.current?.signal.throwIfAborted();
      const next = [...audios, ...generated].map((audio) =>
        select && audio.language === voice.language ? { ...audio, selected: matches(audio, voice) } : audio
      );
      setAudios(next);
      if (!select) {
        const player = createPlayback();
        const controller = new AbortController();
        playback.current = { player, controller };
        setPlaying(voice.id);
        try {
          await player.play(
            next.filter((audio) => matches(audio, voice)).map((audio) => audio.id),
            controller.signal
          );
        } catch (error) {
          if (!controller.signal.aborted) throw error;
        } finally {
          player.stop();
          setPlaying(undefined);
        }
      }
    },
  });
  const save = useAction(
    () => {
      const languages = [...new Set(audios.map((audio) => audio.language))];
      const filtered = languages.flatMap((language) => {
        const entries = audios.filter((audio) => audio.language === language);
        const selected = entries.filter((audio) => audio.selected);
        return selected.length ? selected : entries;
      });
      return sendJson(`/api/card/${card.id}`, 'PUT', {
        data: { ...card.data, audio: filtered.map((audio) => ({ ...audio, selected: Boolean(audio.selected) })) },
      });
    },
    () => {
      close();
      onProcessed();
    }
  );
  return (
    <Dialog
      isOpen
      title="Voice Selection"
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <QueryState query={voices} label="Fetching voices">
        {(configs) => (
          <>
            {['hu', 'de'].map((language) => (
              <section key={language}>
                <h3>{language === 'hu' ? 'Hungarian' : 'German'}</h3>
                {configs
                  .filter((voice) => voice.language === language)
                  .toSorted((a, b) => voiceLabel(a).localeCompare(voiceLabel(b)))
                  .map((voice) => (
                    <div key={voice.id} className={styles.voice}>
                      <Button
                        aria-label={`Voice: ${voiceLabel(voice)}`}
                        isDisabled={generate.isPending && playing !== voice.id}
                        onPress={() => (playing === voice.id ? stop() : generate.mutate({ voice, select: false }))}
                      >
                        <span>{voiceLabel(voice)}</span> · <span>{voice.model}</span>
                        {playing === voice.id ? ' ■' : ' ▶'}
                      </Button>
                      <Button
                        aria-label={`Select ${voiceLabel(voice)}`}
                        aria-pressed={audios.some((audio) => matches(audio, voice) && audio.selected)}
                        isDisabled={generate.isPending}
                        onPress={() => generate.mutate({ voice, select: true })}
                      >
                        {audios.some((audio) => matches(audio, voice) && audio.selected)
                          ? 'Selected'
                          : 'Select this voice'}
                      </Button>
                    </div>
                  ))}
              </section>
            ))}
          </>
        )}
      </QueryState>
      {generate.error && <p role="alert">{generate.error.message}</p>}
      <Button variant="text" onPress={close}>
        Cancel
      </Button>
      <Button onPress={() => save.mutate()} isDisabled={!voices.isSuccess || generate.isPending || save.isPending}>
        Save
      </Button>
    </Dialog>
  );
}

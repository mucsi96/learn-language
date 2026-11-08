import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Dialog, EmptyState, Select, Switch, TextField } from '@mucsi96/react-ui';
import { z } from 'zod';
import { apiQuery, sendJson } from '../../api/http';
import { environmentSchema } from '../../api/schemas';
import { cardSchema } from '../../api/cards';
import { useAction } from '../../api/mutations';
import { QueryState } from '../../components/QueryState';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { RateLimits } from './RateLimits';
import { useVoicePreview } from './useVoicePreview';
import { VoiceCardPreview } from './VoiceCardPreview';
import styles from '../../components/Forms.module.css';

const voiceSchema = z.object({
  id: z.number(),
  voiceId: z.string(),
  model: z.string(),
  language: z.string(),
  displayName: z.string().nullable(),
  isEnabled: z.boolean(),
});
type Voice = z.infer<typeof voiceSchema>;
type Environment = z.infer<typeof environmentSchema>;

export default function Voices() {
  const environment = useQuery(apiQuery('/api/environment', environmentSchema));
  const voices = useQuery(apiQuery('/api/voice-configurations', z.array(voiceSchema)));
  const samples = useQuery({
    ...apiQuery('/api/cards/sample', z.array(cardSchema)),
    select: (cards) => cards.filter((card) => card.type === 'vocabulary' && !!card.data.word?.trim()),
  });
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<Voice>();
  const [index, setIndex] = useState(0);
  const { playing, preview, stop } = useVoicePreview();
  const update = useAction((voice: Voice) =>
    sendJson(`/api/voice-configurations/${voice.id}`, 'PUT', { ...voice, isEnabled: !voice.isEnabled })
  );
  const remove = useAction(
    (id: number) => sendJson(`/api/voice-configurations/${id}`, 'DELETE'),
    () => {
      stop();
      setDeleting(undefined);
    }
  );
  const front = useAction((disabled: boolean) =>
    sendJson('/api/voice-configurations/front-audio', 'PUT', { disabled })
  );
  const card = samples.data?.[index];
  useEffect(() => {
    stop();
  }, [card?.id, stop]);
  const texts = (language: string) => {
    const example = card?.data.examples?.find((example) => example.isSelected);
    return (
      language === 'de'
        ? [card?.data.word, example?.de]
        : language === 'hu'
          ? [card?.data.translation?.hu, example?.hu]
          : []
    ).filter((text): text is string => !!text?.trim());
  };
  return (
    <QueryState query={environment} label="Loading voice settings">
      {(config) => (
        <div className={styles.form}>
          <RateLimits type="audio" config={config} />
          <Switch
            isSelected={!config.frontAudioDisabled}
            isDisabled={front.isPending}
            onChange={(enabled) => front.mutate(!enabled)}
          >
            Front audio
          </Switch>
          <Card>
            <h2>Voice</h2>
            <Button aria-label="Add voice" onPress={() => setAdding(true)}>
              Add voice
            </Button>
            <QueryState query={voices} label="Loading voices">
              {(items) =>
                items.length === 0 ? (
                  <EmptyState title="No voice configurations yet" headingLevel={3} />
                ) : (
                  config.supportedLanguages
                    .filter((language) => items.some((voice) => voice.language === language.code))
                    .map((language) => (
                      <section key={language.code}>
                        <h3>{language.displayName}</h3>
                        <div className={styles.scroll}>
                          <table className={styles.table} aria-label={`${language.displayName} voices`}>
                            <thead>
                              <tr>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Model</th>
                                <th>Enabled</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {items
                                .filter((voice) => voice.language === language.code)
                                .map((voice) => (
                                  <tr key={voice.id}>
                                    <td>
                                      {voice.displayName ||
                                        config.voices.find((item) => item.id === voice.voiceId)?.displayName ||
                                        voice.voiceId}
                                    </td>
                                    <td>
                                      {config.voices.find((item) => item.id === voice.voiceId)?.category === 'premade'
                                        ? 'default'
                                        : config.voices.find((item) => item.id === voice.voiceId)?.category}
                                    </td>
                                    <td>
                                      {config.audioModels.find((model) => model.id === voice.model)?.displayName ??
                                        voice.model}
                                    </td>
                                    <td>
                                      <Switch
                                        aria-label={voice.isEnabled ? 'Disable voice' : 'Enable voice'}
                                        isSelected={voice.isEnabled}
                                        onChange={() => update.mutate(voice)}
                                        isDisabled={update.isPending}
                                      >
                                        {null}
                                      </Switch>
                                    </td>
                                    <td>
                                      <Button
                                        variant="text"
                                        aria-label="Preview voice"
                                        isDisabled={texts(voice.language).length === 0}
                                        onPress={() => {
                                          void preview(voice, texts(voice.language));
                                        }}
                                      >
                                        {playing === voice.id ? 'Stop' : 'Play'}
                                      </Button>
                                      <Button
                                        variant="text"
                                        aria-label="Delete voice"
                                        onPress={() => setDeleting(voice)}
                                      >
                                        Delete
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    ))
                )
              }
            </QueryState>
          </Card>
          <Card>
            <h2>Preview</h2>
            <QueryState query={samples} label="Loading sample cards">
              {(cards) => (
                <>
                  <div className={styles.toolbar}>
                    <Button
                      aria-label="Previous card"
                      isDisabled={cards.length === 0}
                      onPress={() => {
                        stop();
                        setIndex((value) => (value - 1 + cards.length) % cards.length);
                      }}
                    >
                      Previous
                    </Button>
                    <span>
                      {cards.length > 0 ? index + 1 : 0} / {cards.length}
                    </span>
                    <Button
                      aria-label="Next card"
                      isDisabled={cards.length === 0}
                      onPress={() => {
                        stop();
                        setIndex((value) => (value + 1) % cards.length);
                      }}
                    >
                      Next
                    </Button>
                    <Button
                      aria-label="Load new cards"
                      isDisabled={samples.isFetching}
                      onPress={() => {
                        stop();
                        setIndex(0);
                        void samples.refetch();
                      }}
                    >
                      Refresh
                    </Button>
                  </div>
                  {card ? <VoiceCardPreview card={card} /> : <p>No vocabulary cards with text available for preview</p>}
                </>
              )}
            </QueryState>
          </Card>
          {adding && <AddVoice config={config} onClose={() => setAdding(false)} />}
          {deleting && (
            <ConfirmDialog
              message={`Delete voice "${deleting.displayName ?? deleting.voiceId}"?`}
              onClose={() => setDeleting(undefined)}
              onConfirm={() => remove.mutate(deleting.id)}
              pending={remove.isPending}
            />
          )}
        </div>
      )}
    </QueryState>
  );
}

function AddVoice({ config, onClose }: { config: Environment; onClose: () => void }) {
  const [voiceId, setVoiceId] = useState('');
  const [language, setLanguage] = useState('');
  const [model, setModel] = useState(config.audioModels.find((model) => model.default)?.id ?? '');
  const [name, setName] = useState('');
  const [enabled, setEnabled] = useState(true);
  const selected = config.voices.find((voice) => voice.id === voiceId);
  const models = config.audioModels.filter((model) => !selected || model.provider === selected.provider);
  const save = useAction(
    () =>
      sendJson('/api/voice-configurations', 'POST', {
        voiceId,
        language,
        model,
        displayName: name || undefined,
        isEnabled: enabled,
      }),
    onClose
  );
  return (
    <Dialog
      title="Add Voice Configuration"
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        <Select
          label="Voice"
          selectedKey={voiceId}
          onSelectionChange={(key) => {
            const voice = config.voices.find((voice) => voice.id === key);
            if (!voice) throw new Error('Unknown voice');
            setVoiceId(voice.id);
            setName(voice.displayName);
            setLanguage(voice.languages.length === 1 ? voice.languages[0].name : '');
            const available = config.audioModels.filter((model) => model.provider === voice.provider);
            setModel(available.find((model) => model.default)?.id ?? available[0]?.id ?? '');
          }}
          options={config.voices.map((voice) => ({ id: voice.id, label: voice.displayName }))}
          isRequired
        />
        <Select
          label="Language"
          selectedKey={language}
          onSelectionChange={(key) => setLanguage(String(key))}
          options={(selected?.languages ?? []).map((language) => ({
            id: language.name,
            label: config.supportedLanguages.find((item) => item.code === language.name)?.displayName ?? language.name,
          }))}
          isRequired
        />
        <Select
          label="Model"
          selectedKey={model}
          onSelectionChange={(key) => setModel(String(key))}
          options={models.map((model) => ({ id: model.id, label: model.displayName }))}
          isRequired
        />
        <TextField label="Display name" value={name} onChange={setName} />
        <Switch isSelected={enabled} onChange={setEnabled}>
          Enabled
        </Switch>
        <div className={styles.actions}>
          <Button variant="text" onPress={onClose}>
            Cancel
          </Button>
          <Button type="submit" isDisabled={!voiceId || !language || !model || save.isPending}>
            Add
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

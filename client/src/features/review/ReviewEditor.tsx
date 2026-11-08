import { useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Button, Select, TextField } from '@mucsi96/react-ui';
import type { Card, CardData } from '../../api/cards';
import { useAction } from '../../api/mutations';
import { Markdown } from '../../components/Markdown';
import { generateImages } from '../creation/pipeline';
import { ImageContextDialog } from '../creation/Dialogs';
import { grammarGaps } from './readiness';
import styles from './Review.module.css';

const languages = [
  { code: 'de', name: 'German' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'ch', name: 'Swiss German' },
  { code: 'en', name: 'English' },
] as const;
export function ReviewEditor({
  card,
  data,
  onChange,
}: {
  card: Card;
  data: CardData;
  onChange: Dispatch<SetStateAction<CardData>>;
}) {
  const sentence = useRef<HTMLTextAreaElement>(null);
  const [contextIndex, setContextIndex] = useState<number>();
  const update = (patch: Partial<CardData>) => onChange((current) => ({ ...current, ...patch }));
  const updateExample = (index: number, patch: Partial<NonNullable<CardData['examples']>[number]>) =>
    onChange((current) => ({
      ...current,
      examples: (current.examples ?? []).map((example, i) => (i === index ? { ...example, ...patch } : example)),
    }));
  const images = useAction(async ({ index, context }: { index: number; context?: string }) => {
    const example = data.examples?.[index];
    if (!example?.de) throw new Error('Enter a German example before generating images');
    const generated = await generateImages(example.de, context);
    onChange((current) => ({
      ...current,
      examples: current.examples?.map((item, i) =>
        i === index ? { ...item, images: [...(item.images ?? []), ...generated] } : item
      ),
    }));
  });
  const typeOptions = [
    'NOUN',
    'VERB',
    'ADJECTIVE',
    'ADVERB',
    'PRONOUN',
    'PREPOSITION',
    'CONJUNCTION',
    'INTERJECTION',
    'ARTICLE',
    'NUMERAL',
    'DETERMINER',
    'EXPRESSION',
    'OTHER',
  ];
  const forms = data.forms ?? [];
  const examples = data.examples ?? [];
  return (
    <div className={styles.editor}>
      {card.type === 'simple' ? (
        <>
          {(['frontText', 'backText'] as const).map((key, index) => (
            <div key={key}>
              <label className={styles.field}>
                {index === 0 ? 'Front text' : 'Back text'}
                <textarea value={data[key] ?? ''} onChange={(event) => update({ [key]: event.target.value })} />
              </label>
              <Markdown text={data[key] ?? ''} label={index === 0 ? 'Front preview' : 'Back preview'} />
            </div>
          ))}
          <div className={styles.fields}>
            <TextField label="Topic" value={data.topic ?? ''} onChange={(topic) => update({ topic })} />
            <TextField label="Category" value={data.category ?? ''} onChange={(category) => update({ category })} />
          </div>
        </>
      ) : (
        <>
          {card.type === 'vocabulary' && (
            <>
              <div className={styles.fields}>
                <Select
                  label="Type"
                  aria-label="Word type"
                  selectedKey={data.type ?? null}
                  onSelectionChange={(key) => update({ type: String(key) })}
                  options={typeOptions.map((id) => ({ id, label: id.charAt(0) + id.slice(1).toLowerCase() }))}
                />
                {data.type === 'NOUN' && (
                  <Select
                    label="Gender"
                    selectedKey={data.gender ?? null}
                    onSelectionChange={(key) => update({ gender: String(key) })}
                    options={[
                      { id: 'MASCULINE', label: 'Masculine' },
                      { id: 'FEMININE', label: 'Feminine' },
                      { id: 'NEUTER', label: 'Neuter' },
                    ]}
                  />
                )}
              </div>
              <div className={styles.fields}>
                {languages.map((language) => (
                  <TextField
                    key={language.code}
                    label={`${language.name} translation`}
                    value={(language.code === 'de' ? data.word : data.translation?.[language.code]) ?? ''}
                    onChange={(value) =>
                      language.code === 'de'
                        ? update({ word: value })
                        : update({ translation: { ...data.translation, [language.code]: value } })
                    }
                  />
                ))}
              </div>
              <h3>Forms</h3>
              {forms.map((form, index) => (
                <div className={styles.actions} key={index}>
                  <TextField
                    aria-label="Form"
                    label="Form"
                    value={form}
                    onChange={(value) => update({ forms: forms.map((item, i) => (i === index ? value : item)) })}
                  />
                  <Button
                    aria-label="Remove form"
                    onPress={() => update({ forms: forms.filter((_, i) => i !== index) })}
                  >
                    Remove form
                  </Button>
                  <Button
                    aria-label="Insert form below"
                    onPress={() => update({ forms: [...forms.slice(0, index + 1), '', ...forms.slice(index + 1)] })}
                  >
                    Insert form below
                  </Button>
                </div>
              ))}
              <Button onPress={() => update({ forms: [...forms, ''] })}>Add form</Button>
              <h3>Examples</h3>
            </>
          )}
          {examples.map((example, index) => (
            <section className={styles.example} key={index} aria-label={`Example ${index + 1}`}>
              {card.type === 'vocabulary' && (
                <label>
                  <input
                    type="radio"
                    name={`example-${card.id}`}
                    checked={example.isSelected === true}
                    onChange={() =>
                      update({ examples: examples.map((item, i) => ({ ...item, isSelected: i === index })) })
                    }
                  />
                  Select example {index + 1}
                </label>
              )}
              <div className={styles.fields}>
                {languages
                  .filter(
                    (language) =>
                      card.type === 'vocabulary' ||
                      language.code === 'de' ||
                      language.code === 'hu' ||
                      (card.type === 'speech' && language.code === 'en')
                  )
                  .map((language) =>
                    card.type === 'grammar' && language.code === 'de' ? (
                      <label className={styles.field} key={language.code}>
                        German sentence
                        <textarea
                          ref={sentence}
                          value={example.de ?? ''}
                          onChange={(event) => updateExample(index, { de: event.target.value })}
                        />
                      </label>
                    ) : (
                      <TextField
                        key={language.code}
                        label={
                          card.type === 'vocabulary'
                            ? `Example in ${language.name}`
                            : language.code === 'de'
                              ? 'German sentence'
                              : `${language.name} translation`
                        }
                        value={example[language.code] ?? ''}
                        onChange={(value) => updateExample(index, { [language.code]: value })}
                      />
                    )
                  )}
              </div>
              {card.type === 'grammar' ? (
                <>
                  <Button
                    onPress={() => {
                      const input = sentence.current;
                      if (!input || input.selectionStart === input.selectionEnd) return;
                      const text = input.value.slice(input.selectionStart, input.selectionEnd);
                      if (!text.trim() || text.includes('[') || text.includes(']')) return;
                      updateExample(index, {
                        de:
                          input.value.slice(0, input.selectionStart) +
                          '[' +
                          text +
                          ']' +
                          input.value.slice(input.selectionEnd),
                      });
                    }}
                  >
                    Add gap from selection
                  </Button>
                  <div className={styles.actions}>
                    {Array.from((example.de ?? '').matchAll(grammarGaps)).map((match, gapIndex) => (
                      <Button
                        key={gapIndex}
                        aria-label={`Remove gap ${match[1]}`}
                        onPress={() =>
                          updateExample(index, {
                            de:
                              example.de!.slice(0, match.index) +
                              match[1] +
                              example.de!.slice(match.index + match[0].length),
                          })
                        }
                      >
                        {match[1]} ×
                      </Button>
                    ))}
                  </div>
                  <p>{example.de?.replace(grammarGaps, (_, text: string) => '_'.repeat(text.length))}</p>
                </>
              ) : (
                <>
                  <div className={styles.actions}>
                    <Button
                      aria-label="Add example image"
                      isDisabled={images.isPending || !example.de}
                      onPress={() => images.mutate({ index })}
                    >
                      Add example image
                    </Button>
                    <Button
                      aria-label="Add image with context"
                      isDisabled={images.isPending || !example.de}
                      onPress={() => setContextIndex(index)}
                    >
                      Add image with context
                    </Button>
                  </div>
                  <div className={styles.images}>
                    {example.images?.map((image, imageIndex) => (
                      <figure key={image.id} className={styles.image}>
                        <img loading="lazy" src={`/api/image/${encodeURIComponent(image.id)}`} alt={example.de ?? ''} />
                        <Button
                          aria-label="Toggle favorite"
                          aria-pressed={image.isFavorite === true}
                          variant="text"
                          onPress={() =>
                            updateExample(index, {
                              images: example.images!.map((item, i) =>
                                i === imageIndex ? { ...item, isFavorite: !item.isFavorite } : item
                              ),
                            })
                          }
                        >
                          {image.isFavorite ? '♥' : '♡'}
                        </Button>
                        <figcaption>{image.model}</figcaption>
                      </figure>
                    ))}
                  </div>
                </>
              )}
            </section>
          ))}
          {card.type === 'grammar' && (
            <TextField label="Hint" value={data.hint ?? ''} onChange={(hint) => update({ hint })} />
          )}
          {data.audio?.map((audio) => (
            <label className={styles.field} key={audio.id}>
              {audio.text} · {audio.language} · {audio.voice}
              <audio controls preload="none" src={`/api/audio/${encodeURIComponent(audio.id)}`} />
            </label>
          ))}
        </>
      )}
      {contextIndex !== undefined && (
        <ImageContextDialog
          onClose={(context) => {
            const index = contextIndex;
            setContextIndex(undefined);
            if (context !== null) images.mutate({ index, context });
          }}
        />
      )}
    </div>
  );
}

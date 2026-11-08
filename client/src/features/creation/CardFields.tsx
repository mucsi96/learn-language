import { useRef } from 'react';
import { Button, Select, TextField } from '@mucsi96/react-ui';
import type { CardData } from '../../api/cards';
import { Markdown } from '../../components/Markdown';
import type { CardType } from './api';
import { grammarGap } from './cardValidation';
import styles from './Creation.module.css';

const languages = { de: 'German', hu: 'Hungarian', en: 'English', ch: 'Swiss German' };
const wordTypes = [
  ['VERB', 'Ige'],
  ['ADJECTIVE', 'Melléknév'],
  ['ADVERB', 'Határozószó'],
  ['PRONOUN', 'Névmás'],
  ['PREPOSITION', 'Elöljárószó'],
  ['CONJUNCTION', 'Kötőszó'],
  ['INTERJECTION', 'Indulatszó'],
  ['ARTICLE', 'Névelő'],
  ['NUMERAL', 'Számnév'],
  ['DETERMINER', 'Determináns'],
  ['NOUN', 'Főnév'],
  ['EXPRESSION', 'Kifejezés'],
  ['OTHER', 'Egyéb'],
].map(([id, label]) => ({ id, label }));
type Props = {
  type: CardType;
  data: CardData;
  onChange: (data: CardData) => void;
  onGenerateImages: (index: number, withContext: boolean) => void;
  onPreviewImage: (id: string) => void;
};
export function CardFields({ type, data, onChange, onGenerateImages, onPreviewImage }: Props) {
  const sentenceRef = useRef<HTMLTextAreaElement>(null);
  const update = (patch: Partial<CardData>) => onChange({ ...data, ...patch });
  const examples = data.examples ?? [];
  const updateExample = (index: number, patch: Partial<(typeof examples)[number]>) =>
    update({ examples: examples.map((example, i) => (i === index ? { ...example, ...patch } : example)) });
  const textField = (
    label: string,
    key: 'word' | 'hint' | 'grammarTopic' | 'frontText' | 'backText' | 'topic' | 'category',
    multiline = false
  ) => (
    <TextField
      key={key}
      label={label}
      multiline={multiline}
      value={data[key] ?? ''}
      onChange={(value) => update({ [key]: value })}
    />
  );
  if (type === 'simple')
    return (
      <>
        {textField('Front text', 'frontText', true)}
        <Markdown text={data.frontText ?? ''} label="Front preview" />
        {textField('Back text', 'backText', true)}
        <Markdown text={data.backText ?? ''} label="Back preview" />
        {textField('Topic', 'topic')}
        {textField('Category', 'category')}
      </>
    );
  return (
    <>
      {type === 'vocabulary' && (
        <>
          <div className={styles.translations}>
            {textField('German translation', 'word')}
            <Select
              label="Word type"
              options={wordTypes}
              selectedKey={data.type ?? null}
              onSelectionChange={(key) => update({ type: String(key) })}
            />
            {data.type === 'NOUN' && (
              <Select
                label="Gender"
                options={[
                  { id: 'MASCULINE', label: 'Masculine' },
                  { id: 'FEMININE', label: 'Feminine' },
                  { id: 'NEUTER', label: 'Neuter' },
                ]}
                selectedKey={data.gender ?? null}
                onSelectionChange={(key) => update({ gender: String(key) })}
              />
            )}
            {(['hu', 'en', 'ch'] as const).map((language) => (
              <TextField
                key={language}
                label={`${languages[language]} translation`}
                value={data.translation?.[language] ?? ''}
                onChange={(value) => update({ translation: { ...data.translation, [language]: value } })}
              />
            ))}
          </div>
          <h2>Forms</h2>
          {(data.forms ?? []).map((form, index) => (
            <div className={styles.formRow} key={index}>
              <TextField
                label="Form"
                value={form}
                onChange={(value) =>
                  update({ forms: data.forms!.map((current, i) => (i === index ? value : current)) })
                }
              />
              <Button
                variant="icon"
                aria-label="Insert form below"
                onPress={() =>
                  update({ forms: [...data.forms!.slice(0, index + 1), '', ...data.forms!.slice(index + 1)] })
                }
              >
                +
              </Button>
              <Button
                variant="icon"
                tone="error"
                aria-label="Remove form"
                onPress={() => update({ forms: data.forms!.filter((_, i) => i !== index) })}
              >
                ×
              </Button>
            </div>
          ))}
          <Button
            variant="outlined"
            className={styles.inlineAction}
            onPress={() => update({ forms: [...(data.forms ?? []), ''] })}
          >
            Add form
          </Button>
        </>
      )}
      {examples.map((example, index) => (
        <section className={`${styles.fields} ${styles.example}`} key={index}>
          <h2>{type === 'vocabulary' ? `Example ${index + 1}` : 'Sentence'}</h2>
          {type === 'vocabulary' && (
            <label className={styles.actions}>
              <input
                type="radio"
                name="selectedExample"
                checked={Boolean(example.isSelected)}
                onChange={() =>
                  update({
                    examples: examples.map((value, i) => ({ ...value, isSelected: i === index ? true : undefined })),
                  })
                }
              />
              Use this example
            </label>
          )}
          <div className={styles.translations}>
            {(type === 'grammar'
              ? (['de', 'hu'] as const)
              : type === 'speech'
                ? (['de', 'hu', 'en'] as const)
                : (['de', 'hu', 'en', 'ch'] as const)
            ).map((language) => {
              const label =
                type === 'vocabulary'
                  ? `Example in ${languages[language]}`
                  : language === 'de'
                    ? 'German sentence'
                    : `${languages[language]} translation`;
              return language === 'de' && type === 'grammar' ? (
                <label key={language} className={styles.field}>
                  {label}
                  <textarea
                    ref={sentenceRef}
                    value={example.de ?? ''}
                    onChange={(event) => updateExample(index, { de: event.target.value })}
                  />
                </label>
              ) : (
                <TextField
                  key={language}
                  label={label}
                  multiline
                  value={example[language] ?? ''}
                  onChange={(value) => updateExample(index, { [language]: value })}
                />
              );
            })}
          </div>
          {type === 'grammar' && (
            <>
              <Button
                variant="outlined"
                onPress={() => {
                  const input = sentenceRef.current;
                  const sentence = example.de;
                  if (!input || !sentence) return;
                  const selected = sentence.slice(input.selectionStart, input.selectionEnd);
                  if (!selected.trim() || selected.includes('[') || selected.includes(']')) return;
                  updateExample(index, {
                    de: `${sentence.slice(0, input.selectionStart)}[${selected}]${sentence.slice(input.selectionEnd)}`,
                  });
                }}
              >
                Add Gap from Selection
              </Button>
              <p aria-label="Sentence preview">
                {example.de?.replace(grammarGap(), (_, value: string) => '_'.repeat(value.length))}
              </p>
              <div className={styles.actions}>
                {[...(example.de ?? '').matchAll(grammarGap())].map((match, gap) => (
                  <Button
                    key={gap}
                    variant="text"
                    aria-label={`Remove gap ${match[1]}`}
                    onPress={() =>
                      updateExample(index, {
                        de: `${example.de!.slice(0, match.index)}${match[1]}${example.de!.slice(match.index + match[0].length)}`,
                      })
                    }
                  >
                    {match[1]} ×
                  </Button>
                ))}
              </div>
            </>
          )}
          {(type === 'vocabulary' || type === 'speech') && (
            <>
              <div className={styles.images}>
                {example.images?.map((image, imageIndex) => (
                  <div key={image.id}>
                    <button
                      type="button"
                      className={styles.imageButton}
                      onClick={() => onPreviewImage(image.id)}
                      aria-label={`View image ${imageIndex + 1}`}
                    >
                      <img src={`/api/image/${image.id}`} alt={example.de ?? 'Example image'} />
                    </button>
                    <p>{image.model}</p>
                    <Button
                      variant="text"
                      aria-label="Toggle favorite"
                      aria-pressed={Boolean(image.isFavorite)}
                      onPress={() =>
                        updateExample(index, {
                          images: example.images!.map((value, i) =>
                            i === imageIndex ? { ...value, isFavorite: value.isFavorite ? undefined : true } : value
                          ),
                        })
                      }
                    >
                      {image.isFavorite ? '★ Favorite' : '☆ Favorite'}
                    </Button>
                  </div>
                ))}
              </div>
              <div className={styles.actions}>
                <Button variant="outlined" onPress={() => onGenerateImages(index, false)}>
                  Add example image
                </Button>
                <Button variant="outlined" onPress={() => onGenerateImages(index, true)}>
                  Add image with context
                </Button>
              </div>
            </>
          )}
          {type === 'vocabulary' && (
            <Button
              variant="text"
              tone="error"
              onPress={() => update({ examples: examples.filter((_, i) => i !== index) })}
            >
              Remove example
            </Button>
          )}
        </section>
      ))}
      {(type === 'vocabulary' || !examples.length) && (
        <Button
          variant="outlined"
          className={styles.inlineAction}
          onPress={() => update({ examples: [...examples, { de: '', isSelected: examples.length === 0 }] })}
        >
          Add example
        </Button>
      )}
      {type === 'grammar' && (
        <>
          {textField('Grammar topic', 'grammarTopic')}
          {textField('Hint in German', 'hint', true)}
        </>
      )}
    </>
  );
}

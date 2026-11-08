import type { Card } from '../../api/cards';
import styles from './Settings.module.css';

export function VoiceCardPreview({ card }: { card: Card }) {
  const { data } = card;
  const example = data.examples?.find((example) => example.isSelected);
  return (
    <div className={styles.preview}>
      <section aria-label="German preview" lang="de">
        <span>DE</span>
        <h3 className={styles.word} data-gender={data.gender}>
          {data.word}
        </h3>
        {!!data.forms?.length && <p>{data.forms.join(', ')}</p>}
        {example?.de && <p>{example.de}</p>}
      </section>
      <section aria-label="Hungarian preview" lang="hu">
        <span>HU</span>
        <h3>{data.translation?.hu}</h3>
        {example?.hu && <p>{example.hu}</p>}
      </section>
    </div>
  );
}

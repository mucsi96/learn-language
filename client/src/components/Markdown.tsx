import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js/lib/common';
import DOMPurify from 'dompurify';
import 'highlight.js/styles/github-dark.css';
import styles from './Markdown.module.css';

const markdown = new Marked(
  markedHighlight({
    emptyLangClass: 'hljs',
    langPrefix: 'hljs language-',
    highlight: (code, language) =>
      hljs.highlight(code, {
        language: hljs.getLanguage(language) ? language : 'plaintext',
      }).value,
  })
);

export function Markdown({ text, label }: { text: string; label: string }) {
  return (
    <div
      aria-label={label}
      className={styles.markdown}
      dangerouslySetInnerHTML={{
        __html: DOMPurify.sanitize(markdown.parse(text, { async: false, gfm: true, breaks: true })),
      }}
    />
  );
}

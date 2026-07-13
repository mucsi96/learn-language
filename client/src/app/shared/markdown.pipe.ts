import { Pipe, PipeTransform } from '@angular/core';
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js/lib/common';

const marked = new Marked(
  markedHighlight({
    emptyLangClass: 'hljs',
    langPrefix: 'hljs language-',
    highlight: (code, lang) =>
      hljs.highlight(code, {
        language: hljs.getLanguage(lang) ? lang : 'plaintext',
      }).value,
  })
);

@Pipe({
  name: 'markdown',
})
export class MarkdownPipe implements PipeTransform {
  transform(value: string | undefined | null): string {
    if (!value) {
      return '';
    }
    return marked.parse(value, { async: false, gfm: true, breaks: true }) as string;
  }
}

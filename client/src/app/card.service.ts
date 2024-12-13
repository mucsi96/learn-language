import { HttpClient } from '@angular/common/http';
import {
  computed,
  inject,
  Injectable,
  Injector,
  linkedSignal,
  resource,
  ResourceRef,
  ResourceStatus,
  signal,
} from '@angular/core';
import { Translation, Word } from './parser/types';
import { fetchJson } from './utils/fetchJson';

export const languages = ['hu', 'ch', 'en'] as const;

@Injectable({
  providedIn: 'root',
})
export class CardService {
  private readonly http = inject(HttpClient);
  private readonly injector = inject(Injector);
  readonly selectedWord = signal<Word | undefined>(undefined);
  readonly type = signal('');
  readonly word = linkedSignal(() => this.selectedWord()?.word);
  readonly translationMap = Object.fromEntries(
    languages.map((languageCode) => [
      languageCode,
      resource<Translation | undefined, { selectedWord: Word | undefined }>({
        request: () => ({ selectedWord: this.selectedWord() }),
        loader: async ({ request: { selectedWord } }) => {
          if (!selectedWord) {
            return;
          }

          return fetchJson<Translation>(
            this.http,
            `/api/translate/${languageCode}`,
            {
              body: selectedWord,
              method: 'POST',
            }
          );
        },
      }),
    ])
  );
  readonly translation = Object.fromEntries(
    languages.map((languageCode) => [
      languageCode,
      linkedSignal(
        () => this.translationMap[languageCode].value()?.translation
      ),
    ])
  );
  readonly forms = linkedSignal(() =>
    this.selectedWord()?.forms.map((form) => signal(form))
  );
  readonly examples = linkedSignal(() =>
    this.selectedWord()?.examples.map((example) => signal(example))
  );
  readonly examplesTranslations = linkedSignal(() => {
    const examples = this.selectedWord()?.examples;

    if (!examples) {
      return;
    }

    return Object.fromEntries(
      languages.map((languageCode) => [
        languageCode,
        examples.map((_, index) =>
          linkedSignal(
            () => this.translationMap[languageCode].value()?.examples[index]
          )
        ),
      ])
    );
  });
  readonly exampleImages = signal<ResourceRef<string>[]>([]);

  async selectWord(word: Word) {
    this.selectedWord.set(word);
    this.exampleImages.set(
      word.examples.map((example, index) =>
        resource<string, unknown>({
          injector: this.injector,
          loader: async ({ previous }) => {
            const { url } = await fetchJson<{ url: string }>(
              this.http,
              `/api/image`,
              {
                body: {
                  id: word.id,
                  input: example,
                  index,
                  override: previous.status !== ResourceStatus.Idle,
                },
                method: 'POST',
              }
            );
            return url;
          },
        })
      )
    );
  }

  get isLoading() {
    return computed(() =>
      Object.values(this.translationMap).some((translation) =>
        translation.isLoading()
      )
    );
  }
}

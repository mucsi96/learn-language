import {
  Component,
  effect,
  inject,
  linkedSignal,
  resource,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule, MatLabel } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { languages, WordService } from '../../word.service';
import { ActivatedRoute, Params } from '@angular/router';
import { queryParamToObject } from '../../utils/queryCompression';
import { Word } from '../types';
import { injectParams } from '../../utils/inject-params';

@Component({
  selector: 'app-card',
  imports: [
    MatButtonModule,
    FormsModule,
    MatFormFieldModule,
    MatLabel,
    MatInputModule,
    MatCardModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './card.component.html',
  styleUrl: './card.component.css',
})
export class CardComponent {
  private readonly wordService = inject(WordService);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly cardData = injectParams<string>('cardData');
  private readonly data = resource<Word, { cardData: string | Params | null }>({
    request: () => ({ cardData: this.cardData() }),
    loader: ({ request: { cardData } }) => {
      if (typeof cardData !== 'string') {
        throw new Error('Invalid card data');
      }
      return queryParamToObject(cardData);
    },
  });
  readonly loading = this.wordService.isLoading;
  readonly type = signal('');
  readonly word = linkedSignal(() => this.data.value()?.word);
  readonly translation = Object.fromEntries(
    languages.map((languageCode) => [
      languageCode,
      linkedSignal(
        () => this.wordService.translation[languageCode].value()?.translation
      ),
    ])
  );
  readonly forms = linkedSignal(() =>
    this.data.value()?.forms.map((form) => signal(form))
  );
  readonly examples = linkedSignal(() =>
    this.data.value()?.examples.map((example) => signal(example))
  );
  readonly examplesTranslations = linkedSignal(() => {
    const examples = this.data.value()?.examples;

    if (!examples) {
      return;
    }

    return Object.fromEntries(
      languages.map((languageCode) => [
        languageCode,
        examples.map((_, index) =>
          linkedSignal(
            () =>
              this.wordService.translation[languageCode].value()?.examples[
                index
              ]
          )
        ),
      ])
    );
  });
  readonly exampleImages = resource<
    string[],
    { id?: string; examples?: string[] }
  >({
    request: () => ({
      id: this.data.value()?.id,
      examples: this.examples()?.map((example) => example()),
    }),
    loader: async ({ request: { id, examples } }) => {
      if (!id || !examples) {
        return [];
      }

      return await Promise.all(
        examples.map((example, index) =>
          this.wordService.createImage({
            id,
            input: example,
            index,
          })
        )
      );
    },
  });

  constructor() {
    effect(() => {
      const word = this.data.value();
      word && this.wordService.selectWord(word);
    });
  }
}

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
import { Params } from '@angular/router';
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
  private readonly cardData = injectParams<string>('cardData');
  readonly loading = this.wordService.isLoading;
  readonly type = signal('');
  readonly word = linkedSignal(() => this.wordService.selectedWord()?.word);
  readonly translation = Object.fromEntries(
    languages.map((languageCode) => [
      languageCode,
      linkedSignal(
        () => this.wordService.translation[languageCode].value()?.translation
      ),
    ])
  );
  readonly forms = linkedSignal(() =>
    this.wordService.selectedWord()?.forms.map((form) => signal(form))
  );
  readonly examples = linkedSignal(() =>
    this.wordService.selectedWord()?.examples.map((example) => signal(example))
  );
  readonly examplesTranslations = linkedSignal(() => {
    const examples = this.wordService.selectedWord()?.examples;

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
      id: this.wordService.selectedWord()?.id,
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
    effect(async () => {
      const cardData = this.cardData();

      if (typeof cardData !== 'string') {
        return;
      }

      const word = await queryParamToObject<Word>(cardData);
      this.wordService.selectWord(word);
    });
  }
}

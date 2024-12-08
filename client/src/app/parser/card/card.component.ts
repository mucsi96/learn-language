import {
  Component,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule, MatLabel } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { languages, WordService } from '../../word.service';
import { ActivatedRoute } from '@angular/router';
import { queryParamToObject } from '../../utils/queryCompression';
import { Word } from '../types';

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
  private readonly data = this.wordService.selectedWord;
  readonly loading = this.wordService.isLoading;
  readonly type = signal('');
  readonly word = linkedSignal(() => this.data()?.word);
  readonly translation = Object.fromEntries(
    languages.map((languageCode) => [
      languageCode,
      linkedSignal(
        () => this.wordService.translation[languageCode].value()?.translation
      ),
    ])
  );
  readonly forms = linkedSignal(() =>
    this.data()?.forms.map((form) => signal(form))
  );
  readonly examples = linkedSignal(() =>
    this.data()?.examples.map((example) => signal(example))
  );
  readonly examplesTranslations = linkedSignal(() => {
    const examples = this.data()?.examples;

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
  readonly exampleImages = signal<string[] | undefined>(undefined);

  constructor() {
    this.activatedRoute.params.subscribe(async (params) => {
      try {
        const word = await queryParamToObject<Word>(params['cardData']);
        this.wordService.selectWord(word);
        await Promise.all(
          word.examples.map((example, index) =>
            this.wordService.createImage({
              id: word.id,
              input: example,
              index,
            })
          )
        );
        this.exampleImages.set(
          await Promise.all(
            word.examples.map((_, index) =>
              this.wordService.getImageBlobUrl(
                `/api/image/${word.id}-${index}.png`
              )
            )
          )
        );
      } catch (error) {
        console.error(error);
      }
    });
  }
}

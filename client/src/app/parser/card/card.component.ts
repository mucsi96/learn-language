import { Component, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule, MatLabel } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { injectParams } from '../../utils/inject-params';
import { queryParamToObject } from '../../utils/queryCompression';
import { CardService } from '../../card.service';
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
  private readonly cardService = inject(CardService);
  private readonly cardData = injectParams<string>('cardData');
  readonly loading = this.cardService.isLoading;
  readonly word = this.cardService.word;
  readonly type = this.cardService.type;
  readonly translation = this.cardService.translation;
  readonly forms = this.cardService.forms;
  readonly examples = this.cardService.examples;
  readonly examplesTranslations = this.cardService.examplesTranslations;
  readonly exampleImages = this.cardService.exampleImages;

  constructor() {
    effect(async () => {
      const cardData = this.cardData();

      if (typeof cardData !== 'string') {
        return;
      }

      const word = await queryParamToObject<Word>(cardData);
      this.cardService.selectWord(word);
    });
  }
}

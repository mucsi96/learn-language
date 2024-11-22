import { Component, inject, linkedSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule, MatLabel } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { WordService } from '../../word.service';
import { Word } from '../types';

@Component({
  selector: 'app-word-dialog',
  imports: [
    MatDialogModule,
    MatButtonModule,
    FormsModule,
    MatFormFieldModule,
    MatLabel,
    MatInputModule,
    MatCardModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './word-dialog.component.html',
  styleUrl: './word-dialog.component.css',
})
export class WordDialogComponent {
  public data: Word = inject(MAT_DIALOG_DATA);
  private readonly wordService = inject(WordService);
  readonly loading = this.wordService.isLoading;
  readonly type = signal('');
  readonly word = signal(this.data.word);
  readonly hungarianTranslation = linkedSignal(
    () => this.wordService.hungarianTranslation.value()?.translation
  );
  readonly swissGermanTranslation = linkedSignal(
    () => this.wordService.swissGermanTranslation.value()?.translation
  );
  readonly englishTranslation = linkedSignal(
    () => this.wordService.englishTranslation.value()?.translation
  );
  readonly forms = this.data.forms.map((form) => signal(form));
  readonly examples = this.data.examples.map((example) => signal(example));
  readonly exampleHungarianTranslations = this.data.examples.map((_, index) =>
    linkedSignal(
      () => this.wordService.hungarianTranslation.value()?.examples[index]
    )
  );
  readonly exampleSwissGermanTranslations = this.data.examples.map((_, index) =>
    linkedSignal(
      () => this.wordService.swissGermanTranslation.value()?.examples[index]
    )
  );
  readonly exampleEnglishTranslations = this.data.examples.map((_, index) =>
    linkedSignal(
      () => this.wordService.englishTranslation.value()?.examples[index]
    )
  );

  constructor() {
    this.wordService.selectWord(this.data);
  }
}

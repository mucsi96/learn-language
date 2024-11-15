import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule, MatLabel } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Word } from '../types';
import { WordService } from '../../word.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { first } from 'rxjs';

@Component({
  selector: 'app-word-dialog',
  standalone: true,
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
  readonly hungarianTranslation = signal('');
  readonly swissGermanTranslation = signal('');
  readonly forms = this.data.forms.map((form) => signal(form));
  readonly examples = this.data.examples.map((example) => signal(example));
  readonly exampleHungarianTranslations = this.data.examples.map(() => signal(''));
  readonly exampleSwissGermanTranslations = this.data.examples.map(() => signal(''));

  constructor() {
    this.wordService.selectWord(this.data);
    this.wordService.$populatedWord.pipe(first()).subscribe((word) => {
      this.type.set(word.wordType);
      this.hungarianTranslation.set(word.hungarian.translation);
      this.swissGermanTranslation.set(word.swissGerman.translation);
      this.exampleHungarianTranslations.forEach((signal, index) =>
        signal.set(word.hungarian.examples[index])
      );
      this.exampleSwissGermanTranslations.forEach((signal, index) =>
        signal.set(word.swissGerman.examples[index])
      );
    });
  }
}

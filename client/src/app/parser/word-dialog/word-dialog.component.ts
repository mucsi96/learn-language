import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule, MatLabel } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Word } from '../types';

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
  ],
  templateUrl: './word-dialog.component.html',
  styleUrl: './word-dialog.component.css',
})
export class WordDialogComponent {
  public data: Word = inject(MAT_DIALOG_DATA);
  readonly type = signal('');
  readonly word = signal(this.data.word);
  readonly translation = signal('');
  readonly forms = this.data.forms.map((form) => signal(form));
  readonly examples = this.data.examples.map((example) => signal(example));
  readonly exampleTranslations = this.data.examples.map(() => signal(''));
}

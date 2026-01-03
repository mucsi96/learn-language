import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { KnownWordsService } from './known-words.service';
import { ConfirmDialogComponent } from '../parser/edit-card/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-known-words',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatTooltipModule,
    MatDialogModule,
  ],
  templateUrl: './known-words.component.html',
  styleUrl: './known-words.component.css',
})
export class KnownWordsComponent {
  private readonly service = inject(KnownWordsService);
  private readonly dialog = inject(MatDialog);

  readonly knownWords = this.service.knownWords;
  readonly importText = signal('');
  readonly isImporting = signal(false);
  readonly lastImportCount = signal<number | null>(null);

  readonly wordCount = computed(() => this.knownWords.value()?.count ?? 0);
  readonly words = computed(() => this.knownWords.value()?.words ?? []);

  readonly skeletonRows = Array(20).fill({});

  async importWords(): Promise<void> {
    const text = this.importText();
    if (!text.trim()) return;

    this.isImporting.set(true);
    this.lastImportCount.set(null);

    try {
      const result = await this.service.importWords(text);
      this.lastImportCount.set(result.importedCount);
      this.importText.set('');
    } finally {
      this.isImporting.set(false);
    }
  }

  async deleteWord(word: string): Promise<void> {
    await this.service.deleteWord(word);
  }

  clearAll(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        message: `Delete all ${this.wordCount()} known words?`,
      },
    });

    dialogRef.afterClosed().subscribe(async (confirmed) => {
      if (confirmed) {
        await this.service.deleteAllWords();
        this.lastImportCount.set(null);
      }
    });
  }
}

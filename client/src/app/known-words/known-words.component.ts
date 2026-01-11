import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { KnownWordsService, KnownWordEntry } from './known-words.service';
import { ConfirmDialogComponent } from '../parser/edit-card/confirm-dialog/confirm-dialog.component';
import { generateCardId } from '../card-creation-strategies/card-id.util';

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
    MatTooltipModule,
    MatDialogModule,
    MatTableModule,
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
  readonly importError = signal<string | null>(null);

  readonly wordCount = computed(() => this.knownWords.value()?.count ?? 0);
  readonly words = computed(() => this.knownWords.value()?.words ?? []);

  readonly skeletonRows = Array(10).fill({});
  readonly displayedColumns = ['germanWord', 'hungarianTranslation', 'actions'];

  async importWords(): Promise<void> {
    const text = this.importText();
    if (!text.trim()) return;

    this.isImporting.set(true);
    this.lastImportCount.set(null);
    this.importError.set(null);

    try {
      const entries = this.parseCsv(text);

      if (entries.length === 0) {
        this.importError.set('No valid entries found. Please use format: German,Hungarian (one pair per line)');
        return;
      }

      const result = await this.service.importWords(entries);
      this.lastImportCount.set(result.importedCount);
      this.importText.set('');
    } catch {
      this.importError.set('Failed to import words. Please check the format.');
    } finally {
      this.isImporting.set(false);
    }
  }

  private parseCsv(text: string): KnownWordEntry[] {
    const lines = text.split(/[\n\r]+/).filter(line => line.trim());
    const entries: KnownWordEntry[] = [];

    for (const line of lines) {
      const parts = line.split(/[,;]/).map(p => p.trim());
      if (parts.length >= 2 && parts[0] && parts[1]) {
        const germanWord = parts[0];
        const hungarianTranslation = parts[1];
        const wordId = generateCardId(germanWord, hungarianTranslation);

        entries.push({
          wordId,
          germanWord,
          hungarianTranslation,
        });
      }
    }

    return entries;
  }

  async deleteWord(wordId: string): Promise<void> {
    await this.service.deleteWord(wordId);
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

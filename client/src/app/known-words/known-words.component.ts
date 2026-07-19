import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { form, FormField } from '@angular/forms/signals';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { KnownWordsService } from './known-words.service';
import { ConfirmDialogComponent } from '../parser/edit-card/confirm-dialog/confirm-dialog.component';
import { ExtractKnownCardsDialogComponent } from './extract-known-cards-dialog/extract-known-cards-dialog.component';

@Component({
  selector: 'app-known-words',
  standalone: true,
  imports: [
    CommonModule,
    FormField,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
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
  readonly formModel = signal({ importText: '' });
  readonly importForm = form(this.formModel);
  readonly isImporting = signal(false);
  readonly lastImportCount = signal<number | null>(null);

  readonly wordCount = computed(() => this.knownWords.value()?.count ?? 0);
  readonly words = computed(() => this.knownWords.value()?.words ?? []);

  readonly displayedColumns = ['word', 'hungarianTranslation', 'actions'];
  readonly skeletonRows = Array(10).fill({});

  async importWords(): Promise<void> {
    const text = this.formModel().importText;
    if (!text.trim()) return;

    this.isImporting.set(true);
    this.lastImportCount.set(null);

    try {
      const result = await this.service.importWords(text);
      this.lastImportCount.set(result.importedCount);
      this.formModel.set({ importText: '' });
    } finally {
      this.isImporting.set(false);
    }
  }

  async deleteWord(word: string): Promise<void> {
    await this.service.deleteWord(word);
  }

  async extractKnownCards(): Promise<void> {
    const dialogRef = this.dialog.open(ExtractKnownCardsDialogComponent);
    const sourceIds = await firstValueFrom(dialogRef.afterClosed());
    if (!sourceIds || sourceIds.length === 0) return;

    const words = await this.service.exportKnownCards(sourceIds);
    this.downloadWordsFile(words);
  }

  private downloadWordsFile(words: string[]): void {
    const blob = new Blob([words.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'known-cards.txt';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async clearAll(): Promise<void> {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        message: `Delete all ${this.wordCount()} known words?`,
      },
    });

    const confirmed = await firstValueFrom(dialogRef.afterClosed());
    if (confirmed) {
      await this.service.deleteAllWords();
      this.lastImportCount.set(null);
    }
  }
}

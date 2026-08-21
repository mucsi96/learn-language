import { Component, computed, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { parseWordImportFile } from '../word-import-file.parser';
import { WordImportWord } from '../word-import.types';

@Component({
  selector: 'app-word-drop-zone',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatProgressBarModule],
  templateUrl: './word-drop-zone.component.html',
  styleUrl: './word-drop-zone.component.css',
})
export class WordDropZoneComponent {
  readonly staging = input(false);
  readonly wordsSelected = output<WordImportWord[]>();

  readonly dragActive = signal(false);
  readonly error = signal<string | null>(null);
  readonly fileName = signal<string | null>(null);

  readonly busy = computed(() => this.staging());

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragActive.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragActive.set(false);
  }

  async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.dragActive.set(false);
    const file = event.dataTransfer?.files?.[0];

    if (file) {
      await this.handleFile(file);
    }
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      await this.handleFile(file);
    }

    input.value = '';
  }

  private async handleFile(file: File): Promise<void> {
    this.fileName.set(file.name);
    this.error.set(null);

    const result = parseWordImportFile(await file.text());

    if (result.status === 'invalid') {
      this.error.set(result.error);
      return;
    }

    this.wordsSelected.emit(result.words);
  }
}

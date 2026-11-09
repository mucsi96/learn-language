import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { GrammarTopicsService } from '../grammar-topics/grammar-topics.service';

export interface GrammarTopicPickerDialogResult {
  topic: string;
}

@Component({
  selector: 'app-grammar-topic-picker-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    RouterLink,
  ],
  templateUrl: './grammar-topic-picker-dialog.component.html',
  styleUrl: './grammar-topic-picker-dialog.component.css',
})
export class GrammarTopicPickerDialogComponent {
  private readonly dialogRef = inject(
    MatDialogRef<
      GrammarTopicPickerDialogComponent,
      GrammarTopicPickerDialogResult
    >
  );
  private readonly grammarTopicsService = inject(GrammarTopicsService);

  readonly topics = this.grammarTopicsService.topics;
  readonly selectedTopic = signal<string | null>(null);

  readonly topicsList = computed(() => this.topics.value() ?? []);
  readonly hasTopics = computed(() => this.topicsList().length > 0);
  readonly canConfirm = computed(() => !!this.selectedTopic());

  confirm(): void {
    const topic = this.selectedTopic();
    if (!topic) return;
    this.dialogRef.close({ topic });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}

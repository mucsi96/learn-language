import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { form, FormField } from '@angular/forms/signals';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import {
  GrammarTopicsService,
  GrammarTopic,
} from './grammar-topics.service';
import { ConfirmDialogComponent } from '../parser/edit-card/confirm-dialog/confirm-dialog.component';
import { EditGrammarTopicDialogComponent } from './edit-grammar-topic-dialog/edit-grammar-topic-dialog.component';

@Component({
  selector: 'app-grammar-topics',
  standalone: true,
  imports: [
    CommonModule,
    FormField,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatListModule,
    MatTooltipModule,
    MatDialogModule,
  ],
  templateUrl: './grammar-topics.component.html',
  styleUrl: './grammar-topics.component.css',
})
export class GrammarTopicsComponent {
  private readonly service = inject(GrammarTopicsService);
  private readonly dialog = inject(MatDialog);

  readonly topics = this.service.topics;
  readonly formModel = signal({ name: '' });
  readonly topicForm = form(this.formModel);
  readonly isAdding = signal(false);
  readonly editingTopicId = signal<number | null>(null);

  readonly topicsList = computed(() => this.topics.value() ?? []);

  readonly skeletonRows = [{}, {}, {}];

  async addTopic(): Promise<void> {
    const name = this.formModel().name.trim();
    if (!name) return;

    this.isAdding.set(true);
    try {
      await this.service.createTopic({ name });
      this.formModel.set({ name: '' });
    } finally {
      this.isAdding.set(false);
    }
  }

  async editTopic(topic: GrammarTopic): Promise<void> {
    if (this.editingTopicId() !== null) return;

    const dialogRef = this.dialog.open(EditGrammarTopicDialogComponent, {
      data: { topic },
    });

    const result = await firstValueFrom(dialogRef.afterClosed());
    if (!result?.name) return;

    this.editingTopicId.set(topic.id);
    try {
      await this.service.updateTopic(topic.id, { name: result.name });
    } finally {
      this.editingTopicId.set(null);
    }
  }

  async deleteTopic(topic: GrammarTopic): Promise<void> {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        message: `Delete grammar topic "${topic.name}"?`,
      },
    });

    const confirmed = await firstValueFrom(dialogRef.afterClosed());
    if (confirmed) {
      await this.service.deleteTopic(topic.id);
    }
  }
}

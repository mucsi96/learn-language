import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { form, FormField } from '@angular/forms/signals';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { GrammarTopic } from '../grammar-topics.service';

interface DialogData {
  topic: GrammarTopic;
}

@Component({
  selector: 'app-edit-grammar-topic-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormField,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './edit-grammar-topic-dialog.component.html',
  styleUrl: './edit-grammar-topic-dialog.component.css',
})
export class EditGrammarTopicDialogComponent {
  private readonly dialogRef = inject(
    MatDialogRef<EditGrammarTopicDialogComponent>
  );
  private readonly data = inject<DialogData>(MAT_DIALOG_DATA);

  readonly formModel = signal({ name: this.data.topic.name });
  readonly topicForm = form(this.formModel);

  readonly isValid = computed(() => {
    const name = this.formModel().name.trim();
    return name.length > 0 && name !== this.data.topic.name;
  });

  save(): void {
    if (!this.isValid()) return;
    this.dialogRef.close({ name: this.formModel().name.trim() });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}

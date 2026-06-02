import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-image-context-dialog',
  templateUrl: './image-context-dialog.component.html',
  imports: [
    FormsModule,
    MatButtonModule,
    MatDialogContent,
    MatDialogActions,
    MatDialogTitle,
    MatFormFieldModule,
    MatInputModule,
  ],
})
export class ImageContextDialogComponent {
  private readonly dialogRef =
    inject<MatDialogRef<ImageContextDialogComponent, string>>(MatDialogRef);

  readonly context = signal('');
  readonly canGenerate = computed(() => this.context().trim().length > 0);

  onCancel(): void {
    this.dialogRef.close();
  }

  onGenerate(): void {
    const value = this.context().trim();
    if (value === '') return;
    this.dialogRef.close(value);
  }
}

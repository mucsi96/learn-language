import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormFieldModule, MatLabel } from '@angular/material/form-field';
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
    MatLabel,
    MatInputModule,
  ],
})
export class ImageContextDialogComponent {
  readonly context = signal('');

  constructor(private readonly dialogRef: MatDialogRef<ImageContextDialogComponent, string | undefined>) {}

  onCancel(): void {
    this.dialogRef.close(undefined);
  }

  onGenerate(): void {
    const value = this.context().trim();
    this.dialogRef.close(value === '' ? undefined : value);
  }
}

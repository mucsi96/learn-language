import { Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';

@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  imports: [
    MatDialogContent,
    MatDialogActions,
    MatDialogTitle,
    MatButton,
    MatDialogClose,
  ],
})
export class ConfirmDialogComponent {
  data: { message: string } = inject(MAT_DIALOG_DATA);
  dialogRef: MatDialogRef<ConfirmDialogComponent> = inject(MatDialogRef);

  onNoClick(): void {
    this.dialogRef.close();
  }
}

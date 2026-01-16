import { Component, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { BulkCardCreationService } from '../bulk-card-creation.service';
import { CardCreationProgress } from '../shared/types/card-creation.types';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-bulk-creation-progress-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatProgressBarModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    RouterLink,
  ],
  templateUrl: './bulk-creation-progress-dialog.component.html',
  styleUrl: './bulk-creation-progress-dialog.component.css',
})
export class BulkCreationProgressDialogComponent {
  readonly bulkCardService = inject(BulkCardCreationService);
  private readonly dialogRef = inject(MatDialogRef<BulkCreationProgressDialogComponent>);
  readonly data = inject<{ itemLabels: string[] }>(MAT_DIALOG_DATA);

  closeDialog(): void {
    this.dialogRef.close();
  }

  getStatusIcon(status: CardCreationProgress['status']): string {
    switch (status) {
      case 'pending':
        return 'schedule';
      case 'translating':
      case 'generating-images':
      case 'creating-card':
        return 'sync';
      case 'completed':
        return 'check_circle';
      case 'error':
        return 'error';
    }
  }

  getStatusIconClass(status: CardCreationProgress['status']): string {
    switch (status) {
      case 'pending':
        return 'status-icon pending';
      case 'translating':
      case 'generating-images':
      case 'creating-card':
        return 'status-icon in-progress';
      case 'completed':
        return 'status-icon completed';
      case 'error':
        return 'status-icon error';
    }
  }

  getProgressBarClass(
    status: CardCreationProgress['status']
  ): string | undefined {
    switch (status) {
      case 'completed':
        return 'success';
      case 'error':
        return 'error';
      default:
        return undefined;
    }
  }
}

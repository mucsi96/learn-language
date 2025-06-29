import { Component, inject, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import {
  BulkCardCreationService,
  CardCreationProgress,
} from '../bulk-card-creation.service';
import { CommonModule } from '@angular/common';

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
  ],
  templateUrl: './bulk-creation-progress-dialog.component.html',
  styleUrl: './bulk-creation-progress-dialog.component.css',
})
export class BulkCreationProgressDialogComponent {
  readonly bulkCardService = inject(BulkCardCreationService);

  constructor(@Inject(MAT_DIALOG_DATA) public data: { words: string[] }) {}

  getStatusIcon(status: CardCreationProgress['status']): string {
    switch (status) {
      case 'pending':
        return 'schedule';
      case 'word-type':
      case 'translating':
      case 'generating-images':
      case 'creating-card':
        return 'sync';
      case 'completed':
        return 'check_circle';
      case 'error':
        return 'error';
      default:
        return 'help';
    }
  }

  getStatusIconClass(status: CardCreationProgress['status']): string {
    switch (status) {
      case 'pending':
        return 'status-icon pending';
      case 'word-type':
      case 'translating':
      case 'generating-images':
      case 'creating-card':
        return 'status-icon in-progress';
      case 'completed':
        return 'status-icon completed';
      case 'error':
        return 'status-icon error';
      default:
        return 'status-icon';
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

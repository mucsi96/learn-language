import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import {
  BatchAudioCreationService,
  AudioCreationProgress,
} from '../batch-audio-creation.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-batch-audio-creation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatProgressBarModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
  ],
  templateUrl: './batch-audio-creation-dialog.component.html',
  styleUrl: './batch-audio-creation-dialog.component.css',
})
export class BatchAudioCreationDialogComponent {
  readonly batchAudioService = inject(BatchAudioCreationService);
  readonly data = inject<{ cards: Array<{ id: string; data: any }> }>(MAT_DIALOG_DATA);

  getStatusIcon(status: AudioCreationProgress['status']): string {
    switch (status) {
      case 'pending':
        return 'schedule';
      case 'generating-audio':
      case 'updating-card':
        return 'sync';
      case 'completed':
        return 'check_circle';
      case 'error':
        return 'error';
      default:
        return 'help';
    }
  }

  getStatusIconClass(status: AudioCreationProgress['status']): string {
    switch (status) {
      case 'pending':
        return 'status-icon pending';
      case 'generating-audio':
      case 'updating-card':
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
    status: AudioCreationProgress['status']
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

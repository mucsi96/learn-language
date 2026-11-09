import { Component, inject } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { BatchAudioCreationService } from '../batch-audio-creation.service';
import { PipelineProgressComponent } from '../shared/pipeline-progress/pipeline-progress.component';

@Component({
  selector: 'app-batch-audio-creation-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    PipelineProgressComponent,
  ],
  templateUrl: './batch-audio-creation-dialog.component.html',
  styleUrl: './batch-audio-creation-dialog.component.css',
})
export class BatchAudioCreationDialogComponent {
  readonly batchAudioService = inject(BatchAudioCreationService);
}

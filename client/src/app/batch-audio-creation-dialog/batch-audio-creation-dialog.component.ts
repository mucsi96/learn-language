import { Component, inject } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { BatchAudioCreationService } from '../batch-audio-creation.service';
import { DotReporterComponent } from '../shared/dot-reporter/dot-reporter.component';

@Component({
  selector: 'app-batch-audio-creation-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    DotReporterComponent,
  ],
  templateUrl: './batch-audio-creation-dialog.component.html',
  styleUrl: './batch-audio-creation-dialog.component.css',
})
export class BatchAudioCreationDialogComponent {
  readonly batchAudioService = inject(BatchAudioCreationService);
}

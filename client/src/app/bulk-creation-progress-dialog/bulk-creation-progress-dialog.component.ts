import { Component, inject } from '@angular/core';
import {
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { BulkCardCreationService } from '../bulk-card-creation.service';
import { PipelineProgressComponent } from '../shared/pipeline-progress/pipeline-progress.component';

@Component({
  selector: 'app-bulk-creation-progress-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    RouterLink,
    PipelineProgressComponent,
  ],
  templateUrl: './bulk-creation-progress-dialog.component.html',
  styleUrl: './bulk-creation-progress-dialog.component.css',
})
export class BulkCreationProgressDialogComponent {
  readonly bulkCardService = inject(BulkCardCreationService);
  private readonly dialogRef = inject(MatDialogRef<BulkCreationProgressDialogComponent>);

  closeDialog(): void {
    this.dialogRef.close();
  }
}

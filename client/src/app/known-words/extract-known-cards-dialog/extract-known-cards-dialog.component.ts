import { Component, computed, inject, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { SourcesService } from '../../sources.service';

@Component({
  selector: 'app-extract-known-cards-dialog',
  standalone: true,
  imports: [
    FormField,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
  ],
  templateUrl: './extract-known-cards-dialog.component.html',
  styleUrl: './extract-known-cards-dialog.component.css',
})
export class ExtractKnownCardsDialogComponent {
  private readonly sourcesService = inject(SourcesService);
  readonly dialogRef = inject(MatDialogRef<ExtractKnownCardsDialogComponent>);

  readonly sources = computed(() => this.sourcesService.sources.value() ?? []);
  readonly formModel = signal<{ sourceIds: string[] }>({ sourceIds: [] });
  readonly sourceForm = form(this.formModel);

  readonly canExport = computed(() => this.formModel().sourceIds.length > 0);

  onCancel(): void {
    this.dialogRef.close();
  }

  onExport(): void {
    this.dialogRef.close(this.formModel().sourceIds);
  }
}

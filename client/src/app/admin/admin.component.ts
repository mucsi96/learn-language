import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { SourcesService } from '../sources.service';
import { SourceDialogComponent } from '../shared/source-dialog/source-dialog.component';
import { ConfirmDialogComponent } from '../parser/edit-card/confirm-dialog/confirm-dialog.component';
import { Source } from '../parser/types';

@Component({
  selector: 'app-admin',
  imports: [
    RouterLink,
    MatProgressSpinnerModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent {
  private readonly sourcesService = inject(SourcesService);
  private readonly dialog = inject(MatDialog);

  readonly sources = this.sourcesService.sources.value;
  readonly loading = this.sourcesService.sources.isLoading;

  openAddSourceDialog(): void {
    const dialogRef = this.dialog.open(SourceDialogComponent, {
      width: '500px',
      data: { mode: 'create' },
    });

    dialogRef.afterClosed().subscribe(async (result: Partial<Source> | undefined) => {
      if (result) {
        try {
          await this.sourcesService.createSource(result);
        } catch (error) {
          console.error('Error creating source:', error);
        }
      }
    });
  }

  openEditSourceDialog(source: Source, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    const dialogRef = this.dialog.open(SourceDialogComponent, {
      width: '500px',
      data: { source, mode: 'edit' },
    });

    dialogRef.afterClosed().subscribe(async (result: Partial<Source> | undefined) => {
      if (result) {
        try {
          await this.sourcesService.updateSource(source.id, result);
        } catch (error) {
          console.error('Error updating source:', error);
        }
      }
    });
  }

  openDeleteConfirmDialog(source: Source, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        message: `Are you sure you want to delete "${source.name}"? All associated cards will also be deleted. This action cannot be undone.`,
      },
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (confirmed) {
        try {
          await this.sourcesService.deleteSource(source.id);
        } catch (error) {
          console.error('Error deleting source:', error);
        }
      }
    });
  }
}

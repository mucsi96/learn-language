import { Component, inject, signal, computed } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { SourcesService } from '../sources.service';
import { SourceDialogComponent } from '../shared/source-dialog/source-dialog.component';
import { ConfirmDialogComponent } from '../parser/edit-card/confirm-dialog/confirm-dialog.component';
import { Source } from '../parser/types';

@Component({
  selector: 'app-admin',
  imports: [
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
  private readonly router = inject(Router);

  readonly sources = this.sourcesService.sources.value;
  readonly loading = this.sourcesService.sources.isLoading;
  readonly selectedSourceId = signal<string | null>(null);
  readonly selectedSource = computed(() => {
    const id = this.selectedSourceId();
    return this.sources()?.find((s) => s.id === id) ?? null;
  });

  selectSource(source: Source): void {
    this.selectedSourceId.set(
      this.selectedSourceId() === source.id ? null : source.id
    );
  }

  readonly isEbookDictionary = computed(() =>
    this.selectedSource()?.sourceType === 'ebookDictionary'
  );

  navigateToPages(): void {
    const source = this.selectedSource();
    if (!source) return;

    this.router.navigate(['/sources', source.id, 'page', source.startPage]);
  }

  navigateToCards(): void {
    const source = this.selectedSource();
    if (source) {
      this.router.navigate(['/sources', source.id, 'cards']);
    }
  }

  async openAddSourceDialog(): Promise<void> {
    const dialogRef = this.dialog.open(SourceDialogComponent, {
      width: '500px',
      data: { mode: 'create' },
    });

    const result: Partial<Source> | undefined = await firstValueFrom(dialogRef.afterClosed());
    if (result) {
      try {
        await this.sourcesService.createSource(result);
      } catch (error) {
        console.error('Error creating source:', error);
      }
    }
  }

  async openEditSourceDialog(): Promise<void> {
    const source = this.selectedSource();
    if (!source) {
      return;
    }

    const dialogRef = this.dialog.open(SourceDialogComponent, {
      width: '500px',
      data: { source, mode: 'edit' },
    });

    const result: Partial<Source> | undefined = await firstValueFrom(dialogRef.afterClosed());
    if (result) {
      try {
        await this.sourcesService.updateSource(source.id, result);
      } catch (error) {
        console.error('Error updating source:', error);
      }
    }
  }

  async openDeleteConfirmDialog(): Promise<void> {
    const source = this.selectedSource();
    if (!source) {
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        message: `Are you sure you want to delete "${source.name}"? All associated cards will also be deleted. This action cannot be undone.`,
      },
    });

    const confirmed: boolean = await firstValueFrom(dialogRef.afterClosed());
    if (confirmed) {
      try {
        await this.sourcesService.deleteSource(source.id);
        this.selectedSourceId.set(null);
      } catch (error) {
        console.error('Error deleting source:', error);
      }
    }
  }
}

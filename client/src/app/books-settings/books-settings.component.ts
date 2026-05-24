import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { BarLoaderComponent } from '@mucsi96/angular-material-theme';
import { firstValueFrom } from 'rxjs';
import { SourcesService } from '../sources.service';
import { SourceDialogComponent } from '../shared/source-dialog/source-dialog.component';
import { ConfirmDialogComponent } from '../parser/edit-card/confirm-dialog/confirm-dialog.component';
import { Source } from '../parser/types';

type BookCategory = 'read' | 'inProgress' | 'wanted';

const CATEGORY_LABELS: Record<BookCategory, string> = {
  read: 'Already read',
  inProgress: 'Reading in progress',
  wanted: 'To be read',
};

@Component({
  selector: 'app-books-settings',
  standalone: true,
  imports: [
    BarLoaderComponent,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './books-settings.component.html',
  styleUrl: './books-settings.component.css',
})
export class BooksSettingsComponent {
  private readonly sourcesService = inject(SourcesService);
  private readonly dialog = inject(MatDialog);

  readonly sources = this.sourcesService.sources.value;
  readonly loading = this.sourcesService.sources.isLoading;

  readonly categorizedBooks = computed(() => {
    const all = this.sources() ?? [];
    return {
      read: all.filter((s) => this.categorize(s) === 'read'),
      inProgress: all.filter((s) => this.categorize(s) === 'inProgress'),
      wanted: all.filter((s) => this.categorize(s) === 'wanted'),
    };
  });

  readonly categories: { key: BookCategory; label: string; icon: string }[] = [
    { key: 'inProgress', label: CATEGORY_LABELS.inProgress, icon: 'auto_stories' },
    { key: 'read', label: CATEGORY_LABELS.read, icon: 'task_alt' },
    { key: 'wanted', label: CATEGORY_LABELS.wanted, icon: 'bookmark_border' },
  ];

  getCategoryLabel(category: BookCategory): string {
    return CATEGORY_LABELS[category];
  }

  getBooks(category: BookCategory): Source[] {
    return this.categorizedBooks()[category];
  }

  private categorize(source: Source): BookCategory {
    if (source.pageCount === null || source.pageCount === undefined) {
      return 'wanted';
    }
    const bookmarked = source.bookmarkedPage;
    if (bookmarked !== null && bookmarked !== undefined && bookmarked >= source.pageCount) {
      return 'read';
    }
    return 'inProgress';
  }

  async openAddBookDialog(): Promise<void> {
    const dialogRef = this.dialog.open(SourceDialogComponent, {
      width: '700px',
      data: { mode: 'create' },
    });

    const result: Partial<Source> | undefined = await firstValueFrom(dialogRef.afterClosed());
    if (result) {
      await this.sourcesService.createSource(result);
    }
  }

  async openEditBookDialog(source: Source): Promise<void> {
    const dialogRef = this.dialog.open(SourceDialogComponent, {
      width: '700px',
      data: { source, mode: 'edit' },
    });

    const result: Partial<Source> | undefined = await firstValueFrom(dialogRef.afterClosed());
    if (result) {
      await this.sourcesService.updateSource(source.id, result);
    }
  }

  async openDeleteBookDialog(source: Source): Promise<void> {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        message: `Are you sure you want to delete "${source.name}"? All associated cards will also be deleted. This action cannot be undone.`,
      },
    });

    const confirmed: boolean = await firstValueFrom(dialogRef.afterClosed());
    if (confirmed) {
      await this.sourcesService.deleteSource(source.id);
    }
  }

  getProgressLabel(source: Source): string | null {
    if (source.pageCount === null || source.pageCount === undefined) {
      return null;
    }
    const current = source.bookmarkedPage ?? source.startPage ?? 0;
    return `${current} / ${source.pageCount}`;
  }
}

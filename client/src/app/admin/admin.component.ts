import { Component, inject, signal, computed } from '@angular/core';
import { NgClass, NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { BarLoaderComponent } from '@mucsi96/angular-material-theme';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { SourcesService } from '../sources.service';
import { SourceGroupsService, SourceGroup } from '../source-groups/source-groups.service';
import { SourceDialogComponent } from '../shared/source-dialog/source-dialog.component';
import { ConfirmDialogComponent } from '../parser/edit-card/confirm-dialog/confirm-dialog.component';
import { Source } from '../parser/types';
import { StateComponent } from '../shared/state/state.component';
import { CardState } from '../shared/state/card-state';

const READINESS_LABELS: Record<string, string> = {
  'IN_REVIEW': 'In Review',
  'REVIEWED': 'Reviewed',
  'READY': 'Ready',
  'KNOWN': 'Known',
};

const STATE_ORDER: readonly CardState[] = ['NEW', 'LEARNING', 'REVIEW', 'RELEARNING'];
const READINESS_ORDER = ['READY', 'KNOWN', 'IN_REVIEW', 'REVIEWED'] as const;

type AttentionItem = {
  filter: 'flagged' | 'draft' | 'suggestedKnown' | 'unhealthy';
  icon: string;
  label: string;
  count: number;
  cssClass: string;
};

type SourceGroupSection = {
  group: SourceGroup;
  sources: Source[];
};

@Component({
  selector: 'app-admin',
  imports: [
    NgClass,
    NgTemplateOutlet,
    RouterLink,
    BarLoaderComponent,
    MatTableModule,
    MatMenuModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatIconModule,
    StateComponent,
  ],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent {
  private readonly sourcesService = inject(SourcesService);
  private readonly groupsService = inject(SourceGroupsService);
  private readonly dialog = inject(MatDialog);
  readonly router = inject(Router);

  readonly sources = this.sourcesService.sources.value;
  readonly loading = this.sourcesService.sources.isLoading;
  readonly groups = this.groupsService.groups.value;

  readonly displayedColumns = ['name', 'level', 'cards', 'states', 'readiness', 'attention', 'actions'];

  readonly needsAttentionOnly = signal(false);

  readonly visibleSources = computed(() => {
    const all = this.sources() ?? [];
    return this.needsAttentionOnly()
      ? all.filter((source) => this.getAttentionItems(source).length > 0)
      : all;
  });

  readonly groupedSections = computed<SourceGroupSection[]>(() => {
    const sources = this.visibleSources();
    return (this.groups() ?? [])
      .map((group) => ({
        group,
        sources: sources.filter((source) => source.groupId === group.id),
      }))
      .filter((section) => section.sources.length > 0);
  });

  readonly ungroupedSources = computed(() =>
    this.visibleSources().filter((source) => !source.groupId)
  );

  getAttentionItems(source: Source): AttentionItem[] {
    const items: AttentionItem[] = [
      { filter: 'flagged', icon: 'flag', label: 'flagged', count: source.flaggedCardCount ?? 0, cssClass: 'flagged' },
      { filter: 'draft', icon: 'edit_note', label: 'draft', count: source.draftCardCount ?? 0, cssClass: 'draft' },
      { filter: 'suggestedKnown', icon: 'check_circle', label: 'suggested known', count: source.suggestedKnownCardCount ?? 0, cssClass: 'suggested-known' },
      { filter: 'unhealthy', icon: 'warning', label: 'unhealthy', count: source.unhealthyCardCount ?? 0, cssClass: 'unhealthy' },
    ];
    return items.filter((item) => item.count > 0);
  }

  hasStateCounts(source: Source): boolean {
    const counts = source.stateCounts ?? {};
    return STATE_ORDER.some((s) => counts[s] !== undefined);
  }

  getStateCounts(source: Source): { state: CardState; count: number }[] {
    const counts = source.stateCounts ?? {};
    return STATE_ORDER
      .filter((state) => counts[state] !== undefined)
      .map((state) => ({ state, count: counts[state] }));
  }

  hasReadinessCounts(source: Source): boolean {
    const counts = source.readinessCounts ?? {};
    return READINESS_ORDER.some((r) => counts[r] !== undefined);
  }

  getReadinessCounts(source: Source): { readiness: string; count: number }[] {
    const counts = source.readinessCounts ?? {};
    return READINESS_ORDER
      .filter((readiness) => counts[readiness] !== undefined)
      .map((readiness) => ({ readiness, count: counts[readiness] }));
  }

  getReadinessLabel(readiness: string): string {
    return READINESS_LABELS[readiness] ?? readiness;
  }

  navigateToPages(source: Source): void {
    if (source.sourceType === 'json') {
      this.router.navigate(['/sources', source.id, 'json']);
      return;
    }
    this.router.navigate(['/sources', source.id, 'page', source.startPage]);
  }

  navigateToCards(source: Source): void {
    this.router.navigate(['/sources', source.id, 'cards']);
  }

  async openAddSourceDialog(): Promise<void> {
    const dialogRef = this.dialog.open(SourceDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
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

  async openEditSourceDialog(source: Source): Promise<void> {
    const dialogRef = this.dialog.open(SourceDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
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

  async openDeleteConfirmDialog(source: Source): Promise<void> {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        message: `Are you sure you want to delete "${source.name}"? All associated cards will also be deleted. This action cannot be undone.`,
      },
    });

    const confirmed: boolean = await firstValueFrom(dialogRef.afterClosed());
    if (confirmed) {
      try {
        await this.sourcesService.deleteSource(source.id);
      } catch (error) {
        console.error('Error deleting source:', error);
      }
    }
  }
}

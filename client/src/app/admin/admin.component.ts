import { Component, inject, signal, computed, resource } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { SourcesService } from '../sources.service';
import { SourceDialogComponent } from '../shared/source-dialog/source-dialog.component';
import { ConfirmDialogComponent } from '../parser/edit-card/confirm-dialog/confirm-dialog.component';
import { Source, Card } from '../parser/types';
import { fetchJson } from '../utils/fetchJson';
import { mapCardDatesFromISOStrings } from '../utils/date-mapping.util';
import { CardTypeRegistry } from '../cardTypes/card-type.registry';
import { AgGridAngular } from 'ag-grid-angular';
import {
  type ColDef,
  type GridReadyEvent,
  type GridApi,
  type GetRowIdParams,
  ModuleRegistry,
  ClientSideRowModelModule,
  ValidationModule,
  ColumnAutoSizeModule,
  RowSelectionModule,
  themeMaterial,
  colorSchemeDarkBlue,
} from 'ag-grid-community';

ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  ValidationModule,
  ColumnAutoSizeModule,
  RowSelectionModule,
]);

type UnhealthyCardResponse = {
  id: string;
  source: { id: string; name: string; cardType: string };
  sourcePageNumber: number;
  data: Card['data'];
  missingFields: string;
};

type UnhealthyCardRow = {
  id: string;
  word: string;
  source: string;
  cardType: string;
  missingFields: string;
};

@Component({
  selector: 'app-admin',
  imports: [
    MatProgressSpinnerModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    AgGridAngular,
  ],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent {
  private readonly sourcesService = inject(SourcesService);
  private readonly dialog = inject(MatDialog);
  readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly cardTypeRegistry = inject(CardTypeRegistry);
  private readonly snackBar = inject(MatSnackBar);

  readonly sources = this.sourcesService.sources.value;
  readonly loading = this.sourcesService.sources.isLoading;

  readonly flaggedCards = resource<Card[], unknown>({
    loader: async () => {
      const cards = await fetchJson<Card[]>(this.http, '/api/cards/flagged');
      return cards.map(card => mapCardDatesFromISOStrings(card));
    },
  });

  readonly totalFlaggedCount = computed(() => this.flaggedCards.value()?.length ?? 0);

  readonly unhealthyCards = resource<UnhealthyCardResponse[], unknown>({
    loader: () => fetchJson<UnhealthyCardResponse[]>(this.http, '/api/cards/unhealthy'),
  });

  readonly unhealthyCardRows = computed<UnhealthyCardRow[]>(() => {
    const cards = this.unhealthyCards.value();
    if (!cards) return [];
    return cards.map(card => ({
      id: card.id,
      word: card.data?.word ?? card.id,
      source: card.source.name,
      cardType: card.source.cardType,
      missingFields: card.missingFields,
    }));
  });

  readonly totalUnhealthyCount = computed(() => this.unhealthyCards.value()?.length ?? 0);

  private readonly unhealthyGridApi = signal<GridApi | null>(null);
  readonly selectedUnhealthyIds = signal<readonly string[]>([]);

  readonly unhealthyTheme = themeMaterial.withPart(colorSchemeDarkBlue).withParams({
    backgroundColor: 'hsl(215, 28%, 17%)',
    foregroundColor: 'hsl(220, 13%, 91%)',
    headerBackgroundColor: 'hsl(217, 19%, 27%)',
    headerTextColor: 'hsl(220, 13%, 91%)',
    headerFontWeight: 500,
    rowHoverColor: 'hsl(217, 19%, 22%)',
    accentColor: 'hsl(220, 89%, 53%)',
    selectedRowBackgroundColor: 'hsl(220, 89%, 53%, 0.15)',
    fontFamily: 'system-ui',
  });

  readonly unhealthyColumnDefs: ColDef[] = [
    {
      headerName: 'Word',
      field: 'word',
      flex: 2,
    },
    {
      headerName: 'Source',
      field: 'source',
      flex: 1,
    },
    {
      headerName: 'Type',
      field: 'cardType',
      width: 120,
    },
    {
      headerName: 'Missing',
      field: 'missingFields',
      flex: 2,
    },
  ];

  readonly unhealthyDefaultColDef: ColDef = {
    resizable: true,
    sortable: true,
  };

  readonly getUnhealthyRowId = (params: GetRowIdParams) => params.data.id;

  onUnhealthyGridReady(event: GridReadyEvent): void {
    this.unhealthyGridApi.set(event.api);
    event.api.sizeColumnsToFit();
  }

  onUnhealthySelectionChanged(): void {
    const api = this.unhealthyGridApi();
    if (!api) return;
    const selectedRows = api.getSelectedRows() as UnhealthyCardRow[];
    this.selectedUnhealthyIds.set(selectedRows.map(row => row.id));
  }

  async markSelectedAsDraft(): Promise<void> {
    const ids = this.selectedUnhealthyIds();
    if (ids.length === 0) return;

    await fetchJson(this.http, '/api/cards/mark-draft', {
      method: 'put',
      body: [...ids],
    });

    this.snackBar.open(`${ids.length} card(s) moved to draft`, 'Close', {
      duration: 3000,
      verticalPosition: 'top',
    });

    this.selectedUnhealthyIds.set([]);
    this.unhealthyCards.reload();
    this.sourcesService.refetchSources();
  }

  getCardLabel(card: Card): string {
    const cardType = card.source.cardType;
    if (!cardType) return card.data?.word ?? card.id;
    const strategy = this.cardTypeRegistry.getStrategy(cardType);
    return strategy.getCardDisplayLabel(card);
  }

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

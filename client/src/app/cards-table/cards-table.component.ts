import { Component, inject, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AgGridAngular } from 'ag-grid-angular';
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
} from 'ag-grid-community';
import type {
  ColDef,
  RowClickedEvent,
  SelectionChangedEvent,
  GridReadyEvent,
  GridApi,
} from 'ag-grid-community';
import {
  CardsTableService,
  CardTableRow,
  ReviewCountRange,
  GradeFilter,
} from './cards-table.service';

ModuleRegistry.registerModules([AllCommunityModule]);

const GRADE_LABELS: Record<number, string> = {
  1: 'Again',
  2: 'Hard',
  3: 'Good',
  4: 'Easy',
};

@Component({
  selector: 'app-cards-table',
  standalone: true,
  imports: [
    AgGridAngular,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatCardModule,
  ],
  templateUrl: './cards-table.component.html',
  styleUrl: './cards-table.component.css',
})
export class CardsTableComponent {
  private readonly service = inject(CardsTableService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  private gridApi: GridApi | undefined;

  readonly loading = computed(() => this.service.cards.isLoading());
  readonly rows = this.service.filteredRows;
  readonly selectedRows = signal<CardTableRow[]>([]);

  readonly reviewCountFilter = this.service.reviewCountFilter;
  readonly lastReviewDateFilter = this.service.lastReviewDateFilter;
  readonly lastReviewGradeFilter = this.service.lastReviewGradeFilter;
  readonly availableDates = this.service.availableDates;

  readonly hasRows = computed(() => (this.service.cards.value() ?? []).length > 0);
  readonly selectionCount = computed(() => this.selectedRows().length);

  readonly theme = themeQuartz.withParams({
    backgroundColor: 'var(--mat-sys-surface)',
    foregroundColor: 'var(--mat-sys-on-surface)',
    headerBackgroundColor: 'var(--mat-sys-surface-container)',
    headerTextColor: 'var(--mat-sys-on-surface)',
    rowHoverColor: 'var(--mat-sys-surface-container-highest)',
    borderColor: 'var(--mat-sys-outline-variant)',
    selectedRowBackgroundColor: 'var(--mat-sys-secondary-container)',
    headerFontWeight: 500,
  });

  readonly columnDefs: ColDef<CardTableRow>[] = [
    {
      headerCheckboxSelection: true,
      checkboxSelection: true,
      maxWidth: 50,
      sortable: false,
      filter: false,
      resizable: false,
    },
    {
      headerName: 'Source Name',
      field: 'sourceName',
      flex: 1,
      minWidth: 120,
    },
    {
      headerName: 'Source Type',
      field: 'sourceType',
      maxWidth: 120,
      valueFormatter: (params) => params.value ?? '-',
    },
    {
      headerName: 'Card Label',
      field: 'label',
      flex: 2,
      minWidth: 150,
    },
    {
      headerName: 'Reviews',
      field: 'reviewCount',
      maxWidth: 100,
      sort: 'desc',
    },
    {
      headerName: 'Last Review',
      field: 'lastReviewDate',
      flex: 1,
      minWidth: 140,
      valueFormatter: (params) => {
        if (!params.value) return '-';
        return new Date(params.value).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      },
    },
    {
      headerName: 'Grade',
      field: 'lastReviewGrade',
      maxWidth: 100,
      valueFormatter: (params) =>
        params.value !== null && params.value !== undefined
          ? GRADE_LABELS[params.value] ?? String(params.value)
          : '-',
    },
    {
      headerName: 'Reviewer',
      field: 'lastReviewPerson',
      maxWidth: 120,
      valueFormatter: (params) => params.value ?? '-',
    },
  ];

  readonly defaultColDef: ColDef = {
    sortable: true,
    resizable: true,
  };

  onGridReady(event: GridReadyEvent): void {
    this.gridApi = event.api;
  }

  onSelectionChanged(event: SelectionChangedEvent<CardTableRow>): void {
    const selected = event.api.getSelectedRows();
    this.selectedRows.set(selected);
  }

  onRowClicked(event: RowClickedEvent<CardTableRow>): void {
    const target = event.event?.target as HTMLElement | undefined;
    if (target?.closest('.ag-checkbox-input-wrapper')) {
      return;
    }

    const row = event.data;
    if (row) {
      this.router.navigate([
        '/sources',
        row.sourceId,
        'page',
        row.sourcePageNumber,
        'cards',
        row.id,
      ]);
    }
  }

  onReviewCountFilterChange(value: ReviewCountRange): void {
    this.service.reviewCountFilter.set(value);
  }

  onLastReviewDateFilterChange(value: string): void {
    this.service.lastReviewDateFilter.set(value);
  }

  onLastReviewGradeFilterChange(value: GradeFilter): void {
    this.service.lastReviewGradeFilter.set(value);
  }

  async markSelectedAsKnown(): Promise<void> {
    const selected = this.selectedRows();
    if (selected.length === 0) return;

    const cardIds = selected.map((row) => row.id);
    await this.service.markAsKnown(cardIds);

    this.gridApi?.deselectAll();
    this.snackBar.open(
      `${cardIds.length} card(s) marked as known`,
      'Close',
      {
        duration: 3000,
        verticalPosition: 'top',
      }
    );
  }
}

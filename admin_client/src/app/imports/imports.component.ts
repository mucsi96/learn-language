import { Component, Signal } from '@angular/core';
import { Import, ImportsService } from './imports.service';
import '@mucsi96/ui-elements';
import { AgGridAngular } from 'ag-grid-angular';
import {
  ColDef,
  GridOptions,
  RowSelectionMode,
  RowSelectionOptions,
} from 'ag-grid-community';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { toRelativeTime } from '../utils/relativeTime';

@Component({
  selector: 'app-imports',
  standalone: true,
  imports: [AgGridAngular],
  templateUrl: './imports.component.html',
  styleUrl: './imports.component.css',
})
export class ImportsComponent {
  imports: Signal<Import[] | undefined>;
  colDefs: ColDef<Import>[] = [
    { field: 'id' },
    { field: 'word', type: 'rightAligned' },
    { field: 'forms' },
    { field: 'examples' },
    {
      field: 'imported',
      valueFormatter: (params) =>
        params.value ? toRelativeTime(params.value) : '',
    },
    {
      field: 'processed',
      valueFormatter: (params) =>
        params.value ? toRelativeTime(params.value) : '',
    },
  ];
  rowSelection: RowSelectionOptions = {
    mode: 'multiRow',
  };
  gridOptions: GridOptions = {
    autoSizeStrategy: {
      type: 'fitCellContents',
    },
  };

  constructor(private readonly importService: ImportsService) {
    this.imports = this.importService.getImports();
  }
}

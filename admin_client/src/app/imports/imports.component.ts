import { Component } from '@angular/core';
import '@mucsi96/ui-elements';
import { AgGridAngular } from 'ag-grid-angular';
import {
  ColDef,
  GridOptions,
  RowModelType,
  RowSelectionOptions,
} from 'ag-grid-community';
import { Import, ImportsService } from './imports.service';

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
    headerCheckbox: false,
  };
  rowModelType: RowModelType = 'infinite';
  gridOptions: GridOptions = {
    datasource: {
      rowCount: undefined,
      getRows: (params) => {
        const limit = params.endRow - params.startRow;
        this.importService
          .getImports({
            category: 'B1',
            after: params.startRow,
            limit,
          })
          .then((imports) => {
            params.successCallback(
              imports,
              imports.length < limit ? -1 : params.startRow - 1
            );
          });
      },
    },
    onFirstDataRendered(params) {
      params.api.sizeColumnsToFit();
      Ï;
    },
  };

  constructor(private readonly importService: ImportsService) {}
}

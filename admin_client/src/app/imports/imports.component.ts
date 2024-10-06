import { Component } from '@angular/core';
import '@mucsi96/ui-elements';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridOptions, RowModelType } from 'ag-grid-community';
import { Import, ImportsService } from './imports.service';
import { toRelativeTime } from '../utils/relativeTime';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { Router } from '@angular/router';

@Component({
  selector: 'app-imports',
  standalone: true,
  imports: [AgGridAngular],
  templateUrl: './imports.component.html',
  styleUrl: './imports.component.css',
})
export class ImportsComponent {
  colDefs: ColDef<Import>[] = [
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
  rowModelType: RowModelType = 'infinite';
  gridOptions: GridOptions = {
    datasource: {
      rowCount: undefined,
      getRows: (params) => {
        const limit = params.endRow - params.startRow;
        this.importService
          .getImports({
            category: 'B1',
            page: Math.floor(params.startRow / limit),
            limit,
          })
          .then((imports) => {
            params.successCallback(imports.content, imports.totalElements);
          });
      },
    },
    onFirstDataRendered: (params) => {
      params.api.sizeColumnsToFit();
    },
    onRowClicked: (params) => {
      this.router.navigate(['/imports', params.data.id]);
    },
  };

  constructor(
    private readonly importService: ImportsService,
    private readonly router: Router
  ) {}
}

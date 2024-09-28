import { Component, Signal } from '@angular/core';
import { Import, ImportsService } from './imports.service';
import '@mucsi96/ui-elements';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef } from 'ag-grid-community';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css'

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
    { field: 'word' },
    { field: 'category' },
    { field: 'forms' },
    { field: 'examples' },
    { field: 'imported_at' },
    { field: 'processed_at' },
  ];

  constructor(private readonly importService: ImportsService) {
    this.imports = this.importService.getImports();
  }
}

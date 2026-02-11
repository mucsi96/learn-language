import { Component, type WritableSignal } from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import type { IHeaderAngularComp } from 'ag-grid-angular';
import type { GridApi, IHeaderParams } from 'ag-grid-community';

export type SelectAllContext = {
  readonly selectAllActive: WritableSignal<boolean>;
  readonly toggleSelectAll: (active: boolean) => void;
};

@Component({
  standalone: true,
  imports: [MatCheckboxModule],
  template: `<mat-checkbox
    [checked]="params.context.selectAllActive()"
    (change)="onToggle($event)"
    aria-label="Select all cards"
  />`,
  styles: [
    `:host { display: flex; align-items: center; justify-content: center; }`,
  ],
})
export class SelectAllHeaderComponent implements IHeaderAngularComp {
  params!: IHeaderParams & { context: SelectAllContext; api: GridApi };

  agInit(params: IHeaderParams): void {
    this.params = params as IHeaderParams & {
      context: SelectAllContext;
      api: GridApi;
    };
  }

  refresh(): boolean {
    return true;
  }

  onToggle(event: { checked: boolean }): void {
    this.params.context.toggleSelectAll(event.checked);
  }
}

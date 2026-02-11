import { Component, signal } from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { IHeaderAngularComp } from 'ag-grid-angular';
import { type IHeaderParams } from 'ag-grid-community';

type SelectAllHeaderParams = IHeaderParams & {
  onSelectAll: () => void;
  onDeselectAll: () => void;
  isAllSelected: () => boolean;
};

@Component({
  standalone: true,
  imports: [MatCheckboxModule],
  template: `
    <mat-checkbox
      [checked]="checked()"
      (change)="onToggle()"
      aria-label="Select all cards"
    />
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
    }
  `,
})
export class SelectAllHeaderComponent implements IHeaderAngularComp {
  readonly checked = signal(false);
  private params!: SelectAllHeaderParams;

  agInit(params: SelectAllHeaderParams): void {
    this.params = params;
  }

  refresh(params: SelectAllHeaderParams): boolean {
    this.params = params;
    this.checked.set(params.isAllSelected());
    return true;
  }

  onToggle(): void {
    const newValue = !this.checked();
    this.checked.set(newValue);
    if (newValue) {
      this.params.onSelectAll();
    } else {
      this.params.onDeselectAll();
    }
  }
}

import {
  Component,
  signal,
  inject,
  Injector,
  effect,
  runInInjectionContext,
  type Signal,
} from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { IHeaderAngularComp } from 'ag-grid-angular';
import type { IHeaderParams } from 'ag-grid-community';

export type SelectAllHeaderParams = {
  selectedIds: Signal<readonly string[]>;
  totalFilteredCount: Signal<number>;
  onSelectAll: () => void;
  onDeselectAll: () => void;
};

@Component({
  standalone: true,
  imports: [MatCheckboxModule],
  template: `
    <mat-checkbox
      [checked]="checked()"
      [indeterminate]="indeterminate()"
      (change)="onToggle()"
      aria-label="Select all cards"
    ></mat-checkbox>
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
    }
  `,
})
export class SelectAllHeaderComponent implements IHeaderAngularComp {
  private readonly injector = inject(Injector);
  readonly checked = signal(false);
  readonly indeterminate = signal(false);
  private onSelectAllFn = (): void => {};
  private onDeselectAllFn = (): void => {};

  agInit(params: IHeaderParams & SelectAllHeaderParams): void {
    this.onSelectAllFn = params.onSelectAll;
    this.onDeselectAllFn = params.onDeselectAll;

    runInInjectionContext(this.injector, () => {
      effect(() => {
        const selectedCount = params.selectedIds().length;
        const total = params.totalFilteredCount();
        this.checked.set(total > 0 && selectedCount === total);
        this.indeterminate.set(selectedCount > 0 && selectedCount < total);
      });
    });
  }

  refresh(): boolean {
    return true;
  }

  onToggle(): void {
    if (this.checked() || this.indeterminate()) {
      this.onDeselectAllFn();
    } else {
      this.onSelectAllFn();
    }
  }
}

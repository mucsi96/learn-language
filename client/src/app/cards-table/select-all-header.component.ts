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

export type SelectAllContext = {
  selectedIds: Signal<readonly string[]>;
  totalFilteredCount: Signal<number>;
  selectAll: () => void;
  deselectAll: () => void;
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
  private context!: SelectAllContext;

  agInit(params: IHeaderParams): void {
    this.context = params.context as SelectAllContext;

    runInInjectionContext(this.injector, () => {
      effect(() => {
        const selectedCount = this.context.selectedIds().length;
        const total = this.context.totalFilteredCount();
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
      this.context.deselectAll();
    } else {
      this.context.selectAll();
    }
  }
}

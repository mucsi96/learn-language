import {
  Component,
  inject,
  Injector,
  effect,
  runInInjectionContext,
  signal,
  type Signal,
} from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import type { ICellRendererParams } from 'ag-grid-community';

export type SelectionContext = {
  selectedIdsSet: Signal<ReadonlySet<string>>;
  toggleSelection: (id: string) => void;
};

@Component({
  standalone: true,
  imports: [MatCheckboxModule],
  template: `
    <mat-checkbox
      [checked]="checked()"
      (change)="toggle($event)"
      (click)="$event.stopPropagation()"
      aria-label="Select card"
    ></mat-checkbox>
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
    }
  `,
})
export class SelectionCheckboxComponent implements ICellRendererAngularComp {
  private readonly injector = inject(Injector);
  private readonly rowId = signal('');
  readonly checked = signal(false);
  private context!: SelectionContext;

  agInit(params: ICellRendererParams): void {
    this.context = params.context as SelectionContext;
    if (!params.data) return;
    this.rowId.set(String(params.data.id));

    runInInjectionContext(this.injector, () => {
      effect(() => {
        this.checked.set(this.context.selectedIdsSet().has(this.rowId()));
      });
    });
  }

  refresh(params: ICellRendererParams): boolean {
    if (!params.data) return true;
    this.rowId.set(String(params.data.id));
    return true;
  }

  toggle(_event: { checked: boolean }): void {
    this.context.toggleSelection(this.rowId());
  }
}

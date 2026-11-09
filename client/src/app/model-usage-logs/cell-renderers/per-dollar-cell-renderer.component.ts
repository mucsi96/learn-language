import { Component, signal } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import type { ICellRendererParams } from 'ag-grid-community';
import type { ModelUsageLog } from '../model-usage-logs.service';

@Component({
  selector: 'app-per-dollar-cell',
  standalone: true,
  template: `<span class="per-dollar">{{ count() }}</span>`,
  styles: `
    .per-dollar {
      font-family: monospace;
      color: var(--mat-sys-tertiary, #8bb);
    }
  `,
})
export class PerDollarCellRendererComponent implements ICellRendererAngularComp {
  readonly count = signal(0);

  agInit(params: ICellRendererParams): void {
    this.updateState(params);
  }

  refresh(params: ICellRendererParams): boolean {
    this.updateState(params);
    return true;
  }

  private updateState(params: ICellRendererParams): void {
    const log = params.data as ModelUsageLog | undefined;
    if (!log || !log.costUsd || log.costUsd === 0) {
      this.count.set(0);
    } else {
      this.count.set(Math.floor(1 / log.costUsd));
    }
  }
}

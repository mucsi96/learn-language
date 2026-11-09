import { Component, signal } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import type { ICellRendererParams } from 'ag-grid-community';
import type { ModelUsageLog } from '../model-usage-logs.service';

@Component({
  selector: 'app-expand-cell',
  standalone: true,
  template: `
    @if (visible()) {
      <span class="expand-icon" role="button" aria-label="Expand">▶</span>
    }
  `,
  styles: `
    .expand-icon {
      cursor: pointer;
    }
  `,
})
export class ExpandCellRendererComponent implements ICellRendererAngularComp {
  readonly visible = signal(false);

  agInit(params: ICellRendererParams): void {
    this.updateState(params);
  }

  refresh(params: ICellRendererParams): boolean {
    this.updateState(params);
    return true;
  }

  private updateState(params: ICellRendererParams): void {
    const log = params.data as ModelUsageLog | undefined;
    this.visible.set(!!log && log.modelType === 'CHAT' && !!log.responseContent);
  }
}

import { Component, signal } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import type { ICellRendererParams } from 'ag-grid-community';
import type { ModelUsageLog } from '../model-usage-logs.service';

@Component({
  selector: 'app-model-name-cell',
  standalone: true,
  template: `
    @if (modelName()) {
      <span class="model-name">{{ modelName() }}</span>
      @if (isPrimary()) {
        <span class="primary-badge">primary</span>
      }
    }
  `,
  styles: `
    .model-name {
      font-family: monospace;
      font-size: 0.875rem;
    }

    .primary-badge {
      padding: 1px 4px;
      border-radius: 4px;
      font-size: 0.625rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--mat-sys-on-primary, #fff);
      background: var(--mat-sys-primary, #6c9eff);
      vertical-align: middle;
      margin-left: 4px;
    }
  `,
})
export class ModelNameCellRendererComponent implements ICellRendererAngularComp {
  readonly modelName = signal('');
  readonly isPrimary = signal(false);

  agInit(params: ICellRendererParams): void {
    this.updateState(params);
  }

  refresh(params: ICellRendererParams): boolean {
    this.updateState(params);
    return true;
  }

  private updateState(params: ICellRendererParams): void {
    const log = params.data as ModelUsageLog | undefined;
    this.modelName.set(log?.modelName ?? '');

    if (log && params.context?.findGroupForLog) {
      const group = params.context.findGroupForLog(log);
      this.isPrimary.set(
        !!group && group.primaryLog?.id === log.id && group.logs.length > 1,
      );
    } else {
      this.isPrimary.set(false);
    }
  }
}

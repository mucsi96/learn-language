import { Component, signal } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import type { ICellRendererParams } from 'ag-grid-community';
import type { ModelUsageLog } from '../model-usage-logs.service';

@Component({
  selector: 'app-diff-cell',
  standalone: true,
  template: `
    @if (identical()) {
      <span class="identical">identical</span>
    } @else if (additions() > 0 || deletions() > 0) {
      <span class="diff-stats">
        @if (additions() > 0) {
          <span class="additions">+{{ additions() }}</span>
        }
        @if (deletions() > 0) {
          <span class="deletions">-{{ deletions() }}</span>
        }
      </span>
    }
  `,
  styles: `
    .identical {
      color: var(--mat-sys-outline);
      font-style: italic;
      font-size: 0.75rem;
    }

    .diff-stats {
      font-family: monospace;
      font-size: 0.8125rem;
      display: inline-flex;
      gap: 0.5rem;
    }

    .additions {
      color: #4caf50;
      font-weight: 600;
    }

    .deletions {
      color: #f44336;
      font-weight: 600;
    }
  `,
})
export class DiffCellRendererComponent implements ICellRendererAngularComp {
  readonly identical = signal(false);
  readonly additions = signal(0);
  readonly deletions = signal(0);

  agInit(params: ICellRendererParams): void {
    this.updateState(params);
  }

  refresh(params: ICellRendererParams): boolean {
    this.updateState(params);
    return true;
  }

  private updateState(params: ICellRendererParams): void {
    const log = params.data as ModelUsageLog | undefined;

    if (!log || !params.context?.findGroupForLog || !params.context?.computeDiffSummary) {
      this.resetState();
      return;
    }

    const group = params.context.findGroupForLog(log);
    if (!group || !group.primaryLog || group.logs.length <= 1 || log.id === group.primaryLog.id) {
      this.resetState();
      return;
    }

    if (!log.responseContent || !group.primaryLog.responseContent) {
      this.resetState();
      return;
    }

    const diff = params.context.computeDiffSummary(
      group.primaryLog.responseContent,
      log.responseContent,
    );

    if (diff.additions === 0 && diff.deletions === 0) {
      this.identical.set(true);
      this.additions.set(0);
      this.deletions.set(0);
    } else {
      this.identical.set(false);
      this.additions.set(diff.additions);
      this.deletions.set(diff.deletions);
    }
  }

  private resetState(): void {
    this.identical.set(false);
    this.additions.set(0);
    this.deletions.set(0);
  }
}

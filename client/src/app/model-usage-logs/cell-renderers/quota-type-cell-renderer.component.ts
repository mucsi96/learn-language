import { Component, signal } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import type { ICellRendererParams } from 'ag-grid-community';

const QUOTA_TYPE_COLORS: Record<string, string> = {
  RPM: '#ff9800',
  TPM: '#2196f3',
  RPD: '#f44336',
  IPM: '#9c27b0',
};

const QUOTA_TYPE_LABELS: Record<string, string> = {
  RPM: 'Requests/Min',
  TPM: 'Tokens/Min',
  RPD: 'Requests/Day',
  IPM: 'Images/Min',
};

@Component({
  selector: 'app-quota-type-cell',
  standalone: true,
  template: `
    @if (quotaType()) {
      <span class="quota-badge" [style.background]="bgColor()" [style.color]="textColor()">
        {{ quotaType() }}
      </span>
      <span class="quota-label">{{ label() }}</span>
    }
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .quota-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.05em;
    }

    .quota-label {
      font-size: 0.7rem;
      opacity: 0.7;
    }
  `,
})
export class QuotaTypeCellRendererComponent implements ICellRendererAngularComp {
  readonly quotaType = signal('');
  readonly bgColor = signal('rgba(255,255,255,0.1)');
  readonly textColor = signal('#fff');
  readonly label = signal('');

  agInit(params: ICellRendererParams): void {
    this.updateState(params);
  }

  refresh(params: ICellRendererParams): boolean {
    this.updateState(params);
    return true;
  }

  private updateState(params: ICellRendererParams): void {
    const value = params.value as string | undefined;
    this.quotaType.set(value ?? '');
    const color = value ? (QUOTA_TYPE_COLORS[value] ?? '#666') : '#666';
    this.bgColor.set(color + '33');
    this.textColor.set(color);
    this.label.set(value ? (QUOTA_TYPE_LABELS[value] ?? '') : '');
  }
}

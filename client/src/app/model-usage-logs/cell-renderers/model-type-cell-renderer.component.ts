import { Component, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import type { ICellRendererParams } from 'ag-grid-community';

const MODEL_TYPE_ICONS: Record<string, string> = {
  CHAT: 'chat',
  IMAGE: 'image',
  AUDIO: 'volume_up',
};

@Component({
  selector: 'app-model-type-cell',
  standalone: true,
  imports: [MatIconModule],
  template: `
    @if (modelType()) {
      <span class="type-container">
        <mat-icon class="type-icon">{{ icon() }}</mat-icon>
        <span class="type-label">{{ modelType() }}</span>
      </span>
    }
  `,
  styles: `
    .type-container {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .type-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--mat-sys-primary, #6c9eff);
    }

    .type-label {
      font-size: 0.75rem;
      text-transform: uppercase;
    }
  `,
})
export class ModelTypeCellRendererComponent implements ICellRendererAngularComp {
  readonly modelType = signal('');
  readonly icon = signal('help');

  agInit(params: ICellRendererParams): void {
    this.updateState(params);
  }

  refresh(params: ICellRendererParams): boolean {
    this.updateState(params);
    return true;
  }

  private updateState(params: ICellRendererParams): void {
    const value = params.value as string | undefined;
    this.modelType.set(value ?? '');
    this.icon.set(value ? (MODEL_TYPE_ICONS[value] ?? 'help') : 'help');
  }
}

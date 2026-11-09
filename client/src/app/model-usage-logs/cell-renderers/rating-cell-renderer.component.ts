import { Component, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import type { ICellRendererParams } from 'ag-grid-community';
import type { ModelUsageLog } from '../model-usage-logs.service';

@Component({
  selector: 'app-rating-cell',
  standalone: true,
  imports: [MatIconModule],
  template: `
    @if (visible()) {
      <span class="rating-container">
        @for (star of stars; track star) {
          <button
            class="rating-star"
            [class.filled]="rating() !== null && star <= rating()!"
            [attr.aria-label]="'Rate ' + star + ' stars'"
            (click)="onStarClick(star, $event)"
          ><mat-icon>{{ rating() !== null && star <= rating()! ? 'star' : 'star_border' }}</mat-icon></button>
        }
      </span>
    }
  `,
  styles: `
    .rating-container {
      display: inline-flex;
      gap: 0;
    }

    .rating-star {
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      color: rgba(255, 255, 255, 0.4);
      display: inline-flex;
      align-items: center;
    }

    .rating-star mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .rating-star.filled {
      color: #ffc107;
    }
  `,
})
export class RatingCellRendererComponent implements ICellRendererAngularComp {
  readonly stars = [1, 2, 3, 4, 5];
  readonly visible = signal(false);
  readonly rating = signal<number | null>(null);

  private log: ModelUsageLog | null = null;
  private context: { handleRating: (log: ModelUsageLog, star: number) => void } | null = null;

  agInit(params: ICellRendererParams): void {
    this.updateState(params);
  }

  refresh(params: ICellRendererParams): boolean {
    this.updateState(params);
    return true;
  }

  onStarClick(star: number, event: MouseEvent): void {
    event.stopPropagation();
    if (this.log && this.context?.handleRating) {
      this.context.handleRating(this.log, star);
    }
  }

  private updateState(params: ICellRendererParams): void {
    const log = params.data as ModelUsageLog | undefined;
    this.log = log ?? null;
    this.context = params.context;
    this.visible.set(!!log && log.modelType === 'CHAT');
    this.rating.set(log?.rating ?? null);
  }
}

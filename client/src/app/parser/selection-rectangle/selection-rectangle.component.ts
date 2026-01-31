import { Component, computed, inject, input } from '@angular/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import {
  PagedSelection,
  SelectionStateService,
} from '../../selection-state.service';

@Component({
  selector: 'app-selection-rectangle',
  standalone: true,
  imports: [MatBadgeModule, MatIconModule, MatButtonModule],
  templateUrl: './selection-rectangle.component.html',
  styleUrl: './selection-rectangle.component.css',
})
export class SelectionRectangleComponent {
  private readonly selectionStateService = inject(SelectionStateService);

  readonly selection = input.required<PagedSelection>();
  readonly displayIndex = input.required<number>();

  readonly style = computed(() => {
    const rect = this.selection().rectangle;
    return {
      left: `calc(var(--page-width) * ${rect.x})`,
      top: `calc(var(--page-width) * ${rect.y})`,
      width: `calc(var(--page-width) * ${rect.width})`,
      height: `calc(var(--page-width) * ${rect.height})`,
    };
  });

  removeSelection() {
    this.selectionStateService.removeSelection(this.selection());
  }
}

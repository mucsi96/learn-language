import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SelectionStateService } from '../selection-state.service';
import { PageService } from '../page.service';

@Component({
  selector: 'app-selection-actions',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatBadgeModule, MatTooltipModule],
  templateUrl: './selection-actions.component.html',
  styleUrl: './selection-actions.component.css',
})
export class SelectionActionsComponent {
  readonly selectionStateService = inject(SelectionStateService);
  private readonly pageService = inject(PageService);

  readonly hasCardType = computed(() => !!this.pageService.selectedCardType());

  confirmSelection() {
    this.pageService.confirmSelection();
  }

  cancelSelection() {
    this.pageService.cancelSelection();
  }
}

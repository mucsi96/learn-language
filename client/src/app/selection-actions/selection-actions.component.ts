import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { SelectionStateService } from '../selection-state.service';
import { PageService } from '../page.service';

@Component({
  selector: 'app-selection-actions',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatBadgeModule],
  templateUrl: './selection-actions.component.html',
  styleUrl: './selection-actions.component.css',
})
export class SelectionActionsComponent {
  readonly selectionStateService = inject(SelectionStateService);
  private readonly pageService = inject(PageService);
  private readonly router = inject(Router);

  confirmSelection() {
    const result = this.pageService.confirmSelection();
    if (result) {
      this.router.navigate(['/sources', result.sourceId, 'page', result.pageNumber]);
    }
  }

  cancelSelection() {
    this.pageService.cancelSelection();
  }
}

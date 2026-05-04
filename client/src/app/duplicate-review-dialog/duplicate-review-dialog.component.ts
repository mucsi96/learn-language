import { Component, computed, inject, signal } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { PotentialDuplicate } from '../duplicate-detection.service';

export interface DuplicateReviewDialogData {
  duplicates: PotentialDuplicate[];
}

export interface DuplicateReviewDialogResult {
  proceed: boolean;
  ignoredIds: string[];
}

@Component({
  selector: 'app-duplicate-review-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatCheckboxModule,
  ],
  templateUrl: './duplicate-review-dialog.component.html',
  styleUrl: './duplicate-review-dialog.component.css',
})
export class DuplicateReviewDialogComponent {
  private readonly dialogRef = inject(
    MatDialogRef<DuplicateReviewDialogComponent, DuplicateReviewDialogResult>
  );
  readonly data = inject<DuplicateReviewDialogData>(MAT_DIALOG_DATA);
  private readonly skippedNewIds = signal<Set<string>>(new Set());

  readonly groupedDuplicates = computed(() => {
    const groups = new Map<string, PotentialDuplicate[]>();
    for (const duplicate of this.data.duplicates) {
      const existing = groups.get(duplicate.newId) ?? [];
      groups.set(duplicate.newId, [...existing, duplicate]);
    }
    return [...groups.entries()].map(([newId, matches]) => ({
      newId,
      matches,
    }));
  });

  readonly skippedCount = computed(() => this.skippedNewIds().size);

  isSkipped(newId: string): boolean {
    return this.skippedNewIds().has(newId);
  }

  toggleSkip(newId: string, skip: boolean): void {
    this.skippedNewIds.update((current) => {
      const next = new Set(current);
      if (skip) {
        next.add(newId);
      } else {
        next.delete(newId);
      }
      return next;
    });
  }

  proceed(): void {
    this.dialogRef.close({
      proceed: true,
      ignoredIds: [...this.skippedNewIds()],
    });
  }

  cancel(): void {
    this.dialogRef.close({ proceed: false, ignoredIds: [] });
  }
}

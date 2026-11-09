import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { StudySessionService } from '../study-session.service';
import { ConfirmDialogComponent } from '../parser/edit-card/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-daily-sessions',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatDialogModule,
  ],
  templateUrl: './daily-sessions.component.html',
  styleUrl: './daily-sessions.component.css',
})
export class DailySessionsComponent {
  private readonly studySessionService = inject(StudySessionService);
  private readonly dialog = inject(MatDialog);

  readonly isDeleting = signal(false);

  async cleanupDailySessions(): Promise<void> {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        message: 'Delete all daily study sessions? This cannot be undone.',
      },
    });

    const confirmed = await new Promise<boolean>((resolve) => {
      dialogRef.afterClosed().subscribe((result) => resolve(!!result));
    });
    if (!confirmed) {
      return;
    }

    this.isDeleting.set(true);
    try {
      await this.studySessionService.deleteAllSessions();
    } finally {
      this.isDeleting.set(false);
    }
  }
}

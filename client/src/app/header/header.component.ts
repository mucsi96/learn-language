import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UserProfileService } from '../user-profile.service';
import { MatMenuModule } from '@angular/material/menu';
import { PRIMARY_OUTLET, Router, RouterLink } from '@angular/router';
import { StudySessionService } from '../study-session.service';
import { PomodoroService } from '../pomodoro.service';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector: 'app-header',
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatTooltipModule,
    MatMenuModule,
    MatProgressBarModule,
    RouterLink,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent {
  private readonly router = inject(Router);
  readonly isStudyRoute = computed(() => {
    const segments = this.router.lastSuccessfulNavigation()?.finalUrl?.root.children[PRIMARY_OUTLET]?.segments;
    return segments?.length === 3 && segments[0].path === 'sources' && segments[2].path === 'study';
  });
  readonly pomodoro = inject(PomodoroService);
  readonly studySession = inject(StudySessionService);
  readonly restart = computed(() => this.studySession.hasSession() ? this.studySession.restartControl() : null);
  readonly timerLabel = computed(() => this.restart() ? 'Start new study session' : this.pomodoro.seconds() !== null ? 'Restart Pomodoro' : 'Start Pomodoro');
  profile = inject(UserProfileService).profile;

  async startTimer() {
    const restart = this.restart();
    if (restart) {
      if (!restart.disabled()) await restart.start();
    } else {
      this.pomodoro.start();
    }
  }
}

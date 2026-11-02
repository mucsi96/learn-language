import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UserProfileService } from '../user-profile.service';
import { MatMenuModule } from '@angular/material/menu';
import { RouterLink } from '@angular/router';
import { StudySessionService } from '../study-session.service';
import { PomodoroService } from '../pomodoro.service';

@Component({
  selector: 'app-header',
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatTooltipModule,
    MatMenuModule,
    RouterLink,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent {
  readonly pomodoro = inject(PomodoroService);
  readonly studySession = inject(StudySessionService);
  readonly restart = computed(() => this.studySession.hasSession() ? this.studySession.restartControl() : null);
  readonly timerLabel = computed(() => this.restart() ? 'Start new study session' : this.pomodoro.time() ? 'Restart Pomodoro' : 'Start Pomodoro');
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

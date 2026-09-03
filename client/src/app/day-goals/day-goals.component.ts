import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { DayGoalSetting, DayGoalSettingsService } from './day-goal-settings.service';
import { DayGoalTierSettingsComponent } from './day-goal-tier-settings/day-goal-tier-settings.component';

@Component({
  selector: 'app-day-goals',
  standalone: true,
  imports: [MatCardModule, DayGoalTierSettingsComponent],
  templateUrl: './day-goals.component.html',
  styleUrl: './day-goals.component.css',
})
export class DayGoalsComponent {
  private readonly service = inject(DayGoalSettingsService);

  readonly settings = this.service.settings;
  readonly skeletonRows = [{}, {}, {}];

  updateSetting(setting: DayGoalSetting): Promise<void> {
    return this.service.updateSetting(setting);
  }
}

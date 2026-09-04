import { Component, computed, effect, input, linkedSignal, output, untracked } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { form, FormField, max, min, required } from '@angular/forms/signals';
import { DAY_GOAL_TIER_LABELS } from '../../shared/day-goal/day-goal-tiers';
import { DayGoalRequirements, DayGoalSetting } from '../day-goal-settings.service';

@Component({
  selector: 'app-day-goal-tier-settings',
  standalone: true,
  imports: [FormField, MatFormFieldModule, MatInputModule, MatIconModule],
  templateUrl: './day-goal-tier-settings.component.html',
  styleUrl: './day-goal-tier-settings.component.css',
})
export class DayGoalTierSettingsComponent {
  readonly setting = input.required<DayGoalSetting>();
  readonly settingChange = output<DayGoalSetting>();

  readonly label = computed(() => DAY_GOAL_TIER_LABELS[this.setting().tier]);

  readonly requirements = linkedSignal<DayGoalRequirements>(() => ({
    requiredCompletionPercent: this.setting().requiredCompletionPercent,
    requiredAccuracyPercent: this.setting().requiredAccuracyPercent,
  }));

  readonly requirementsForm = form(this.requirements, (path) => {
    required(path.requiredCompletionPercent);
    min(path.requiredCompletionPercent, 0);
    max(path.requiredCompletionPercent, 100);
    required(path.requiredAccuracyPercent);
    min(path.requiredAccuracyPercent, 0);
    max(path.requiredAccuracyPercent, 100);
  });

  constructor() {
    effect(() => {
      if (!this.requirementsForm().valid()) {
        return;
      }

      const requirements = this.requirements();
      const current = untracked(() => this.setting());
      const changed =
        requirements.requiredCompletionPercent !== current.requiredCompletionPercent ||
        requirements.requiredAccuracyPercent !== current.requiredAccuracyPercent;

      if (changed) {
        this.settingChange.emit({ ...current, ...requirements });
      }
    });
  }
}

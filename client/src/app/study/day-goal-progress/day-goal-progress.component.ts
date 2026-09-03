import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DayGoalTierProgress, SessionStats } from '../../parser/types';
import { DAY_GOAL_TIER_LABELS } from '../../shared/day-goal/day-goal-tiers';

const percentRequirement = (label: string, percent: number): string => `${percent}% ${label}`;

const describeRequirements = (tier: DayGoalTierProgress): string =>
  [
    percentRequirement('cards', tier.requiredCompletionPercent),
    ...(tier.requiredAccuracyPercent > 0
      ? [percentRequirement('accuracy', tier.requiredAccuracyPercent)]
      : []),
  ].join(' · ');

@Component({
  selector: 'app-day-goal-progress',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './day-goal-progress.component.html',
  styleUrl: './day-goal-progress.component.css',
})
export class DayGoalProgressComponent {
  readonly stats = input.required<SessionStats>();

  readonly tiers = computed(() =>
    this.stats().dayGoal.tiers.map((tier) => ({
      ...tier,
      label: DAY_GOAL_TIER_LABELS[tier.tier],
      requirements: describeRequirements(tier),
    }))
  );

  readonly achievedTier = computed(() => this.stats().dayGoal.achievedTier);

  readonly status = computed(() => {
    const achieved = this.achievedTier();
    return achieved ? `${DAY_GOAL_TIER_LABELS[achieved]} goal achieved` : 'No goal achieved yet';
  });

  readonly summary = computed(() => {
    const { completedCards, totalCards, dayGoal } = this.stats();
    return `${completedCards} of ${totalCards} cards done · ${dayGoal.accuracyPercent}% accuracy`;
  });
}

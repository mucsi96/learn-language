import { HttpClient } from '@angular/common/http';
import { inject, Injectable, resource } from '@angular/core';
import { DayGoalTier } from '../parser/types';
import { fetchJson } from '../utils/fetchJson';

export type DayGoalRequirements = {
  requiredCompletionPercent: number;
  requiredAccuracyPercent: number;
};

export type DayGoalSetting = DayGoalRequirements & {
  tier: DayGoalTier;
};

@Injectable({
  providedIn: 'root',
})
export class DayGoalSettingsService {
  private readonly http = inject(HttpClient);

  readonly settings = resource<DayGoalSetting[], unknown>({
    loader: () => fetchJson(this.http, '/api/day-goal-settings'),
  });

  async updateSetting(setting: DayGoalSetting): Promise<void> {
    this.settings.update((settings) =>
      settings?.map((current) => (current.tier === setting.tier ? setting : current))
    );
    const { tier, ...requirements } = setting;
    await fetchJson(this.http, `/api/day-goal-settings/${tier}`, {
      method: 'PUT',
      body: requirements satisfies DayGoalRequirements,
    });
  }
}

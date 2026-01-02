import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import {
  AiModelSettingsService,
  ModelSetting,
} from './ai-model-settings.service';

@Component({
  selector: 'app-ai-model-settings',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatTooltipModule,
    RouterLink,
  ],
  templateUrl: './ai-model-settings.component.html',
  styleUrl: './ai-model-settings.component.css',
})
export class AiModelSettingsComponent {
  private readonly service = inject(AiModelSettingsService);

  readonly settings = this.service.settings;
  readonly togglingModel = signal<string | null>(null);

  async onToggle(
    operationType: string,
    model: ModelSetting,
    isEnabled: boolean
  ) {
    const key = `${operationType}-${model.modelName}`;
    this.togglingModel.set(key);
    try {
      await this.service.toggleModel(operationType, model.modelName, isEnabled);
    } finally {
      this.togglingModel.set(null);
    }
  }

  isToggling(operationType: string, modelName: string): boolean {
    return this.togglingModel() === `${operationType}-${modelName}`;
  }
}

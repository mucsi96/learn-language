import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import {
  AiModelSettingsService,
  OperationSettings,
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
    MatTableModule,
    RouterLink,
  ],
  templateUrl: './ai-model-settings.component.html',
  styleUrl: './ai-model-settings.component.css',
})
export class AiModelSettingsComponent {
  private readonly service = inject(AiModelSettingsService);

  readonly settings = this.service.settings;
  readonly togglingModel = signal<string | null>(null);

  readonly modelNames = computed(() => {
    const data = this.settings.value();
    if (!data || data.length === 0) return [];
    return data[0].models.map((m) => m.modelName);
  });

  isModelEnabled(operation: OperationSettings, modelName: string): boolean {
    const model = operation.models.find((m) => m.modelName === modelName);
    return model?.isEnabled ?? false;
  }

  async onToggle(
    operationType: string,
    modelName: string,
    isEnabled: boolean
  ) {
    const key = `${operationType}-${modelName}`;
    this.togglingModel.set(key);
    try {
      await this.service.toggleModel(operationType, modelName, isEnabled);
    } finally {
      this.togglingModel.set(null);
    }
  }

  isToggling(operationType: string, modelName: string): boolean {
    return this.togglingModel() === `${operationType}-${modelName}`;
  }
}

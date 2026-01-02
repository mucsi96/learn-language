import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  AiModelSettingsService,
  AiModelSetting,
  ModelType,
} from './ai-model-settings.service';

@Component({
  selector: 'app-ai-model-settings',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTooltipModule,
    FormsModule,
    RouterLink,
  ],
  templateUrl: './ai-model-settings.component.html',
  styleUrl: './ai-model-settings.component.css',
})
export class AiModelSettingsComponent {
  private readonly service = inject(AiModelSettingsService);

  readonly settings = this.service.settings;
  readonly savingOperation = signal<string | null>(null);

  readonly displayedColumns = ['operation', 'model', 'actions'];
  readonly skeletonRows = [{}, {}, {}, {}, {}];

  readonly groupedSettings = computed(() => {
    const settingsList = this.settings.value();
    if (!settingsList) return null;

    const groups: Record<ModelType, AiModelSetting[]> = {
      CHAT: [],
      IMAGE: [],
      AUDIO: [],
    };

    for (const setting of settingsList) {
      groups[setting.modelType].push(setting);
    }

    return groups;
  });

  getModelTypeLabel(type: ModelType): string {
    switch (type) {
      case 'CHAT':
        return 'Chat Models';
      case 'IMAGE':
        return 'Image Generation';
      case 'AUDIO':
        return 'Audio Generation';
    }
  }

  getModelTypeIcon(type: ModelType): string {
    switch (type) {
      case 'CHAT':
        return 'chat';
      case 'IMAGE':
        return 'image';
      case 'AUDIO':
        return 'volume_up';
    }
  }

  getModelsForType(type: ModelType) {
    return this.service.getModelsForType(type);
  }

  async onModelChange(setting: AiModelSetting, modelName: string) {
    this.savingOperation.set(setting.operationType);
    try {
      await this.service.updateSetting(setting.operationType, modelName);
    } finally {
      this.savingOperation.set(null);
    }
  }

  async clearSetting(setting: AiModelSetting) {
    this.savingOperation.set(setting.operationType);
    try {
      await this.service.deleteSetting(setting.operationType);
    } finally {
      this.savingOperation.set(null);
    }
  }
}

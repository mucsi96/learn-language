import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ChatModelSettingsService } from './chat-model-settings.service';

type ModelProvider = 'openai' | 'anthropic' | 'google';

@Component({
  selector: 'app-chat-model-settings',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatTooltipModule,
  ],
  templateUrl: './chat-model-settings.component.html',
  styleUrl: './chat-model-settings.component.css',
})
export class ChatModelSettingsComponent {
  private readonly service = inject(ChatModelSettingsService);

  readonly chatModels = this.service.chatModels;
  readonly operationTypes = this.service.operationTypes;
  readonly settingsMatrix = this.service.settingsMatrix;

  getOperationDisplayName(code: string): string {
    return this.service.getOperationDisplayName(code);
  }

  isModelEnabled(modelName: string, operationType: string): boolean {
    return this.service.isModelEnabled(modelName, operationType);
  }

  async toggleSetting(modelName: string, operationType: string): Promise<void> {
    await this.service.toggleSetting(modelName, operationType);
  }

  async enableAllForOperation(operationType: string): Promise<void> {
    await this.service.enableAllForOperation(operationType);
  }

  getModelProvider(modelName: string): ModelProvider {
    if (modelName.startsWith('gpt-')) {
      return 'openai';
    }
    if (modelName.startsWith('claude-')) {
      return 'anthropic';
    }
    if (modelName.startsWith('gemini-')) {
      return 'google';
    }
    return 'openai';
  }
}

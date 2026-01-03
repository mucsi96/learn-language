import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRadioModule } from '@angular/material/radio';
import { ChatModelSettingsService } from './chat-model-settings.service';

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
    MatRadioModule,
  ],
  templateUrl: './chat-model-settings.component.html',
  styleUrl: './chat-model-settings.component.css',
})
export class ChatModelSettingsComponent {
  private readonly service = inject(ChatModelSettingsService);

  readonly chatModels = this.service.chatModels;
  readonly operationTypes = this.service.operationTypes;
  readonly settingsMatrix = this.service.settingsMatrix;
  readonly primaryModelByOperation = this.service.primaryModelByOperation;

  getOperationDisplayName(code: string): string {
    return this.service.getOperationDisplayName(code);
  }

  isModelEnabled(modelName: string, operationType: string): boolean {
    return this.service.isModelEnabled(modelName, operationType);
  }

  isPrimaryModel(modelName: string, operationType: string): boolean {
    return this.service.isPrimaryModel(modelName, operationType);
  }

  async toggleSetting(modelName: string, operationType: string): Promise<void> {
    await this.service.toggleSetting(modelName, operationType);
  }

  async setPrimaryModel(modelName: string, operationType: string): Promise<void> {
    await this.service.setPrimaryModel(modelName, operationType);
  }

  async enableAllForOperation(operationType: string): Promise<void> {
    await this.service.enableAllForOperation(operationType);
  }
}

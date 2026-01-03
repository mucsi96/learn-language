import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fetchJson } from '../utils/fetchJson';
import { ENVIRONMENT_CONFIG, OperationTypeInfo, ChatModelInfo } from '../environment/environment.config';

export interface ChatModelSettingResponse {
  id: number;
  modelName: string;
  operationType: string;
  isEnabled: boolean;
}

export interface ChatModelSettingRequest {
  modelName: string;
  operationType: string;
  isEnabled: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ChatModelSettingsService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ENVIRONMENT_CONFIG);

  readonly chatModels: ChatModelInfo[] = this.config.chatModels;
  readonly operationTypes: OperationTypeInfo[] = this.config.operationTypes;

  private readonly _enabledModelsByOperation = signal<Record<string, string[]>>(
    this.config.enabledModelsByOperation ?? {}
  );

  readonly enabledModelsByOperation = this._enabledModelsByOperation.asReadonly();

  readonly settingsMatrix = computed(() => {
    const enabled = this._enabledModelsByOperation();
    const matrix: Record<string, Record<string, boolean>> = {};

    for (const model of this.chatModels) {
      matrix[model.modelName] = {};
      for (const operation of this.operationTypes) {
        const enabledModels = enabled[operation.code] ?? [];
        matrix[model.modelName][operation.code] = enabledModels.includes(model.modelName);
      }
    }

    return matrix;
  });

  isModelEnabled(modelName: string, operationType: string): boolean {
    const enabled = this._enabledModelsByOperation();
    const models = enabled[operationType] ?? [];
    return models.includes(modelName);
  }

  async toggleSetting(modelName: string, operationType: string): Promise<void> {
    const currentEnabled = this.isModelEnabled(modelName, operationType);
    const newEnabled = !currentEnabled;

    this._enabledModelsByOperation.update((current) => {
      const updated = { ...current };
      const models = [...(updated[operationType] ?? [])];

      if (newEnabled) {
        if (!models.includes(modelName)) {
          models.push(modelName);
        }
      } else {
        const index = models.indexOf(modelName);
        if (index !== -1) {
          models.splice(index, 1);
        }
      }

      updated[operationType] = models;
      return updated;
    });

    try {
      await fetchJson<ChatModelSettingResponse>(
        this.http,
        '/api/chat-model-settings',
        {
          method: 'PUT',
          body: {
            modelName,
            operationType,
            isEnabled: newEnabled,
          } as ChatModelSettingRequest,
        }
      );
    } catch (error) {
      this._enabledModelsByOperation.update((current) => {
        const updated = { ...current };
        const models = [...(updated[operationType] ?? [])];

        if (currentEnabled) {
          if (!models.includes(modelName)) {
            models.push(modelName);
          }
        } else {
          const index = models.indexOf(modelName);
          if (index !== -1) {
            models.splice(index, 1);
          }
        }

        updated[operationType] = models;
        return updated;
      });
      throw error;
    }
  }

  async enableAllForOperation(operationType: string): Promise<void> {
    const allModels = this.chatModels.map((m) => m.modelName);

    this._enabledModelsByOperation.update((current) => ({
      ...current,
      [operationType]: allModels,
    }));

    try {
      await fetchJson(
        this.http,
        `/api/chat-model-settings/enable-all/${operationType}`,
        { method: 'POST' }
      );
    } catch (error) {
      this._enabledModelsByOperation.update((current) => ({
        ...current,
        [operationType]: [],
      }));
      throw error;
    }
  }

  getOperationDisplayName(code: string): string {
    const operation = this.operationTypes.find((op) => op.code === code);
    return operation?.displayName ?? code;
  }
}

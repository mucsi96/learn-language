import { Injectable, inject, resource, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fetchJson } from '../utils/fetchJson';
import { ENVIRONMENT_CONFIG } from '../environment/environment.config';

export type ModelType = 'CHAT' | 'IMAGE' | 'AUDIO';

export interface AiModelSetting {
  id: number | null;
  operationType: string;
  operationDisplayName: string;
  modelType: ModelType;
  modelName: string | null;
  updatedAt: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class AiModelSettingsService {
  private readonly http = inject(HttpClient);
  private readonly injector = inject(Injector);
  private readonly config = inject(ENVIRONMENT_CONFIG);

  readonly chatModels = this.config.chatModels;
  readonly imageModels = this.config.imageModels;
  readonly audioModels = this.config.audioModels;

  readonly settings = resource<AiModelSetting[], never>({
    injector: this.injector,
    loader: async () => {
      return await fetchJson<AiModelSetting[]>(
        this.http,
        '/api/ai-model-settings'
      );
    },
  });

  getModelsForType(modelType: ModelType): { id: string; displayName: string }[] {
    switch (modelType) {
      case 'CHAT':
        return this.chatModels.map((m) => ({
          id: m.modelName,
          displayName: m.modelName + (m.primary ? ' (primary)' : ''),
        }));
      case 'IMAGE':
        return this.imageModels.map((m) => ({
          id: m.id,
          displayName: m.displayName,
        }));
      case 'AUDIO':
        return this.audioModels.map((m) => ({
          id: m.id,
          displayName: m.displayName + (m.isDefault ? ' (default)' : ''),
        }));
    }
  }

  async updateSetting(
    operationType: string,
    modelName: string
  ): Promise<AiModelSetting> {
    const result = await fetchJson<AiModelSetting>(
      this.http,
      `/api/ai-model-settings/${operationType}`,
      {
        method: 'PUT',
        body: { modelName },
      }
    );
    this.settings.reload();
    return result;
  }

  async deleteSetting(operationType: string): Promise<void> {
    await fetchJson(this.http, `/api/ai-model-settings/${operationType}`, {
      method: 'DELETE',
    });
    this.settings.reload();
  }
}

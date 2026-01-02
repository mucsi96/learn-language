import { Injectable, inject, resource, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fetchJson } from '../utils/fetchJson';

export interface ModelSetting {
  modelName: string;
  isEnabled: boolean;
}

export interface OperationSettings {
  operationType: string;
  operationDisplayName: string;
  models: ModelSetting[];
}

@Injectable({
  providedIn: 'root',
})
export class AiModelSettingsService {
  private readonly http = inject(HttpClient);
  private readonly injector = inject(Injector);

  readonly settings = resource<OperationSettings[], never>({
    injector: this.injector,
    loader: async () => {
      return await fetchJson<OperationSettings[]>(
        this.http,
        '/api/ai-model-settings'
      );
    },
  });

  async toggleModel(
    operationType: string,
    modelName: string,
    isEnabled: boolean
  ): Promise<void> {
    await fetchJson(this.http, `/api/ai-model-settings/${operationType}`, {
      method: 'PUT',
      body: { modelName, isEnabled },
    });
    this.settings.reload();
  }
}

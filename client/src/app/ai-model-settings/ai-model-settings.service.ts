import { Injectable, inject, resource, Injector, signal } from '@angular/core';
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

  private readonly _settings = signal<OperationSettings[] | undefined>(
    undefined
  );
  private readonly _isLoading = signal(true);

  readonly settings = {
    value: this._settings.asReadonly(),
    isLoading: this._isLoading.asReadonly(),
  };

  constructor() {
    this.loadSettings();
  }

  private async loadSettings() {
    this._isLoading.set(true);
    try {
      const data = await fetchJson<OperationSettings[]>(
        this.http,
        '/api/ai-model-settings'
      );
      this._settings.set(data);
    } finally {
      this._isLoading.set(false);
    }
  }

  async toggleModel(
    operationType: string,
    modelName: string,
    isEnabled: boolean
  ): Promise<void> {
    this._settings.update((settings) => {
      if (!settings) return settings;
      return settings.map((op) => {
        if (op.operationType !== operationType) return op;
        return {
          ...op,
          models: op.models.map((m) => {
            if (m.modelName !== modelName) return m;
            return { ...m, isEnabled };
          }),
        };
      });
    });

    await fetchJson(this.http, `/api/ai-model-settings/${operationType}`, {
      method: 'PUT',
      body: { modelName, isEnabled },
    });
  }
}

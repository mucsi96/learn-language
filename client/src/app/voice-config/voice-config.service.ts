import { Injectable, inject, resource, Injector, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fetchJson } from '../utils/fetchJson';
import { Card } from '../parser/types';

export interface VoiceConfiguration {
  id: number;
  voiceId: string;
  model: string;
  language: string;
  displayName: string | null;
  isEnabled: boolean;
}

export interface VoiceConfigurationRequest {
  voiceId: string;
  model: string;
  language: string;
  displayName?: string;
  isEnabled?: boolean;
}

export interface Voice {
  id: string;
  displayName: string;
  languages: { name: string }[];
}

@Injectable({
  providedIn: 'root',
})
export class VoiceConfigService {
  private readonly http = inject(HttpClient);
  private readonly injector = inject(Injector);

  readonly configurations = resource<VoiceConfiguration[], never>({
    injector: this.injector,
    loader: async () => {
      return await fetchJson<VoiceConfiguration[]>(
        this.http,
        '/api/voice-configurations'
      );
    },
  });

  readonly availableVoices = resource<Voice[], never>({
    injector: this.injector,
    loader: async () => {
      return await fetchJson<Voice[]>(this.http, '/api/voices');
    },
  });

  readonly sampleCards = resource<Card[], never>({
    injector: this.injector,
    loader: async () => {
      return await fetchJson<Card[]>(this.http, '/api/cards/sample');
    },
  });

  async createConfiguration(
    request: VoiceConfigurationRequest
  ): Promise<VoiceConfiguration> {
    const result = await fetchJson<VoiceConfiguration>(
      this.http,
      '/api/voice-configurations',
      {
        method: 'POST',
        body: request,
      }
    );
    this.refresh();
    return result;
  }

  async updateConfiguration(
    id: number,
    request: VoiceConfigurationRequest
  ): Promise<VoiceConfiguration> {
    const result = await fetchJson<VoiceConfiguration>(
      this.http,
      `/api/voice-configurations/${id}`,
      {
        method: 'PUT',
        body: request,
      }
    );
    this.refresh();
    return result;
  }

  async deleteConfiguration(id: number): Promise<void> {
    await fetchJson(this.http, `/api/voice-configurations/${id}`, {
      method: 'DELETE',
    });
    this.refresh();
  }

  async toggleEnabled(config: VoiceConfiguration): Promise<void> {
    await this.updateConfiguration(config.id, {
      voiceId: config.voiceId,
      model: config.model,
      language: config.language,
      displayName: config.displayName ?? undefined,
      isEnabled: !config.isEnabled,
    });
  }

  refreshSampleCards(): void {
    this.sampleCards.reload();
  }

  private refresh(): void {
    this.configurations.reload();
  }
}

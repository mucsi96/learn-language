import { Injectable, inject, resource, signal, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fetchJson } from '../utils/fetchJson';
import { Card } from '../parser/types';
import { ENVIRONMENT_CONFIG } from '../environment/environment.config';

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

@Injectable({
  providedIn: 'root',
})
export class VoiceConfigService {
  private readonly http = inject(HttpClient);
  private readonly injector = inject(Injector);
  private readonly config = inject(ENVIRONMENT_CONFIG);

  readonly audioModels = this.config.audioModels;
  readonly availableVoices = this.config.voices;
  readonly supportedLanguages = this.config.supportedLanguages;
  readonly audioRateLimitPerMinute = signal(this.config.audioRateLimitPerMinute);
  readonly audioMaxConcurrent = signal(this.config.audioMaxConcurrent);

  readonly configurations = resource<VoiceConfiguration[], never>({
    injector: this.injector,
    loader: async () => {
      return await fetchJson<VoiceConfiguration[]>(
        this.http,
        '/api/voice-configurations'
      );
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

  updateAudioRateLimit(value: number): void {
    this.audioRateLimitPerMinute.set(value);

    fetchJson(this.http, '/api/rate-limit-settings', {
      method: 'PUT',
      body: { type: 'audio', maxPerMinute: value },
    });
  }

  updateAudioMaxConcurrent(value: number): void {
    this.audioMaxConcurrent.set(value);

    fetchJson(this.http, '/api/rate-limit-settings', {
      method: 'PUT',
      body: { type: 'audio', maxConcurrent: value },
    });
  }

  refreshSampleCards(): void {
    this.sampleCards.reload();
  }

  private refresh(): void {
    this.configurations.reload();
  }
}

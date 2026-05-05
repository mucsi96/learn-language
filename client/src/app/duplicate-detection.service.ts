import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fetchJson } from './utils/fetchJson';
import { MultiModelService } from './multi-model.service';
import { ENVIRONMENT_CONFIG } from './environment/environment.config';

export interface PotentialDuplicate {
  newId: string;
  existingId: string;
  reason: string;
}

interface DuplicateDetectionResponse {
  duplicates: PotentialDuplicate[];
}

@Injectable({
  providedIn: 'root',
})
export class DuplicateDetectionService {
  private readonly http = inject(HttpClient);
  private readonly multiModelService = inject(MultiModelService);
  private readonly environmentConfig = inject(ENVIRONMENT_CONFIG);

  isAvailable(): boolean {
    const enabledModels =
      this.environmentConfig.enabledModelsByOperation['duplicate_detection'] ?? [];
    const primary =
      this.environmentConfig.primaryModelByOperation['duplicate_detection'];
    return Boolean(primary && enabledModels.includes(primary));
  }

  async detectDuplicates(newIds: string[]): Promise<PotentialDuplicate[]> {
    if (newIds.length === 0 || !this.isAvailable()) {
      return [];
    }

    const result = await this.multiModelService.call<DuplicateDetectionResponse>(
      'duplicate_detection',
      (model: string, headers?: Record<string, string>) =>
        fetchJson<DuplicateDetectionResponse>(
          this.http,
          `/api/duplicate-detection?model=${model}`,
          {
            body: { newIds },
            method: 'POST',
            headers,
          }
        )
    );

    return result.duplicates ?? [];
  }
}

import { Injectable, inject, resource, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fetchJson } from '../utils/fetchJson';

export interface LearningPartner {
  id: number;
  name: string;
  isEnabled: boolean;
}

export interface LearningPartnerRequest {
  name: string;
  isEnabled?: boolean;
}

export interface StudySettings {
  studyMode: 'SOLO' | 'WITH_PARTNER';
  enabledPartners: LearningPartner[];
}

export interface StudySettingsRequest {
  studyMode: 'SOLO' | 'WITH_PARTNER';
}

@Injectable({
  providedIn: 'root',
})
export class LearningPartnersService {
  private readonly http = inject(HttpClient);
  private readonly injector = inject(Injector);

  readonly partners = resource<LearningPartner[], never>({
    injector: this.injector,
    loader: async () => {
      return await fetchJson<LearningPartner[]>(
        this.http,
        '/api/learning-partners'
      );
    },
  });

  readonly studySettings = resource<StudySettings, never>({
    injector: this.injector,
    loader: async () => {
      return await fetchJson<StudySettings>(this.http, '/api/study-settings');
    },
  });

  async createPartner(request: LearningPartnerRequest): Promise<LearningPartner> {
    const result = await fetchJson<LearningPartner>(
      this.http,
      '/api/learning-partners',
      {
        method: 'POST',
        body: request,
      }
    );
    this.refresh();
    return result;
  }

  async updatePartner(
    id: number,
    request: LearningPartnerRequest
  ): Promise<LearningPartner> {
    const result = await fetchJson<LearningPartner>(
      this.http,
      `/api/learning-partners/${id}`,
      {
        method: 'PUT',
        body: request,
      }
    );
    this.refresh();
    return result;
  }

  async deletePartner(id: number): Promise<void> {
    await fetchJson(this.http, `/api/learning-partners/${id}`, {
      method: 'DELETE',
    });
    this.refresh();
  }

  async toggleEnabled(partner: LearningPartner): Promise<void> {
    await this.updatePartner(partner.id, {
      name: partner.name,
      isEnabled: !partner.isEnabled,
    });
  }

  async updateStudyMode(studyMode: 'SOLO' | 'WITH_PARTNER'): Promise<void> {
    await fetchJson<StudySettings>(this.http, '/api/study-settings', {
      method: 'PUT',
      body: { studyMode },
    });
    this.studySettings.reload();
  }

  private refresh(): void {
    this.partners.reload();
    this.studySettings.reload();
  }
}

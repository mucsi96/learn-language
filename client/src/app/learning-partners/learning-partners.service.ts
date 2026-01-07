import { Injectable, inject, resource, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fetchJson } from '../utils/fetchJson';

export interface LearningPartner {
  id: number;
  name: string;
  isActive: boolean;
}

export interface LearningPartnerRequest {
  name: string;
  isActive?: boolean;
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

  async createPartner(request: LearningPartnerRequest): Promise<LearningPartner> {
    const result = await fetchJson<LearningPartner>(
      this.http,
      '/api/learning-partners',
      {
        method: 'POST',
        body: request,
      }
    );
    this.partners.reload();
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
    this.partners.reload();
    return result;
  }

  async deletePartner(id: number): Promise<void> {
    await fetchJson(this.http, `/api/learning-partners/${id}`, {
      method: 'DELETE',
    });
    this.partners.reload();
  }

  async setActivePartner(partner: LearningPartner): Promise<void> {
    await this.updatePartner(partner.id, {
      name: partner.name,
      isActive: !partner.isActive,
    });
  }
}

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { fetchJson } from './utils/fetchJson';

@Injectable({
  providedIn: 'root',
})
export class ReadinessService {
  private readonly http = inject(HttpClient);

  async updateCardReadiness(cardId: string, readiness: string) {
    await fetchJson(this.http, `/api/card/${cardId}`, {
      method: 'PUT',
      body: { readiness },
    });
  }
}
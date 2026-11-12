import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Example } from './parser/types';
import { MultiModelService } from './multi-model.service';
import { fetchJson } from './utils/fetchJson';

@Injectable({ providedIn: 'root' })
export class SpeakerGenderService {
  private readonly http = inject(HttpClient);
  private readonly multiModelService = inject(MultiModelService);

  classify(sentence: string): Promise<Pick<Example, 'speakerGenderHint'>> {
    return this.multiModelService.call(
      'classification',
      (model, headers) => fetchJson(this.http, `/api/speaker-gender?model=${model}`, {
        method: 'POST',
        body: { sentence },
        headers,
      })
    );
  }
}

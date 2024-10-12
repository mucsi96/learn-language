import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { shareReplay, tap } from 'rxjs';
import { Source } from './parser/types';
import { handleError } from './utils/handleError';

@Injectable({
  providedIn: 'root',
})
export class SourcesService {
  private readonly http = inject(HttpClient);
  private readonly $sources = this.http.get<Source[]>(`/api/sources`).pipe(
    handleError('Could load sources'),
    tap(() => this.loading.set(false)),
    shareReplay(1)
  );
  private readonly loading = signal(true);

  get sources() {
    return this.$sources;
  }

  get sourcesSignal() {
    return toSignal(this.$sources);
  }

  isLoading() {
    return this.loading;
  }
}

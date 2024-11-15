import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, EMPTY, filter, map, shareReplay, switchMap, tap } from 'rxjs';
import { PopulatedWord, Word } from './parser/types';
import { handleError } from './utils/handleError';

@Injectable({
  providedIn: 'root',
})
export class WordService {
  private readonly loading = signal(true);
  private readonly http = inject(HttpClient);
  private readonly $selectedWord = new BehaviorSubject<Word | undefined>(
    undefined
  );
  readonly $populatedWord = this.$selectedWord.pipe(
    filter((word) => !!word),
    tap(() => this.loading.set(true)),
    switchMap((word) => {
      return this.http.post<PopulatedWord>('/api/prepopulate', word).pipe(
        handleError('Could not load word'),
        tap(() => this.loading.set(false))
      );
    }),
    shareReplay(1)
  );

  selectWord(word: Word) {
    this.$selectedWord.next(word);
  }

  get hungarian() {
    return toSignal(this.$populatedWord.pipe(map((word) => word.hungarian)));
  }

  get swissGerman() {
    return toSignal(this.$populatedWord.pipe(map((word) => word.swissGerman)));
  }

  get isLoading() {
    return this.loading;
  }
}

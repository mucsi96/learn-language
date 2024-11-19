import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  EMPTY,
  filter,
  map,
  shareReplay,
  switchMap,
  tap,
} from 'rxjs';
import { Translation, Word } from './parser/types';
import { handleError } from './utils/handleError';

@Injectable({
  providedIn: 'root',
})
export class WordService {
  private readonly http = inject(HttpClient);
  private readonly $selectedWord = new BehaviorSubject<Word | undefined>(
    undefined
  );
  private readonly hungarianTranslationLoading = signal(true);
  readonly $hungarianTranslation = this.$selectedWord.pipe(
    filter((word) => !!word),
    tap(() => this.hungarianTranslationLoading.set(true)),
    switchMap((word) => {
      return this.http.post<Translation>('/api/translate/hu', word).pipe(
        handleError('Could not load word'),
        tap(() => this.hungarianTranslationLoading.set(false))
      );
    }),
    shareReplay(1)
  );
  private readonly swissGermanTranslationLoading = signal(true);
  readonly $swissGermanTranslation = this.$selectedWord.pipe(
    filter((word) => !!word),
    tap(() => this.swissGermanTranslationLoading.set(true)),
    switchMap((word) => {
      return this.http.post<Translation>('/api/translate/ch', word).pipe(
        handleError('Could not load word'),
        tap(() => this.swissGermanTranslationLoading.set(false))
      );
    }),
    shareReplay(1)
  );
  private readonly englishTranslationLoading = signal(true);
  readonly $englishTranslation = this.$selectedWord.pipe(
    filter((word) => !!word),
    tap(() => this.englishTranslationLoading.set(true)),
    switchMap((word) => {
      return this.http.post<Translation>('/api/translate/en', word).pipe(
        handleError('Could not load word'),
        tap(() => this.englishTranslationLoading.set(false))
      );
    }),
    shareReplay(1)
  );

  selectWord(word: Word) {
    this.$selectedWord.next(word);
  }

  get isLoading() {
    return computed(() =>
      this.hungarianTranslationLoading() ||
      this.swissGermanTranslationLoading() ||
      this.englishTranslationLoading()
    );
  }

  get hungarianTranslation() {
    return toSignal(this.$hungarianTranslation);
  }

  get swissGermanTranslation() {
    return toSignal(this.$swissGermanTranslation);
  }

  get englishTranslation() {
    return toSignal(this.$englishTranslation);
  }
}

import {
  Component,
  HostListener,
  computed,
  effect,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BarLoaderComponent } from '@mucsi96/angular-material-theme';
import { SourcesService } from '../sources.service';
import { injectParams } from '../utils/inject-params';
import { WordDropZoneComponent } from './word-drop-zone/word-drop-zone.component';
import { WordTriageDeckComponent } from './word-triage-deck/word-triage-deck.component';
import { WordImportService } from './word-import.service';
import {
  WordImportCandidate,
  WordImportDecision,
  WordImportStageResult,
  WordImportWord,
} from './word-import.types';

const KEY_DECISIONS: Record<string, WordImportDecision> = {
  ArrowLeft: 'known',
  k: 'known',
  ArrowRight: 'card',
  n: 'card',
};

const UNDO_KEYS = ['Backspace', 'u'];

@Component({
  selector: 'app-word-import',
  standalone: true,
  imports: [
    RouterLink,
    BarLoaderComponent,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
    WordDropZoneComponent,
    WordTriageDeckComponent,
  ],
  templateUrl: './word-import.component.html',
  styleUrl: './word-import.component.css',
})
export class WordImportComponent {
  private readonly routeSourceId = injectParams('sourceId');
  private readonly wordImportService = inject(WordImportService);
  private readonly sourcesService = inject(SourcesService);
  private readonly snackBar = inject(MatSnackBar);

  readonly sourceId = computed(() => String(this.routeSourceId()));

  readonly source = computed(() =>
    (this.sourcesService.sources.value() ?? []).find(
      (source) => source.id === this.sourceId()
    )
  );

  readonly loading = this.wordImportService.queue.isLoading;
  readonly pendingSyncCount = this.wordImportService.pendingSyncCount;
  readonly failedSyncCount = this.wordImportService.failedSyncCount;

  readonly candidates = computed<WordImportCandidate[]>(
    () => this.wordImportService.queue.value()?.candidates ?? []
  );

  private readonly loadedStats = computed(
    () => this.wordImportService.queue.value()?.stats
  );

  readonly index = linkedSignal<WordImportCandidate[], number>({
    source: this.candidates,
    computation: () => 0,
  });

  readonly decisions = linkedSignal<
    WordImportCandidate[],
    readonly WordImportDecision[]
  >({
    source: this.candidates,
    computation: () => [],
  });

  readonly staging = signal(false);
  readonly stageResult = signal<WordImportStageResult | null>(null);

  readonly remainingCandidates = computed(() =>
    this.candidates().slice(this.index())
  );

  readonly knownCount = computed(
    () =>
      (this.loadedStats()?.knownCount ?? 0) +
      this.decisions().filter((decision) => decision === 'known').length
  );

  readonly cardCount = computed(
    () =>
      (this.loadedStats()?.cardCount ?? 0) +
      this.decisions().filter((decision) => decision === 'card').length
  );

  readonly leftCount = computed(() => this.remainingCandidates().length);

  readonly decidedCount = computed(() => this.knownCount() + this.cardCount());

  readonly totalCount = computed(() => this.decidedCount() + this.leftCount());

  readonly triaging = computed(() => this.leftCount() > 0);

  readonly finished = computed(
    () => this.leftCount() === 0 && this.decidedCount() > 0
  );

  readonly showDropZone = computed(
    () => this.leftCount() === 0 && this.decidedCount() === 0
  );

  readonly progress = computed(() => {
    const total = this.totalCount();
    return total === 0 ? 0 : ((total - this.leftCount()) / total) * 100;
  });

  readonly canUndo = computed(() => this.index() > 0);

  constructor() {
    effect(() => this.wordImportService.setSource(this.sourceId()));
  }

  @HostListener('document:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    if (!this.triaging()) {
      return;
    }

    const target = event.target as HTMLElement | null;

    if (target?.closest('input, textarea, select')) {
      return;
    }

    if (UNDO_KEYS.includes(event.key)) {
      event.preventDefault();
      this.undo();
      return;
    }

    const decision = KEY_DECISIONS[event.key];

    if (decision) {
      event.preventDefault();
      this.decide(decision);
    }
  }

  async stageWords(words: WordImportWord[]): Promise<void> {
    this.staging.set(true);

    try {
      const result = await this.wordImportService.stageWords(
        this.sourceId(),
        words
      );
      this.stageResult.set(result);
      this.sourcesService.refetchSources();

      if (result.stagedCount === 0) {
        this.snackBar.open(
          'No new words to triage in this file',
          'Dismiss',
          { duration: 5000 }
        );
      }
    } catch {
      this.snackBar.open('Could not stage the word list', 'Dismiss', {
        duration: 5000,
      });
    } finally {
      this.staging.set(false);
    }
  }

  decide(decision: WordImportDecision): void {
    const candidate = this.remainingCandidates()[0];

    if (!candidate) {
      return;
    }

    this.decisions.update((decisions) => [...decisions, decision]);
    this.index.update((index) => index + 1);
    this.wordImportService.decide(this.sourceId(), candidate.id, decision);
  }

  undo(): void {
    const previousIndex = this.index() - 1;
    const candidate = this.candidates()[previousIndex];

    if (!candidate) {
      return;
    }

    this.decisions.update((decisions) => decisions.slice(0, -1));
    this.index.set(previousIndex);
    this.wordImportService.undoDecision(this.sourceId(), candidate.id);
  }

  async finish(): Promise<void> {
    try {
      await this.wordImportService.clearQueue(this.sourceId());
      this.stageResult.set(null);
      this.sourcesService.refetchSources();
    } catch {
      this.snackBar.open('Could not clear the import queue', 'Dismiss', {
        duration: 5000,
      });
    }
  }
}

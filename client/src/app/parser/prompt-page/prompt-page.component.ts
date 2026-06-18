import {
  Component,
  computed,
  inject,
  linkedSignal,
  resource,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { injectParams } from '../../utils/inject-params';
import { SourcesService } from '../../sources.service';
import { PromptSourceService } from '../../prompt-source.service';
import { MarkdownPipe } from '../../shared/markdown.pipe';
import { CoverageOverviewComponent } from '../../coverage-overview/coverage-overview.component';
import { SimpleCardSuggestion } from '../types';

type PreviewItem = {
  suggestion: SimpleCardSuggestion;
  include: boolean;
};

@Component({
  selector: 'app-prompt-page',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatProgressBarModule,
    MarkdownPipe,
    CoverageOverviewComponent,
  ],
  templateUrl: './prompt-page.component.html',
  styleUrl: './prompt-page.component.css',
})
export class PromptPageComponent {
  private readonly routeSourceId = injectParams('sourceId');
  private readonly sourcesService = inject(SourcesService);
  private readonly promptSourceService = inject(PromptSourceService);

  readonly sourceId = computed(() => {
    const id = this.routeSourceId();
    return id ? String(id) : null;
  });

  readonly source = computed(() =>
    (this.sourcesService.sources.value() ?? []).find(
      (s) => s.id === this.sourceId()
    )
  );

  readonly primaryModel = this.promptSourceService.primaryModel;

  readonly basePrompt = linkedSignal(() => this.source()?.prompt ?? '');
  readonly generationPrompt = signal('');
  readonly count = signal(10);

  readonly savingPrompt = signal(false);
  readonly generating = signal(false);
  readonly creating = signal(false);

  readonly suggestions = signal<PreviewItem[]>([]);
  readonly selectedCount = computed(
    () => this.suggestions().filter((item) => item.include).length
  );

  private readonly coverageVersion = signal(0);

  readonly coverage = resource({
    params: () => {
      const sourceId = this.sourceId();
      const version = this.coverageVersion();
      return sourceId ? { sourceId, version } : undefined;
    },
    loader: async ({ params }) =>
      this.promptSourceService.getCoverage(params.sourceId),
  });

  async savePrompt(): Promise<void> {
    const sourceId = this.sourceId();
    if (!sourceId) {
      return;
    }
    this.savingPrompt.set(true);
    try {
      await this.sourcesService.updateSource(sourceId, {
        prompt: this.basePrompt(),
      });
    } finally {
      this.savingPrompt.set(false);
    }
  }

  async generate(): Promise<void> {
    const sourceId = this.sourceId();
    if (!sourceId) {
      return;
    }
    this.generating.set(true);
    try {
      const cards = await this.promptSourceService.generateCards(
        sourceId,
        this.generationPrompt(),
        this.count()
      );
      this.suggestions.set(cards.map((suggestion) => ({ suggestion, include: true })));
    } finally {
      this.generating.set(false);
    }
  }

  toggleInclude(index: number, include: boolean): void {
    this.suggestions.update((items) =>
      items.map((item, i) => (i === index ? { ...item, include } : item))
    );
  }

  async createSelected(): Promise<void> {
    const sourceId = this.sourceId();
    if (!sourceId) {
      return;
    }
    const selected = this.suggestions()
      .filter((item) => item.include)
      .map((item) => item.suggestion);
    if (selected.length === 0) {
      return;
    }
    this.creating.set(true);
    try {
      await this.promptSourceService.createCards(sourceId, selected);
      this.suggestions.set([]);
      this.coverageVersion.update((v) => v + 1);
      this.sourcesService.refetchSources();
    } finally {
      this.creating.set(false);
    }
  }

  refreshCoverage(): void {
    this.coverageVersion.update((v) => v + 1);
  }
}

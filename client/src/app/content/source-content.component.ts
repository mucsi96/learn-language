import { Component, computed, effect, inject, resource, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { BarLoaderComponent } from '@mucsi96/angular-material-theme';
import { injectParams, injectRouteData } from '../utils/inject-params';
import { SourcesService } from '../sources.service';
import { SourceExtensionsService } from './source-extensions.service';
import { ContentService, contentError } from './content.service';
import { ContentPlayerComponent } from './content-player.component';
import { formatPosition } from './content.types';

@Component({
  selector: 'app-source-content',
  imports: [RouterLink, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatInputModule, MatIconModule,
    BarLoaderComponent, ContentPlayerComponent],
  templateUrl: './source-content.component.html',
  styleUrl: './source-content.component.css',
})
export class SourceContentComponent {
  private readonly service = inject(ContentService);
  private readonly sources = inject(SourcesService);
  private readonly extensions = inject(SourceExtensionsService);
  private readonly sourceParam = injectParams('sourceId');
  private readonly contentParam = injectParams('contentId');
  private readonly mode = injectRouteData('contentMode');
  readonly sourceId = computed(() => String(this.sourceParam()));
  readonly contentId = computed(() => this.contentParam() ? String(this.contentParam()) : undefined);
  readonly admin = computed(() => this.mode() === 'content');
  readonly route = computed(() => this.admin() ? 'content' : 'listen');
  readonly source = computed(() => this.sources.sources.value()?.find(source => source.id === this.sourceId()));
  readonly descriptor = computed(() => this.extensions.descriptor(this.source()));
  readonly listing = resource({ params: () => this.sourceId(), loader: ({ params }) => this.service.list(params) });
  readonly detail = resource({
    params: () => this.contentId() ? { source: this.sourceId(), content: this.contentId()! } : undefined,
    loader: ({ params }) => this.service.detail(params.source, params.content),
  });
  readonly search = signal('');
  readonly selected = signal<string[]>([]);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  private readonly preparedRequest = signal<string | null>(null);
  readonly items = computed(() => {
    const items = (this.listing.hasValue() ? this.listing.value() : []).filter(item =>
      `${item.metadata.title} ${item.metadata.number} ${item.metadata.languageLevel}`.toLocaleLowerCase().includes(this.search().toLocaleLowerCase()));
    return items;
  });
  readonly missing = computed(() => this.detail.value()?.words.filter(word => word.status === 'missing') ?? []);
  readonly unresolved = computed(() => this.detail.value()?.words.filter(word => word.status !== 'satisfied') ?? []);
  readonly processing = computed(() => ['queued', 'processing'].includes(this.detail.value()?.status ?? ''));
  readonly formatPosition = formatPosition;
  readonly labels = { missing: 'Missing card', not_ready: 'Card not ready', unreviewed: 'Not yet studied', satisfied: 'Ready and studied' };

  constructor() {
    effect(() => {
      const item = this.detail.value();
      if (this.admin() && item?.status === 'unprepared' && !item.metadata.matchError && this.preparedRequest() !== item.id) {
        this.preparedRequest.set(item.id);
        untracked(() => void this.prepare());
      }
    });
    effect(onCleanup => {
      if (!this.processing()) return;
      const timer = setInterval(() => this.detail.reload(), 1200);
      onCleanup(() => clearInterval(timer));
    });
    effect(() => { this.contentId(); this.selected.set([]); });
  }

  toggle(key: string, checked: boolean): void {
    this.selected.update(keys => checked ? [...keys, key] : keys.filter(value => value !== key));
  }

  async prepare(): Promise<void> {
    await this.run(() => this.service.action(this.sourceId(), this.contentId(), 'prepare'));
  }

  async refresh(): Promise<void> {
    await this.run(() => this.service.action(this.sourceId(), undefined, 'refresh'));
  }

  async drafts(): Promise<void> {
    await this.run(() => this.service.action(this.sourceId(), this.contentId(), 'drafts', { wordKeys: this.selected() }));
    this.selected.set([]);
    this.sources.refetchSources();
  }

  async markKnown(): Promise<void> {
    await this.run(() => this.service.action(this.sourceId(), this.contentId(), 'known', { wordKeys: this.selected() }));
    this.selected.set([]);
  }

  private async run(operation: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await operation();
      this.detail.reload();
      this.listing.reload();
    } catch (error) {
      this.error.set(contentError(error));
    } finally {
      this.busy.set(false);
    }
  }
}

import {
  Component,
  computed,
  inject,
  signal,
  Injector,
  resource,
  linkedSignal,
  ResourceRef,
  untracked,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MostDueCardService } from '../../most-due-card.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { HttpClient } from '@angular/common/http';
import { fetchAsset } from '../../utils/fetchAsset';
import { ExampleImage } from '../../parser/types';

type ImageResource = ExampleImage & { url: string };
type Grade = 'Again' | 'Hard' | 'Good' | 'Easy';

@Component({
  selector: 'app-flashcard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
  ],
  templateUrl: './flashcard.component.html',
  styleUrl: './flashcard.component.css',
})
export class FlashcardComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly mostDueCardService = inject(MostDueCardService);
  private readonly http = inject(HttpClient);
  private readonly injector = inject(Injector);

  readonly isRevealed = signal(false);
  readonly sourceId = computed(
    () => this.route.snapshot.paramMap.get('sourceId') ?? ''
  );
  readonly card = this.mostDueCardService.getMostDueCard(this.sourceId());
  readonly selectedExample = computed(() =>
    this.card.value()?.examples?.find((ex) => ex.isSelected)
  );
  readonly word = computed(() =>
    this.isRevealed()
      ? this.card.value()?.word
      : this.card.value()?.translation?.['hu']
  );
  readonly forms = computed(() => this.card.value()?.forms);

  readonly example = computed(() =>
    this.isRevealed()
      ? this.selectedExample()?.['de']
      : this.selectedExample()?.['hu']
  );

  readonly exampleImages = linkedSignal(() => {
    const example = this.selectedExample();

    return untracked(() => {
      if (!example?.images?.length) return [];

      return example.images
        .filter((img) => img.isFavorite)
        .map((image) =>
          resource<ImageResource, never>({
            injector: this.injector,
            loader: async () => {
              return {
                ...image,
                url: await fetchAsset(
                  this.http,
                  `/api/image/${image.id}?width=1200&height=1200`
                ),
              };
            },
          })
        );
    });
  });

  toggleReveal() {
    this.isRevealed.update((revealed) => !revealed);
  }

  async gradeCard(grade: Grade) {
    const cardId = this.card.value()?.id;
    if (!cardId) return;

    try {
      await this.http.post(`/api/cards/${cardId}/grade`, { grade }).toPromise();
      // Reload the page to get the next card
      await this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { t: Date.now() },
        queryParamsHandling: 'merge',
      });
      this.isRevealed.set(false);
    } catch (error) {
      console.error('Error grading card:', error);
    }
  }
}

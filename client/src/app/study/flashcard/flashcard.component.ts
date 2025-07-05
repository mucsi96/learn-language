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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MostDueCardService } from '../../most-due-card.service';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
import { fetchAsset } from '../../utils/fetchAsset';
import { ExampleImage } from '../../parser/types';

type ImageResource = ExampleImage & { url: string };

@Component({
  selector: 'app-flashcard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './flashcard.component.html',
  styleUrl: './flashcard.component.css',
})
export class FlashcardComponent {
  private readonly route = inject(ActivatedRoute);
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
                  `/api/image/${image.id}?width=600&height=600`
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
}

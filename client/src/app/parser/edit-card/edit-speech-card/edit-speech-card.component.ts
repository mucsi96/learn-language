import {
  Component,
  input,
  output,
  computed,
  inject,
  linkedSignal,
  untracked,
  effect,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule, MatLabel } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Card, CardData } from '../../types';
import {
  ImageGridComponent,
  GridImageResource,
} from '../../../shared/image-grid/image-grid.component';
import { ImageResourceService } from '../../../shared/image-resource.service';

@Component({
  selector: 'app-edit-speech-card',
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatLabel,
    MatInputModule,
    MatButtonModule,
    MatIcon,
    MatProgressSpinnerModule,
    ImageGridComponent,
  ],
  templateUrl: './edit-speech-card.component.html',
  styleUrl: './edit-speech-card.component.css',
})
export class EditSpeechCardComponent {
  selectedCardId = input<string | undefined>();
  selectedSourceId = input<string | undefined>();
  selectedPageNumber = input<number | undefined>();
  card = input<Card | undefined>();
  cardUpdate = output<Partial<Card>>();
  saveRequested = output<void>();
  markAsReviewedAvailable = output<boolean>();

  private readonly imageResourceService = inject(ImageResourceService);
  readonly sentence = linkedSignal(() => this.card()?.data.examples?.[0]?.de);
  readonly hungarianTranslation = linkedSignal(
    () => this.card()?.data.examples?.[0]?.hu
  );
  readonly englishTranslation = linkedSignal(
    () => this.card()?.data.examples?.[0]?.en
  );

  readonly images = linkedSignal<GridImageResource[]>(() => {
    return untracked(() => {
      if (!this.selectedCardId()) {
        return [];
      }

      const example = this.card()?.data.examples?.[0];
      return (
        example?.images?.map((image) =>
          this.imageResourceService.createResource(image)
        ) ?? []
      );
    });
  });

  readonly canMarkAsReviewed = computed(() => {
    if (this.card()?.readiness !== 'IN_REVIEW') {
      return false;
    }

    const currentImages = this.images();
    if (!currentImages || currentImages.length === 0) {
      return false;
    }

    return currentImages.some((imageResource) => {
      const imageValue = imageResource.value();
      return imageValue?.isFavorite === true;
    });
  });

  constructor() {
    effect(() => {
      const cardData = this.getCardData();
      if (cardData) {
        this.cardUpdate.emit(cardData);
      }
    });

    effect(() => {
      this.markAsReviewedAvailable.emit(this.canMarkAsReviewed());
    });
  }

  async addImage() {
    const englishTranslation = this.englishTranslation();
    if (!englishTranslation) return;

    const { placeholders, done } =
      this.imageResourceService.generateImages(englishTranslation);

    this.images.update((imgs) => [...imgs, ...placeholders]);

    await done;

    const cardData = this.getCardData();
    if (cardData) {
      this.cardUpdate.emit(cardData);
    }
    this.saveRequested.emit();
  }

  areImagesLoading() {
    const imgs = this.images() || [];
    return imgs.some((image) => image.isLoading());
  }

  onFavoriteToggled(imageIdx: number) {
    const imgs = this.images();
    if (!imgs?.length) return;

    const image = imgs[imageIdx];
    if (!image || image.isLoading()) return;

    this.imageResourceService.toggleFavorite(image);
    this.images.update((currentImages) => [...currentImages]);
  }

  private getCardData():
    | Omit<
        Card,
        | 'due'
        | 'stability'
        | 'readiness'
        | 'difficulty'
        | 'elapsedDays'
        | 'scheduledDays'
        | 'learningSteps'
        | 'reps'
        | 'lapses'
        | 'state'
      >
    | undefined {
    const sourceId = this.selectedSourceId();
    const pageNumber = this.selectedPageNumber();
    const cardId = this.selectedCardId();
    const sentenceText = this.sentence();

    if (!cardId || !sentenceText || !sourceId || !pageNumber) {
      return;
    }

    const data: CardData = {
      examples: [
        {
          de: sentenceText,
          hu: this.hungarianTranslation(),
          en: this.englishTranslation(),
          isSelected: true,
          images: this.imageResourceService.toExampleImages(this.images()),
        },
      ],
      audio: this.card()?.data.audio || [],
    };

    return {
      id: cardId,
      source: { id: sourceId },
      sourcePageNumber: pageNumber,
      data,
    };
  }
}

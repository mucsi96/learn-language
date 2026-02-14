import {
  Component,
  input,
  output,
  computed,
  inject,
  linkedSignal,
  untracked,
  effect,
  viewChild,
  ElementRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule, MatLabel } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { Card, CardData } from '../../types';
import {
  ImageGridComponent,
  GridImageResource,
} from '../../../shared/image-grid/image-grid.component';
import { ImageResourceService } from '../../../shared/image-resource.service';
import { createGrammarGapRegex } from '../../../shared/constants/grammar.constants';

@Component({
  selector: 'app-edit-grammar-card',
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatLabel,
    MatInputModule,
    MatButtonModule,
    MatIcon,
    MatProgressSpinnerModule,
    MatChipsModule,
    ImageGridComponent,
  ],
  templateUrl: './edit-grammar-card.component.html',
  styleUrl: './edit-grammar-card.component.css',
})
export class EditGrammarCardComponent {
  selectedCardId = input<string | undefined>();
  selectedSourceId = input<string | undefined>();
  selectedPageNumber = input<number | undefined>();
  card = input<Card | undefined>();
  cardUpdate = output<Partial<Card>>();
  saveRequested = output<void>();
  markAsReviewedAvailable = output<boolean>();

  private readonly imageResourceService = inject(ImageResourceService);
  private readonly sentenceInput = viewChild<ElementRef<HTMLTextAreaElement>>('sentenceInput');

  readonly sentence = linkedSignal(() => this.card()?.data.examples?.[0]?.de);
  readonly englishTranslation = linkedSignal(
    () => this.card()?.data.examples?.[0]?.en
  );

  readonly gapsDisplay = computed(() => {
    const sentence = this.sentence() ?? '';
    const matches = [...sentence.matchAll(createGrammarGapRegex())];
    return matches.map((match) => ({
      text: match[1],
    }));
  });

  readonly sentenceWithGaps = computed(() => {
    const sentence = this.sentence() ?? '';
    return sentence.replace(createGrammarGapRegex(), (_match, content) => '_'.repeat(content.length));
  });

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

  addGapFromSelection() {
    const textarea = this.sentenceInput()?.nativeElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (start === end) return;

    const currentSentence = this.sentence() ?? '';
    const selectedText = currentSentence.slice(start, end);

    if (selectedText.includes('[') || selectedText.includes(']')) return;
    if (selectedText.trim().length === 0) return;

    const newSentence =
      currentSentence.slice(0, start) +
      '[' + selectedText + ']' +
      currentSentence.slice(end);

    this.sentence.set(newSentence);
  }

  removeGap(indexToRemove: number) {
    const gaps = this.gapsDisplay();
    if (indexToRemove < 0 || indexToRemove >= gaps.length) return;

    const currentSentence = this.sentence() ?? '';
    const matches = [...currentSentence.matchAll(createGrammarGapRegex())];

    const newSentence = matches.reduceRight(
      (sentence, match, idx) =>
        idx === indexToRemove
          ? sentence.slice(0, match.index) + match[1] + sentence.slice(match.index + match[0].length)
          : sentence,
      currentSentence
    );

    this.sentence.set(newSentence);
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

import { Component, effect, inject, linkedSignal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  WORD_TYPE_TRANSLATIONS,
} from '../../shared/word-type-translations';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CardService } from '../../card.service';
import { injectQueryParams } from '../../utils/inject-query-params';
import { queryParamToObject } from '../../utils/queryCompression';
import { Word } from '../types';
import { ConfirmDialogComponent } from './confirm-dialog/confirm-dialog.component';
import { GENDER_TRANSLATIONS } from '../../shared/gender-translations';
import { InReviewCardsService } from '../../in-review-cards.service';

@Component({
  selector: 'app-card',
  imports: [
    MatButtonModule,
    FormsModule,
    MatFormFieldModule,
    MatLabel,
    MatInputModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatIcon,
    MatRadioModule,
    MatSelectModule,
    RouterModule,
  ],
  templateUrl: './card.component.html',
  styleUrl: './card.component.css',
})
export class CardComponent {
  readonly cardService = inject(CardService);
  readonly inReviewCardsService = inject(InReviewCardsService);
  readonly route = inject(ActivatedRoute);
  readonly cardData = injectQueryParams<string>('cardData');
  readonly dialog = inject(MatDialog);
  readonly snackBar = inject(MatSnackBar);
  readonly wordTypeOptions = WORD_TYPE_TRANSLATIONS;
  readonly genderOptions = GENDER_TRANSLATIONS;

  exampleImageCarouselIndices = linkedSignal<number[]>(() => {
    const examples = this.cardService.examples();
    return examples?.map(() => 0) ?? []
  });

  readonly backNavigationUrl = computed(() => {
    const card = this.cardService.card.value();
    const readiness = card?.readiness;
    const sourceId = this.cardService.selectedSourceId();
    const pageNumber = this.cardService.selectedPageNumber();

    if (readiness === 'IN_REVIEW' || readiness === 'REVIEWED') {
      return ['/in-review-cards'];
    }

    return ['/sources', sourceId, 'page', pageNumber];
  });

  readonly isInReview = computed(() => {
    const card = this.cardService.card.value();
    return card?.readiness === 'IN_REVIEW';
  });

  readonly canMarkAsReviewed = computed(() => {
    if (!this.isInReview()) {
      return false;
    }

    // Check if there is a selected example
    const selectedExampleIndex = this.cardService.selectedExampleIndex();
    const examples = this.cardService.examples();

    if (!examples || selectedExampleIndex < 0 || selectedExampleIndex >= examples.length) {
      return false;
    }

    // Check if the selected example has a favorite image
    const exampleImages = this.cardService.exampleImages();
    const selectedExampleImages = exampleImages?.[selectedExampleIndex];

    if (!selectedExampleImages || selectedExampleImages.length === 0) {
      return false;
    }

    // Check if at least one image in the selected example is marked as favorite
    return selectedExampleImages.some(imageResource => {
      const imageValue = imageResource.value();
      return imageValue?.isFavorite === true;
    });
  });

  constructor() {
    this.route.params.subscribe((params) => {
      this.cardService.selectedSourceId.set(params['sourceId']);
      this.cardService.selectedPageNumber.set(parseInt(params['pageNumber']));
    });
    effect(async () => {
      const cardData = this.cardData();

      if (typeof cardData !== 'string') {
        return;
      }

      const word = await queryParamToObject<Word>(cardData);
      this.cardService.selectWord(word);
    });
  }

  addImage(exampleIdx: number) {
    const length = this.cardService.addExampleImage(exampleIdx).length;
    this.exampleImageCarouselIndices.update((indices) => {
      indices[exampleIdx] = length - 1;
      return indices;
    });
  }

  areImagesLoading(exampleIdx: number) {
    const images = this.cardService.exampleImages()?.[exampleIdx] || [];
    return images.some((image) => image.isLoading());
  }

  prevImage(exampleIdx: number) {
    const images = this.cardService.exampleImages()?.[exampleIdx] || [];
    if (!images.length) return;
    this.exampleImageCarouselIndices.update((indices) => {
      indices[exampleIdx] =
        (indices[exampleIdx] - 1 + images.length) % images.length;
      return indices;
    });
  }

  nextImage(exampleIdx: number) {
    const images = this.cardService.exampleImages()?.[exampleIdx] || [];
    if (!images.length) return;
    this.exampleImageCarouselIndices.update((indices) => {
      indices[exampleIdx] =
        (indices[exampleIdx] + 1) % images.length;
      return indices;
    });
  }

  private showSnackBar(message: string) {
    this.snackBar
      .open(message, 'Close', {
        duration: 3000,
        verticalPosition: 'top',
        panelClass: ['success'],
      });
  }

  async createCard() {
    await this.cardService.createCard();
    this.showSnackBar('Card created successfully');
  }

  async updateCard() {
    await this.cardService.updateCard();
    this.showSnackBar('Card updated successfully');
  }

  async markAsReviewed() {
    // First save any changes to the card (same as update button)
    await this.cardService.updateCard();
    // Then mark it as reviewed
    await this.cardService.markAsReviewed();
    this.cardService.card.reload();
    this.inReviewCardsService.refetchCards();
    this.showSnackBar('Card marked as reviewed successfully');
  }

  async confirmDeleteCard() {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '250px',
      data: { message: 'Are you sure you want to delete this card?' },
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        await this.cardService.deleteCard();
        this.showSnackBar('Card deleted successfully');
      }
    });
  }

  async toggleFavorite(exampleIdx: number, imageIdx: number) {
    const images = this.cardService.exampleImages()?.[exampleIdx];
    if (!images?.length) return;

    const image = images[imageIdx];
    if (!image || image.isLoading()) return;

    const imageValue = image.value();
    if (!imageValue) return;

    image.set({
      ...imageValue,
      isFavorite: !imageValue.isFavorite
    });
  }
}

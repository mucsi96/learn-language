import { Component, inject, computed } from '@angular/core';
import { AsyncPipe, CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { RouterLink } from '@angular/router';
import { InReviewCardsService } from '../in-review-cards.service';
import { CompressQueryPipe } from '../utils/compress-query.pipe';
import { getWordTypeInfo } from '../shared/word-type-translations';
import { getGenderInfo } from '../shared/gender-translations';

export interface BackendCard {
  id: string;
  source: {
    id: string;
    name: string;
  };
  sourcePageNumber: number;
  data: {
    word: string;
    type?: string;
    gender?: string;
    translation?: Record<string, string>;
    forms?: string[];
    examples?: Array<{
      de?: string;
      hu?: string;
      ch?: string;
      en?: string;
      isSelected?: boolean;
      images?: Array<{ id: string; isFavorite?: boolean }>;
    }>;
  };
}

@Component({
  selector: 'app-in-review-cards',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    RouterLink,
    AsyncPipe,
    CompressQueryPipe,
  ],
  templateUrl: './in-review-cards.component.html',
  styleUrl: './in-review-cards.component.css',
})
export class InReviewCardsComponent {
  private readonly inReviewCardsService = inject(InReviewCardsService);

  readonly cards = this.inReviewCardsService.cards.value;
  readonly loading = computed(() => this.inReviewCardsService.cards.isLoading());

  readonly displayedColumns: string[] = [
    'word',
    'type',
    'translation',
    'source',
  ];

  readonly skeletonData = Array(5).fill({}); // Create 5 empty objects for skeleton rows

  getWordTypeInfo(type: string | undefined) {
    return type ? getWordTypeInfo(type) : undefined;
  }

  getGenderInfo(gender: string | undefined) {
    return gender ? getGenderInfo(gender) : undefined;
  }

  getTranslationText(card: BackendCard): string {
    const translations = [];
    if (card.data.translation?.['hu']) translations.push(`HU: ${card.data.translation['hu']}`);
    if (card.data.translation?.['en']) translations.push(`EN: ${card.data.translation['en']}`);
    if (card.data.translation?.['ch']) translations.push(`CH: ${card.data.translation['ch']}`);
    return translations.join(' • ');
  }
}

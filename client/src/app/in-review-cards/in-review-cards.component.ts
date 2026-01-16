import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { RouterLink } from '@angular/router';
import { InReviewCardsService } from '../in-review-cards.service';
import { BatchAudioCreationFabComponent } from '../batch-audio-creation-fab/batch-audio-creation-fab.component';
import { Card } from '../parser/types';
import { CardTypeRegistry } from '../cardTypes/card-type.registry';

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
    BatchAudioCreationFabComponent,
  ],
  templateUrl: './in-review-cards.component.html',
  styleUrl: './in-review-cards.component.css',
})
export class InReviewCardsComponent {
  private readonly inReviewCardsService = inject(InReviewCardsService);
  private readonly cardTypeRegistry = inject(CardTypeRegistry);

  readonly cards = this.inReviewCardsService.cards.value;
  readonly loading = computed(() => this.inReviewCardsService.cards.isLoading());

  readonly displayedColumns: string[] = [
    'word',
    'type',
    'translation',
    'source',
  ];

  readonly skeletonData = Array(5).fill({});

  getTranslationText(card: Card): string {
    const translations = [];
    if (card.data.translation?.['hu']) translations.push(`HU: ${card.data.translation['hu']}`);
    if (card.data.translation?.['en']) translations.push(`EN: ${card.data.translation['en']}`);
    if (card.data.translation?.['ch']) translations.push(`CH: ${card.data.translation['ch']}`);
    return translations.join(' • ');
  }

  getDisplayLabel(card: Card): string {
    const strategy = this.cardTypeRegistry.getStrategy(card.source.cardType);
    return strategy.getCardDisplayLabel(card);
  }

  getTypeLabel(card: Card): string {
    const strategy = this.cardTypeRegistry.getStrategy(card.source.cardType);
    return strategy.getCardTypeLabel(card);
  }

  getAdditionalInfo(card: Card): string | undefined {
    const strategy = this.cardTypeRegistry.getStrategy(card.source.cardType);
    return strategy.getCardAdditionalInfo(card);
  }
}

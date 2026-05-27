import {
  Component,
  input,
  output,
  computed,
  linkedSignal,
  effect,
  viewChild,
  ElementRef,
} from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { MatFormFieldModule, MatLabel } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { Card, CardData } from '../../types';
import { createGrammarGapRegex } from '../../../shared/constants/grammar.constants';

@Component({
  selector: 'app-edit-grammar-card',
  imports: [
    FormField,
    MatFormFieldModule,
    MatLabel,
    MatInputModule,
    MatButtonModule,
    MatIcon,
    MatTooltipModule,
    MatChipsModule,
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

  private readonly sentenceInput = viewChild<ElementRef<HTMLTextAreaElement>>('sentenceInput');

  readonly formModel = linkedSignal(() => ({
    sentence: this.card()?.data.examples?.[0]?.de ?? '',
    englishTranslation: this.card()?.data.examples?.[0]?.en ?? '',
  }));
  readonly grammarForm = form(this.formModel);

  readonly gapsDisplay = computed(() => {
    const sentence = this.formModel().sentence;
    const matches = [...sentence.matchAll(createGrammarGapRegex())];
    return matches.map((match) => ({
      text: match[1],
    }));
  });

  readonly sentenceWithGaps = computed(() => {
    const sentence = this.formModel().sentence;
    return sentence.replace(createGrammarGapRegex(), (_match, content) => '_'.repeat(content.length));
  });

  readonly canMarkAsReviewed = computed(() => {
    if (this.card()?.readiness !== 'IN_REVIEW') {
      return false;
    }

    return this.gapsDisplay().length > 0;
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

    const currentSentence = this.formModel().sentence;
    const selectedText = currentSentence.slice(start, end);

    if (selectedText.includes('[') || selectedText.includes(']')) return;
    if (selectedText.trim().length === 0) return;

    const newSentence =
      currentSentence.slice(0, start) +
      '[' + selectedText + ']' +
      currentSentence.slice(end);

    this.formModel.update((m) => ({ ...m, sentence: newSentence }));
  }

  removeGap(indexToRemove: number) {
    const gaps = this.gapsDisplay();
    if (indexToRemove < 0 || indexToRemove >= gaps.length) return;

    const currentSentence = this.formModel().sentence;
    const matches = [...currentSentence.matchAll(createGrammarGapRegex())];

    const newSentence = matches.reduceRight(
      (sentence, match, idx) =>
        idx === indexToRemove
          ? sentence.slice(0, match.index) + match[1] + sentence.slice(match.index + match[0].length)
          : sentence,
      currentSentence
    );

    this.formModel.update((m) => ({ ...m, sentence: newSentence }));
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
    const { sentence, englishTranslation } = this.formModel();

    if (!cardId || !sentence || !sourceId || !pageNumber) {
      return;
    }

    const existingGrammarTopic = this.card()?.data.grammarTopic;
    const data: CardData = {
      examples: [
        {
          de: sentence,
          en: englishTranslation,
          isSelected: true,
        },
      ],
      audio: this.card()?.data.audio || [],
      ...(existingGrammarTopic ? { grammarTopic: existingGrammarTopic } : {}),
    };

    return {
      id: cardId,
      source: { id: sourceId },
      sourcePageNumber: pageNumber,
      data,
    };
  }
}

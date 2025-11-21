import {
  Component,
  computed,
  input,
  output,
  effect,
  ResourceRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Card } from '../../parser/types';
import { StateComponent } from '../../shared/state/state.component';
import { LanguageTexts } from '../../shared/voice-selection-dialog/voice-selection-dialog.component';

@Component({
  selector: 'app-learn-grammar-card',
  standalone: true,
  imports: [
    CommonModule,
    StateComponent,
  ],
  templateUrl: './learn-grammar-card.component.html',
  styleUrl: './learn-grammar-card.component.css',
})
export class LearnGrammarCardComponent {
  card = input<ResourceRef<Card | null | undefined> | null>(null);
  isRevealed = input<boolean>(false);
  onPlayAudio = input<((texts: string[]) => void) | null>(null);
  languageTextsReady = output<LanguageTexts[]>();

  readonly sentence = computed(() => this.card()?.value()?.data.sentence);
  readonly maskedIndices = computed(() => this.card()?.value()?.data.maskedIndices || []);
  readonly translation = computed(() => this.card()?.value()?.data.translation?.['hu']);

  readonly displaySentence = computed(() => {
    const sentence = this.sentence();
    const maskedIndices = this.maskedIndices();
    const isRevealed = this.isRevealed();

    if (!sentence) return '';

    const words = sentence.split(/\s+/);

    if (isRevealed) {
      return sentence;
    }

    return words.map((word, index) => 
      maskedIndices.includes(index) ? '___' : word
    ).join(' ');
  });

  constructor() {
    effect(() => {
      const sentence = this.displaySentence();
      const playAudioFn = this.onPlayAudio();
      const isRevealed = this.isRevealed();

      if (sentence && playAudioFn && isRevealed) {
        playAudioFn([sentence]);
      }
    });

    effect(() => {
      const card = this.card();
      if (card?.value()) {
        this.languageTextsReady.emit(this.getLanguageTextsForVoiceDialog());
      }
    });
  }

  getLanguageTextsForVoiceDialog(): LanguageTexts[] {
    const card = this.card()?.value();
    if (!card?.data) return [];

    const result: LanguageTexts[] = [];

    if (card.data.sentence) {
      result.push({ language: 'de', texts: [card.data.sentence] });
    }

    if (card.data.translation?.['hu']) {
      result.push({ language: 'hu', texts: [card.data.translation['hu']] });
    }

    return result;
  }
}

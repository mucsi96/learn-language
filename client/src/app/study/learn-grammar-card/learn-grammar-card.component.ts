import {
  Component,
  computed,
  inject,
  input,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateComponent } from '../../shared/state/state.component';
import { CardResourceLike } from '../../shared/types/card-resource.types';
import { createGrammarGapRegex } from '../../shared/constants/grammar.constants';
import { VoiceConfigService } from '../../voice-config/voice-config.service';

type SentencePart = {
  text: string;
  isGap: boolean;
};

@Component({
  selector: 'app-learn-grammar-card',
  standalone: true,
  imports: [CommonModule, StateComponent],
  templateUrl: './learn-grammar-card.component.html',
  styleUrl: './learn-grammar-card.component.css',
  host: { role: 'article', 'aria-label': 'Flashcard' },
})
export class LearnGrammarCardComponent {
  card = input<CardResourceLike | null>(null);
  isRevealed = input<boolean>(false);
  onPlayAudio = input<((texts: string[]) => void) | null>(null);

  private readonly voiceConfigService = inject(VoiceConfigService);

  readonly selectedExample = computed(() =>
    this.card()?.value()?.data.examples?.find((ex) => ex.isSelected)
  );

  readonly sentence = computed(() => this.selectedExample()?.de ?? '');

  readonly hint = computed(() => this.card()?.value()?.data.hint);

  readonly audioSentence = computed(() => {
    if (!this.isRevealed()) return undefined;
    return this.sentence().replace(createGrammarGapRegex(), '$1');
  });

  readonly sentenceParts = computed(() => {
    const sentence = this.sentence();
    return this.buildSentenceParts(sentence);
  });

  constructor() {
    effect(() => {
      const currentSentence = this.audioSentence();
      const playAudioFn = this.onPlayAudio();
      const isRevealed = this.isRevealed();

      if (!isRevealed && this.voiceConfigService.frontAudioDisabled()) {
        return;
      }

      if (currentSentence && playAudioFn) {
        playAudioFn([currentSentence]);
      }
    });
  }

  private buildSentenceParts(sentence: string): SentencePart[] {
    const matches = [...sentence.matchAll(createGrammarGapRegex())];

    if (matches.length === 0) {
      return [{ text: sentence, isGap: false }];
    }

    const { parts, lastIndex } = matches.reduce(
      (acc, match) => {
        const textBefore = match.index > acc.lastIndex
          ? [{ text: sentence.slice(acc.lastIndex, match.index), isGap: false }]
          : [];
        const gapPart = { text: match[1], isGap: true };

        return {
          parts: [...acc.parts, ...textBefore, gapPart],
          lastIndex: match.index + match[0].length,
        };
      },
      { parts: [] as SentencePart[], lastIndex: 0 }
    );

    const remainingText = lastIndex < sentence.length
      ? [{ text: sentence.slice(lastIndex), isGap: false }]
      : [];

    return [...parts, ...remainingText];
  }
}

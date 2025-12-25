import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatChipsModule } from '@angular/material/chips';
import { Card } from '../../parser/types';
import { getWordTypeInfo } from '../../shared/word-type-translations';
import { getGenderInfo } from '../../shared/gender-translations';

@Component({
  selector: 'app-card-preview',
  standalone: true,
  imports: [CommonModule, MatChipsModule],
  templateUrl: './card-preview.component.html',
  styleUrl: './card-preview.component.css',
})
export class CardPreviewComponent {
  card = input.required<Card>();

  readonly word = computed(() => this.card().data?.word);
  readonly translation = computed(() => this.card().data?.translation?.['hu']);
  readonly gender = computed(() => this.card().data?.gender);
  readonly type = computed(() => this.card().data?.type);
  readonly forms = computed(() => this.card().data?.forms);

  readonly selectedExample = computed(() =>
    this.card().data?.examples?.find((ex) => ex.isSelected)
  );

  readonly germanExample = computed(() => this.selectedExample()?.['de']);
  readonly hungarianExample = computed(() => this.selectedExample()?.['hu']);

  readonly genderInfo = computed(() => {
    const gender = this.gender();
    return gender ? getGenderInfo(gender) : undefined;
  });

  readonly wordTypeInfo = computed(() => {
    const type = this.type();
    return type ? getWordTypeInfo(type) : undefined;
  });
}

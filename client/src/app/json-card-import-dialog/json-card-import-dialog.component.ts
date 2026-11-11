import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CardType, CardTypeStrategy } from '../parser/types';
import { CardTypeRegistry } from '../cardTypes/card-type.registry';
import { CARD_TYPE_OPTIONS } from '../cardTypes/card-type-options';
import { JsonCardSuggestion } from '../cardTypes/json-card-import';

export interface JsonCardImportDialogResult {
  cards: JsonCardSuggestion[];
}

type ParseResult =
  | { status: 'empty' }
  | { status: 'invalid'; error: string }
  | { status: 'valid'; cards: JsonCardSuggestion[] };

function parseCardsJson(text: string, strategy: CardTypeStrategy): ParseResult {
  if (!text.trim()) {
    return { status: 'empty' };
  }
  try {
    const parsed: unknown = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      return { status: 'invalid', error: 'Expected a JSON array of cards.' };
    }
    if (parsed.length === 0) {
      return { status: 'invalid', error: 'The array contains no cards.' };
    }
    const errors = parsed.flatMap((item, index) => strategy.jsonImport.validate(item, index));
    if (errors.length > 0) {
      return { status: 'invalid', error: errors.join('\n') };
    }
    const cards = parsed.map((item: Record<string, string>) => {
      const fields = Object.fromEntries(Object.entries(item)
        .map(([key, value]) => [key, value.trim()])
        .filter(([, value]) => value.length > 0));
      return { id: fields['id'], type: strategy.cardType, data: strategy.jsonImport.toData(fields) };
    });
    if (new Set(cards.map(card => card.id)).size !== cards.length) {
      return { status: 'invalid', error: 'Card ids must be unique within an import.' };
    }
    return { status: 'valid', cards };
  } catch (error) {
    return { status: 'invalid', error: `Invalid JSON: ${(error as Error).message}` };
  }
}

@Component({
  selector: 'app-json-card-import-dialog',
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './json-card-import-dialog.component.html',
  styleUrl: './json-card-import-dialog.component.css',
})
export class JsonCardImportDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<JsonCardImportDialogComponent, JsonCardImportDialogResult>);
  private readonly registry = inject(CardTypeRegistry);
  private readonly data = inject<{ cardTypes: CardType[] }>(MAT_DIALOG_DATA);
  readonly cardTypes = CARD_TYPE_OPTIONS.filter(option => this.data.cardTypes.includes(option.code));
  readonly selectedType = signal(this.data.cardTypes[0]);
  readonly strategy = computed(() => this.registry.getStrategy(this.selectedType()));
  readonly exampleJson = computed(() => JSON.stringify([this.strategy().jsonImport.example], null, 2));
  readonly jsonText = signal('');
  readonly parseResult = computed(() => parseCardsJson(this.jsonText(), this.strategy()));
  readonly error = computed(() => {
    const result = this.parseResult();
    return result.status === 'invalid' ? result.error : null;
  });
  readonly cardCount = computed(() => {
    const result = this.parseResult();
    return result.status === 'valid' ? result.cards.length : 0;
  });
  readonly canImport = computed(() => this.parseResult().status === 'valid');

  confirm(): void {
    const result = this.parseResult();
    if (result.status === 'valid') {
      this.dialogRef.close({ cards: result.cards });
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }
}

import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { SimpleCardSuggestion } from '../parser/types';

export interface SimpleCardImportDialogResult {
  cards: SimpleCardSuggestion[];
}

type ParseResult =
  | { status: 'empty' }
  | { status: 'invalid'; error: string }
  | { status: 'valid'; cards: SimpleCardSuggestion[] };

const REQUIRED_FIELDS = ['frontText', 'backText'] as const;
const OPTIONAL_FIELDS = ['topic', 'category'] as const;
const NON_EMPTY_OPTIONAL_FIELDS = ['id'] as const;

function validateCard(item: unknown, index: number): string[] {
  const cardNumber = index + 1;
  if (typeof item !== 'object' || item === null || Array.isArray(item)) {
    return [`Card ${cardNumber}: expected an object.`];
  }
  const record = item as Record<string, unknown>;
  const requiredErrors = REQUIRED_FIELDS.filter(
    (field) => typeof record[field] !== 'string' || !(record[field] as string).trim()
  ).map((field) => `Card ${cardNumber}: "${field}" must be a non-empty string.`);
  const optionalErrors = OPTIONAL_FIELDS.filter(
    (field) => record[field] !== undefined && typeof record[field] !== 'string'
  ).map((field) => `Card ${cardNumber}: "${field}" must be a string.`);
  const nonEmptyOptionalErrors = NON_EMPTY_OPTIONAL_FIELDS.filter(
    (field) =>
      record[field] !== undefined &&
      (typeof record[field] !== 'string' || !(record[field] as string).trim())
  ).map((field) => `Card ${cardNumber}: "${field}" must be a non-empty string.`);
  return [...requiredErrors, ...optionalErrors, ...nonEmptyOptionalErrors];
}

function toSuggestion(item: Record<string, unknown>): SimpleCardSuggestion {
  const id = typeof item['id'] === 'string' ? item['id'].trim() : '';
  const topic = typeof item['topic'] === 'string' ? item['topic'].trim() : '';
  const category =
    typeof item['category'] === 'string' ? item['category'].trim() : '';
  return {
    ...(id ? { id } : {}),
    frontText: (item['frontText'] as string).trim(),
    backText: (item['backText'] as string).trim(),
    ...(topic ? { topic } : {}),
    ...(category ? { category } : {}),
  };
}

function parseCardsJson(text: string): ParseResult {
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
    const errors = parsed.flatMap(validateCard);
    if (errors.length > 0) {
      return { status: 'invalid', error: errors.join('\n') };
    }
    return {
      status: 'valid',
      cards: parsed.map((item) => toSuggestion(item as Record<string, unknown>)),
    };
  } catch (error) {
    return {
      status: 'invalid',
      error: `Invalid JSON: ${(error as Error).message}`,
    };
  }
}

@Component({
  selector: 'app-simple-card-import-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './simple-card-import-dialog.component.html',
  styleUrl: './simple-card-import-dialog.component.css',
})
export class SimpleCardImportDialogComponent {
  private readonly dialogRef = inject(
    MatDialogRef<SimpleCardImportDialogComponent, SimpleCardImportDialogResult>
  );

  readonly exampleJson = JSON.stringify(
    [
      {
        id: 'Optional card id',
        frontText: 'Question (Markdown)',
        backText: 'Answer (Markdown)',
        topic: 'Optional topic',
        category: 'Optional category',
      },
    ],
    null,
    2
  );

  readonly jsonText = signal('');
  readonly parseResult = computed(() => parseCardsJson(this.jsonText()));
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
    if (result.status !== 'valid') {
      return;
    }
    this.dialogRef.close({ cards: result.cards });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}

import { Component, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule, MatLabel } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CardService } from '../../card.service';
import { injectParams } from '../../utils/inject-params';
import { queryParamToObject } from '../../utils/queryCompression';
import { Word } from '../types';
import { ConfirmDialogComponent } from './confirm-dialog/confirm-dialog.component';

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
  ],
  templateUrl: './card.component.html',
  styleUrl: './card.component.css',
})
export class CardComponent {
  private readonly cardService = inject(CardService);
  private readonly cardData = injectParams<string>('cardData');
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  readonly loading = this.cardService.isLoading;
  readonly card = this.cardService.card.value;
  readonly word = this.cardService.word;
  readonly type = this.cardService.wordType;
  readonly translation = this.cardService.translation;
  readonly forms = this.cardService.forms;
  readonly examples = this.cardService.examples;
  readonly examplesTranslations = this.cardService.examplesTranslations;
  readonly exampleImages = this.cardService.exampleImages;

  constructor() {
    effect(async () => {
      const cardData = this.cardData();

      if (typeof cardData !== 'string') {
        return;
      }

      const word = await queryParamToObject<Word>(cardData);
      this.cardService.selectWord(word);
    });
  }

  private showSnackBar(message: string) {
    this.snackBar
      .open(message, 'Close', {
        duration: 3000,
        verticalPosition: 'top',
        panelClass: ['success'],
      })
      .afterDismissed()
      .subscribe(() => {
        window.close();
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
}

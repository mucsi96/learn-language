import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { form, FormField } from '@angular/forms/signals';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { ApiTokensService, ApiToken } from './api-tokens.service';
import { ConfirmDialogComponent } from '../parser/edit-card/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-api-tokens',
  standalone: true,
  imports: [
    CommonModule,
    FormField,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatListModule,
    MatTooltipModule,
    MatDialogModule,
  ],
  templateUrl: './api-tokens.component.html',
  styleUrl: './api-tokens.component.css',
})
export class ApiTokensComponent {
  private readonly service = inject(ApiTokensService);
  private readonly dialog = inject(MatDialog);

  readonly tokens = this.service.tokens;
  readonly formModel = signal({ name: '' });
  readonly tokenForm = form(this.formModel);
  readonly isCreating = signal(false);

  readonly tokensList = computed(() => this.tokens.value() ?? []);

  readonly skeletonRows = [{}, {}, {}];

  async createToken(): Promise<void> {
    const name = this.formModel().name.trim();
    if (!name) return;

    this.isCreating.set(true);
    try {
      const result = await this.service.createToken(name);
      this.downloadTokenFile(name, result.token);
      this.formModel.set({ name: '' });
    } finally {
      this.isCreating.set(false);
    }
  }

  private downloadTokenFile(name: string, token: string): void {
    const blob = new Blob([token], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'ai-dictionary.token';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async deleteToken(token: ApiToken): Promise<void> {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        message: `Delete API token "${token.name}"?`,
      },
    });

    const confirmed = await firstValueFrom(dialogRef.afterClosed());
    if (confirmed) {
      await this.service.deleteToken(token.id);
    }
  }
}

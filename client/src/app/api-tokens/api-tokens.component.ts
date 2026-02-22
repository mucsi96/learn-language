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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
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
    MatSnackBarModule,
  ],
  templateUrl: './api-tokens.component.html',
  styleUrl: './api-tokens.component.css',
})
export class ApiTokensComponent {
  private readonly service = inject(ApiTokensService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly tokens = this.service.tokens;
  readonly formModel = signal({ name: '' });
  readonly tokenForm = form(this.formModel);
  readonly isCreating = signal(false);
  readonly newToken = signal<string | null>(null);

  readonly tokensList = computed(() => this.tokens.value() ?? []);

  readonly skeletonRows = [{}, {}, {}];

  async createToken(): Promise<void> {
    const name = this.formModel().name.trim();
    if (!name) return;

    this.isCreating.set(true);
    try {
      const result = await this.service.createToken(name);
      this.newToken.set(result.token);
      this.formModel.set({ name: '' });
    } finally {
      this.isCreating.set(false);
    }
  }

  async copyToken(): Promise<void> {
    const token = this.newToken();
    if (!token) return;

    await navigator.clipboard.writeText(token);
    this.snackBar.open('Token copied to clipboard', '', { duration: 2000 });
  }

  dismissToken(): void {
    this.newToken.set(null);
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

import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { form, FormField } from '@angular/forms/signals';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import {
  LearningPartnersService,
  LearningPartner,
} from './learning-partners.service';
import { ConfirmDialogComponent } from '../parser/edit-card/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-learning-partners',
  standalone: true,
  imports: [
    CommonModule,
    FormField,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    MatListModule,
    MatTooltipModule,
    MatDialogModule,
  ],
  templateUrl: './learning-partners.component.html',
  styleUrl: './learning-partners.component.css',
})
export class LearningPartnersComponent {
  private readonly service = inject(LearningPartnersService);
  private readonly dialog = inject(MatDialog);

  readonly partners = this.service.partners;
  readonly formModel = signal({ name: '' });
  readonly partnerForm = form(this.formModel);
  readonly isAdding = signal(false);

  readonly partnersList = computed(() => this.partners.value() ?? []);

  readonly skeletonRows = [{}, {}, {}];

  async addPartner(): Promise<void> {
    const name = this.formModel().name.trim();
    if (!name) return;

    this.isAdding.set(true);
    try {
      await this.service.createPartner({ name });
      this.formModel.set({ name: '' });
    } finally {
      this.isAdding.set(false);
    }
  }

  async toggleActive(partner: LearningPartner): Promise<void> {
    await this.service.setActivePartner(partner);
  }

  async deletePartner(partner: LearningPartner): Promise<void> {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        message: `Delete learning partner "${partner.name}"?`,
      },
    });

    const confirmed = await firstValueFrom(dialogRef.afterClosed());
    if (confirmed) {
      await this.service.deletePartner(partner.id);
    }
  }
}

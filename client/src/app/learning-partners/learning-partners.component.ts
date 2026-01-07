import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatRadioModule } from '@angular/material/radio';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
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
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    MatRadioModule,
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
  readonly studySettings = this.service.studySettings;
  readonly newPartnerName = signal('');
  readonly isAdding = signal(false);

  readonly partnersList = computed(() => this.partners.value() ?? []);
  readonly studyMode = computed(
    () => this.studySettings.value()?.studyMode ?? 'SOLO'
  );
  readonly enabledPartners = computed(
    () => this.studySettings.value()?.enabledPartners ?? []
  );

  readonly skeletonRows = [{}, {}, {}];

  async addPartner(): Promise<void> {
    const name = this.newPartnerName().trim();
    if (!name) return;

    this.isAdding.set(true);
    try {
      await this.service.createPartner({ name, isEnabled: true });
      this.newPartnerName.set('');
    } finally {
      this.isAdding.set(false);
    }
  }

  async toggleEnabled(partner: LearningPartner): Promise<void> {
    await this.service.toggleEnabled(partner);
  }

  async deletePartner(partner: LearningPartner): Promise<void> {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        message: `Delete learning partner "${partner.name}"?`,
      },
    });

    dialogRef.afterClosed().subscribe(async (confirmed) => {
      if (confirmed) {
        await this.service.deletePartner(partner.id);
      }
    });
  }

  async onStudyModeChange(mode: 'SOLO' | 'WITH_PARTNER'): Promise<void> {
    await this.service.updateStudyMode(mode);
  }
}

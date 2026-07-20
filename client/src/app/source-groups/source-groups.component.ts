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
import { SourceGroupsService, SourceGroup } from './source-groups.service';
import { ConfirmDialogComponent } from '../parser/edit-card/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-source-groups',
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
  templateUrl: './source-groups.component.html',
  styleUrl: './source-groups.component.css',
})
export class SourceGroupsComponent {
  private readonly service = inject(SourceGroupsService);
  private readonly dialog = inject(MatDialog);

  readonly groups = this.service.groups;
  readonly formModel = signal({ name: '' });
  readonly groupForm = form(this.formModel);
  readonly isAdding = signal(false);

  readonly groupsList = computed(() => this.groups.value() ?? []);

  readonly skeletonRows = [{}, {}, {}];

  async addGroup(): Promise<void> {
    const name = this.formModel().name.trim();
    if (!name) return;

    this.isAdding.set(true);
    try {
      await this.service.createGroup({ name });
      this.formModel.set({ name: '' });
    } finally {
      this.isAdding.set(false);
    }
  }

  async deleteGroup(group: SourceGroup): Promise<void> {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        message: `Delete source group "${group.name}"?`,
      },
    });

    const confirmed = await firstValueFrom(dialogRef.afterClosed());
    if (confirmed) {
      await this.service.deleteGroup(group.id);
    }
  }
}

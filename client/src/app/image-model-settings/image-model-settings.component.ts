import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ImageModelSettingsService } from './image-model-settings.service';

@Component({
  selector: 'app-image-model-settings',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './image-model-settings.component.html',
  styleUrl: './image-model-settings.component.css',
})
export class ImageModelSettingsComponent {
  private readonly service = inject(ImageModelSettingsService);

  readonly imageModels = this.service.imageModels;

  async onImageCountChange(modelId: string, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value, 10);
    if (!isNaN(value) && value >= 0) {
      await this.service.updateImageCount(modelId, value);
    }
  }
}

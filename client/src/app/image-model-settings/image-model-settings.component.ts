import { Component, effect, inject, signal, untracked } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { form, FormField } from '@angular/forms/signals';
import { ImageModelSettingsService } from './image-model-settings.service';

@Component({
  selector: 'app-image-model-settings',
  standalone: true,
  imports: [
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    FormField,
  ],
  templateUrl: './image-model-settings.component.html',
  styleUrl: './image-model-settings.component.css',
})
export class ImageModelSettingsComponent {
  private readonly service = inject(ImageModelSettingsService);

  readonly imageModels = this.service.imageModels;

  readonly rateLimitModel = signal({
    rateLimitPerMinute: this.service.imageRateLimitPerMinute(),
    maxConcurrent: this.service.imageMaxConcurrent(),
  });
  readonly rateLimitForm = form(this.rateLimitModel);

  constructor() {
    effect(() => {
      const { rateLimitPerMinute, maxConcurrent } = this.rateLimitModel();
      const currentRateLimit = untracked(() => this.service.imageRateLimitPerMinute());
      const currentMaxConcurrent = untracked(() => this.service.imageMaxConcurrent());

      if (rateLimitPerMinute !== currentRateLimit && rateLimitPerMinute >= 1) {
        this.service.updateImageRateLimit(rateLimitPerMinute);
      }
      if (maxConcurrent !== currentMaxConcurrent && maxConcurrent >= 1) {
        this.service.updateImageMaxConcurrent(maxConcurrent);
      }
    });
  }

  onImageCountChange(modelId: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value, 10);
    if (!isNaN(value) && value >= 0) {
      this.service.updateImageCount(modelId, value);
    }
  }
}

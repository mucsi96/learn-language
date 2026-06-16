import { Component, effect, inject, signal, untracked } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { form, FormField, required, min } from '@angular/forms/signals';
import { ImageModelSettingsService } from './image-model-settings.service';

@Component({
  selector: 'app-image-model-settings',
  standalone: true,
  imports: [
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    FormField,
  ],
  templateUrl: './image-model-settings.component.html',
  styleUrl: './image-model-settings.component.css',
})
export class ImageModelSettingsComponent {
  private readonly service = inject(ImageModelSettingsService);

  readonly imageModels = this.service.imageModels;
  readonly useEnglishForImageGeneration = this.service.useEnglishForImageGeneration;

  readonly rateLimitModel = signal({
    rateLimitPerMinute: this.service.imageRateLimitPerMinute(),
    maxConcurrentRequests: this.service.imageMaxConcurrentRequests(),
    dailyLimit: this.service.imageDailyLimit(),
  });
  readonly rateLimitForm = form(this.rateLimitModel, (path) => {
    required(path.rateLimitPerMinute);
    min(path.rateLimitPerMinute, 0);
    required(path.maxConcurrentRequests);
    min(path.maxConcurrentRequests, 0);
    required(path.dailyLimit);
    min(path.dailyLimit, 0);
  });

  constructor() {
    effect(() => {
      if (!this.rateLimitForm().valid()) {
        return;
      }

      const { rateLimitPerMinute, maxConcurrentRequests, dailyLimit } = this.rateLimitModel();
      const currentRateLimit = untracked(() => this.service.imageRateLimitPerMinute());
      const currentMaxConcurrent = untracked(() => this.service.imageMaxConcurrentRequests());
      const currentDailyLimit = untracked(() => this.service.imageDailyLimit());

      if (rateLimitPerMinute !== currentRateLimit) {
        this.service.updateImageRateLimit(rateLimitPerMinute);
      }

      if (maxConcurrentRequests !== currentMaxConcurrent) {
        this.service.updateImageMaxConcurrent(maxConcurrentRequests);
      }

      if (dailyLimit !== currentDailyLimit) {
        this.service.updateImageDailyLimit(dailyLimit);
      }
    });
  }

  onImageCountChange(modelId: string, event: Event): void {
    const value = this.parseCount(event);
    if (value !== undefined) {
      this.service.updateImageCount(modelId, value);
    }
  }

  onDescribedImageCountChange(modelId: string, event: Event): void {
    const value = this.parseCount(event);
    if (value !== undefined) {
      this.service.updateDescribedImageCount(modelId, value);
    }
  }

  private parseCount(event: Event): number | undefined {
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value, 10);
    return !isNaN(value) && value >= 0 ? value : undefined;
  }

  toggleUseEnglishForImageGeneration(): void {
    this.service.updateUseEnglishForImageGeneration(
      !this.useEnglishForImageGeneration()
    );
  }
}

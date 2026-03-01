import { Injectable, inject } from '@angular/core';
import { ENVIRONMENT_CONFIG } from './environment/environment.config';
import { ImageGenerationQueue } from './utils/image-generation-queue';
import { TokenPool } from './utils/token-pool';

@Injectable({ providedIn: 'root' })
export class RateLimitTokenService {
  private readonly environmentConfig = inject(ENVIRONMENT_CONFIG);

  readonly imagePool = new TokenPool(
    this.environmentConfig.imageMaxConcurrent,
    this.environmentConfig.imageRateLimitPerMinute
  );

  readonly imageGenerationQueue = new ImageGenerationQueue(this.imagePool);

  readonly audioPool = new TokenPool(
    this.environmentConfig.audioMaxConcurrent,
    this.environmentConfig.audioRateLimitPerMinute
  );
}

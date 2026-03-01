import { Injectable, inject } from '@angular/core';
import { ENVIRONMENT_CONFIG } from './environment/environment.config';
import { ToolPool } from './utils/tool-pool';

@Injectable({ providedIn: 'root' })
export class RateLimitTokenService {
  private readonly environmentConfig = inject(ENVIRONMENT_CONFIG);

  readonly imagePool = new ToolPool(
    this.environmentConfig.imageRateLimitPerMinute
  );

  readonly audioPool = new ToolPool(
    this.environmentConfig.audioRateLimitPerMinute
  );
}

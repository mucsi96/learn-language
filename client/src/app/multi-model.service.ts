import { Injectable, inject } from '@angular/core';
import { ENVIRONMENT_CONFIG } from './environment/environment.config';

interface ModelResponse<T> {
  model: string;
  response: T;
}

@Injectable({
  providedIn: 'root',
})
export class MultiModelService {
  private readonly environmentConfig = inject(ENVIRONMENT_CONFIG);

  async call<T>(
    apiCall: (model: string) => Promise<T>
  ): Promise<T> {
    const chatModels = this.environmentConfig.chatModels;
    const primaryModelInfo = chatModels.find(m => m.primary);
    const primaryModelName = primaryModelInfo?.modelName;

    const modelResponses = await Promise.allSettled(
      chatModels.map(async (modelInfo) => {
        const response = await apiCall(modelInfo.modelName);
        return { model: modelInfo.modelName, response } as ModelResponse<T>;
      })
    );

    const successfulResponses: ModelResponse<T>[] = modelResponses
      .filter((result): result is PromiseFulfilledResult<ModelResponse<T>> =>
        result.status === 'fulfilled'
      )
      .map(result => result.value);

    const primaryResponse = successfulResponses.find(r => r.model === primaryModelName);

    if (!primaryResponse) {
      if (successfulResponses.length === 0) {
        throw new Error('All models failed');
      }
      console.warn(`Primary model ${primaryModelName} failed, falling back to first successful response`);
      return successfulResponses[0].response;
    }

    return primaryResponse.response;
  }
}

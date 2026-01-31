import { Injectable, inject } from '@angular/core';
import { ENVIRONMENT_CONFIG } from './environment/environment.config';

export interface ModelResponse<T> {
  model: string;
  response: T;
}

@Injectable({
  providedIn: 'root',
})
export class MultiModelService {
  private readonly environmentConfig = inject(ENVIRONMENT_CONFIG);

  async call<T>(
    operationType: string,
    apiCall: (model: string) => Promise<T>
  ): Promise<T> {
    const result = await this.callWithModel(operationType, apiCall);
    return result.response;
  }

  async callWithModel<T>(
    operationType: string,
    apiCall: (model: string) => Promise<T>
  ): Promise<ModelResponse<T>> {
    const enabledModelNames = this.environmentConfig.enabledModelsByOperation[operationType] ?? [];
    const modelsToUse = this.environmentConfig.chatModels.filter(m =>
      enabledModelNames.includes(m.modelName)
    );
    const primaryModelName = this.environmentConfig.primaryModelByOperation[operationType];

    if (!primaryModelName || !enabledModelNames.includes(primaryModelName)) {
      throw new Error(`No primary model enabled for operation type: ${operationType}`);
    }

    const modelResponses = await Promise.allSettled(
      modelsToUse.map(async (modelInfo) => {
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
      if (successfulResponses.length > 0) {
        return successfulResponses[0];
      }
      throw new Error(`Primary model ${primaryModelName} failed and no other models succeeded`);
    }

    return primaryResponse;
  }
}

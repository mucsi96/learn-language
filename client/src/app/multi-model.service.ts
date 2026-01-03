import { Injectable, inject } from '@angular/core';
import { ENVIRONMENT_CONFIG, ChatModelInfo } from './environment/environment.config';

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
    operationType: string,
    apiCall: (model: string) => Promise<T>
  ): Promise<T> {
    const allChatModels = this.environmentConfig.chatModels;
    const enabledModelsByOperation = this.environmentConfig.enabledModelsByOperation;
    const enabledModelNames = enabledModelsByOperation[operationType] ?? [];

    const modelsToUse: ChatModelInfo[] = enabledModelNames.length > 0
      ? allChatModels.filter(m => enabledModelNames.includes(m.modelName))
      : allChatModels;

    const primaryModelInfo = modelsToUse.find(m => m.primary)
      ?? allChatModels.find(m => m.primary);
    const primaryModelName = primaryModelInfo?.modelName;

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
        return successfulResponses[0].response;
      }
      throw new Error(`Primary model ${primaryModelName} failed and no other models succeeded`);
    }

    return primaryResponse.response;
  }
}

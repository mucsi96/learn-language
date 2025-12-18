import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fetchJson } from './utils/fetchJson';
import { ChatModelInfo, ENVIRONMENT_CONFIG } from './environment/environment.config';

interface ModelResponse<T> {
  model: string;
  response: T;
  executionTimeMs: number;
}

interface ModelResponseLogRequest {
  operationType: string;
  input: string;
  responses: { modelName: string; output: string; priceUsd: number; executionTimeMs: number }[];
}

@Injectable({
  providedIn: 'root',
})
export class MultiModelService {
  private readonly http = inject(HttpClient);
  private readonly environmentConfig = inject(ENVIRONMENT_CONFIG);

  async call<T>(
    operationType: string,
    input: string,
    apiCall: (model: string) => Promise<T>,
    responseToString: (response: T) => string
  ): Promise<T> {
    const chatModels = this.environmentConfig.chatModels;
    const primaryModelInfo = chatModels.find(m => m.primary);
    const primaryModelName = primaryModelInfo?.modelName;

    const modelResponses = await Promise.allSettled(
      chatModels.map(async (modelInfo) => {
        const startTime = performance.now();
        const response = await apiCall(modelInfo.modelName);
        const executionTimeMs = Math.round(performance.now() - startTime);
        return { model: modelInfo.modelName, response, executionTimeMs } as ModelResponse<T>;
      })
    );

    const successfulResponses: ModelResponse<T>[] = modelResponses
      .filter((result): result is PromiseFulfilledResult<ModelResponse<T>> =>
        result.status === 'fulfilled'
      )
      .map(result => result.value);

    const primaryResponse = successfulResponses.find(r => r.model === primaryModelName);

    if (!primaryResponse) {
      throw new Error(`Primary model ${primaryModelName} failed for ${operationType}`);
    }

    await this.logResponses(operationType, input, successfulResponses, responseToString);

    return primaryResponse.response;
  }

  private async logResponses<T>(
    operationType: string,
    input: string,
    responses: ModelResponse<T>[],
    responseToString: (response: T) => string
  ): Promise<void> {
    const chatModels = this.environmentConfig.chatModels;

    const logResponses = responses.map(r => {
      const output = responseToString(r.response);
      const modelInfo = chatModels.find(m => m.modelName === r.model);
      const priceUsd = modelInfo ? this.estimatePrice(input, output, modelInfo) : 0;
      return {
        modelName: r.model,
        output,
        priceUsd,
        executionTimeMs: r.executionTimeMs
      };
    });

    const logRequest: ModelResponseLogRequest = {
      operationType,
      input,
      responses: logResponses
    };

    try {
      await fetchJson(this.http, '/api/model-response-logs', {
        method: 'POST',
        body: logRequest
      });
    } catch (error) {
      console.error('Failed to log model responses:', error);
    }
  }

  private estimatePrice(input: string, output: string, modelInfo: ChatModelInfo): number {
    const inputTokens = this.estimateTokens(input);
    const outputTokens = this.estimateTokens(output);
    const inputCost = (inputTokens / 1_000_000) * modelInfo.inputPricePerMillionTokens;
    const outputCost = (outputTokens / 1_000_000) * modelInfo.outputPricePerMillionTokens;
    return inputCost + outputCost;
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}

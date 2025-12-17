import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fetchJson } from './utils/fetchJson';
import { ENVIRONMENT_CONFIG } from './environment/environment.config';

interface ModelResponse<T> {
  model: string;
  response: T;
}

interface ModelResponseLogRequest {
  operationType: string;
  input: string;
  responses: { modelName: string; output: string }[];
  diffSummary: string;
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
        throw new Error(`All models failed for ${operationType}`);
      }
      console.warn(`Primary model ${primaryModelName} failed, falling back to first successful response`);
      await this.logResponses(operationType, input, successfulResponses, responseToString);
      return successfulResponses[0].response;
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
    const logResponses = responses.map(r => ({
      modelName: r.model,
      output: responseToString(r.response)
    }));

    const responseGroups = this.groupByResponse(responses, responseToString);
    const sortedGroups = Array.from(responseGroups.entries())
      .sort((a, b) => b[1].length - a[1].length);
    const diffSummary = this.buildDiffSummary(sortedGroups);

    const logRequest: ModelResponseLogRequest = {
      operationType,
      input,
      responses: logResponses,
      diffSummary
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

  private groupByResponse<T>(
    responses: ModelResponse<T>[],
    responseToString: (response: T) => string
  ): Map<string, ModelResponse<T>[]> {
    const groups = new Map<string, ModelResponse<T>[]>();

    for (const modelResponse of responses) {
      const key = responseToString(modelResponse.response);
      const existing = groups.get(key) || [];
      existing.push(modelResponse);
      groups.set(key, existing);
    }

    return groups;
  }

  private buildDiffSummary<T>(
    sortedGroups: [string, ModelResponse<T>[]][]
  ): string {
    const lines = sortedGroups.map(([response, models]) => {
      const modelNames = models.map(m => m.model).join(', ');
      return `[${modelNames}]: ${response}`;
    });
    return lines.join('\n');
  }
}

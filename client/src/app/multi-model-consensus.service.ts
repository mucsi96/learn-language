import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fetchJson } from './utils/fetchJson';
import { ENVIRONMENT_CONFIG } from './environment/environment.config';

interface ModelResponse<T> {
  model: string;
  response: T;
  error?: string;
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
export class MultiModelConsensusService {
  private readonly http = inject(HttpClient);
  private readonly environmentConfig = inject(ENVIRONMENT_CONFIG);

  async callWithConsensus<T>(
    operationType: string,
    input: string,
    apiCall: (model: string) => Promise<T>,
    responseToString: (response: T) => string
  ): Promise<T> {
    const chatModels = this.environmentConfig.chatModels;

    const modelResponses = await Promise.allSettled(
      chatModels.map(async (model) => {
        const response = await apiCall(model);
        return { model, response } as ModelResponse<T>;
      })
    );

    const successfulResponses: ModelResponse<T>[] = modelResponses
      .filter((result): result is PromiseFulfilledResult<ModelResponse<T>> =>
        result.status === 'fulfilled'
      )
      .map(result => result.value);

    if (successfulResponses.length === 0) {
      throw new Error(`All models failed for ${operationType}`);
    }

    const responseGroups = this.groupByResponse(successfulResponses, responseToString);
    const sortedGroups = Array.from(responseGroups.entries())
      .sort((a, b) => b[1].length - a[1].length);

    const [, majorityModels] = sortedGroups[0];
    const consensusReached = sortedGroups.length === 1 ||
      majorityModels.length > successfulResponses.length / 2;

    if (!consensusReached || sortedGroups.length > 1) {
      await this.logDivergentResponses(
        operationType,
        input,
        successfulResponses,
        responseToString,
        sortedGroups
      );
    }

    return majorityModels[0].response;
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

  private async logDivergentResponses<T>(
    operationType: string,
    input: string,
    responses: ModelResponse<T>[],
    responseToString: (response: T) => string,
    sortedGroups: [string, ModelResponse<T>[]][]
  ): Promise<void> {
    const logResponses = responses.map(r => ({
      modelName: r.model,
      output: responseToString(r.response)
    }));

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
      console.error('Failed to log model response divergence:', error);
    }
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

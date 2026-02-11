import { ImageGenerationHandler } from './imageGeneration';

interface InlinedRequest {
  contents: Array<{
    parts: Array<{ text?: string }>;
  }>;
  config?: {
    responseModalities?: string[];
    imageConfig?: Record<string, string>;
  };
  metadata?: Record<string, string>;
}

interface StoredBatch {
  name: string;
  state: string;
  inlinedResponses: Array<Record<string, unknown>>;
}

export class GoogleBatchHandler {
  private batches = new Map<string, StoredBatch>();
  private nextBatchId = 1;

  constructor(private readonly imageHandler: ImageGenerationHandler) {}

  reset(): void {
    this.batches.clear();
    this.nextBatchId = 1;
  }

  createBatch(model: string, inlinedRequests: InlinedRequest[]): StoredBatch {
    const batchName = `batches/batch-${this.nextBatchId++}`;

    const inlinedResponses = inlinedRequests.map((req) => {
      try {
        const prompt = req.contents?.[0]?.parts?.[0]?.text ?? '';
        const imageBytes = this.imageHandler.generateImage(prompt);
        return {
          response: {
            candidates: [
              {
                content: {
                  parts: [
                    {
                      inlineData: {
                        mimeType: 'image/png',
                        data: imageBytes,
                      },
                    },
                  ],
                },
              },
            ],
          },
          metadata: req.metadata ?? {},
        };
      } catch (error: any) {
        return {
          error: { message: error.message || 'Image generation failed' },
          metadata: req.metadata ?? {},
        };
      }
    });

    const batch: StoredBatch = {
      name: batchName,
      state: 'JOB_STATE_SUCCEEDED',
      inlinedResponses,
    };

    this.batches.set(batchName, batch);
    return batch;
  }

  getBatch(name: string): StoredBatch | undefined {
    return this.batches.get(name);
  }
}

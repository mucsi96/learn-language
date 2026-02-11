import { ImageGenerationHandler } from './imageGeneration';

interface BatchRequest {
  custom_id: string;
  method: string;
  url: string;
  body: {
    model: string;
    input: string;
    tools: Array<{
      type: string;
      model?: string;
      size?: string;
      quality?: string;
      output_format?: string;
      output_compression?: number;
    }>;
  };
}

interface StoredFile {
  id: string;
  content: string;
  purpose: string;
}

interface StoredBatch {
  id: string;
  inputFileId: string;
  status: string;
  outputFileId: string | null;
}

export class BatchHandler {
  private files = new Map<string, StoredFile>();
  private batches = new Map<string, StoredBatch>();
  private outputFiles = new Map<string, string>();
  private nextFileId = 1;
  private nextBatchId = 1;

  constructor(private readonly imageHandler: ImageGenerationHandler) {}

  reset(): void {
    this.files.clear();
    this.batches.clear();
    this.outputFiles.clear();
    this.nextFileId = 1;
    this.nextBatchId = 1;
  }

  uploadFile(content: string, purpose: string): StoredFile {
    const id = `file-${this.nextFileId++}`;
    const file: StoredFile = { id, content, purpose };
    this.files.set(id, file);
    return file;
  }

  createBatch(inputFileId: string): StoredBatch {
    const file = this.files.get(inputFileId);
    if (!file) {
      throw new Error(`File not found: ${inputFileId}`);
    }

    const batchId = `batch-${this.nextBatchId++}`;
    const outputFileId = `file-output-${this.nextBatchId}`;

    const outputLines = file.content
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => this.processRequest(JSON.parse(line)));

    this.outputFiles.set(outputFileId, outputLines.join('\n'));

    const batch: StoredBatch = {
      id: batchId,
      inputFileId,
      status: 'completed',
      outputFileId,
    };
    this.batches.set(batchId, batch);

    return batch;
  }

  getBatch(batchId: string): StoredBatch | undefined {
    return this.batches.get(batchId);
  }

  getFileContent(fileId: string): string | undefined {
    return this.outputFiles.get(fileId);
  }

  private processRequest(request: BatchRequest): string {
    const { custom_id, body } = request;

    try {
      const imageGenTool = body.tools?.find((t) => t.type === 'image_generation');
      if (!imageGenTool) {
        return JSON.stringify({
          custom_id,
          error: { message: 'No image_generation tool found' },
          response: null,
        });
      }

      const prompt = body.input;
      const model = imageGenTool.model ?? 'gpt-image-1';
      const imageResult = this.imageHandler.generateImage({ prompt, model });
      const b64Image = imageResult.data[0].b64_json;

      return JSON.stringify({
        custom_id,
        error: null,
        response: {
          status_code: 200,
          body: {
            output: [
              {
                type: 'image_generation_call',
                result: b64Image,
              },
            ],
          },
        },
      });
    } catch (error: any) {
      return JSON.stringify({
        custom_id,
        error: { message: error.message || 'Processing failed' },
        response: null,
      });
    }
  }
}

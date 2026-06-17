export interface ImageSourceRequest {
  input: string;
  model: string;
  context?: string;
  describe: boolean;
}

export type ImageJobStatus = 'pending' | 'completed' | 'failed';

export interface ImageResponse {
  id: string;
  model: string;
  status: ImageJobStatus;
}

export interface ImageJobStatusResponse {
  status: ImageJobStatus;
  error?: string;
  description?: string;
}

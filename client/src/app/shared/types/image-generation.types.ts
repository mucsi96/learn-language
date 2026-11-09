export interface ImageSourceRequest {
  input: string;
  model: string;
  context?: string;
  description?: string;
}

export interface ImageDescriptionsRequest {
  input: string;
  context?: string;
  count: number;
}

export interface ImageDescriptionsResponse {
  descriptions: string[];
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
}

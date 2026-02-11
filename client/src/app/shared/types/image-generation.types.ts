export interface ImageSourceRequest {
  input: string;
  model: string;
}

export interface ImageResponse {
  id: string;
  model: string;
}

export interface BatchImageRequestItem {
  customId: string;
  input: string;
  model: string;
}

export interface BatchImageRequest {
  requests: BatchImageRequestItem[];
}

export interface BatchImageJobResponse {
  batchId: string;
}

export interface BatchImageResultItem {
  customId: string;
  image?: ImageResponse;
  error?: string;
}

export interface BatchImageStatusResponse {
  status: string;
  results?: BatchImageResultItem[];
}

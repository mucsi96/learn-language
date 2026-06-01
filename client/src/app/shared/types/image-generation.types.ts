export interface ImageSourceRequest {
  input: string;
  model: string;
  context?: string;
}

export interface ImageResponse {
  id: string;
  model: string;
}

export interface ImageSourceRequest {
  input: string;
  model: string;
  context?: string;
  describe?: boolean;
}

export interface ImageResponse {
  id: string;
  model: string;
}

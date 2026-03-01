import { TokenPool } from './token-pool';

export class ImageGenerationQueue {
  constructor(private readonly tokenPool: TokenPool) {}

  async submit<T>(request: () => Promise<T>): Promise<T> {
    await this.tokenPool.acquire();
    try {
      return await request();
    } finally {
      this.tokenPool.release();
    }
  }
}

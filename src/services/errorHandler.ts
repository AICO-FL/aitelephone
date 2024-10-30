import { Logger } from './logger';

export class ErrorHandler {
  private logger: Logger;
  private retryAttempts: Map<string, number>;
  private readonly MAX_RETRIES = 3;

  constructor() {
    this.logger = new Logger();
    this.retryAttempts = new Map();
  }

  public async handleError(
    error: Error,
    context: string,
    operation: () => Promise<any>
  ): Promise<any> {
    const retryCount = this.retryAttempts.get(context) || 0;

    if (retryCount < this.MAX_RETRIES) {
      this.retryAttempts.set(context, retryCount + 1);
      this.logger.warn(`Retrying operation: ${context}`, {
        attempt: retryCount + 1,
        error: error.message,
      });

      // Exponential backoff
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, retryCount) * 1000)
      );

      return operation();
    }

    this.logger.error(`Operation failed after ${this.MAX_RETRIES} retries`, {
      context,
      error: error.message,
      stack: error.stack,
    });

    throw error;
  }

  public clearRetryCount(context: string) {
    this.retryAttempts.delete(context);
  }

  public isRetryable(error: any): boolean {
    // Network errors are typically retryable
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return true;
    }

    // Rate limiting errors are retryable
    if (error.response?.status === 429) {
      return true;
    }

    // Server errors might be retryable
    if (error.response?.status >= 500 && error.response?.status < 600) {
      return true;
    }

    return false;
  }
}
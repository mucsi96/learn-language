import { HttpErrorResponse } from '@angular/common/http';

export class ProviderBillingError extends Error {}

export function rethrowProviderBillingError(error: unknown): never {
  if (error instanceof HttpErrorResponse && error.error?.code === 'PROVIDER_BILLING_REQUIRED') {
    window.dispatchEvent(new Event('ai-operation-failed'));
    throw new ProviderBillingError(error.error.detail, { cause: error });
  }
  throw error;
}

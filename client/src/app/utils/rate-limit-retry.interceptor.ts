import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { retry, throwError, timer } from 'rxjs';
import { isApiRequest } from './http.util';

const MAX_RETRIES = 6;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30_000;

const backoffDelayMs = (retryCount: number): number => {
  const exponential = Math.min(
    BASE_DELAY_MS * 2 ** (retryCount - 1),
    MAX_DELAY_MS
  );
  return exponential / 2 + Math.random() * (exponential / 2);
};

const retryAfterMs = (error: HttpErrorResponse): number | undefined => {
  const header = error.headers.get('Retry-After');
  if (!header) {
    return undefined;
  }

  const seconds = Number(header);
  if (Number.isFinite(seconds)) {
    return Math.min(Math.max(seconds, 0) * 1000, MAX_DELAY_MS);
  }

  const dateMs = Date.parse(header);
  if (Number.isFinite(dateMs)) {
    return Math.min(Math.max(dateMs - Date.now(), 0), MAX_DELAY_MS);
  }

  return undefined;
};

/**
 * Survives upstream rate limiting (Cloudflare returns 429 and blocks the
 * client IP for a fixed window) without corrupting in-flight work.
 *
 * During bulk operations the app fans out many concurrent polls and fetches.
 * A burst can trip the rate limiter, after which every request comes back 429
 * for the duration of the block. Treat that as "keep waiting": retry the
 * request with exponential backoff and equal jitter so a transient block never
 * surfaces as a failed image job or card fetch, and so parallel callers
 * de-synchronize instead of hammering the limiter in lockstep. When the 429
 * carries a Retry-After header it is honored (capped) in preference to the
 * computed backoff.
 *
 * Sits inside the error interceptor so a successful retry never raises a
 * spurious error notification; only an exhausted retry budget propagates.
 */
export const rateLimitRetryInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    retry({
      count: MAX_RETRIES,
      delay: (error: unknown, retryCount: number) => {
        if (
          !(error instanceof HttpErrorResponse) ||
          error.status !== 429 ||
          !isApiRequest(req.url)
        ) {
          return throwError(() => error);
        }

        const waitMs = retryAfterMs(error) ?? backoffDelayMs(retryCount);
        console.warn(
          '[rate-limit] API request returned 429 - backing off and retrying',
          JSON.stringify({ url: req.url, retryCount, waitMs: Math.round(waitMs) })
        );
        return timer(waitMs);
      },
    })
  );

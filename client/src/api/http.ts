import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';

export class ApiError extends Error {
  readonly status: number;
  readonly detail: unknown;
  constructor(status: number, message: string, detail: unknown) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

const wait = (ms: number, signal?: AbortSignal | null) =>
  new Promise<void>((resolve, reject) => {
    signal?.throwIfAborted();
    const abort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', abort, { once: true });
  });

export async function request(path: string, init: RequestInit = {}, attempt = 0): Promise<Response> {
  const url = new URL(path, window.location.origin);
  if (url.origin !== window.location.origin) throw new Error('API requests must be same-origin');
  const headers = new Headers(init.headers);
  headers.set('X-Timezone', Intl.DateTimeFormat().resolvedOptions().timeZone);
  const response = await fetch(url, { ...init, headers, credentials: 'same-origin' });
  if (response.status === 429 && attempt < 6) {
    const retryAfter = response.headers.get('Retry-After');
    const exponential = Math.min(1000 * 2 ** attempt, 30000);
    const delay =
      retryAfter === null
        ? exponential / 2 + (Math.random() * exponential) / 2
        : Number.isFinite(Number(retryAfter))
          ? Number(retryAfter) * 1000
          : Date.parse(retryAfter) - Date.now();
    await wait(Number.isFinite(delay) ? Math.min(Math.max(delay, 0), 30000) : exponential, init.signal);
    return request(path, init, attempt + 1);
  }
  if (!response.ok) {
    const text = await response.text();
    const detail: unknown = (() => {
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    })();
    const parsed = z
      .object({ detail: z.string().optional(), message: z.string().optional(), code: z.string().optional() })
      .safeParse(detail);
    if (parsed.success && parsed.data.code === 'PROVIDER_BILLING_REQUIRED')
      window.dispatchEvent(new Event('ai-operation-failed'));
    throw new ApiError(
      response.status,
      parsed.success
        ? (parsed.data.detail ?? parsed.data.message ?? `Request failed (${response.status})`)
        : `Request failed (${response.status})`,
      detail
    );
  }
  return response;
}

export async function getJson<T>(path: string, schema: z.ZodType<T>, signal?: AbortSignal): Promise<T> {
  const response = await request(path, { signal, headers: { Accept: 'application/json' } });
  const result = schema.safeParse(response.status === 204 ? null : await response.json());
  if (!result.success) {
    console.error('Invalid API response', path, result.error);
    throw new Error('The server returned an invalid response. Please retry.');
  }
  return result.data;
}

export async function sendJson(path: string, method: string, body?: unknown): Promise<void> {
  await request(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function apiQuery<T>(path: string, schema: z.ZodType<T>) {
  return queryOptions({ queryKey: [path], queryFn: ({ signal }) => getJson(path, schema, signal) });
}

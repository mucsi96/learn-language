import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export async function fetchJson<T>(
  http: HttpClient,
  url: string,
  options: { body?: any; method?: string; headers?: Record<string, string>; params?: Record<string, string> } = {}
) {
  const { body, method = 'get', headers: extraHeaders = {}, params } = options;
  const response = await firstValueFrom(
    http.request(method, url, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...extraHeaders,
      }),
      params: params ? new HttpParams({ fromObject: params }) : undefined,
      body,
      responseType: 'json',
    })
  );
  return response as T;
}

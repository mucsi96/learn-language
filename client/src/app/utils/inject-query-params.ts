import { assertInInjectionContext, inject, type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, type Params } from '@angular/router';
import { map } from 'rxjs';

export function injectQueryParams<T>(
  keyOrTransform?: string | ((params: Params) => T)
): Signal<T | Params | string | null> {
  assertInInjectionContext(injectQueryParams);
  const route = inject(ActivatedRoute);
  const params = route.snapshot.queryParams;

  if (typeof keyOrTransform === 'function') {
    return toSignal(route.queryParams.pipe(map(keyOrTransform)), {
      initialValue: keyOrTransform(params),
    });
  }

  const getParam = (params: Params) =>
    keyOrTransform ? params?.[keyOrTransform] ?? null : params;

  return toSignal(route.queryParams.pipe(map(getParam)), {
    initialValue: getParam(params),
  });
}

import { assertInInjectionContext, inject, type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, type Data, type Params } from '@angular/router';
import { map } from 'rxjs';

export function injectParams<T>(
  keyOrTransform?: string | ((params: Params) => T)
): Signal<T | Params | string | null> {
  assertInInjectionContext(injectParams);
  const route = inject(ActivatedRoute);
  const params = route.snapshot.params;

  if (typeof keyOrTransform === 'function') {
    return toSignal(route.params.pipe(map(keyOrTransform)), {
      initialValue: keyOrTransform(params),
    });
  }

  const getParam = (params: Params) =>
    keyOrTransform ? params?.[keyOrTransform] ?? null : params;

  return toSignal(route.params.pipe(map(getParam)), {
    initialValue: getParam(params),
  });
}

export function injectRouteData<T>(
  keyOrTransform?: string | ((data: Data) => T)
): Signal<T | Data | string | null> {
  assertInInjectionContext(injectRouteData);
  const route = inject(ActivatedRoute);
  const data = route.snapshot.data;

  if (typeof keyOrTransform === 'function') {
    return toSignal(route.data.pipe(map(keyOrTransform)), {
      initialValue: keyOrTransform(data),
    });
  }

  const getData = (data: Data) =>
    keyOrTransform ? data?.[keyOrTransform] ?? null : data;

  return toSignal(route.data.pipe(map(getData)), {
    initialValue: getData(data),
  });
}

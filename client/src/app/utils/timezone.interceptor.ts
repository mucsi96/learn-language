import { HttpInterceptorFn } from '@angular/common/http';

export const timezoneInterceptor: HttpInterceptorFn = (req, next) => {
  const cloned = req.clone({
    setHeaders: {
      'X-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });
  return next(cloned);
};

import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((err: unknown) => {
      // Aquí podríamos integrarlo con un servicio de notificaciones global.
      // Por ahora, dejamos un log útil.
      if (err instanceof HttpErrorResponse) {
        console.error('[HTTP ERROR]', {
          url: err.url,
          status: err.status,
          message: err.message,
          error: err.error
        });
      } else {
        console.error('[UNKNOWN ERROR]', err);
      }

      return throwError(() => err);
    })
  );
};
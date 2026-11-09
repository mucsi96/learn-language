import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export async function uploadDocument<T>(
  http: HttpClient,
  url: string,
  file: File
): Promise<T> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await firstValueFrom(
    http.post<T>(url, formData)
    // Don't set Content-Type header - browser will set it automatically with boundary for multipart/form-data
  );

  return response;
}

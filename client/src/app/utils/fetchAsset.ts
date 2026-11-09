import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export async function fetchAsset(http: HttpClient, url: string): Promise<string> {
  const response = await firstValueFrom(http.get(url, { responseType: 'blob' }));
  return URL.createObjectURL(response);
}

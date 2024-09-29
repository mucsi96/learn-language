import { HttpClient } from '@angular/common/http';
import { Injectable, Signal } from '@angular/core';
import { firstValueFrom, map, Observable } from 'rxjs';

export type Import = {
  id: number;
  category: string;
  word: string;
  forms: string[];
  examples: string[];
  imported?: Date;
  processed?: Date;
};

type RawImport = {
  id: number;
  category: string;
  word: string;
  forms: string[];
  examples: string[];
  imported_at?: string;
  processed_at?: string;
};

@Injectable({
  providedIn: 'root',
})
export class ImportsService {
  constructor(private readonly http: HttpClient) {}

  async getImports({
    category,
    after,
    limit,
  }: {
    category: string;
    after?: number;
    limit: number;
  }): Promise<Import[]> {
    const url = after
      ? `/api/imports?category=${category}&after=${after}&limit=${limit}`
      : `/api/imports?category=${category}&limit=${limit}`;
    return firstValueFrom(
      this.http.get<RawImport[]>(url).pipe(
        map((imports) =>
          imports.map(({ imported_at, processed_at, ...importedWord }) => ({
            ...importedWord,
            imported: imported_at ? new Date(imported_at) : undefined,
            processed: processed_at ? new Date(processed_at) : undefined,
          }))
        )
      )
    );
  }
}

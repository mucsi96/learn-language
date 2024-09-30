import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom, map } from 'rxjs';

export type Import = {
  id: number;
  category: string;
  word: string;
  forms: string[];
  examples: string[];
  imported?: Date;
  processed?: Date;
};

export type Imports = {
  content: Import[];
  totalElements: number;
};

type ImportsResponse = {
  content: {
    id: number;
    category: string;
    word: string;
    forms: string[];
    examples: string[];
    imported_at?: string;
    processed_at?: string;
  }[];
  totalElements: number;
};

@Injectable({
  providedIn: 'root',
})
export class ImportsService {
  constructor(private readonly http: HttpClient) {}

  async getImports({
    category,
    page = 0,
    limit,
  }: {
    category: string;
    page?: number;
    limit: number;
  }): Promise<Imports> {
    const url = `/api/imports?category=${category}&page=${page}&limit=${limit}`;
    return firstValueFrom(
      this.http.get<ImportsResponse>(url).pipe(
        map((imports) => ({
          ...imports,
          content: imports.content.map(
            ({ imported_at, processed_at, ...importedWord }) => ({
              ...importedWord,
              imported: imported_at ? new Date(imported_at) : undefined,
              processed: processed_at ? new Date(processed_at) : undefined,
            })
          ),
        }))
      )
    );
  }
}

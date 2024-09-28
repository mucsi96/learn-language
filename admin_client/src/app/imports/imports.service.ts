import { HttpClient } from '@angular/common/http';
import { Injectable, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, Observable } from 'rxjs';

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
  $imports: Observable<Import[]>;

  constructor(private readonly http: HttpClient) {
    this.$imports = this.http.get<RawImport[]>('/api/imports?category=B1').pipe(
      map((imports) =>
        imports.map(({ imported_at, processed_at, ...importedWord }) => ({
          ...importedWord,
          imported: imported_at ? new Date(imported_at) : undefined,
          processed: processed_at ? new Date(processed_at) : undefined,
        }))
      )
    );
  }

  getImports(): Signal<Import[] | undefined> {
    return toSignal(this.$imports);
  }
}

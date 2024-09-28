import { HttpClient } from '@angular/common/http';
import { Injectable, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';

export type Import = {
  id: number;
  category: string;
  word: string;
  forms: string[];
  examples: string[];
  imported_at: Date;
  processed_at: Date;
};


@Injectable({
  providedIn: 'root'
})
export class ImportsService {
  $imports: Observable<Import[]>;

  constructor(private readonly http: HttpClient) {
    this.$imports = this.http.get<Import[]>('/api/imports');
  }

  getImports(): Signal<Import[] | undefined> {
    return toSignal(this.$imports);
  }
}

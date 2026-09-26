import { computed, inject, Injectable, resource } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fetchJson } from '../utils/fetchJson';
import { Source } from '../parser/types';
import { SourceExtension } from './content.types';

@Injectable({ providedIn: 'root' })
export class SourceExtensionsService {
  private readonly http = inject(HttpClient);
  readonly extensions = resource({ loader: () => fetchJson<SourceExtension[]>(this.http, '/api/source-extensions') });
  readonly descriptors = computed(() => this.extensions.value() ?? []);

  descriptor(source: Source | undefined): SourceExtension | undefined {
    return this.descriptors().find(extension => extension.id === source?.extensionId);
  }

  supports(source: Source, capability: string): boolean {
    return this.descriptor(source)?.capabilities.includes(capability) === true;
  }
}

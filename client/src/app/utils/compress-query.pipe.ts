import { Pipe, PipeTransform } from '@angular/core';
import { objectToQueryParam } from './queryCompression';

@Pipe({
  name: 'compressQuery',
})
export class CompressQueryPipe implements PipeTransform {
  transform(value?: Record<string, any>): Promise<string> {
    if (!value) {
      return Promise.resolve('');
    }

    return objectToQueryParam(value);
  }
}

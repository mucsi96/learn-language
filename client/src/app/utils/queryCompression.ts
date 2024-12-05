import { deflate, inflate } from 'pako';

export function objectToQueryParam(obj: Record<string, any>): string {
  const jsonString = JSON.stringify(obj);
  const compressed = deflate(jsonString);
  const base64String = btoa(String.fromCharCode(...compressed));
  return encodeURIComponent(base64String);
}

export function queryParamToObject(queryParam: string): Record<string, any> {
  const decodedBase64 = atob(decodeURIComponent(queryParam));
  const binaryData = new Uint8Array(decodedBase64.split('').map(char => char.charCodeAt(0)));
  const decompressed = inflate(binaryData, { to: 'string' });
  return JSON.parse(decompressed);
}

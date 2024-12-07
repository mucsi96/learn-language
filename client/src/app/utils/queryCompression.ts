export async function objectToQueryParam(
  obj: Record<string, any>
): Promise<string> {
  const jsonString = JSON.stringify(obj);
  const stream = new CompressionStream('gzip');
  const writer = stream.writable.getWriter();
  writer.write(new TextEncoder().encode(jsonString));
  writer.close();
  const compressedBuffer = await new Response(stream.readable).arrayBuffer();
  return encodeURIComponent(btoa(String.fromCharCode(...new Uint8Array(compressedBuffer))));
}

export async function queryParamToObject(
  queryParam: string
): Promise<Record<string, any>> {
  const compressedBuffer = Uint8Array.from(atob(decodeURIComponent(queryParam)), (c) =>
    c.charCodeAt(0)
  );
  const stream = new DecompressionStream('gzip');
  const writer = stream.writable.getWriter();
  writer.write(compressedBuffer);
  writer.close();
  const decompressedBuffer = await new Response(stream.readable).arrayBuffer();
  const jsonString = new TextDecoder().decode(decompressedBuffer);
  return JSON.parse(jsonString);
}

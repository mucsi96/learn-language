import { cp, lstat, mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function prepareClient(directory, destination, assetBaseUrl, appOrigin) {
  const assetUrl = new URL(assetBaseUrl);
  const origin = new URL(appOrigin);
  const localUrl = url => url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
  if ((!localUrl(assetUrl) && (assetUrl.protocol !== 'https:' || !assetUrl.hostname.endsWith('.blob.core.windows.net')))
      || assetUrl.pathname !== '/assets/' || assetUrl.search || assetUrl.hash || assetUrl.username || assetUrl.password) {
    throw new Error('Expected an HTTPS Azure Blob /assets/ URL');
  }
  if ((!localUrl(origin) && origin.protocol !== 'https:') || origin.origin !== appOrigin) throw new Error('Expected an HTTPS app origin');
  const root = resolve(directory);
  const index = await readFile(join(root, 'index.html'), 'utf8');
  await Promise.all((await readdir(root, { recursive: true })).map(async entry => {
    if ((await lstat(join(root, entry))).isSymbolicLink()) throw new Error(`Unexpected symlink: ${entry}`);
  }));
  const assets = join(destination, 'assets');
  const documents = join(destination, 'documents');
  await mkdir(documents, { recursive: true });
  await cp(root, assets, { recursive: true });
  const html = index.replace(/<(script|link)\b[^>]*>/gi, tag => {
    const attribute = /^<script\b/i.test(tag) ? 'src' : 'href';
    const pattern = new RegExp(`\\b${attribute}=(['"])(.*?)\\1`, 'i');
    if (!pattern.test(tag)) return tag;
    const rewritten = tag.replace(pattern, (_, quote, path) => {
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(path)) throw new Error(`Build assets must be local: ${path}`);
      const url = new URL(path.replace(/^\/+/, ''), assetUrl).href;
      if (!url.startsWith(assetUrl.href)) throw new Error(`Asset escaped its container: ${path}`);
      return `${attribute}="${url.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}"`;
    }).replace(/\s+crossorigin(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?/gi, '');
    return rewritten.replace(/\s*\/?>(?=$)/, ' crossorigin="anonymous">');
  });
  await rename(join(assets, 'index.html'), join(documents, 'index.html'));
  await writeFile(join(documents, 'index.html'), html);
  const manifestPath = join(assets, 'manifest.webmanifest');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const navigation = Object.fromEntries(['id', 'start_url', 'scope'].map(key => {
    if (typeof manifest[key] !== 'string') throw new Error(`Missing manifest ${key}`);
    const url = new URL(manifest[key], `${appOrigin}/`);
    if (url.origin !== appOrigin) throw new Error(`Manifest ${key} must stay on the app origin`);
    return [key, url.href];
  }));
  await writeFile(manifestPath, JSON.stringify({ ...manifest, ...navigation }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.length !== 6) throw new Error('Usage: prepare-client.mjs <build> <output> <asset-base-url> <app-origin>');
  await prepareClient(...process.argv.slice(2));
}

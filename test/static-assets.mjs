import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join, resolve, extname } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { prepareClient } from '../scripts/prepare-client.mjs';

const directory = await mkdtemp(join(process.env.RUNNER_TEMP ?? '/tmp/opencode', 'learn-static-'));
const credentials = new Set();
const mime = { '.js': 'application/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const close = server => new Promise(resolve => server.close(resolve));
const assets = createServer(async (request, response) => {
  credentials.add(request.headers.cookie ?? '');
  credentials.add(request.headers.authorization ?? '');
  const url = new URL(request.url, assetBase);
  if (!url.searchParams.has('no-cors')) response.setHeader('Access-Control-Allow-Origin', appOrigin);
  try {
    const path = resolve(directory, `.${decodeURIComponent(url.pathname)}`);
    if (!path.startsWith(join(directory, 'assets/'))) throw new Error('Invalid asset path');
    const body = await readFile(path);
    response.writeHead(200, { 'Content-Type': mime[extname(path)] ?? 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404).end();
  }
});
const app = createServer(async (_request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' });
  response.end(await readFile(join(directory, 'documents/index.html')));
});
await Promise.all([listen(app), listen(assets)]);
const appOrigin = `http://localhost:${app.address().port}`;
const assetBase = `http://127.0.0.1:${assets.address().port}/assets/`;
const browser = await chromium.launch();
try {
  const redirect = 'http://localhost/test';
  const authorization = await fetch(`http://localhost:8079/default/authorize?${new URLSearchParams({ client_id: 'test-client', redirect_uri: redirect, response_type: 'code' })}`, { redirect: 'manual' });
  const code = new URL(authorization.headers.get('location')).searchParams.get('code');
  const tokens = await fetch('http://localhost:8079/default/token', {
    method: 'POST', body: new URLSearchParams({ grant_type: 'authorization_code', client_id: 'test-client', redirect_uri: redirect, code }),
  });
  assert(tokens.ok);
  const token = (await tokens.json()).access_token;
  await prepareClient(resolve('../client/dist'), directory, assetBase, appOrigin);
  const context = await browser.newContext();
  await context.addCookies([{ name: 'private-session', value: 'secret', url: appOrigin }]);
  const page = await context.newPage();
  const requestedAssets = new Set();
  const errors = new Set();
  page.on('pageerror', error => errors.add(error.message));
  page.on('request', request => {
    if (['script', 'stylesheet', 'font', 'image', 'manifest'].includes(request.resourceType())) requestedAssets.add(request.url());
  });
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    assert.equal(url.origin, appOrigin);
    assert.equal(route.request().headers().authorization, undefined);
    const response = await fetch(`http://localhost:8170${url.pathname}${url.search}`, { headers: { Authorization: `Bearer ${token}` } });
    await route.fulfill({ status: response.status, contentType: 'application/json', body: await response.text() });
  });
  await page.route('**/oauth2/userinfo', route => route.fulfill({ json: { email: 'static@example.test' } }));
  await page.route('**/_telemetry/collect', route => route.fulfill({ status: 202, body: 'ok' }));
  await page.goto(`${appOrigin}/settings/known-words`);
  await expect(page.getByRole('heading', { name: 'Import Known Words', exact: true })).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(['400 16px Roboto', '400 24px "Material Icons"'].map(async font => {
      if (!(await document.fonts.load(font)).length) throw new Error(`Missing font: ${font}`);
    }));
  });
  assert.equal(await page.evaluate(() => document.baseURI), `${appOrigin}/`);
  const manifest = await page.evaluate(async () => (await fetch(document.querySelector('link[rel="manifest"]').href, { credentials: 'omit' })).json());
  ['id', 'scope', 'start_url'].forEach(key => assert.equal(manifest[key], `${appOrigin}/`));
  await page.evaluate(url => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = resolve;
    image.onerror = reject;
    image.src = url;
  }), new URL(manifest.icons[0].src, `${assetBase}manifest.webmanifest`).href);
  ['.js', '.css', '.woff2', '.png'].forEach(suffix => assert([...requestedAssets].some(url => url.endsWith(suffix))));
  assert([...requestedAssets].every(url => url.startsWith(assetBase)));
  assert([...requestedAssets].some(url => /\/chunk-.*\.js$/.test(url)));
  assert.deepEqual([...credentials], ['']);
  assert.deepEqual([...errors], []);
  assert.equal(await page.evaluate(async url => (await fetch(url)).status, `${assetBase}missing.js`), 404);
  assert(await page.evaluate(async url => {
    try { await fetch(url); return false; } catch { return true; }
  }, `${[...requestedAssets].find(url => url.endsWith('.js'))}?no-cors`));
  console.log('Static hosting: deep link, modules, fonts, icons, manifest, CORS and credential isolation passed');
} finally {
  await browser.close();
  await Promise.all([close(app), close(assets)]);
  await rm(directory, { recursive: true });
}

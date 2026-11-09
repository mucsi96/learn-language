import { test, expect } from '@playwright/test';
import { Client } from 'pg';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { once } from 'node:events';
import { randomUUID, createCipheriv, createDecipheriv, generateKeyPairSync, sign } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';

const exec = promisify(execFile);
const serverDirectory = path.resolve(__dirname, '../../server');
const binary = path.join(serverDirectory, 'target/debug/learn-language-server');
const key = Buffer.from('AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=', 'base64');
const origin = 'http://localhost:8170';
const databaseOptions = { host: 'localhost', port: 5470, user: 'postgres', password: 'postgres' };

const withDatabase = async <T>(database: string, action: (client: Client) => Promise<T>) => {
  const client = new Client({ ...databaseOptions, database });
  await client.connect();
  try { return await action(client); } finally { await client.end(); }
};

const environment = (database: string, storage: string) => ({
  ...process.env,
  DATABASE_URL: `postgres://postgres:postgres@localhost:5470/${database}`,
  SERVER_PORT: '8073',
  OIDC_ISSUER: 'http://localhost:8079/default',
  API_CLIENT_ID: 'mock-api-client-id',
  APP_ORIGIN: origin,
  STORAGE_DIRECTORY: storage,
  TOKEN_ENCRYPTION_KEY: key.toString('base64'),
  OPENAI_BASE_URL: 'http://localhost:3070', OPENAI_API_KEY: 'mock-key',
  ANTHROPIC_BASE_URL: 'http://localhost:3073', ANTHROPIC_API_KEY: 'mock-key',
  GOOGLE_AI_BASE_URL: 'http://localhost:3071', GOOGLE_AI_API_KEY: 'mock-key',
  XAI_BASE_URL: 'http://localhost:3070', XAI_API_KEY: 'mock-key',
  IDEOGRAM_BASE_URL: 'http://localhost:3074', IDEOGRAM_API_KEY: 'mock-key',
  ELEVEN_LABS_BASE_URL: 'http://localhost:3072', ELEVEN_LABS_API_KEY: 'mock-key',
});

const withTestDatabase = async (action: (database: string, env: NodeJS.ProcessEnv) => Promise<void>) => {
  const database = `rust_migration_${randomUUID().replaceAll('-', '')}`;
  const storage = await mkdtemp('/tmp/opencode/learn-language-rust-');
  await withDatabase('postgres', client => client.query(`CREATE DATABASE "${database}"`));
  try { await action(database, environment(database, storage)); }
  finally {
    await withDatabase('postgres', client => client.query(`DROP DATABASE "${database}" WITH (FORCE)`));
    await rm(storage, { recursive: true });
  }
};

const legacySchema = async (database: string) => {
  const { stdout } = await exec('podman', ['exec', 'learn-language-test-db', 'pg_dump',
    '-U', 'postgres', '-d', 'test', '--schema-only', '--schema=learn_language', '--no-owner', '--no-privileges'],
  { maxBuffer: 4 * 1024 * 1024 });
  await withDatabase(database, client => client.query(stdout));
};

const runServer = async (env: NodeJS.ProcessEnv, action: () => Promise<void>) => {
  const logPath = test.info().outputPath(`server-${randomUUID()}.log`);
  const log = createWriteStream(logPath);
  const child = spawn(binary, ['start', '--environment', 'test'], { cwd: serverDirectory, env, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.pipe(log, { end: false });
  child.stderr.pipe(log, { end: false });
  const exit = once(child, 'exit');
  try {
    await expect.poll(async () => {
      if (child.exitCode !== null) throw new Error(await readFile(logPath, 'utf8'));
      return fetch('http://127.0.0.1:8073/healthz').then(response => response.status).catch(() => 0);
    }, { timeout: 30_000 }).toBe(200);
    await action();
  } finally {
    if (child.exitCode === null) child.kill('SIGTERM');
    await exit;
    log.end();
  }
};

const legacyEncryptedToken = (token: string) => {
  const iv = Buffer.from('000102030405060708090a0b', 'hex');
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  return Buffer.concat([iv, cipher.update(token), cipher.final(), cipher.getAuthTag()]).toString('base64');
};

const seedLegacyData = async (database: string) => withDatabase(database, async client => {
  await client.query(`
    INSERT INTO learn_language.learning_partners (id, name) VALUES (81, 'Partner');
    SELECT setval('learn_language.learning_partners_id_seq', 81);
    INSERT INTO learn_language.source_groups (id, name) VALUES ('existing-group', 'Existing group');
    INSERT INTO learn_language.sources (id, name, source_type, card_types, group_id, learning_partner_id)
      VALUES ('existing-source', 'Existing source', 'JSON', 'VOCABULARY', 'existing-group', 81);
    INSERT INTO learn_language.cards (id, source_id, source_page_number, data, readiness, due,
      stability, difficulty, elapsed_days, scheduled_days, learning_steps, reps, lapses, state, type)
      VALUES ('existing-card', 'existing-source', 1, '{"word":"Haus","unknownFutureField":{"keep":[1,2]}}',
        'READY', '2026-01-01', 5, 6, 2, 3, 0, 4, 1, 'REVIEW', 'VOCABULARY');
    INSERT INTO learn_language.review_logs (card_id, rating, review, state, due, stability, difficulty,
      elapsed_days, scheduled_days, learning_partner_id) VALUES ('existing-card', 3, '2026-01-01',
        'REVIEW', '2026-01-02', 5, 6, 2, 3, 81);
    INSERT INTO learn_language.study_sessions (id, source_id, created_at, study_mode)
      VALUES ('existing-session', 'existing-source', now(), 'WITH_PARTNER');
    INSERT INTO learn_language.study_session_cards (session_id, card_id, position, learning_partner_id)
      VALUES ('existing-session', 'existing-card', 7, 81);
    INSERT INTO learn_language.content_items (id, collection_path, external_id, descriptor, preparation, status)
      VALUES ('00000000-0000-0000-0000-000000000001', 'collection/', '001-story', '{"title":"Story"}', '{"words":["Haus"]}', 'ready');
    INSERT INTO learn_language.listening_progress (source_id, content_id, user_id, audio_revision,
      position, duration, session_id, sequence, expires_at) VALUES ('existing-source',
      '00000000-0000-0000-0000-000000000001', 'existing-user', 'revision', 42, 120,
      '00000000-0000-0000-0000-000000000002', 9, now() + interval '4 hours');
    INSERT INTO learn_language.pending_photos (id, user_id, source_id, image_data, content_type, created_at, expires_at)
      VALUES ('00000000-0000-0000-0000-000000000003', 'existing-user', 'existing-source', decode('ff0010', 'hex'),
        'image/png', now(), now() + interval '1 hour');
  `);
  await client.query(`INSERT INTO learn_language.api_tokens (name, encrypted_token, scope, created_at)
    VALUES ('Existing export', $1, 'KNOWN_CARDS_EXPORT', now()), ('Existing dictionary', $2, 'DICTIONARY', now())`,
  [legacyEncryptedToken('existing-export-token'), legacyEncryptedToken('existing-dictionary-token')]);
});

const snapshot = async (database: string) => withDatabase(database, async client => {
  const tables = await client.query<{ tablename: string }>(`SELECT tablename FROM pg_tables
    WHERE schemaname = 'learn_language' AND tablename <> 'seaql_migrations' ORDER BY tablename`);
  const data = await tables.rows.reduce<Promise<unknown[]>>(async (previous, { tablename }) => {
    const accumulated = await previous;
    const result = await client.query(`SELECT to_jsonb(t) AS value FROM learn_language."${tablename}" t ORDER BY to_jsonb(t)::text`);
    return [...accumulated, [tablename, result.rows]];
  }, Promise.resolve([]));
  const sequences = await client.query(`SELECT sequencename, last_value FROM pg_sequences
    WHERE schemaname = 'learn_language' ORDER BY sequencename`);
  return { data, sequences: sequences.rows };
});

test('adopts persisted data without rewriting identifiers, JSON, tokens, history, or sequences', async ({ request }) => {
  await withTestDatabase(async (database, env) => {
    await legacySchema(database);
    await seedLegacyData(database);
    const before = await snapshot(database);
    await runServer(env, async () => {
      expect(await snapshot(database)).toEqual(before);
      const exported = await request.get('/api/known-cards', { headers: { Authorization: 'Bearer existing-export-token' } });
      expect(exported.status()).toBe(200);
      expect(await exported.json()).toEqual({ words: ['haus'] });
      expect((await request.get('/api/known-cards', { headers: { Authorization: 'Bearer existing-dictionary-token' } })).status()).toBe(403);
      expect((await request.get('/api/known-cards', { headers: { Authorization: 'Bearer invalid' } })).status()).toBe(401);
    });
    await runServer(env, async () => { expect(await snapshot(database)).toEqual(before); });
  });
});

test('initializes an empty database and enforces authentication and exact mutation origins', async ({ request }) => {
  await withTestDatabase(async (database, env) => {
    await runServer(env, async () => {
      const authorization = await request.get('http://localhost:8079/default/authorize', {
        params: { client_id: 'test-client', redirect_uri: 'http://localhost/test', response_type: 'code' }, maxRedirects: 0,
      });
      const code = new URL(authorization.headers()['location']).searchParams.get('code')!;
      const tokenResponse = await request.post('http://localhost:8079/default/token', {
        form: { grant_type: 'authorization_code', client_id: 'test-client', redirect_uri: 'http://localhost/test', code },
      });
      expect(tokenResponse.ok()).toBeTruthy();
      const { access_token: accessToken } = await tokenResponse.json();
      const headers = { Authorization: `Bearer ${accessToken}`, Origin: origin };
      expect((await request.get('/api/learning-partners')).status()).toBe(401);
      expect((await request.get('/api/learning-partners', { headers: { Authorization: 'Bearer invalid' } })).status()).toBe(401);
      await Promise.all([undefined, 'null', 'https://attacker.example', `${origin}.attacker.example`].map(async invalidOrigin => {
        const response = await request.post('/api/learning-partners', {
          headers: { Authorization: headers.Authorization, ...(invalidOrigin ? { Origin: invalidOrigin } : {}) }, data: { name: 'Rejected' },
        });
        expect(response.status()).toBe(403);
      }));
      const created = await request.post('/api/learning-partners', { headers, data: { name: 'First partner' } });
      expect(created.status()).toBe(200);
      const partner = await created.json();
      expect(partner).toMatchObject({ name: 'First partner' });
      expect((await request.put(`/api/learning-partners/${partner.id}`, { headers, data: { name: 'Renamed partner' } })).status()).toBe(200);
      expect(await (await request.get('/api/learning-partners', { headers })).json()).toEqual([{ id: partner.id, name: 'Renamed partner' }]);
      const imported = await request.post('/api/known-words/import', { headers, data: { text: 'Haus, ház\nHAUS, ignored\nBaum, fa' } });
      expect(imported.status()).toBe(200);
      expect(await imported.json()).toEqual({ importedCount: 2 });
      const token = await request.post('/api/api-tokens', { headers, data: { name: 'Export', scope: 'KNOWN_CARDS_EXPORT' } });
      expect(token.status()).toBe(200);
      const value = await token.json();
      const stored = await withDatabase(database, client => client.query('SELECT encrypted_token FROM learn_language.api_tokens WHERE id = $1', [value.id]));
      const encrypted = Buffer.from(stored.rows[0].encrypted_token, 'base64');
      const decipher = createDecipheriv('aes-256-gcm', key, encrypted.subarray(0, 12));
      decipher.setAuthTag(encrypted.subarray(-16));
      expect(Buffer.concat([decipher.update(encrypted.subarray(12, -16)), decipher.final()]).toString()).toBe(value.token);
      expect(await (await request.get('/api/known-cards', { headers: { Authorization: `Bearer ${value.token}` } })).json()).toEqual({ words: ['baum', 'haus'] });
      expect((await request.delete(`/api/api-tokens/${value.id}`, { headers })).status()).toBe(204);
      expect((await request.get('/api/known-cards', { headers: { Authorization: `Bearer ${value.token}` } })).status()).toBe(401);
    });
  });
});

test('validates JWT signatures, claims, API scope, and per-operation roles', async ({ request }) => {
  const issuer = 'http://127.0.0.1:8078';
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const fixture = createServer((incoming, response) => {
    response.setHeader('Content-Type', 'application/json');
    if (incoming.url === '/.well-known/openid-configuration') {
      response.end(JSON.stringify({ issuer, jwks_uri: `${issuer}/jwks` }));
    } else if (incoming.url === '/jwks') {
      response.end(JSON.stringify({ keys: [{ ...publicKey.export({ format: 'jwk' }), kid: 'fixture', alg: 'RS256', use: 'sig' }] }));
    } else {
      response.writeHead(404).end();
    }
  });
  fixture.listen(8078, '127.0.0.1');
  await once(fixture, 'listening');
  const token = (claims: Record<string, unknown>) => {
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'fixture' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ iss: issuer, aud: 'mock-api-client-id', sub: 'test-user',
      exp: Math.floor(Date.now() / 1000) + 3600, scp: 'api-access', roles: ['readDecks', 'createDeck'], ...claims })).toString('base64url');
    const content = `${header}.${payload}`;
    return `${content}.${sign('RSA-SHA256', Buffer.from(content), privateKey).toString('base64url')}`;
  };
  try {
    await withTestDatabase(async (_database, env) => {
      await runServer({ ...env, OIDC_ISSUER: issuer }, async () => {
        await Promise.all([
          { iss: 'https://wrong-issuer.example' }, { aud: 'wrong-audience' }, { exp: 1 },
          { nbf: Math.floor(Date.now() / 1000) + 3600 }, { exp: undefined }, { iss: undefined }, { aud: undefined },
        ].map(async claims => {
          expect((await request.get('/api/learning-partners', { headers: { Authorization: `Bearer ${token(claims)}` } })).status()).toBe(401);
        }));
        const valid = token({});
        const invalid = `${valid.slice(0, valid.lastIndexOf('.') + 1)}${Buffer.alloc(256).toString('base64url')}`;
        expect((await request.get('/api/learning-partners', { headers: { Authorization: `Bearer ${invalid}` } })).status()).toBe(401);
        await Promise.all([{ roles: [] }, { scp: 'wrong-scope' }].map(async claims => {
          expect((await request.get('/api/learning-partners', { headers: { Authorization: `Bearer ${token(claims)}` } })).status()).toBe(403);
        }));
        const readOnly = { Authorization: `Bearer ${token({ roles: ['readDecks'] })}`, Origin: origin };
        expect((await request.get('/api/learning-partners', { headers: readOnly })).status()).toBe(200);
        expect((await request.post('/api/learning-partners', { headers: readOnly, data: { name: 'Denied' } })).status()).toBe(403);
        expect((await request.get('/api/api-tokens', { headers: readOnly })).status()).toBe(403);
        expect((await request.get('/api/known-words', { headers: readOnly })).status()).toBe(403);
        expect((await request.get('/api/known-cards', { headers: readOnly })).status()).toBe(401);
      });
    });
  } finally {
    await new Promise<void>((resolve, reject) => fixture.close(error => error ? reject(error) : resolve()));
  }
});

test('rejects incompatible existing schemas without changing their data', async () => {
  await withTestDatabase(async (database, env) => {
    await legacySchema(database);
    await seedLegacyData(database);
    await withDatabase(database, client => client.query('ALTER TABLE learn_language.cards RENAME COLUMN data TO old_data'));
    const before = await snapshot(database);
    await expect(exec(binary, ['db', 'migrate', '--environment', 'test'], { cwd: serverDirectory, env }))
      .rejects.toThrow('Database schema does not match the Rust baseline');
    expect(await snapshot(database)).toEqual(before);
  });
});

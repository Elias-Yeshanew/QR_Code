import test, { after, before, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import pg from 'pg';
import { createApi } from './backend.ts';
import { FileStore, PgStore, type CardStore } from './store.ts';
import { CardStore as ClientStore } from '../src/db/cardStore.ts';

const PIN = 'initial-pin-123';

const backends: { name: string; make: () => CardStore }[] = [
  {
    name: 'file store',
    make: () => new FileStore(path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'card-')), 'card.json')),
  },
];
if (process.env.TEST_DATABASE_URL) {
  backends.push({
    name: 'postgres store',
    make: () => new PgStore(new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL }), `card_test_${Date.now()}`),
  });
}

for (const backend of backends) {
  describe(`API (${backend.name})`, () => {
    let store: CardStore;
    let server: Server;
    let base: string;

    const call = async (method: string, url: string, body?: unknown, token?: string) => {
      const res = await fetch(base + url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { status: res.status, body: (await res.json()) as any };
    };

    const login = async (pin = PIN) => (await call('POST', '/api/auth/login', { pin })).body.token as string;

    before(async () => {
      process.env.ADMIN_PIN = PIN;
      store = backend.make();
      await store.init();
      delete process.env.ADMIN_PIN;
      server = createApi(store, { loginMaxFailures: 3 }).listen(0);
      await new Promise((r) => server.once('listening', r));
      base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    });

    after(async () => {
      server.close();
      if (store instanceof PgStore) {
        const schema = (store as any).schema;
        await (store as any).pool.query(`DROP SCHEMA "${schema}" CASCADE`);
      }
      await store.close();
    });

    test('public card is readable without auth', async () => {
      const res = await call('GET', '/api/card');
      assert.equal(res.status, 200);
      assert.ok(res.body.profile.title);
      assert.deepEqual(res.body.links, []);
      assert.equal('adminPin' in res.body, false);
      assert.equal('pinHash' in res.body, false);
    });

    test('admin writes require a valid session token', async () => {
      const link = { id: 'a1', title: 'A', url: 'https://a.example' };
      assert.equal((await call('POST', '/api/admin/links', { link })).status, 401);
      assert.equal((await call('POST', '/api/admin/links', { link }, 'garbage')).status, 401);
      // The old API accepted the PIN in the body; that must not work any more.
      assert.equal((await call('POST', '/api/admin/links', { link, pin: PIN })).status, 401);
    });

    test('login with the right PIN returns a token that authorizes writes', async () => {
      const token = await login();
      assert.ok(token);
      const res = await call('POST', '/api/admin/links', { link: { id: 'a1', title: 'A', url: 'https://a.example', clicks: 999 } }, token);
      assert.equal(res.status, 200);
      assert.equal(res.body.links.length, 1);
      assert.equal(res.body.links[0].clicks, 0, 'clicks are server-owned');
    });

    test('rejects unsafe URLs and unknown profile fields', async () => {
      const token = await login();
      const bad = await call('POST', '/api/admin/links', { link: { id: 'x', title: 'X', url: 'javascript:alert(1)' } }, token);
      assert.equal(bad.status, 400);
      const prof = await call('POST', '/api/admin/profile', { profile: { title: 'New name', isAdmin: true, theme: 'neo-dark' } }, token);
      assert.equal(prof.status, 200);
      assert.equal(prof.body.profile.title, 'New name');
      assert.equal('isAdmin' in prof.body.profile, false);
      const badTheme = await call('POST', '/api/admin/profile', { profile: { theme: 'nope' } }, token);
      assert.equal(badTheme.status, 400);
    });

    test('click counting is throttled per client', async () => {
      const first = await call('POST', '/api/links/a1/click');
      assert.equal(first.body.counted, true);
      assert.equal(first.body.clicks, 1);
      const second = await call('POST', '/api/links/a1/click');
      assert.equal(second.body.counted, false);
      const card = await call('GET', '/api/card');
      assert.equal(card.body.links[0].clicks, 1);
    });

    test('editing a link keeps its click count', async () => {
      const token = await login();
      const res = await call('POST', '/api/admin/links', { link: { id: 'a1', title: 'A renamed', url: 'https://a.example' } }, token);
      assert.equal(res.body.links[0].title, 'A renamed');
      assert.equal(res.body.links[0].clicks, 1);
    });

    test('changing the PIN needs the current PIN and invalidates old sessions', async () => {
      const oldToken = await login();
      const wrong = await call('POST', '/api/admin/pin', { currentPin: 'nope', newPin: 'another-pin' }, oldToken);
      assert.equal(wrong.status, 403);
      const short = await call('POST', '/api/admin/pin', { currentPin: PIN, newPin: 'abc' }, oldToken);
      assert.equal(short.status, 400);

      const ok = await call('POST', '/api/admin/pin', { currentPin: PIN, newPin: 'second-pin-456' }, oldToken);
      assert.equal(ok.status, 200);
      assert.equal((await call('GET', '/api/auth/session', undefined, oldToken)).status, 401);
      assert.equal((await call('GET', '/api/auth/session', undefined, ok.body.token)).status, 200);
      assert.ok(await login('second-pin-456'));

      // restore for later tests
      await call('POST', '/api/admin/pin', { currentPin: 'second-pin-456', newPin: PIN }, ok.body.token);
    });

    test('reset clears content but keeps the PIN', async () => {
      const token = await login();
      const res = await call('POST', '/api/admin/reset', {}, token);
      assert.equal(res.status, 200);
      assert.deepEqual(res.body.links, []);
      assert.ok(await login(PIN));
    });

    test('client store throws on failed writes and leaves state unchanged', async () => {
      const client = new ClientStore((input, init) => fetch(base + String(input), init));
      await client.refresh();
      assert.equal(await client.login('wrong-pin'), false);
      assert.equal(client.isAdmin(), false);

      // Not logged in: the save must fail loudly, not pretend to succeed.
      await assert.rejects(client.saveLink({ id: 'c1', title: 'C', url: 'https://c.example', description: '', category: 'x', icon: 'globe' }));
      assert.equal(client.getLinks().length, 0);

      assert.equal(await client.login(PIN), true);
      await client.saveLink({ id: 'c1', title: 'C', url: 'https://c.example', description: '', category: 'x', icon: 'globe' });
      assert.equal(client.getLinks().length, 1);

      // A server-side PIN change makes the next write fail and signs the client out.
      const other = await login();
      await call('POST', '/api/admin/pin', { currentPin: PIN, newPin: 'third-pin-789' }, other);
      const states: boolean[] = [];
      client.subscribeAuth((v) => states.push(v));
      await assert.rejects(client.deleteLink('c1'), /log in again/);
      assert.equal(client.isAdmin(), false);
      assert.deepEqual(states, [true, false]);
      assert.equal(client.getLinks().length, 1);
    });

    test('login is rate limited after repeated failures', async () => {
      for (let i = 0; i < 3; i++) {
        assert.equal((await call('POST', '/api/auth/login', { pin: 'bad' })).status, 401);
      }
      assert.equal((await call('POST', '/api/auth/login', { pin: 'third-pin-789' })).status, 429);
    });
  });
}

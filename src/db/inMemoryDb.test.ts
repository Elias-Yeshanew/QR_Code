import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from './inMemoryDb';
import { adminAuthStore } from './useAdminAuth';
import { WebsiteLink } from '../types';

test('Clean database starts with 0 links and clean profile', () => {
  db.resetClean();
  assert.equal(db.getLinks().length, 0);

  const profile = db.getProfile();
  assert.equal(profile.title, 'Alex Morgan');
  assert.deepEqual(profile.socials, []);
});

test('Clean database supports inserting and retrieving links', () => {
  db.resetClean();

  const newLink: WebsiteLink = {
    id: 'link-abc',
    title: 'Personal Portfolio',
    url: 'https://mysite.dev',
    description: 'My projects',
    category: 'Official',
    icon: 'globe',
    clicks: 0,
  };

  db.insertLink(newLink);
  assert.equal(db.getLinks().length, 1);
  assert.equal(db.getLinkById('link-abc')?.title, 'Personal Portfolio');
});

test('Clean database prevents duplicate IDs', () => {
  db.resetClean();
  const link: WebsiteLink = {
    id: 'dup-1',
    title: 'Link 1',
    url: 'https://test.com',
    description: '',
    category: 'General',
    icon: 'globe',
    clicks: 0,
  };
  db.insertLink(link);

  assert.throws(() => {
    db.insertLink(link);
  }, /already exists/);
});

test('Clean database updates and deletes links', () => {
  db.resetClean();
  db.insertLink({
    id: 'link-to-edit',
    title: 'Initial Title',
    url: 'https://initial.com',
    description: '',
    category: 'General',
    icon: 'globe',
    clicks: 5,
  });

  const updated = db.updateLink('link-to-edit', { title: 'Updated Title' });
  assert.equal(updated?.title, 'Updated Title');
  assert.equal(db.getLinkById('link-to-edit')?.title, 'Updated Title');

  const deleted = db.deleteLink('link-to-edit');
  assert.equal(deleted, true);
  assert.equal(db.getLinks().length, 0);
});

test('Clean database click increment works correctly', () => {
  db.resetClean();
  db.insertLink({
    id: 'click-counter-test',
    title: 'Click Test',
    url: 'https://click.test',
    description: '',
    category: 'General',
    icon: 'globe',
    clicks: 0,
  });

  db.incrementClicks('click-counter-test');
  assert.equal(db.getLinkById('click-counter-test')?.clicks, 1);
});

test('Clean database notifies subscribers on changes', () => {
  db.resetClean();
  const recordedCounts: number[] = [];

  const unsubscribe = db.subscribeLinks((links) => {
    recordedCounts.push(links.length);
  });

  db.insertLink({
    id: 'sub-link-1',
    title: 'First',
    url: 'https://first.com',
    description: '',
    category: 'General',
    icon: 'globe',
    clicks: 0,
  });

  db.insertLink({
    id: 'sub-link-2',
    title: 'Second',
    url: 'https://second.com',
    description: '',
    category: 'General',
    icon: 'globe',
    clicks: 0,
  });

  db.deleteLink('sub-link-1');

  unsubscribe();
  db.insertLink({
    id: 'sub-link-3',
    title: 'Third',
    url: 'https://third.com',
    description: '',
    category: 'General',
    icon: 'globe',
    clicks: 0,
  });

  // Initial (0), insert 1 (1), insert 2 (2), delete 1 (1)
  assert.deepEqual(recordedCounts, [0, 1, 2, 1]);
});

test('Clean database updates profile and notifies subscribers', () => {
  db.resetClean();
  let latestTitle = '';

  const unsubscribe = db.subscribeProfile((p) => {
    latestTitle = p.title;
  });

  db.updateProfile({ title: 'Apex Studios' });
  assert.equal(latestTitle, 'Apex Studios');

  unsubscribe();
});

test('Clean database verifies and updates admin PIN', async () => {
  db.resetClean();
  assert.equal(db.verifyAdminPin('admin123'), true);
  assert.equal(db.verifyAdminPin('wrongpass'), false);

  const updated = await db.updateAdminPin('saphire2026');
  assert.equal(updated, true);
  assert.equal(db.verifyAdminPin('saphire2026'), true);
  assert.equal(db.verifyAdminPin('admin123'), false);

  // Reject PINs less than 3 chars
  assert.equal(await db.updateAdminPin('ab'), false);
});

test('adminAuthStore notifies all subscribers on login and logout', async () => {
  db.resetClean();
  const authStates: boolean[] = [];

  const unsubscribe = adminAuthStore.subscribe((isAdmin) => {
    authStates.push(isAdmin);
  });

  assert.equal(adminAuthStore.getIsAdmin(), false);

  // Incorrect PIN fails
  const failed = await adminAuthStore.login('wrong-pin');
  assert.equal(failed, false);
  assert.equal(adminAuthStore.getIsAdmin(), false);

  // Correct PIN logs in and triggers reactive notification
  const success = await adminAuthStore.login('admin123');
  assert.equal(success, true);
  assert.equal(adminAuthStore.getIsAdmin(), true);

  // Logout triggers reactive notification
  adminAuthStore.logout();
  assert.equal(adminAuthStore.getIsAdmin(), false);

  unsubscribe();

  // Initial (false), login (true), logout (false)
  assert.deepEqual(authStates, [false, true, false]);
});

test('Clean database persists and reloads state to/from localStorage when available', async () => {
  const store = new Map<string, string>();
  const mockLocalStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, val: string) => store.set(key, val),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  };

  // Mock window & localStorage
  (globalThis as any).window = {
    localStorage: mockLocalStorage,
    addEventListener: () => {},
  };

  // 1. Update PIN and verify saved to localStorage
  await db.updateAdminPin('myNewSecurePin');
  assert.equal(mockLocalStorage.getItem('saphire_db_admin_pin'), 'myNewSecurePin');

  // 2. Update profile and verify saved
  db.updateProfile({ title: 'Sophia Carter', tagline: 'VP of Innovation' });
  const savedProfile = JSON.parse(mockLocalStorage.getItem('saphire_db_profile') || '{}');
  assert.equal(savedProfile.title, 'Sophia Carter');
  assert.equal(savedProfile.tagline, 'VP of Innovation');


  // 3. Insert link and verify saved
  db.insertLink({
    id: 'persisted-link-1',
    title: 'Persistent Link',
    url: 'https://persist.example',
    description: 'Testing persistence',
    category: 'Official',
    icon: 'globe',
    clicks: 0,
  });
  const savedLinks = JSON.parse(mockLocalStorage.getItem('saphire_db_links') || '[]');
  assert.equal(savedLinks.length, 1);
  assert.equal(savedLinks[0].title, 'Persistent Link');

  // 4. resetClean clears storage
  db.resetClean();
  assert.equal(mockLocalStorage.getItem('saphire_db_admin_pin'), null);
  assert.equal(mockLocalStorage.getItem('saphire_db_profile'), null);
  assert.equal(mockLocalStorage.getItem('saphire_db_links'), null);

  // Clean up global mock
  delete (globalThis as any).window;
});



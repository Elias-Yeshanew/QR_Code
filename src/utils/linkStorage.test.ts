import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractDomain,
  validateUrl,
  normalizeUrl,
  filterAndSearchLinks,
  getCategoryList,
  incrementLinkClicks,
  DEFAULT_LINKS,
} from './linkStorage';

test('extractDomain correctly parses hostnames and strips www', () => {
  assert.equal(extractDomain('https://www.google.com/search?q=test'), 'google.com');
  assert.equal(extractDomain('https://sub.domain.org/path'), 'sub.domain.org');
  assert.equal(extractDomain('github.com/profile'), 'github.com');
});

test('validateUrl validates valid and invalid URLs', () => {
  assert.equal(validateUrl('https://example.com'), true);
  assert.equal(validateUrl('http://mysite.org/about'), true);
  assert.equal(validateUrl('sub.test.io'), true);
  assert.equal(validateUrl('mailto:support@test.com'), true);
  assert.equal(validateUrl(''), false);
  assert.equal(validateUrl('not-a-domain'), false);
});

test('normalizeUrl prefixes https when missing protocol', () => {
  assert.equal(normalizeUrl('myhub.io'), 'https://myhub.io');
  assert.equal(normalizeUrl('https://myhub.io'), 'https://myhub.io');
  assert.equal(normalizeUrl('mailto:me@example.com'), 'mailto:me@example.com');
});

test('filterAndSearchLinks filters by category and search term', () => {
  const filteredOfficial = filterAndSearchLinks(DEFAULT_LINKS, 'Official', '');
  assert.ok(filteredOfficial.length > 0);
  assert.ok(filteredOfficial.every((l) => l.category === 'Official'));

  const searchDiscord = filterAndSearchLinks(DEFAULT_LINKS, 'All', 'discord');
  assert.equal(searchDiscord.length, 1);
  assert.equal(searchDiscord[0].title, 'Community Discord Server');

  const emptyResults = filterAndSearchLinks(DEFAULT_LINKS, 'All', 'nonexistentquery123');
  assert.equal(emptyResults.length, 0);
});

test('filterAndSearchLinks sorts by featured and popularity', () => {
  const sortedFeatured = filterAndSearchLinks(DEFAULT_LINKS, 'All', '', 'featured');
  // First elements should have featured = true
  assert.equal(sortedFeatured[0].featured, true);

  const sortedPopularity = filterAndSearchLinks(DEFAULT_LINKS, 'All', '', 'popularity');
  for (let i = 0; i < sortedPopularity.length - 1; i++) {
    assert.ok(sortedPopularity[i].clicks >= sortedPopularity[i + 1].clicks);
  }

  const sortedAlpha = filterAndSearchLinks(DEFAULT_LINKS, 'All', '', 'alphabetical');
  for (let i = 0; i < sortedAlpha.length - 1; i++) {
    assert.ok(sortedAlpha[i].title.localeCompare(sortedAlpha[i + 1].title) <= 0);
  }
});

test('getCategoryList computes counts and includes All option', () => {
  const categories = getCategoryList(DEFAULT_LINKS);
  assert.equal(categories[0].name, 'All');
  assert.equal(categories[0].count, DEFAULT_LINKS.length);

  const officialCat = categories.find((c) => c.name === 'Official');
  assert.ok(officialCat !== undefined);
  assert.ok(officialCat.count > 0);
});

test('incrementLinkClicks increments click counter', () => {
  const initial = DEFAULT_LINKS[0].clicks;
  const updated = incrementLinkClicks(DEFAULT_LINKS, DEFAULT_LINKS[0].id);
  assert.equal(updated[0].clicks, initial + 1);
  // Other links unchanged
  assert.equal(updated[1].clicks, DEFAULT_LINKS[1].clicks);
});

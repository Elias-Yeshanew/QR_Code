import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractDomain,
  validateUrl,
  normalizeUrl,
  filterAndSearchLinks,
  getCategoryList,
  incrementLinkClicks,
} from './linkStorage';
import type { WebsiteLink } from '../types';

// Sample directory used as a test fixture.
const DEFAULT_LINKS: WebsiteLink[] = [
  {
    id: 'link-1',
    title: 'Main Web Platform',
    url: 'https://google.com',
    description: 'Our primary web home, product announcements, and company overview.',
    category: 'Official',
    icon: 'globe',
    clicks: 1420,
    featured: true,
    badge: 'Popular',
    accentColor: 'indigo',
    createdAt: Date.now() - 1000000,
  },
  {
    id: 'link-2',
    title: 'Interactive Web App & Tools',
    url: 'https://github.com',
    description: 'Open web application with cloud workspace, dashboard, and templates.',
    category: 'Products',
    icon: 'layers',
    clicks: 980,
    featured: true,
    badge: 'New',
    accentColor: 'cyan',
    createdAt: Date.now() - 900000,
  },
  {
    id: 'link-3',
    title: 'Documentation & API Guides',
    url: 'https://developer.mozilla.org',
    description: 'Comprehensive guides, code snippets, SDK references, and tutorials.',
    category: 'Resources',
    icon: 'book-open',
    clicks: 654,
    featured: false,
    accentColor: 'emerald',
    createdAt: Date.now() - 800000,
  },
  {
    id: 'link-4',
    title: 'Official Online Store & Merch',
    url: 'https://store.google.com',
    description: 'Order limited edition apparel, accessories, and physical hardware.',
    category: 'Store',
    icon: 'shopping-bag',
    clicks: 412,
    badge: '15% Off',
    accentColor: 'amber',
    createdAt: Date.now() - 700000,
  },
  {
    id: 'link-5',
    title: '24/7 Customer Helpdesk & Chat',
    url: 'https://support.google.com',
    description: 'Get immediate help from our support team, FAQs, and ticket system.',
    category: 'Support',
    icon: 'life-buoy',
    clicks: 320,
    accentColor: 'rose',
    createdAt: Date.now() - 600000,
  },
  {
    id: 'link-6',
    title: 'Community Discord Server',
    url: 'https://discord.com',
    description: 'Chat with over 20,000 members, share feedback, and join live streams.',
    category: 'Community',
    icon: 'message-square',
    clicks: 890,
    badge: '20k Online',
    accentColor: 'violet',
    createdAt: Date.now() - 500000,
  },
  {
    id: 'link-7',
    title: 'Book a Consultation / Demo Call',
    url: 'https://calendar.google.com',
    description: 'Schedule a personalized 15-minute product walk-through or partner discussion.',
    category: 'Official',
    icon: 'calendar',
    clicks: 195,
    accentColor: 'blue',
    createdAt: Date.now() - 400000,
  },
  {
    id: 'link-8',
    title: 'Video Tutorials & Masterclasses',
    url: 'https://youtube.com',
    description: 'Watch step-by-step guides, feature breakdowns, and creator spotlights.',
    category: 'Resources',
    icon: 'play-circle',
    clicks: 530,
    accentColor: 'red',
    createdAt: Date.now() - 300000,
  },
];


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

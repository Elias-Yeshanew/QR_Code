import { WebsiteLink, ThemeType } from '../types';

export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function validateUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.startsWith('mailto:') || trimmed.startsWith('tel:')) return true;
  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    return Boolean(parsed.hostname && parsed.hostname.includes('.'));
  } catch {
    return false;
  }
}

export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('mailto:') || trimmed.startsWith('tel:')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export type SortOption = 'featured' | 'popularity' | 'alphabetical' | 'newest';

export function filterAndSearchLinks(
  links: WebsiteLink[],
  selectedCategory: string,
  searchQuery: string,
  sortBy: SortOption = 'featured'
): WebsiteLink[] {
  let filtered = [...links];

  // Category filter
  if (selectedCategory && selectedCategory.toLowerCase() !== 'all') {
    filtered = filtered.filter(
      (link) => link.category.toLowerCase() === selectedCategory.toLowerCase()
    );
  }

  // Search query
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(
      (link) =>
        link.title.toLowerCase().includes(q) ||
        link.description.toLowerCase().includes(q) ||
        link.url.toLowerCase().includes(q) ||
        link.category.toLowerCase().includes(q) ||
        (link.badge && link.badge.toLowerCase().includes(q))
    );
  }

  // Sorting
  filtered.sort((a, b) => {
    if (sortBy === 'featured') {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return b.clicks - a.clicks;
    }
    if (sortBy === 'popularity') {
      return b.clicks - a.clicks;
    }
    if (sortBy === 'alphabetical') {
      return a.title.localeCompare(b.title);
    }
    if (sortBy === 'newest') {
      return (b.createdAt || 0) - (a.createdAt || 0);
    }
    return 0;
  });

  return filtered;
}

export function getCategoryList(links: WebsiteLink[]): { name: string; count: number }[] {
  const counts: Record<string, number> = {};
  links.forEach((l) => {
    const cat = l.category.trim();
    if (cat) {
      counts[cat] = (counts[cat] || 0) + 1;
    }
  });

  const categories = Object.keys(counts).map((name) => ({
    name,
    count: counts[name],
  }));

  categories.sort((a, b) => b.count - a.count);
  return [{ name: 'All', count: links.length }, ...categories];
}

export function incrementLinkClicks(links: WebsiteLink[], id: string): WebsiteLink[] {
  return links.map((l) => (l.id === id ? { ...l, clicks: l.clicks + 1 } : l));
}

export function getThemeStyles(theme: ThemeType): {
  bg: string;
  cardBg: string;
  cardBorder: string;
  accentText: string;
  primaryButton: string;
  badgeBg: string;
  subtext: string;
  headerGrad: string;
} {
  switch (theme) {
    case 'aurora':
      return {
        bg: 'bg-slate-950 text-slate-100',
        cardBg: 'bg-slate-900/80 backdrop-blur-md hover:bg-slate-850',
        cardBorder: 'border-teal-500/20 hover:border-teal-400/50',
        accentText: 'text-teal-400',
        primaryButton: 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-semibold shadow-lg shadow-teal-500/20',
        badgeBg: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
        subtext: 'text-slate-400',
        headerGrad: 'from-teal-400 via-cyan-400 to-indigo-400',
      };
    case 'emerald':
      return {
        bg: 'bg-zinc-950 text-zinc-100',
        cardBg: 'bg-zinc-900/80 backdrop-blur-md hover:bg-zinc-850',
        cardBorder: 'border-emerald-500/20 hover:border-emerald-400/50',
        accentText: 'text-emerald-400',
        primaryButton: 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-zinc-950 font-semibold shadow-lg shadow-emerald-500/20',
        badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        subtext: 'text-zinc-400',
        headerGrad: 'from-emerald-400 via-teal-300 to-lime-300',
      };
    case 'sunset':
      return {
        bg: 'bg-neutral-950 text-neutral-100',
        cardBg: 'bg-neutral-900/80 backdrop-blur-md hover:bg-neutral-850',
        cardBorder: 'border-orange-500/20 hover:border-orange-400/50',
        accentText: 'text-orange-400',
        primaryButton: 'bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-400 hover:to-rose-400 text-neutral-950 font-semibold shadow-lg shadow-orange-500/20',
        badgeBg: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
        subtext: 'text-neutral-400',
        headerGrad: 'from-orange-400 via-rose-400 to-pink-400',
      };
    case 'clean-light':
      return {
        bg: 'bg-gray-50 text-gray-900',
        cardBg: 'bg-white shadow-sm hover:shadow-md hover:border-indigo-300',
        cardBorder: 'border-gray-200',
        accentText: 'text-indigo-600',
        primaryButton: 'bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md shadow-indigo-600/20',
        badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        subtext: 'text-gray-600',
        headerGrad: 'from-indigo-600 via-purple-600 to-blue-600',
      };
    case 'neo-dark':
      return {
        bg: 'bg-black text-white',
        cardBg: 'bg-[#111111] hover:bg-[#1a1a1a]',
        cardBorder: 'border-[#262626] hover:border-white/40',
        accentText: 'text-white',
        primaryButton: 'bg-white hover:bg-gray-200 text-black font-bold shadow-md shadow-white/10',
        badgeBg: 'bg-white/10 text-white border-white/20',
        subtext: 'text-neutral-400',
        headerGrad: 'from-white via-neutral-200 to-neutral-400',
      };
    case 'midnight':
    default:
      return {
        bg: 'bg-[#0b0f19] text-gray-100',
        cardBg: 'bg-[#111827]/80 backdrop-blur-md hover:bg-[#1f2937]/90',
        cardBorder: 'border-indigo-500/20 hover:border-indigo-400/50',
        accentText: 'text-indigo-400',
        primaryButton: 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-semibold shadow-lg shadow-indigo-500/25',
        badgeBg: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
        subtext: 'text-gray-400',
        headerGrad: 'from-indigo-400 via-purple-400 to-pink-400',
      };
  }
}

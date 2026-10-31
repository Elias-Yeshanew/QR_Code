import React from 'react';
import { Search, X, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { SortOption } from '../utils/linkStorage';
import { ThemeType } from '../types';
import { getThemeStyles } from '../utils/linkStorage';

interface SearchAndFilterProps {
  categories: { name: string; count: number }[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  theme: ThemeType;
  totalFiltered: number;
}

export const SearchAndFilter: React.FC<SearchAndFilterProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  theme,
  totalFiltered,
}) => {
  const themeStyles = getThemeStyles(theme);

  return (
    <div className="space-y-3 px-4 max-w-xl mx-auto mb-6">
      {/* Search Input Row */}
      <div className="relative flex items-center">
        <Search className="w-4 h-4 absolute left-3.5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search websites, tools, documentation..."
          className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm text-inherit placeholder-gray-400 outline-none transition-all shadow-inner"
          aria-label="Search websites"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10"
            aria-label="Clear search query"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Category Pills & Sort Dropdown */}
      <div className="flex items-center justify-between gap-2">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 text-xs">
          {categories.map((cat) => {
            const isActive = selectedCategory.toLowerCase() === cat.name.toLowerCase();
            return (
              <button
                key={cat.name}
                onClick={() => onSelectCategory(cat.name)}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                    : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10'
                }`}
              >
                <span>{cat.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-indigo-800 text-white' : 'bg-white/10 text-gray-400'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sort Select */}
        <div className="flex-shrink-0 flex items-center">
          <label htmlFor="sort-select" className="sr-only">
            Sort websites
          </label>
          <div className="relative">
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="appearance-none bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg pl-2.5 pr-7 py-1.5 text-xs text-gray-300 hover:text-white cursor-pointer outline-none focus:border-indigo-500"
            >
              <option value="featured" className="bg-gray-900 text-white">
                Featured First
              </option>
              <option value="popularity" className="bg-gray-900 text-white">
                Most Visited
              </option>
              <option value="alphabetical" className="bg-gray-900 text-white">
                A - Z
              </option>
              <option value="newest" className="bg-gray-900 text-white">
                Newest First
              </option>
            </select>
            <ArrowUpDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Result feedback when searching */}
      {searchQuery && (
        <div className="flex items-center justify-between text-xs text-gray-400 px-1">
          <span>Found {totalFiltered} matching {totalFiltered === 1 ? 'website' : 'websites'}</span>
          <button
            onClick={() => {
              onSearchChange('');
              onSelectCategory('All');
            }}
            className="text-indigo-400 hover:underline"
          >
            Reset filter
          </button>
        </div>
      )}
    </div>
  );
};

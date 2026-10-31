import React, { useState, useEffect, useCallback } from 'react';
import { 
  HeaderProfile 
} from './components/HeaderProfile';
import { 
  SearchAndFilter 
} from './components/SearchAndFilter';
import { 
  LinkCard 
} from './components/LinkCard';
import { 
  ManageLinksModal 
} from './components/ManageLinksModal';
import { 
  AdminLoginModal 
} from './components/AdminLoginModal';
import { 
  filterAndSearchLinks, 
  getCategoryList, 
  getThemeStyles, 
  SortOption 
} from './utils/linkStorage';
import { 
  SearchX,
  Database,
  Plus,
  LogOut,
  Sparkles,
  Settings2,
  ShieldCheck
} from 'lucide-react';
import { db } from './db/inMemoryDb';
import { useLinks, useProfile } from './db/useDatabase';
import { useAdminAuth } from './db/useAdminAuth';

export default function App() {
  // Admin authentication state backed by shared reactive store
  const { isAdmin, logout: handleAdminLogout } = useAdminAuth();
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState<boolean>(false);

  // Reactive in-memory database subscriptions
  const links = useLinks();
  const profile = useProfile();

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('featured');

  // Manage modal state (admin only)
  const [isManageModalOpen, setIsManageModalOpen] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<'add' | 'list' | 'settings'>('add');
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);

  const categories = getCategoryList(links);
  const filteredLinks = filterAndSearchLinks(links, selectedCategory, searchQuery, sortBy);
  const themeStyles = getThemeStyles(profile.theme);

  // Current URL for sharing
  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://scanlink.app';

  // Check if current URL is an admin URL (/admin, ?admin, or #admin)
  const checkAdminRoute = useCallback(() => {
    if (typeof window === 'undefined') return;

    const pathname = window.location.pathname.toLowerCase();
    const search = window.location.search.toLowerCase();
    const hash = window.location.hash.toLowerCase();

    const isAdminUrl =
      pathname.includes('/admin') ||
      search.includes('admin') ||
      hash.includes('admin');

    if (isAdminUrl) {
      if (!isAdmin) {
        setIsAdminLoginOpen(true);
      }
    }
  }, [isAdmin]);

  useEffect(() => {
    checkAdminRoute();

    window.addEventListener('popstate', checkAdminRoute);
    window.addEventListener('hashchange', checkAdminRoute);
    return () => {
      window.removeEventListener('popstate', checkAdminRoute);
      window.removeEventListener('hashchange', checkAdminRoute);
    };
  }, [checkAdminRoute]);

  const handleLinkClick = (id: string, _url: string) => {
    db.incrementClicks(id);
  };

  const handleResetDefaults = () => {
    if (!isAdmin) return;
    db.resetClean();
  };

  const handleOpenAddLink = () => {
    setEditingLinkId(null);
    setModalTab('add');
    setIsManageModalOpen(true);
  };

  const handleOpenCustomize = () => {
    setEditingLinkId(null);
    setModalTab('settings');
    setIsManageModalOpen(true);
  };

  const handleEditLink = (id: string) => {
    setEditingLinkId(id);
    setModalTab('add');
    setIsManageModalOpen(true);
  };

  const handleDeleteLink = (id: string) => {
    db.deleteLink(id);
  };

  const handleExitAdmin = () => {
    handleAdminLogout();
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/');
    }
  };

  return (
    <div className={`min-h-screen ${themeStyles.bg} transition-colors duration-300 antialiased selection:bg-cyan-500 selection:text-white flex flex-col justify-between`}>
      {/* Main Container */}
      <main className="flex-1 w-full max-w-xl mx-auto px-4 py-8">
        {/* Header Profile Section (Public view has ZERO admin buttons/icons) */}
        <HeaderProfile
          profile={profile}
          currentUrl={currentUrl}
          isAdmin={isAdmin}
          onOpenManageModal={handleOpenCustomize}
          onAdminLogout={handleExitAdmin}
        />

        {/* Search, Filter Categories & Sorting (shown when links exist) */}
        {links.length > 0 && (
          <SearchAndFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortBy={sortBy}
            onSortChange={setSortBy}
            theme={profile.theme}
            totalFiltered={filteredLinks.length}
          />
        )}

        {/* Admin Quick Link Management Bar when links exist */}
        {isAdmin && links.length > 0 && (
          <div className="flex items-center justify-between px-1 mb-3 pt-1 animate-in fade-in">
            <span className="text-xs font-semibold text-gray-400">
              Websites ({filteredLinks.length} of {links.length})
            </span>
            <button
              onClick={handleOpenAddLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Another Link</span>
            </button>
          </div>
        )}

        {/* Links Directory List */}
        <section aria-label="Website Directory" className="space-y-3 pb-12">
          {links.length === 0 ? (
            <div className="text-center py-12 px-6 rounded-3xl bg-white/5 border border-dashed border-white/15 my-4">
              {isAdmin ? (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-cyan-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/10">
                    <Plus className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">
                    Digital Business Card Ready
                  </h3>
                  <p className="text-xs text-gray-400 max-w-xs mx-auto mb-5 leading-relaxed">
                    Logged in as Admin. You can now add websites, social profiles, documents, or company links!
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={handleOpenAddLink}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add First Link</span>
                    </button>
                    <button
                      onClick={handleOpenCustomize}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/15 transition-all cursor-pointer"
                    >
                      <Settings2 className="w-4 h-4 text-cyan-400" />
                      <span>Customize Card</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">
                    Welcome to {profile.title}'s Card
                  </h3>
                  <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
                    Thank you for scanning our business card. Explore our contact links above.
                  </p>
                </>
              )}
            </div>
          ) : filteredLinks.length > 0 ? (
            filteredLinks.map((link) => (
              <LinkCard
                key={link.id}
                link={link}
                theme={profile.theme}
                isAdmin={isAdmin}
                onLinkClick={handleLinkClick}
                onEditLink={handleEditLink}
                onDeleteLink={handleDeleteLink}
              />
            ))
          ) : (
            <div className="text-center py-12 px-4 rounded-3xl bg-white/5 border border-white/10 my-4">
              <SearchX className="w-10 h-10 text-gray-500 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-white mb-1">
                No matching links found
              </h3>
              <p className="text-xs text-gray-400 max-w-xs mx-auto mb-4">
                No links matching "{searchQuery}".
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer transition-all"
              >
                Clear Filters
              </button>
            </div>
          )}
        </section>
      </main>

      {/* Clean Public Footer (Admin info only visible when logged in) */}
      <footer className="text-center py-6 text-xs text-gray-500 border-t border-white/5 px-4 space-y-2">
        <div className="flex items-center justify-center gap-2 text-gray-400 font-medium">
          <span>{profile.title}</span>
          {isAdmin && (
            <>
              <span className="text-gray-600">•</span>
              <button
                onClick={handleExitAdmin}
                className="text-[11px] text-gray-400 hover:text-rose-400 inline-flex items-center gap-1 transition-colors cursor-pointer"
                title="Exit Admin Mode"
              >
                <LogOut className="w-3 h-3" />
                <span>Exit Admin Mode</span>
              </button>
            </>
          )}
        </div>

        {isAdmin && (
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-500 font-mono animate-in fade-in">
            <Database className="w-3 h-3 text-emerald-400" />
            <span>Central DB: {links.length} {links.length === 1 ? 'record' : 'records'}</span>
            <span className="text-cyan-400 font-sans font-semibold ml-1 inline-flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Admin Active
            </span>
          </div>
        )}
      </footer>

      {/* Admin Login Modal (Triggered by visiting /admin or ?admin) */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => {
          setIsAdminLoginOpen(false);
          // Return URL back to / if closed without logging in
          if (!isAdmin && typeof window !== 'undefined' && window.location.pathname.includes('/admin')) {
            window.history.pushState({}, '', '/');
          }
        }}
        onSuccess={() => {
          // Immediately open customize / management modal so admin can start editing right away
          setModalTab(links.length === 0 ? 'add' : 'settings');
          setIsManageModalOpen(true);
        }}
      />

      {/* Manage Profile, Logo & Links Modal (Admin Only) */}
      {isAdmin && (
        <ManageLinksModal
          isOpen={isManageModalOpen}
          onClose={() => {
            setIsManageModalOpen(false);
            setEditingLinkId(null);
          }}
          links={links}
          profile={profile}
          initialTab={modalTab}
          editLinkId={editingLinkId}
          onResetDefaults={handleResetDefaults}
        />
      )}
    </div>
  );
}

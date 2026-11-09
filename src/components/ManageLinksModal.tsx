import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Sparkles, 
  Save, 
  RotateCcw, 
  Download, 
  Settings, 
  Layers, 
  Check,
  AlertCircle,
  Database,
  Lock,
  Pencil,
  Globe,
  Share2
} from 'lucide-react';
import { WebsiteLink, PortalProfile, ThemeType, SocialLink } from '../types';
import { validateUrl, normalizeUrl } from '../utils/linkStorage';
import { db } from '../db/cardStore';
import { SaphireLogo } from './SaphireLogo';

interface ManageLinksModalProps {
  isOpen: boolean;
  onClose: () => void;
  links: WebsiteLink[];
  profile: PortalProfile;
  initialTab?: 'add' | 'list' | 'settings';
  editLinkId?: string | null;
  onUpdateLinks?: (newLinks: WebsiteLink[]) => void;
  onUpdateProfile?: (newProfile: PortalProfile) => void;
  onResetDefaults?: () => void;
}

export const ManageLinksModal: React.FC<ManageLinksModalProps> = ({
  isOpen,
  onClose,
  links,
  profile,
  initialTab = 'add',
  editLinkId = null,
  onUpdateLinks,
  onUpdateProfile,
  onResetDefaults,
}) => {
  const [activeTab, setActiveTab] = useState<'add' | 'list' | 'settings'>(initialTab);
  const [currentEditId, setCurrentEditId] = useState<string | null>(editLinkId);

  // Form states for adding / editing link
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Official');
  const [icon, setIcon] = useState('globe');
  const [badge, setBadge] = useState('');
  const [featured, setFeatured] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Profile form state
  const [profileTitle, setProfileTitle] = useState(profile.title);
  const [profileTagline, setProfileTagline] = useState(profile.tagline);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState(profile.avatarUrl || '');
  const [profileBio, setProfileBio] = useState(profile.bio || '');
  const [profileTheme, setProfileTheme] = useState<ThemeType>(profile.theme);
  const [profileSaved, setProfileSaved] = useState(false);

  // Socials state
  const [socialEmail, setSocialEmail] = useState('');
  const [socialLinkedin, setSocialLinkedin] = useState('');
  const [socialWebsite, setSocialWebsite] = useState('');
  const [socialGithub, setSocialGithub] = useState('');
  const [socialX, setSocialX] = useState('');

  // Admin PIN management
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinFeedback, setPinFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  // Server errors from saves/deletes, and in-flight state for submit buttons
  const [actionError, setActionError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Load link for editing
  const loadLinkForEditing = (link: WebsiteLink) => {
    setCurrentEditId(link.id);
    setTitle(link.title);
    setUrl(link.url);
    setDescription(link.description || '');
    setCategory(link.category || 'Official');
    setIcon(link.icon || 'globe');
    setBadge(link.badge || '');
    setFeatured(Boolean(link.featured));
    setActiveTab('add');
    setFormError('');
    setFormSuccess('');
  };

  const resetLinkForm = () => {
    setCurrentEditId(null);
    setTitle('');
    setUrl('');
    setDescription('');
    setCategory('Official');
    setIcon('globe');
    setBadge('');
    setFeatured(false);
    setFormError('');
    setFormSuccess('');
  };

  // Sync state when modal opens or initialTab/editLinkId changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      if (editLinkId) {
        const link = links.find((l) => l.id === editLinkId);
        if (link) {
          loadLinkForEditing(link);
        }
      } else {
        resetLinkForm();
      }

      setProfileTitle(profile.title);
      setProfileTagline(profile.tagline);
      setProfileAvatarUrl(profile.avatarUrl || '');
      setProfileBio(profile.bio || '');
      setProfileTheme(profile.theme);

      // Populate socials
      const emailObj = profile.socials?.find((s) => s.platform === 'email');
      const linkedinObj = profile.socials?.find((s) => s.platform === 'linkedin');
      const websiteObj = profile.socials?.find((s) => s.platform === 'website');
      const githubObj = profile.socials?.find((s) => s.platform === 'github');
      const xObj = profile.socials?.find((s) => s.platform === 'x');

      setSocialEmail(emailObj ? emailObj.url.replace('mailto:', '') : '');
      setSocialLinkedin(linkedinObj ? linkedinObj.url : '');
      setSocialWebsite(websiteObj ? websiteObj.url : '');
      setSocialGithub(githubObj ? githubObj.url : '');
      setSocialX(xObj ? xObj.url : '');
    }
  }, [isOpen, initialTab, editLinkId]);

  if (!isOpen) return null;

  const showActionError = (err: unknown) => {
    setActionError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
  };

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setActionError('');

    if (!title.trim()) {
      setFormError('Please enter a website or destination title.');
      return;
    }
    if (!validateUrl(url)) {
      setFormError('Please enter a valid URL (e.g. https://example.com or company.org).');
      return;
    }

    const existing = currentEditId ? db.getLinkById(currentEditId) : undefined;
    if (currentEditId && !existing) {
      setFormError('Failed to update link. Record not found.');
      return;
    }

    const record = {
      id: existing?.id ?? `link-${Date.now()}`,
      title: title.trim(),
      url: normalizeUrl(url),
      description: description.trim() || 'Tap to visit website',
      category: category.trim() || 'General',
      icon: icon || 'globe',
      badge: badge.trim() || undefined,
      featured,
      accentColor: existing?.accentColor,
      createdAt: existing?.createdAt ?? Date.now(),
    };

    setIsSaving(true);
    try {
      await db.saveLink(record);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save the link.');
      return;
    } finally {
      setIsSaving(false);
    }

    if (onUpdateLinks) onUpdateLinks(db.getLinks());
    if (existing) {
      setFormSuccess('Link updated and saved.');
      setTimeout(() => {
        setFormSuccess('');
        resetLinkForm();
        setActiveTab('list');
      }, 1200);
    } else {
      resetLinkForm();
      setFormSuccess('Link added and saved.');
      setTimeout(() => setFormSuccess(''), 2500);
    }
  };

  const handleDeleteLink = async (id: string) => {
    setActionError('');
    try {
      await db.deleteLink(id);
    } catch (err) {
      showActionError(err);
      return;
    }
    if (onUpdateLinks) onUpdateLinks(db.getLinks());
    if (currentEditId === id) {
      resetLinkForm();
    }
  };

  const handleToggleFeatured = async (id: string) => {
    const item = db.getLinkById(id);
    if (!item) return;
    setActionError('');
    try {
      await db.saveLink({ ...item, featured: !item.featured });
      if (onUpdateLinks) onUpdateLinks(db.getLinks());
    } catch (err) {
      showActionError(err);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError('');

    // Construct social array
    const updatedSocials: SocialLink[] = [];
    if (socialEmail.trim()) {
      const email = socialEmail.trim();
      updatedSocials.push({
        platform: 'email',
        url: email.startsWith('mailto:') ? email : `mailto:${email}`,
      });
    }
    if (socialWebsite.trim()) {
      updatedSocials.push({
        platform: 'website',
        url: normalizeUrl(socialWebsite.trim()),
      });
    }
    if (socialLinkedin.trim()) {
      updatedSocials.push({
        platform: 'linkedin',
        url: normalizeUrl(socialLinkedin.trim()),
      });
    }
    if (socialGithub.trim()) {
      updatedSocials.push({
        platform: 'github',
        url: normalizeUrl(socialGithub.trim()),
      });
    }
    if (socialX.trim()) {
      updatedSocials.push({
        platform: 'x',
        url: normalizeUrl(socialX.trim()),
      });
    }

    setIsSaving(true);
    try {
      const updated = await db.saveProfile({
        title: profileTitle.trim() || 'Alex Morgan',
        tagline: profileTagline.trim(),
        avatarUrl: profileAvatarUrl.trim() ? normalizeUrl(profileAvatarUrl.trim()) : '',
        bio: profileBio.trim(),
        theme: profileTheme,
        socials: updatedSocials,
      });
      if (onUpdateProfile) onUpdateProfile(updated);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch (err) {
      showActionError(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePin = async () => {
    setPinFeedback(null);
    if (newPin.trim().length < 6) {
      setPinFeedback({ ok: false, text: 'New PIN must be at least 6 characters.' });
      return;
    }
    try {
      await db.changePin(currentPin, newPin.trim());
      setPinFeedback({ ok: true, text: 'PIN changed. Other devices will need to log in again.' });
      setCurrentPin('');
      setNewPin('');
    } catch (err) {
      setPinFeedback({ ok: false, text: err instanceof Error ? err.message : 'Could not change the PIN.' });
    }
  };

  const handleResetData = async () => {
    if (!window.confirm('Delete all links and reset the profile? This cannot be undone.')) return;
    setActionError('');
    try {
      await db.resetContent();
      resetLinkForm();
      if (onResetDefaults) onResetDefaults();
    } catch (err) {
      showActionError(err);
    }
  };

  const handleExportJson = () => {
    const data = JSON.stringify({ profile: db.getProfile(), links: db.getLinks() }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `saphire-card-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(blobUrl);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Manage Business Card and Links"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl bg-[#0f172a] border border-blue-500/30 shadow-2xl text-gray-100 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-gradient-to-r from-blue-950/40 to-indigo-950/40">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-blue-500/15 text-cyan-400 border border-blue-500/30">
              <Database className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Card Management</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Admin Active
                </span>
              </div>
              <p className="text-xs text-gray-400">Manage company logo, dynamic name, headline, and links</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close Management Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/10 bg-black/30 px-5 pt-2 gap-2 text-xs font-semibold">
          <button
            onClick={() => {
              if (currentEditId) resetLinkForm();
              setActiveTab('add');
            }}
            className={`pb-3 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'add'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {currentEditId ? <Pencil className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{currentEditId ? 'Edit Link' : 'Add Link'}</span>
          </button>

          <button
            onClick={() => setActiveTab('list')}
            className={`pb-3 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'list'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Links ({links.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-3 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'settings'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Profile, Logo & Theme</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {actionError && (
            <div role="alert" className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{actionError}</span>
              <button type="button" onClick={() => setActionError('')} className="text-rose-300 hover:text-white cursor-pointer" aria-label="Dismiss error">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* TAB 1: ADD OR EDIT LINK */}
          {activeTab === 'add' && (
            <form onSubmit={handleLinkSubmit} className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-cyan-400 font-semibold">
                  {currentEditId ? 'Editing Existing Link' : 'Add New Link to Business Card'}
                </span>
                {currentEditId && (
                  <button
                    type="button"
                    onClick={resetLinkForm}
                    className="text-xs text-gray-400 hover:text-white underline cursor-pointer"
                  >
                    Cancel Edit / Add New
                  </button>
                )}
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              {formSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <Check className="w-4 h-4 flex-shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Website / Destination Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Official Website, Portfolio, WhatsApp, Store"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:border-cyan-400 outline-none text-white placeholder-gray-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Destination URL *
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com or mysite.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:border-cyan-400 outline-none text-white placeholder-gray-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Short Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Explore our corporate solutions and services..."
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-sm focus:border-cyan-400 outline-none resize-none text-white placeholder-gray-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#1e293b] border border-white/10 text-sm focus:border-cyan-400 outline-none text-gray-200"
                  >
                    <option value="Official">Official</option>
                    <option value="Services">Services</option>
                    <option value="Products">Products</option>
                    <option value="Portfolio">Portfolio</option>
                    <option value="Contact">Contact</option>
                    <option value="Community">Community</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Icon
                  </label>
                  <select
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#1e293b] border border-white/10 text-sm focus:border-cyan-400 outline-none text-gray-200"
                  >
                    <option value="globe">Globe (Web)</option>
                    <option value="layers">Layers (App/Service)</option>
                    <option value="book-open">Book (Docs/Catalog)</option>
                    <option value="shopping-bag">Store (Shop)</option>
                    <option value="message-square">Chat / WhatsApp</option>
                    <option value="calendar">Calendar (Meeting)</option>
                    <option value="play-circle">Video / Showcase</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center pt-1">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Badge Tag (Optional)
                  </label>
                  <input
                    type="text"
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    placeholder="e.g. Featured, 2026, New"
                    className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-sm focus:border-cyan-400 outline-none text-white placeholder-gray-500"
                  />
                </div>

                <div className="pt-4">
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={featured}
                      onChange={(e) => setFeatured(e.target.checked)}
                      className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 bg-white/10 border-white/20"
                    />
                    <span>Highlight as Featured</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {currentEditId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  <span>{currentEditId ? 'Save Changes' : 'Add Link to Card'}</span>
                </button>
                {currentEditId && (
                  <button
                    type="button"
                    onClick={resetLinkForm}
                    className="py-2.5 px-4 rounded-xl text-sm font-medium bg-white/10 hover:bg-white/15 text-gray-300 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          )}

          {/* TAB 2: LIST OF ALL LINKS */}
          {activeTab === 'list' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                <span>{links.length} saved links</span>
                <button
                  onClick={handleResetData}
                  className="text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset All to Clean</span>
                </button>
              </div>

              {links.length === 0 ? (
                <div className="text-center py-8 px-4 rounded-2xl bg-white/5 border border-dashed border-white/10">
                  <p className="text-xs text-gray-400 mb-3">No links added yet.</p>
                  <button
                    onClick={() => {
                      resetLinkForm();
                      setActiveTab('add');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add First Link</span>
                  </button>
                </div>
              ) : (
                links.map((link) => (
                  <div
                    key={link.id}
                    className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3 hover:border-white/20 transition-all"
                  >
                    <div className="truncate min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-white truncate">
                          {link.title}
                        </span>
                        {link.featured && (
                          <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Featured
                          </span>
                        )}
                        {link.badge && (
                          <span className="text-[10px] px-2 py-0.2 rounded-full bg-blue-500/20 text-cyan-300">
                            {link.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 truncate mt-0.5 font-mono">
                        {link.url}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-1">
                        {link.category} • {link.clicks} visits
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => loadLinkForEditing(link)}
                        className="p-2 rounded-xl bg-blue-500/10 text-cyan-300 hover:bg-blue-500/25 transition-colors cursor-pointer"
                        title="Edit link"
                        aria-label={`Edit ${link.title}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleToggleFeatured(link.id)}
                        className={`p-2 rounded-xl transition-colors cursor-pointer ${
                          link.featured
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-white/5 text-gray-400 hover:text-white'
                        }`}
                        title={link.featured ? 'Unmark featured' : 'Mark as featured'}
                        aria-label="Toggle featured"
                      >
                        <Sparkles className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteLink(link.id)}
                        className="p-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                        title="Delete link"
                        aria-label={`Delete ${link.title}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: PROFILE, LOGO & THEME SETTINGS */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {profileSaved && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <Check className="w-4 h-4 flex-shrink-0" />
                  <span>Card profile, logo, and theme saved!</span>
                </div>
              )}

              {/* Company Logo Section with Live Preview */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <label className="block text-xs font-semibold text-cyan-300 flex items-center justify-between">
                  <span>Company Logo</span>
                  <span className="text-[10px] text-gray-400 font-normal">Replaces the picture place</span>
                </label>

                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-black/40 border border-white/15 flex items-center justify-center overflow-hidden flex-shrink-0 p-1">
                    <SaphireLogo size={56} customLogoUrl={profileAvatarUrl} />
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <input
                      type="text"
                      value={profileAvatarUrl}
                      onChange={(e) => setProfileAvatarUrl(e.target.value)}
                      placeholder="Paste image URL (PNG/SVG/JPG) or leave empty"
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:border-cyan-400 outline-none"
                    />
                    <div className="flex items-center justify-between text-[11px] text-gray-400">
                      <span>{profileAvatarUrl ? 'Custom Image URL active' : 'Glowing Saphire Gemstone Logo'}</span>
                      {profileAvatarUrl && (
                        <button
                          type="button"
                          onClick={() => setProfileAvatarUrl('')}
                          className="text-cyan-400 hover:underline cursor-pointer"
                        >
                          Use Default Saphire Logo
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Name and Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Dynamic Full Name *
                  </label>
                  <input
                    type="text"
                    value={profileTitle}
                    onChange={(e) => setProfileTitle(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-sm focus:border-cyan-400 outline-none text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Title / Role / Headline
                  </label>
                  <input
                    type="text"
                    value={profileTagline}
                    onChange={(e) => setProfileTagline(e.target.value)}
                    placeholder="e.g. Senior Consultant • Saphire"
                    className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-sm focus:border-cyan-400 outline-none text-white"
                  />
                </div>
              </div>

              {/* Social Channels */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <label className="block text-xs font-semibold text-cyan-300 flex items-center justify-between">
                  <span>Social & Contact Icons</span>
                  <span className="text-[10px] text-gray-400 font-normal">Displayed on card</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Official Website</label>
                    <input
                      type="text"
                      value={socialWebsite}
                      onChange={(e) => setSocialWebsite(e.target.value)}
                      placeholder="https://saphire.company"
                      className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:border-cyan-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={socialEmail}
                      onChange={(e) => setSocialEmail(e.target.value)}
                      placeholder="contact@saphire.com"
                      className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:border-cyan-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">LinkedIn Profile</label>
                    <input
                      type="text"
                      value={socialLinkedin}
                      onChange={(e) => setSocialLinkedin(e.target.value)}
                      placeholder="https://linkedin.com/in/alexmorgan"
                      className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:border-cyan-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Twitter / X</label>
                    <input
                      type="text"
                      value={socialX}
                      onChange={(e) => setSocialX(e.target.value)}
                      placeholder="https://x.com/saphire"
                      className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:border-cyan-400 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Color Theme */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Color Theme
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'midnight', name: 'Midnight', color: 'bg-indigo-950 border-indigo-500' },
                    { id: 'aurora', name: 'Aurora', color: 'bg-slate-900 border-teal-500' },
                    { id: 'emerald', name: 'Emerald', color: 'bg-zinc-900 border-emerald-500' },
                    { id: 'sunset', name: 'Sunset', color: 'bg-neutral-900 border-orange-500' },
                    { id: 'clean-light', name: 'Light', color: 'bg-gray-100 border-indigo-500 text-gray-900' },
                    { id: 'neo-dark', name: 'Neo Dark', color: 'bg-black border-white' },
                  ].map((t) => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => setProfileTheme(t.id as ThemeType)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center ${t.color} ${
                        profileTheme === t.id
                          ? 'ring-2 ring-cyan-400 scale-102'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Admin Security PIN */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <Lock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Admin Security (PIN / Password)</span>
                </div>
                <p className="text-[11px] text-gray-400">
                  Only the admin can edit this card. Changing the PIN signs out every other device.
                </p>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <input
                    type="password"
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value)}
                    placeholder="Current PIN"
                    autoComplete="current-password"
                    className="flex-1 min-w-0 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:border-cyan-400 outline-none font-mono"
                  />
                  <input
                    type="password"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="New PIN (6+ characters)"
                    autoComplete="new-password"
                    className="flex-1 min-w-0 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:border-cyan-400 outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleChangePin}
                    disabled={!currentPin || !newPin}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Change PIN
                  </button>
                </div>
                {pinFeedback && (
                  <p className={`text-[11px] ${pinFeedback.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {pinFeedback.text}
                  </p>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Profile & Logo Settings</span>
                </button>
              </div>

              <div className="pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-300 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Card Data (JSON)</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { 
  Check, 
  Settings2, 
  ShieldCheck, 
  Globe, 
  Github, 
  Twitter, 
  Linkedin, 
  Mail, 
  MessageSquare, 
  Share2,
  Pencil,
  X,
  LogOut,
  Plus
} from 'lucide-react';
import { PortalProfile } from '../types';
import { getThemeStyles } from '../utils/linkStorage';
import { db } from '../db/cardStore';
import { SaphireLogo } from './SaphireLogo';

interface HeaderProfileProps {
  profile: PortalProfile;
  currentUrl: string;
  isAdmin: boolean;
  onOpenManageModal: () => void;
  onAdminLogout: () => void;
}

export const HeaderProfile: React.FC<HeaderProfileProps> = ({
  profile,
  currentUrl,
  isAdmin,
  onOpenManageModal,
  onAdminLogout,
}) => {
  const [copied, setCopied] = useState(false);
  const themeStyles = getThemeStyles(profile.theme);

  // In-place dynamic name editing states (active when isAdmin is true)
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(profile.title);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // In-place dynamic tagline / role editing states (active when isAdmin is true)
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [roleInput, setRoleInput] = useState(profile.tagline);
  const roleInputRef = useRef<HTMLInputElement>(null);

  // Sync states when profile updates
  useEffect(() => {
    setNameInput(profile.title);
  }, [profile.title]);

  useEffect(() => {
    setRoleInput(profile.tagline);
  }, [profile.tagline]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const saveInline = async (patch: Partial<PortalProfile>, revert: () => void) => {
    try {
      await db.saveProfile(patch);
    } catch (err) {
      revert();
      window.alert(err instanceof Error ? err.message : 'Could not save your change.');
    }
  };

  const handleSaveName = () => {
    if (!isAdmin) return;
    setIsEditingName(false);
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === profile.title) {
      setNameInput(profile.title);
      return;
    }
    saveInline({ title: trimmed }, () => setNameInput(profile.title));
  };

  const handleSaveRole = () => {
    if (!isAdmin) return;
    setIsEditingRole(false);
    const trimmed = roleInput.trim();
    if (trimmed === profile.tagline) return;
    saveInline({ tagline: trimmed }, () => setRoleInput(profile.tagline));
  };

  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case 'github':
        return <Github className="w-4 h-4" />;
      case 'x':
        return <Twitter className="w-4 h-4" />;
      case 'linkedin':
        return <Linkedin className="w-4 h-4" />;
      case 'discord':
        return <MessageSquare className="w-4 h-4" />;
      case 'email':
        return <Mail className="w-4 h-4" />;
      case 'website':
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  return (
    <header className="relative pt-2 pb-6 text-center select-none">
      {/* Ambient background glow */}
      <div 
        aria-hidden="true" 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-44 bg-blue-600/15 rounded-full blur-3xl pointer-events-none -z-10" 
      />

      {/* Top bar (ONLY rendered when logged in as Admin via /admin URL) */}
      {isAdmin && (
        <div className="flex items-center justify-between max-w-xl mx-auto px-2 mb-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-cyan-300 border border-blue-500/30">
              <ShieldCheck className="w-3 h-3 text-cyan-400" />
              <span>Admin Mode</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenManageModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              title="Customize profile, logo, colors and links"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Customize</span>
            </button>

            <button
              onClick={onAdminLogout}
              className="p-1.5 rounded-full bg-white/5 hover:bg-rose-500/20 text-gray-400 hover:text-rose-300 border border-white/10 transition-colors cursor-pointer"
              title="Lock / Exit Admin Mode"
              aria-label="Logout Admin"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Admin Quick Action Banner (Admin Mode only) */}
      {isAdmin && (
        <div className="max-w-xl mx-auto px-2 mb-5 animate-in fade-in duration-200">
          <div className="p-2.5 rounded-2xl bg-blue-950/40 border border-blue-500/30 text-xs text-cyan-200 flex items-center justify-between gap-2 shadow-inner">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="text-[11px]">Click logo or name to edit directly, or tap customize</span>
            </div>
            <button
              onClick={onOpenManageModal}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/30 transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Add / Manage</span>
            </button>
          </div>
        </div>
      )}

      {/* Picture Place: Company Logo */}
      <div 
        onClick={isAdmin ? onOpenManageModal : undefined}
        className={`relative inline-block mx-auto mb-4 group ${
          isAdmin ? 'cursor-pointer' : ''
        }`}
        title={isAdmin ? 'Company Logo (Click to customize or change)' : 'Company Logo'}
      >
        <div className="transition-transform duration-200 group-hover:scale-105">
          <SaphireLogo size={104} customLogoUrl={profile.avatarUrl} />
        </div>
        {isAdmin && (
          <span 
            className="absolute bottom-1 right-1 p-1.5 rounded-full bg-blue-600 text-white shadow-lg border-2 border-slate-900 group-hover:scale-110 transition-transform"
            title="Click to edit / change company logo"
          >
            <Pencil className="w-3 h-3" />
          </span>
        )}
      </div>

      {/* Dynamic Name (Editable when isAdmin is true) */}
      <div className="flex items-center justify-center gap-2 mb-1 px-4 min-h-[44px]">
        {isAdmin && isEditingName ? (
          <div className="flex items-center gap-1.5 max-w-sm w-full mx-auto animate-in fade-in zoom-in-95 duration-150">
            <input
              ref={nameInputRef}
              type="text"
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveName();
                if (e.key === 'Escape') {
                  setNameInput(profile.title);
                  setIsEditingName(false);
                }
              }}
              placeholder="Your Full Name"
              className="flex-1 px-3 py-1.5 text-center text-xl sm:text-2xl font-extrabold rounded-xl bg-white/10 border-2 border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-white placeholder-gray-500 shadow-inner"
            />
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleSaveName}
              className="p-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white transition-all cursor-pointer shadow-md"
              title="Save Name"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setNameInput(profile.title);
                setIsEditingName(false);
              }}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white transition-all cursor-pointer"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : isAdmin ? (
          <div className="flex items-center justify-center gap-1.5 group">
            <button
              onClick={() => setIsEditingName(true)}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-2xl hover:bg-white/10 border border-white/15 bg-white/5 transition-all cursor-pointer group shadow-sm"
              title="Click to edit name directly (Admin)"
            >
              <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r ${themeStyles.headerGrad} bg-clip-text text-transparent`}>
                {profile.title}
              </h1>
              <span className="p-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                <Pencil className="w-3.5 h-3.5" />
              </span>
            </button>
            {profile.verified && (
              <span className="inline-flex items-center text-blue-400 flex-shrink-0" title="Verified Profile">
                <ShieldCheck className="w-5 h-5 fill-blue-500/20 text-blue-400" />
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r ${themeStyles.headerGrad} bg-clip-text text-transparent`}>
              {profile.title}
            </h1>
            {profile.verified && (
              <span className="inline-flex items-center text-blue-400 flex-shrink-0" title="Verified Profile">
                <ShieldCheck className="w-5 h-5 fill-blue-500/20 text-blue-400" />
              </span>
            )}
          </div>
        )}
      </div>

      {/* Dynamic Role / Headline (Editable when isAdmin is true) */}
      <div className="flex items-center justify-center px-4 mb-4 min-h-[32px]">
        {isAdmin && isEditingRole ? (
          <div className="flex items-center gap-1.5 max-w-xs w-full mx-auto animate-in fade-in zoom-in-95 duration-150">
            <input
              ref={roleInputRef}
              type="text"
              autoFocus
              value={roleInput}
              onChange={(e) => setRoleInput(e.target.value)}
              onBlur={handleSaveRole}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveRole();
                if (e.key === 'Escape') {
                  setRoleInput(profile.tagline);
                  setIsEditingRole(false);
                }
              }}
              placeholder="e.g. Senior Consultant • Saphire"
              className="flex-1 px-3 py-1 text-center text-xs sm:text-sm font-medium rounded-xl bg-white/10 border border-cyan-400 focus:outline-none text-white placeholder-gray-500"
            />
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleSaveRole}
              className="p-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer"
              title="Save Role"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setRoleInput(profile.tagline);
                setIsEditingRole(false);
              }}
              className="p-1.5 rounded-lg bg-white/10 text-gray-400 hover:text-white cursor-pointer"
              title="Cancel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : isAdmin ? (
          <button
            onClick={() => setIsEditingRole(true)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl hover:bg-white/10 border border-white/15 bg-white/5 text-xs sm:text-sm font-medium max-w-md mx-auto transition-all cursor-pointer group shadow-sm ${themeStyles.subtext}`}
            title="Click to edit role/company headline (Admin)"
          >
            <span>{profile.tagline || 'Add your title / company'}</span>
            <Pencil className="w-3 h-3 text-cyan-400" />
          </button>
        ) : (
          profile.tagline && (
            <p className={`text-xs sm:text-sm font-medium max-w-md mx-auto px-4 ${themeStyles.subtext}`}>
              {profile.tagline}
            </p>
          )
        )}
      </div>

      {/* Social links row */}
      {profile.socials && profile.socials.length > 0 && (
        <div className="flex items-center justify-center gap-2 mb-5 flex-wrap px-4">
          {profile.socials.map((social, idx) => (
            <a
              key={idx}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 hover:border-white/20 transition-all hover:-translate-y-0.5"
              aria-label={`Visit ${social.platform}`}
              title={social.platform.toUpperCase()}
            >
              {getSocialIcon(social.platform)}
            </a>
          ))}
        </div>
      )}

      {/* Share / Copy Profile Button */}
      <div className="flex items-center justify-center gap-3 px-4 max-w-xs mx-auto">
        <button
          onClick={handleCopyLink}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs sm:text-sm font-medium bg-white/10 hover:bg-white/15 text-white border border-white/15 transition-all cursor-pointer hover:shadow-lg hover:shadow-blue-500/10"
          title="Share profile link"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400">Card Link Copied!</span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4 text-gray-300" />
              <span>Share Card</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};

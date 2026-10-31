import React, { useState } from 'react';
import { 
  ExternalLink, 
  Copy, 
  Check, 
  Globe, 
  BookOpen, 
  Layers, 
  ShoppingBag, 
  LifeBuoy, 
  MessageSquare, 
  Calendar, 
  PlayCircle,
  Pencil,
  Trash2
} from 'lucide-react';
import { WebsiteLink, ThemeType } from '../types';
import { extractDomain, getThemeStyles, normalizeUrl } from '../utils/linkStorage';

interface LinkCardProps {
  link: WebsiteLink;
  theme: ThemeType;
  isAdmin?: boolean;
  onLinkClick: (id: string, url: string) => void;
  onEditLink?: (id: string) => void;
  onDeleteLink?: (id: string) => void;
}

export const LinkCard: React.FC<LinkCardProps> = ({
  link,
  theme,
  isAdmin = false,
  onLinkClick,
  onEditLink,
  onDeleteLink,
}) => {
  const [copied, setCopied] = useState(false);
  const themeStyles = getThemeStyles(theme);
  const domain = extractDomain(link.url);
  const fullUrl = normalizeUrl(link.url);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onEditLink) onEditLink(link.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDeleteLink) onDeleteLink(link.id);
  };

  const renderIcon = (iconName: string) => {
    const props = { className: 'w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform' };
    switch (iconName.toLowerCase()) {
      case 'globe':
        return <Globe {...props} />;
      case 'layers':
        return <Layers {...props} />;
      case 'book-open':
      case 'book':
        return <BookOpen {...props} />;
      case 'shopping-bag':
      case 'store':
        return <ShoppingBag {...props} />;
      case 'life-buoy':
      case 'support':
        return <LifeBuoy {...props} />;
      case 'message-square':
      case 'chat':
        return <MessageSquare {...props} />;
      case 'calendar':
        return <Calendar {...props} />;
      case 'play-circle':
      case 'youtube':
        return <PlayCircle {...props} />;
      default:
        return <Globe {...props} />;
    }
  };

  return (
    <a
      href={fullUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => onLinkClick(link.id, fullUrl)}
      className={`group relative rounded-2xl border p-4 transition-all duration-200 block ${themeStyles.cardBg} ${themeStyles.cardBorder} hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/10`}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: Icon + Content */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-cyan-400/40 transition-all">
            {renderIcon(link.icon)}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-semibold text-sm sm:text-base text-gray-100 group-hover:text-cyan-300 transition-colors truncate">
                {link.title}
              </h2>
              {link.featured && (
                <span className="text-[10px] px-2 py-0.2 rounded-md font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Featured
                </span>
              )}
              {link.badge && (
                <span className={`text-[10px] px-2 py-0.2 rounded-md font-semibold border ${themeStyles.badgeBg}`}>
                  {link.badge}
                </span>
              )}
            </div>

            {link.description && (
              <p className="text-xs text-gray-400 truncate mt-0.5">
                {link.description}
              </p>
            )}

            <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500">
              <span className="font-mono text-gray-400">{domain}</span>
              <span>•</span>
              <span>{link.category}</span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 flex-shrink-0 pl-2">
          {isAdmin && (
            <>
              <button
                onClick={handleEdit}
                className="p-2 rounded-lg text-cyan-400 hover:text-white hover:bg-cyan-500/20 transition-colors cursor-pointer"
                title="Edit link (Admin)"
                aria-label={`Edit ${link.title}`}
              >
                <Pencil className="w-4 h-4" />
              </button>

              <button
                onClick={handleDelete}
                className="p-2 rounded-lg text-rose-400 hover:text-white hover:bg-rose-500/20 transition-colors cursor-pointer"
                title="Delete link (Admin)"
                aria-label={`Delete ${link.title}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            onClick={handleCopy}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Copy URL"
            aria-label={`Copy link for ${link.title}`}
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>

          <div className="p-2 text-gray-400 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all">
            <ExternalLink className="w-4 h-4" />
          </div>
        </div>
      </div>
    </a>
  );
};

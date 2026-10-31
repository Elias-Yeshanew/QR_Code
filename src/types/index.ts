export interface WebsiteLink {
  id: string;
  title: string;
  url: string;
  description: string;
  category: string;
  icon: string;
  clicks: number;
  featured?: boolean;
  badge?: string;
  accentColor?: string;
  createdAt?: number;
}

export interface SocialLink {
  platform: 'github' | 'x' | 'linkedin' | 'instagram' | 'youtube' | 'email' | 'discord' | 'website';
  url: string;
}

export type ThemeType = 'midnight' | 'aurora' | 'emerald' | 'sunset' | 'clean-light' | 'neo-dark';

export interface PortalProfile {
  title: string;
  tagline: string;
  bio: string;
  avatarUrl: string;
  verified: boolean;
  theme: ThemeType;
  socials: SocialLink[];
  customLandingUrl?: string;
}

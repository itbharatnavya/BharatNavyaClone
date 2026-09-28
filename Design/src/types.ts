export type View =
  | 'ecosystem-marketplace'
  | 'ecosystem-network'
  | 'ecosystem-hub'
  | 'home'
  | 'companies'
  | 'discover'
  | 'brief'
  | 'results'
  | 'compare'
  | 'profile'
  | 'inquiry'
  | 'requests'
  | 'provider-start'
  | 'provider-setup'
  | 'provider-preview'
  | 'provider-dashboard'
  | 'provider-lead'
  | 'jobs'
  | 'job-results'
  | 'job-detail'
  | 'updates'
  | 'saved'
  | 'applicant-dashboard'
  | 'applicant-profile'
  | 'recruiter-dashboard'
  | 'recruiter-pipeline'
  | 'recruiter-job-editor'
  | 'workspace-media'
  | 'workspace-reviews'
  | 'workspace-updates'
  | 'workspace-recruitment'
  | 'workspace-team'
  | 'workspace-promotions'
  | 'component-gallery';

export type ShellMode = 'founder' | 'provider';

export type NavigationIcon = 'search' | 'sparkles' | 'bookmark' | 'inbox' | 'home' | 'building' | 'briefcase' | 'megaphone' | 'users' | 'images' | 'star' | 'badge';

export interface NavigationItem {
  route: View;
  label: string;
  icon: NavigationIcon;
  mode: ShellMode;
  mobile: boolean;
  matches: View[];
}

export interface ShellPreferences {
  providerSidebarCollapsed: boolean;
}

export interface ResultFilters {
  verifiedOnly: boolean;
  evidenceOnly: boolean;
  nearbyOnly: boolean;
  availableSoon: boolean;
  pricingShown: boolean;
}

export type VerificationLevel = 'unclaimed' | 'claimed' | 'identity' | 'evidence';

export interface SearchBrief {
  originalQuery: string;
  serviceCategory: string;
  location: string;
  timing: string;
  budgetBand: string;
  providerType: string;
  proofRequirements: string[];
}

export interface MatchExplanation {
  matched: string[];
  gaps: string[];
  updated: string;
}

export interface BusinessProfile {
  id: string;
  name: string;
  initials: string;
  verification: VerificationLevel;
  descriptor: string;
  location: string;
  distance: string;
  services: string[];
  industries: string[];
  responseTime: string;
  yearsActive: number;
  priceGuide: string;
  availability: string;
  credentials: string[];
  proof: string[];
  about: string;
  match: MatchExplanation;
  logoImage?: string;
  coverImage?: string;
  coverImageAlt?: string;
  careersImage?: string;
  careersImageAlt?: string;
  promoted?: boolean;
  gallery?: Array<{ id: string; src: string; alt: string; category: 'Workplace' | 'Work samples' | 'Team' | 'Certificates' }>;
  rating?: number;
  reviewCount?: number;
  teamSize?: string;
  founded?: number;
  website?: string;
  activeStatus?: { title: string; detail: string; age: string };
  highlights?: string[];
  reviews?: Array<{ id: string; author: string; role: string; rating: number; text: string; date: string; verified: boolean; response?: string }>;
  portfolio?: Array<{ title: string; outcome: string; detail: string }>;
  openJobs?: Array<{ id: string; title: string; location: string; salary: string }>;
  recruiter?: { name: string; title: string; response: string; avatar?: string };
}

export interface Inquiry {
  id: string;
  businessId: string;
  businessName: string;
  summary: string;
  contactMethod: 'Bharat Navya' | 'Email' | 'WhatsApp';
  status: 'Sent' | 'Viewed' | 'Replied';
  sentAt: string;
}

export interface ProviderDraft {
  mode: 'claim' | 'create';
  businessName: string;
  phone: string;
  gstin: string;
  service: string;
  location: string;
  industries: string;
  priceGuide: string;
  credential: string;
  availability: string;
}

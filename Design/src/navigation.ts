import type { NavigationItem } from './types';

export const founderNavigation: NavigationItem[] = [
  { route: 'home', label: 'Home', icon: 'home', mode: 'founder', mobile: true, matches: ['home'] },
  { route: 'companies', label: 'Companies', icon: 'search', mode: 'founder', mobile: true, matches: ['companies', 'discover', 'brief', 'results', 'compare', 'profile', 'inquiry', 'requests'] },
  { route: 'jobs', label: 'Jobs', icon: 'briefcase', mode: 'founder', mobile: true, matches: ['jobs', 'job-results', 'job-detail', 'applicant-dashboard', 'applicant-profile'] },
  { route: 'updates', label: 'Updates', icon: 'megaphone', mode: 'founder', mobile: true, matches: ['updates'] },
  { route: 'saved', label: 'Saved', icon: 'bookmark', mode: 'founder', mobile: true, matches: ['saved'] },
];

export const providerNavigation: NavigationItem[] = [
  { route: 'provider-dashboard', label: 'Business home', icon: 'home', mode: 'provider', mobile: true, matches: ['provider-dashboard'] },
  { route: 'provider-lead', label: 'Leads', icon: 'inbox', mode: 'provider', mobile: true, matches: ['provider-lead'] },
  { route: 'provider-setup', label: 'Business profile', icon: 'building', mode: 'provider', mobile: true, matches: ['provider-start', 'provider-setup', 'provider-preview'] },
  { route: 'workspace-media', label: 'Media', icon: 'images', mode: 'provider', mobile: false, matches: ['workspace-media'] },
  { route: 'workspace-reviews', label: 'Reviews', icon: 'star', mode: 'provider', mobile: false, matches: ['workspace-reviews'] },
  { route: 'workspace-updates', label: 'Updates', icon: 'megaphone', mode: 'provider', mobile: true, matches: ['workspace-updates'] },
  { route: 'workspace-recruitment', label: 'Recruitment', icon: 'users', mode: 'provider', mobile: true, matches: ['workspace-recruitment', 'recruiter-dashboard', 'recruiter-pipeline', 'recruiter-job-editor'] },
  { route: 'workspace-team', label: 'Team', icon: 'users', mode: 'provider', mobile: false, matches: ['workspace-team'] },
  { route: 'workspace-promotions', label: 'Promote', icon: 'badge', mode: 'provider', mobile: false, matches: ['workspace-promotions'] },
];

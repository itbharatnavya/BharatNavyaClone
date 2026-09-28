import { useEffect, useState } from 'react';
import type React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bell,
  Bookmark,
  BriefcaseBusiness,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileCheck2,
  Filter,
  HelpCircle,
  Inbox,
  LayoutList,
  MapPin,
  Menu,
  MessageSquare,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Store,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { businesses, initialBrief } from './data';
import { Shell } from './components/Shell';
import { FounderExperience } from './founder/FounderExperience';
import { EcosystemExperience } from './ecosystem-lab/EcosystemExperience';
import { PlatformExperience } from './platform/PlatformExperience';
import { AuthDialog } from './platform/AuthDialog';
import { HomeExperience } from './home/HomeExperience';
import { AssistantShell } from './components/AssistantShell';
import { usePersistentState } from './hooks/usePersistentState';
import type { BusinessProfile, Inquiry, ProviderDraft, SearchBrief, ShellPreferences, View } from './types';

const verificationCopy = {
  unclaimed: 'Unclaimed listing',
  claimed: 'Claimed business',
  identity: 'Identity verified',
  evidence: 'Evidence verified',
};

const categoryPrompts = [
  ['Tax & compliance', 'Need help registering for GST'],
  ['Manufacturing', 'Find a small-batch manufacturer'],
  ['Marketing', 'Looking for a launch marketing partner'],
  ['Business services', 'Need an event manager for a company event'],
] as const;

const defaultDraft: ProviderDraft = {
  mode: 'create',
  businessName: 'Aroha Foods Private Limited',
  phone: '+91 98765 43210',
  gstin: '24AABCA1234A1Z5',
  service: 'Food manufacturing',
  location: 'Ahmedabad, Gujarat',
  industries: 'Food & beverage, Retail, Hospitality',
  priceGuide: 'Projects from ₹75,000',
  credential: 'FSSAI licence and GST registration',
  availability: 'Accepting two new projects this month',
};

const viewPaths: Record<View, string> = {
  'ecosystem-marketplace': '/vision',
  'ecosystem-network': '/opportunities',
  'ecosystem-hub': '/business-hub',
  home: '/',
  companies: '/companies',
  discover: '/companies',
  brief: '/directory/brief',
  results: '/companies/browse',
  compare: '/companies/compare',
  profile: '/companies/profile/ledgercraft',
  inquiry: '/companies/inquiry/ledgercraft',
  requests: '/requests',
  'provider-start': '/workspace/start',
  'provider-setup': '/workspace/profile',
  'provider-preview': '/workspace/preview',
  'provider-dashboard': '/workspace',
  'provider-lead': '/workspace/leads',
  jobs: '/jobs',
  'job-results': '/jobs/browse',
  'job-detail': '/jobs/job-ops',
  updates: '/updates',
  saved: '/saved',
  'applicant-dashboard': '/jobs/applications',
  'applicant-profile': '/me/profile',
  'recruiter-dashboard': '/workspace/recruitment/dashboard',
  'recruiter-pipeline': '/workspace/recruitment/pipeline',
  'recruiter-job-editor': '/workspace/recruitment/job',
  'workspace-media': '/workspace/media',
  'workspace-reviews': '/workspace/reviews',
  'workspace-updates': '/workspace/updates',
  'workspace-recruitment': '/workspace/recruitment',
  'workspace-team': '/workspace/team',
  'workspace-promotions': '/workspace/promotions',
  'component-gallery': '/design-system',
};

const viewTitles: Record<View, string> = {
  'ecosystem-marketplace': 'Archived marketplace vision',
  'ecosystem-network': 'Archived opportunity network',
  'ecosystem-hub': 'Archived business hub',
  home: 'Home',
  companies: 'Companies',
  discover: 'Companies',
  brief: 'Review your company brief',
  results: 'Company results',
  compare: 'Compare companies',
  profile: 'Company profile',
  inquiry: 'Send an inquiry',
  requests: 'Request tracking',
  'provider-start': 'Create or claim a company',
  'provider-setup': 'Company profile setup',
  'provider-preview': 'Company profile preview',
  'provider-dashboard': 'Company workspace',
  'provider-lead': 'Lead details',
  jobs: 'Jobs',
  'job-results': 'Job results',
  'job-detail': 'Job details',
  updates: 'Updates',
  saved: 'Saved items',
  'applicant-dashboard': 'Applications',
  'applicant-profile': 'Applicant profile',
  'recruiter-dashboard': 'Recruiter dashboard',
  'recruiter-pipeline': 'Candidate pipeline',
  'recruiter-job-editor': 'Job editor',
  'workspace-media': 'Company media',
  'workspace-reviews': 'Company reviews',
  'workspace-updates': 'Company updates',
  'workspace-recruitment': 'Recruitment workspace',
  'workspace-team': 'Team and permissions',
  'workspace-promotions': 'Promotion centre',
  'component-gallery': 'Design system',
};

const protectedViews: View[] = ['inquiry', 'requests', 'provider-start', 'provider-setup', 'provider-preview', 'provider-dashboard', 'provider-lead', 'applicant-dashboard', 'applicant-profile', 'recruiter-dashboard', 'recruiter-pipeline', 'recruiter-job-editor', 'workspace-media', 'workspace-reviews', 'workspace-updates', 'workspace-recruitment', 'workspace-team', 'workspace-promotions'];

function viewFromPath(pathname: string): View {
  const legacyAliases: Record<string, View> = {
    '/directory': 'companies',
    '/directory/discover': 'companies',
    '/directory/results': 'results',
    '/directory/compare': 'compare',
    '/directory/profile': 'profile',
    '/directory/inquiry': 'inquiry',
    '/jobs/detail': 'job-detail',
    '/me': 'applicant-dashboard',
  };
  if (legacyAliases[pathname]) return legacyAliases[pathname];
  if (pathname.startsWith('/companies/profile/')) return 'profile';
  if (pathname.startsWith('/companies/inquiry/')) return 'inquiry';
  if (pathname === '/jobs/applications') return 'applicant-dashboard';
  if (pathname.startsWith('/jobs/') && pathname !== '/jobs/browse') return 'job-detail';
  return (Object.entries(viewPaths).find(([, path]) => path === pathname)?.[0] as View | undefined) ?? 'home';
}

function App() {
  const [view, setView] = useState<View>(() => viewFromPath(window.location.pathname));
  const [query, setQuery] = useState(initialBrief.originalQuery);
  const [jobQuery, setJobQuery] = useState('');
  const [brief, setBrief] = useState<SearchBrief>(initialBrief);
  const [shortlist, setShortlist] = usePersistentState<string[]>('bharatconnect:shortlist', ['ledgercraft', 'taxbridge']);
  const [selectedBusinessId, setSelectedBusinessId] = useState(() => window.location.pathname.startsWith('/companies/profile/') || window.location.pathname.startsWith('/companies/inquiry/') ? window.location.pathname.split('/').filter(Boolean).at(-1) ?? 'ledgercraft' : 'ledgercraft');
  const [inquiries, setInquiries] = usePersistentState<Inquiry[]>('bharatconnect:inquiries', [
    {
      id: 'inq-1024',
      businessId: 'taxbridge',
      businessName: 'TaxBridge Professionals',
      summary: 'GST registration and monthly compliance for a food startup',
      contactMethod: 'Bharat Navya',
      status: 'Viewed',
      sentAt: 'Yesterday, 4:18 PM',
    },
  ]);
  const [draft, setDraft] = usePersistentState<ProviderDraft>('bharatconnect:provider-draft', defaultDraft);
  const [providerStep, setProviderStep] = useState(0);
  const [published, setPublished] = usePersistentState('bharatconnect:provider-published', false);
  const [shellPreferences, setShellPreferences] = usePersistentState<ShellPreferences>('bharatconnect:shell-preferences', { providerSidebarCollapsed: false });
  const [theme, setTheme] = usePersistentState<'light' | 'dark'>('bharatconnect:theme', 'light');
  const [notice, setNotice] = useState('');
  const [signedIn, setSignedIn] = usePersistentState('bharatnavya:signed-in', false);
  const [accountRole, setAccountRole] = usePersistentState<'applicant' | 'company'>('bharatnavya:account-role', 'applicant');
  const [savedJobIds, setSavedJobIds] = usePersistentState<string[]>('bharatnavya:saved-jobs', []);
  const [followedCompanyIds, setFollowedCompanyIds] = usePersistentState<string[]>('bharatnavya:followed-companies', ['aroha']);
  const [selectedJobId, setSelectedJobId] = useState(() => window.location.pathname.startsWith('/jobs/') && !['/jobs/browse', '/jobs/applications', '/jobs/detail'].includes(window.location.pathname) ? window.location.pathname.split('/').filter(Boolean).at(-1) ?? 'job-ops' : 'job-ops');
  const [authDialog, setAuthDialog] = useState<{ mode: 'join' | 'signin'; reason: string; next?: View } | null>(null);
  const [meaningfulPageViews, setMeaningfulPageViews] = useState(1);
  const [passivePromptDismissedUntil, setPassivePromptDismissedUntil] = usePersistentState('bharatnavya:prompt-dismissed-until', 0);
  const [routeAnnouncement, setRouteAnnouncement] = useState('');

  const selectedBusiness = businesses.find((business) => business.id === selectedBusinessId) ?? businesses[0];
  const shortlistedBusinesses = businesses.filter((business) => shortlist.includes(business.id)).slice(0, 3);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const title = viewTitles[view];
    document.title = `${title} · Bharat Navya`;
    setRouteAnnouncement(`Navigated to ${title}`);
  }, [view]);

  useEffect(() => {
    if (view === 'profile') window.history.replaceState({ ...window.history.state, view }, '', `/companies/profile/${selectedBusinessId}`);
    if (view === 'inquiry') window.history.replaceState({ ...window.history.state, view }, '', `/companies/inquiry/${selectedBusinessId}`);
  }, [selectedBusinessId, view]);

  useEffect(() => {
    if (view === 'job-detail') window.history.replaceState({ ...window.history.state, view }, '', `/jobs/${selectedJobId}`);
  }, [selectedJobId, view]);

  useEffect(() => {
    if (signedIn || Date.now() < passivePromptDismissedUntil) return;
    const timer = window.setTimeout(() => {
      if (meaningfulPageViews >= 2) setAuthDialog({ mode: 'join', reason: 'You have explored a few useful pages. Join to save companies, follow updates, and track applications without losing your place.' });
    }, 90_000);
    return () => window.clearTimeout(timer);
  }, [signedIn, meaningfulPageViews, passivePromptDismissedUntil]);

  useEffect(() => {
    const initialView = view;
    const requiresAccount = !signedIn && protectedViews.includes(initialView);
    const safeInitialView: View = requiresAccount ? 'home' : initialView;
    if (requiresAccount) {
      setView(safeInitialView);
      setAuthDialog({ mode: 'join', reason: initialView.startsWith('recruiter') || initialView.startsWith('workspace') || initialView.startsWith('provider') ? 'Join or sign in to open an authorized company workspace.' : initialView === 'inquiry' ? 'Join to contact this company while keeping your direct details private.' : 'Join to save your progress and use your personal workspace.', next: initialView });
    }
    window.history.replaceState({ view: safeInitialView, scrollY: window.scrollY }, '', pathForView(safeInitialView));
    const handlePopState = (event: PopStateEvent) => {
      const next = typeof event.state?.view === 'string' ? event.state.view as View : viewFromPath(window.location.pathname);
      setView(next);
      window.requestAnimationFrame(() => {
        document.getElementById('main-content')?.focus({ preventScroll: true });
        window.scrollTo({ top: Number(event.state?.scrollY ?? 0), behavior: 'auto' });
      });
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  function navigate(next: View) {
    if (next === view) return;
    if (!signedIn && protectedViews.includes(next)) {
      setAuthDialog({ mode: 'join', reason: next === 'inquiry' ? 'Join to contact this company while keeping your direct details private.' : next.startsWith('recruiter') || next.startsWith('workspace') || next.startsWith('provider') ? 'Join or sign in to open an authorized company workspace.' : 'Join to save your progress and use your personal workspace.', next });
      return;
    }
    window.history.replaceState({ ...window.history.state, view, scrollY: window.scrollY }, '', window.location.href);
    window.history.pushState({ view: next, scrollY: 0 }, '', pathForView(next));
    setView(next);
    setMeaningfulPageViews((count) => count + 1);
    window.scrollTo({ top: 0, behavior: 'auto' });
    window.requestAnimationFrame(() => {
      document.getElementById('main-content')?.focus({ preventScroll: true });
    });
  }

  function pathForView(next: View) {
    if (next === 'profile') return `/companies/profile/${selectedBusinessId}`;
    if (next === 'inquiry') return `/companies/inquiry/${selectedBusinessId}`;
    if (next === 'job-detail') return `/jobs/${selectedJobId}`;
    return viewPaths[next];
  }

  function searchFromHome(value: string) {
    const normalized = value.trim();
    if (!normalized) {
      setNotice('Tell us what you are looking for first.');
      return;
    }
    const isJobIntent = /\b(job|jobs|role|roles|hiring|career|salary|vacanc(?:y|ies)|recruiter|employment|apply)\b/i.test(normalized);
    if (isJobIntent) {
      setJobQuery(normalized);
      navigate('job-results');
      return;
    }
    setQuery(normalized);
    setBrief((current) => ({ ...current, originalQuery: normalized, serviceCategory: normalized }));
    navigate('results');
  }

  const providerViews: View[] = ['provider-start', 'provider-setup', 'provider-preview', 'provider-dashboard', 'provider-lead', 'recruiter-dashboard', 'recruiter-pipeline', 'recruiter-job-editor', 'workspace-media', 'workspace-reviews', 'workspace-updates', 'workspace-recruitment', 'workspace-team', 'workspace-promotions'];
  const mode = providerViews.includes(view) ? 'provider' : 'founder';
  const platformViews: View[] = ['jobs', 'job-results', 'job-detail', 'updates', 'saved', 'applicant-dashboard', 'applicant-profile', 'recruiter-dashboard', 'recruiter-pipeline', 'recruiter-job-editor', 'workspace-media', 'workspace-reviews', 'workspace-updates', 'workspace-recruitment', 'workspace-team', 'workspace-promotions', 'component-gallery'];

  function requireAuth(reason: string) {
    setAuthDialog({ mode: 'join', reason });
  }

  function completeAuth(role: 'applicant' | 'company') {
    const next = authDialog?.next;
    setSignedIn(true);
    setAccountRole(role);
    setAuthDialog(null);
    setNotice('You are signed in to this local prototype.');
    if (next) {
      window.history.pushState({ view: next }, '', pathForView(next));
      setView(next);
      setMeaningfulPageViews((count) => count + 1);
      window.requestAnimationFrame(() => document.getElementById('main-content')?.focus({ preventScroll: true }));
    }
  }

  function updateShortlist(action: React.SetStateAction<string[]>) {
    if (!signedIn) {
      requireAuth('Join Bharat Navya to save companies and keep your shortlist across visits.');
      return;
    }
    setShortlist(action);
  }

  return (
    <>
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{routeAnnouncement}</div>
    <Shell
      mode={mode}
      view={view}
      shortlistCount={shortlist.length}
      providerSidebarCollapsed={shellPreferences.providerSidebarCollapsed}
      theme={theme}
      onToggleProviderSidebar={() => setShellPreferences((current) => ({ ...current, providerSidebarCollapsed: !current.providerSidebarCollapsed }))}
      onToggleTheme={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
      onNavigate={navigate}
      signedIn={signedIn}
      accountRole={accountRole}
      onAuthIntent={(authMode, reason = '') => setAuthDialog({ mode: authMode, reason })}
      onSignOut={() => { setSignedIn(false); setAccountRole('applicant'); setNotice('Signed out of this local prototype.'); navigate('home'); }}
      onSwitchRole={setAccountRole}
    >
        <div className={notice ? 'notice' : 'sr-only'} role="status" aria-live="polite" aria-atomic="true">
          {notice && <>{/(sent|live|reply)/i.test(notice) ? <CheckCircle2 size={18} aria-hidden="true" /> : <CircleAlert size={18} aria-hidden="true" />}<span>{notice}</span><button className="icon-button small" aria-label="Dismiss message" onClick={() => setNotice('')}><X size={16} aria-hidden="true" /></button></>}
        </div>

        {view === 'home' ? (
          <HomeExperience signedIn={signedIn} onNavigate={navigate} onSearch={searchFromHome} onAuthRequired={requireAuth} />
        ) : platformViews.includes(view) ? (
          <PlatformExperience
            view={view}
            signedIn={signedIn}
            selectedJobId={selectedJobId}
            savedJobIds={savedJobIds}
            followedCompanyIds={followedCompanyIds}
            onNavigate={navigate}
            onSelectJob={setSelectedJobId}
            onToggleSavedJob={(id) => setSavedJobIds((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id])}
            onToggleFollow={(id) => setFollowedCompanyIds((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id])}
            onAuthRequired={requireAuth}
            onNotice={setNotice}
            jobQuery={jobQuery}
            setJobQuery={setJobQuery}
          />
        ) : view === 'ecosystem-marketplace' || view === 'ecosystem-network' || view === 'ecosystem-hub' ? (
          <EcosystemExperience view={view} initialQuery={query} onNavigate={navigate} onNotice={setNotice} />
        ) : mode === 'founder' && (
          <FounderExperience
            view={view}
            query={query}
            setQuery={setQuery}
            brief={brief}
            setBrief={setBrief}
            shortlist={shortlist}
            setShortlist={updateShortlist}
            selectedBusinessId={selectedBusinessId}
            setSelectedBusinessId={setSelectedBusinessId}
            inquiries={inquiries}
            setInquiries={setInquiries}
            onNavigate={navigate}
            onNotice={setNotice}
            signedIn={signedIn}
            onAuthRequired={requireAuth}
          />
        )}
        {view === 'provider-start' && (
          <ProviderStart
            draft={draft}
            setDraft={setDraft}
            onContinue={() => {
              setProviderStep(0);
              navigate('provider-setup');
            }}
          />
        )}
        {view === 'provider-setup' && (
          <ProviderSetup
            draft={draft}
            setDraft={setDraft}
            step={providerStep}
            setStep={setProviderStep}
            onBack={() => navigate('provider-start')}
            onPreview={() => navigate('provider-preview')}
          />
        )}
        {view === 'provider-preview' && (
          <ProviderPreview
            draft={draft}
            onBack={() => navigate('provider-setup')}
            onPublish={() => {
              setPublished(true);
              setNotice('Your business profile is live.');
              navigate('provider-dashboard');
            }}
          />
        )}
        {view === 'provider-dashboard' && (
          <ProviderDashboard published={published} draft={draft} onOpenLead={() => navigate('provider-lead')} onEdit={() => navigate('provider-setup')} onNavigate={navigate} />
        )}
        {view === 'provider-lead' && (
          <ProviderLead
            onBack={() => navigate('provider-dashboard')}
            onRespond={() => {
              setNotice('Reply sent. The founder can now continue in Messages.');
              navigate('provider-dashboard');
            }}
          />
        )}
    </Shell>
    {!authDialog && ['home', 'companies', 'results', 'jobs', 'job-results', 'updates'].includes(view) && <AssistantShell onNotice={setNotice} />}
    {authDialog && <AuthDialog mode={authDialog.mode} reason={authDialog.reason} onClose={() => { setAuthDialog(null); setPassivePromptDismissedUntil(Date.now() + 7 * 24 * 60 * 60 * 1000); }} onComplete={completeAuth} onModeChange={(authMode) => setAuthDialog((current) => ({ mode: authMode, reason: current?.reason ?? '', next: current?.next }))} />}
    </>
  );
}

interface NavProps {
  mode: 'founder' | 'provider';
  view: View;
  shortlistCount?: number;
  onNavigate: (view: View) => void;
}

function Brand() {
  return (
    <button className="brand" onClick={() => window.location.reload()} aria-label="Bharat Navya home">
      <span className="brand-mark" aria-hidden="true"><span /><span /></span>
      <span>Bharat Navya</span>
    </button>
  );
}

function Topbar({ mode, view, shortlistCount = 0, onNavigate, onMenu }: NavProps & { onMenu: () => void }) {
  return (
    <header className="topbar">
      <button className="icon-button menu-button" aria-label="Open navigation" onClick={onMenu}>
        <Menu size={20} aria-hidden="true" />
      </button>
      <Brand />
      <nav className="top-nav" aria-label="Primary">
        {mode === 'founder' ? (
          <>
            <button className={view === 'discover' || view === 'brief' || view === 'results' ? 'active' : ''} onClick={() => onNavigate('discover')}>Discover</button>
            <button className={view === 'compare' ? 'active' : ''} onClick={() => onNavigate('compare')}>Compare <Count value={shortlistCount} /></button>
            <button className={view === 'requests' ? 'active' : ''} onClick={() => onNavigate('requests')}>Requests</button>
          </>
        ) : (
          <>
            <button className={view === 'provider-dashboard' ? 'active' : ''} onClick={() => onNavigate('provider-dashboard')}>Business home</button>
            <button className={view === 'provider-lead' ? 'active' : ''} onClick={() => onNavigate('provider-lead')}>Leads</button>
            <button onClick={() => onNavigate('provider-setup')}>Profile</button>
          </>
        )}
      </nav>
      <div className="top-actions">
        <button className="mode-switch" onClick={() => onNavigate(mode === 'founder' ? 'provider-start' : 'discover')}>
          {mode === 'founder' ? <Store size={17} aria-hidden="true" /> : <Search size={17} aria-hidden="true" />}
          <span>{mode === 'founder' ? 'For business' : 'Find services'}</span>
        </button>
        <button className="icon-button" aria-label="Notifications"><Bell size={19} aria-hidden="true" /></button>
        <button className="avatar" aria-label="Open account menu">AK</button>
      </div>
    </header>
  );
}

function Sidebar({ mode, view, shortlistCount = 0, onNavigate }: NavProps) {
  const founderItems = [
    ['discover', Search, 'Find services'],
    ['compare', LayoutList, `Compare (${shortlistCount})`],
    ['requests', Inbox, 'Requests'],
  ] as const;
  const providerItems = [
    ['provider-dashboard', BriefcaseBusiness, 'Business home'],
    ['provider-lead', Inbox, 'Leads'],
    ['provider-setup', Building2, 'Business profile'],
  ] as const;
  const items = mode === 'founder' ? founderItems : providerItems;

  return (
    <aside className="sidebar" aria-label={`${mode} navigation`}>
      <div className="sidebar-mode">
        <span>{mode === 'founder' ? 'Founder workspace' : 'Business workspace'}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </div>
      <nav>
        {items.map(([target, Icon, label]) => (
          <button key={target} className={view === target || (target === 'discover' && ['brief', 'results', 'profile', 'inquiry'].includes(view)) ? 'active' : ''} onClick={() => onNavigate(target)}>
            <Icon size={18} aria-hidden="true" /><span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-spacer" />
      {mode === 'founder' ? (
        <button className="sidebar-prompt" onClick={() => onNavigate('provider-start')}>
          <Plus size={17} aria-hidden="true" />
          <span><strong>List a business</strong><small>Create or claim a free profile</small></span>
        </button>
      ) : (
        <button className="sidebar-prompt" onClick={() => onNavigate('discover')}>
          <Search size={17} aria-hidden="true" />
          <span><strong>Find a provider</strong><small>Switch to founder view</small></span>
        </button>
      )}
      <nav className="sidebar-secondary">
        <button><HelpCircle size={18} aria-hidden="true" /><span>Help centre</span></button>
        <button><Settings size={18} aria-hidden="true" /><span>Settings</span></button>
      </nav>
      <div className="signed-in">
        <span className="avatar small-avatar">AK</span>
        <span><strong>Amit Kumar</strong><small>Aroha Foods Pvt. Ltd.</small></span>
      </div>
    </aside>
  );
}

function MobileDrawer({ mode, onClose, onNavigate }: Omit<NavProps, 'view'> & { onClose: () => void }) {
  return (
    <div className="drawer-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="mobile-drawer" aria-label="Mobile navigation">
        <div className="drawer-head"><Brand /><button className="icon-button" aria-label="Close navigation" onClick={onClose}><X size={20} /></button></div>
        <p className="drawer-label">{mode === 'founder' ? 'Founder workspace' : 'Business workspace'}</p>
        <button onClick={() => onNavigate('discover')}><Search size={18} />Find services</button>
        <button onClick={() => onNavigate('compare')}><LayoutList size={18} />Compare businesses</button>
        <button onClick={() => onNavigate('requests')}><Inbox size={18} />Requests</button>
        <hr />
        <button onClick={() => onNavigate('provider-dashboard')}><BriefcaseBusiness size={18} />Business home</button>
        <button onClick={() => onNavigate('provider-start')}><Plus size={18} />List a business</button>
      </aside>
    </div>
  );
}

function MobileNav({ mode, view, shortlistCount = 0, onNavigate }: NavProps) {
  const isProvider = mode === 'provider';
  return (
    <nav className="mobile-nav" aria-label="Mobile primary">
      <button className={!isProvider && ['discover', 'brief', 'results', 'profile', 'inquiry'].includes(view) ? 'active' : ''} onClick={() => onNavigate('discover')}><Search size={20} /><span>Discover</span></button>
      {!isProvider ? (
        <>
          <button className={view === 'compare' ? 'active' : ''} onClick={() => onNavigate('compare')}><LayoutList size={20} /><span>Compare</span>{shortlistCount > 0 && <i>{shortlistCount}</i>}</button>
          <button className={view === 'requests' ? 'active' : ''} onClick={() => onNavigate('requests')}><Inbox size={20} /><span>Requests</span></button>
          <button onClick={() => onNavigate('provider-dashboard')}><Store size={20} /><span>Business</span></button>
        </>
      ) : (
        <>
          <button className={view === 'provider-dashboard' ? 'active' : ''} onClick={() => onNavigate('provider-dashboard')}><BriefcaseBusiness size={20} /><span>Home</span></button>
          <button className={view === 'provider-lead' ? 'active' : ''} onClick={() => onNavigate('provider-lead')}><Inbox size={20} /><span>Leads</span></button>
          <button className={view === 'provider-setup' ? 'active' : ''} onClick={() => onNavigate('provider-setup')}><Building2 size={20} /><span>Profile</span></button>
        </>
      )}
    </nav>
  );
}

function Count({ value }: { value: number }) {
  return value > 0 ? <span className="count">{value}</span> : null;
}

function PageHeader({ title, description, back, actions }: { title: string; description?: string; back?: () => void; actions?: React.ReactNode }) {
  return (
    <header className="page-header">
      <div className="page-title-wrap">
        {back && <button className="icon-button back-button" onClick={back} aria-label="Go back"><ArrowLeft size={20} /></button>}
        <div><h1>{title}</h1>{description && <p>{description}</p>}</div>
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

function Discover({ query, setQuery, onSearch }: { query: string; setQuery: (value: string) => void; onSearch: () => void }) {
  return (
    <div className="discover-view">
      <section className="search-stage" aria-labelledby="discover-title">
        <div className="search-copy">
          <p className="context-line">Business discovery, without the guesswork</p>
          <h1 id="discover-title">Tell us what your business needs.</h1>
          <p>Use your own words. Bharat Navya will turn the request into a brief and show businesses with relevant, checkable evidence.</p>
        </div>
        <form className="hero-search" onSubmit={(event) => { event.preventDefault(); onSearch(); }}>
          <label htmlFor="business-need">What do you need help with?</label>
          <div className="search-box">
            <Search size={22} aria-hidden="true" />
            <textarea id="business-need" value={query} onChange={(event) => setQuery(event.target.value)} rows={2} />
            <button className="primary-button" type="submit">Prepare my brief <ArrowRight size={18} /></button>
          </div>
          <p className="field-hint"><Sparkles size={15} aria-hidden="true" /> We extract the details. You approve them before anything is shared.</p>
        </form>
      </section>

      <section className="category-index" aria-labelledby="category-title">
        <div className="section-heading"><h2 id="category-title">Or start with an area</h2><span>Four common starting points</span></div>
        <div className="category-lines">
          {categoryPrompts.map(([category, prompt], index) => (
            <button key={category} onClick={() => { setQuery(prompt); }}>
              <span className="category-number">0{index + 1}</span>
              <span><strong>{category}</strong><small>{prompt}</small></span>
              <ArrowRight size={19} aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>

      <section className="trust-explainer" aria-labelledby="trust-title">
        <div><ShieldCheck size={28} aria-hidden="true" /><h2 id="trust-title">Evidence before endorsement</h2></div>
        <p>Bharat Navya separates claimed information from checked identity and supporting evidence, so you can see what is known—and what is not.</p>
        <div className="trust-scale" aria-label="Verification levels">
          {Object.entries(verificationCopy).map(([level, label]) => <TrustBadge key={level} level={level as keyof typeof verificationCopy} label={label} />)}
        </div>
      </section>
    </div>
  );
}

function BriefBuilder({ brief, setBrief, onBack, onContinue }: { brief: SearchBrief; setBrief: React.Dispatch<React.SetStateAction<SearchBrief>>; onBack: () => void; onContinue: () => void }) {
  const fields: Array<[keyof SearchBrief, string, string[]]> = [
    ['serviceCategory', 'Service', ['GST consultant', 'Tax advisor', 'Company secretary']],
    ['location', 'Location', ['Ahmedabad', 'Gandhinagar', 'Remote']],
    ['timing', 'Timing', ['This week', 'Within 2 weeks', 'Within a month']],
    ['budgetBand', 'Budget', ['Under ₹25,000', '₹25,000–₹60,000', '₹60,000–₹1,00,000']],
    ['providerType', 'Provider type', ['Independent expert', 'CA firm', 'Either']],
  ];

  return (
    <div className="page-container brief-page">
      <PageHeader title="Review your brief" description="We found the details below in your request. Adjust anything that changes the match." back={onBack} />
      <div className="brief-progress" role="progressbar" aria-label="Search progress" aria-valuemin={1} aria-valuemax={2} aria-valuenow={1} aria-valuetext="Step 1 of 2: Brief"><span className="active" /><span /><small>Brief</small><small>Matches</small></div>
      <section className="original-request">
        <span>Your request</span>
        <p>“{brief.originalQuery}”</p>
        <button className="text-button" onClick={onBack}><Pencil size={15} />Edit request</button>
      </section>
      <section className="brief-form" aria-labelledby="details-title">
        <div className="section-heading"><h2 id="details-title">What we understood</h2><span>All fields can be changed</span></div>
        <div className="brief-fields">
          {fields.map(([key, label, options]) => (
            <label key={key} className="select-field">
              <span>{label}</span>
              <select aria-label={label} value={String(brief[key])} onChange={(event) => setBrief((current) => ({ ...current, [key]: event.target.value }))}>
                {options.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
          ))}
        </div>
      </section>
      <section className="proof-section" aria-labelledby="proof-title">
        <div className="section-heading"><div><h2 id="proof-title">What should businesses prove?</h2><p>These requirements influence the order of results, not whether a business can appear.</p></div></div>
        <fieldset className="choice-list">
          <legend className="sr-only">Evidence requirements</legend>
          {['GST registration experience', 'Food or FMCG clients', 'Available for in-person meetings', 'At least 5 years in business'].map((requirement) => {
            const checked = brief.proofRequirements.includes(requirement);
            return (
              <label key={requirement} className={checked ? 'choice checked' : 'choice'}>
                <input type="checkbox" checked={checked} onChange={() => setBrief((current) => ({
                  ...current,
                  proofRequirements: checked ? current.proofRequirements.filter((item) => item !== requirement) : [...current.proofRequirements, requirement],
                }))} />
                <span className="check-box"><Check size={15} /></span><span>{requirement}</span>
              </label>
            );
          })}
        </fieldset>
      </section>
      <div className="sticky-action-row">
        <span><ShieldCheck size={17} />Your brief stays private until you contact a business.</span>
        <button className="primary-button" onClick={onContinue}>Show matching businesses <ArrowRight size={18} /></button>
      </div>
    </div>
  );
}

function Results({ brief, shortlist, onToggleShortlist, onCompare, onOpen, onEditBrief }: {
  brief: SearchBrief;
  shortlist: string[];
  onToggleShortlist: (id: string) => void;
  onCompare: () => void;
  onOpen: (id: string) => void;
  onEditBrief: () => void;
}) {
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const visible = verifiedOnly ? businesses.filter((business) => business.verification === 'evidence' || business.verification === 'identity') : businesses;

  return (
    <div className="results-page">
      <div className="results-head">
        <div>
          <span className="result-context">{brief.serviceCategory} · {brief.location}</span>
          <h1>Businesses that fit your brief</h1>
          <p>Ordered by relevant evidence, availability, and fit with the requirements you selected.</p>
        </div>
        <button className="secondary-button" onClick={onEditBrief}><SlidersHorizontal size={17} />Edit brief</button>
      </div>
      <div className="filter-bar">
        <button className={verifiedOnly ? 'filter active' : 'filter'} onClick={() => setVerifiedOnly((value) => !value)}><ShieldCheck size={16} />Verified identity</button>
        <button className="filter"><MapPin size={16} />Within 25 km <ChevronDown size={15} /></button>
        <button className="filter"><Clock3 size={16} />Available soon <ChevronDown size={15} /></button>
        <button className="filter"><Filter size={16} />More filters</button>
        <span className="results-count">{visible.length} businesses</span>
      </div>
      <div className="index-labels" aria-hidden="true">
        <span>Business</span><span>Why this fits</span><span>Response</span><span>Experience</span><span>Action</span>
      </div>
      <div className="business-index">
        {visible.map((business, index) => (
          <BusinessRow key={business.id} business={business} rank={index + 1} shortlisted={shortlist.includes(business.id)} onToggle={() => onToggleShortlist(business.id)} onOpen={() => onOpen(business.id)} />
        ))}
      </div>
      {visible.length === 0 && (
        <div className="empty-state"><Search size={28} /><h2>No verified businesses match every filter</h2><p>Remove the verification filter to see claimed and unclaimed listings with clearly marked evidence.</p><button className="secondary-button" onClick={() => setVerifiedOnly(false)}>Show all listings</button></div>
      )}
      {shortlist.length > 0 && (
        <div className="compare-dock" role="status" aria-live="polite">
          <div className="avatar-stack">{businesses.filter((business) => shortlist.includes(business.id)).map((business) => <span key={business.id}>{business.initials}</span>)}</div>
          <span><strong>{shortlist.length} selected</strong><small>Compare evidence side by side</small></span>
          <button className="primary-button" onClick={onCompare}>Compare businesses <ArrowRight size={17} /></button>
        </div>
      )}
    </div>
  );
}

function BusinessRow({ business, rank, shortlisted, onToggle, onOpen }: { business: BusinessProfile; rank: number; shortlisted: boolean; onToggle: () => void; onOpen: () => void }) {
  return (
    <article className="business-row">
      <button className="business-main" onClick={onOpen} aria-label={`View ${business.name}`}>
        <span className="rank">{String(rank).padStart(2, '0')}</span>
        <span className="business-logo">{business.initials}</span>
        <span className="business-identity">
          <span className="business-name-line"><strong>{business.name}</strong><TrustBadge level={business.verification} compact /></span>
          <small>{business.descriptor}</small>
          <span className="metadata"><MapPin size={14} />{business.location} · {business.distance}</span>
          <span className="service-tags">{business.services.slice(0, 2).map((service) => <i key={service}>{service}</i>)}</span>
        </span>
      </button>
      <div className="match-reasons">
        {business.match.matched.slice(0, 2).map((reason) => <span key={reason}><CheckCircle2 size={15} />{reason}</span>)}
        {business.match.gaps[0] && <span className="gap"><CircleAlert size={15} />{business.match.gaps[0]}</span>}
        <small>{business.match.updated}</small>
      </div>
      <div className="index-stat"><strong>{business.responseTime}</strong><small>usual response</small></div>
      <div className="index-stat"><strong>{business.yearsActive} years</strong><small>{business.priceGuide}</small></div>
      <div className="row-actions">
        <button className={shortlisted ? 'square-action selected' : 'square-action'} onClick={onToggle} aria-pressed={shortlisted} aria-label={shortlisted ? `Remove ${business.name} from comparison` : `Add ${business.name} to comparison`}><Bookmark size={18} fill={shortlisted ? 'currentColor' : 'none'} /></button>
        <button className="secondary-button" onClick={onOpen}>View profile</button>
      </div>
    </article>
  );
}

function TrustBadge({ level, label, compact = false }: { level: BusinessProfile['verification']; label?: string; compact?: boolean }) {
  const Icon = level === 'evidence' ? BadgeCheck : level === 'identity' ? ShieldCheck : level === 'claimed' ? CheckCircle2 : CircleAlert;
  return <span className={`trust-badge ${level} ${compact ? 'compact' : ''}`}><Icon size={compact ? 14 : 16} aria-hidden="true" />{label ?? verificationCopy[level]}</span>;
}

function Compare({ items, onBack, onRemove, onOpen }: { items: BusinessProfile[]; onBack: () => void; onRemove: (id: string) => void; onOpen: (id: string) => void }) {
  if (items.length === 0) {
    return <div className="page-container"><PageHeader title="Compare businesses" back={onBack} /><div className="empty-state"><LayoutList size={30} /><h2>Your comparison is empty</h2><p>Add up to three businesses from the results index to compare evidence and gaps.</p><button className="primary-button" onClick={onBack}>Browse businesses</button></div></div>;
  }
  return (
    <div className="page-container compare-page">
      <PageHeader title="Compare businesses" description="Compare what each business can demonstrate—not just what it claims." back={onBack} actions={<button className="text-button" onClick={onBack}><Plus size={16} />Add another</button>} />
      <div className="comparison-grid" style={{ '--compare-columns': items.length } as React.CSSProperties}>
        <div className="comparison-labels" aria-hidden="true"><div /><span>Identity</span><span>Why it fits</span><span>What to clarify</span><span>Availability</span><span>Price guidance</span><span>Credentials</span><div /></div>
        {items.map((business) => (
          <article className="comparison-column" key={business.id}>
            <header>
              <button className="icon-button small" aria-label={`Remove ${business.name}`} onClick={() => onRemove(business.id)}><X size={16} /></button>
              <span className="business-logo large">{business.initials}</span>
              <h2>{business.name}</h2>
              <TrustBadge level={business.verification} />
            </header>
            <div data-label="Identity"><p>{business.descriptor}</p><small>{business.location}</small></div>
            <div data-label="Why it fits" className="evidence-list">{business.match.matched.map((item) => <span key={item}><Check size={15} />{item}</span>)}</div>
            <div data-label="What to clarify" className="evidence-list gaps">{business.match.gaps.map((item) => <span key={item}><CircleAlert size={15} />{item}</span>)}</div>
            <div data-label="Availability"><strong>{business.availability}</strong><small>{business.responseTime} response</small></div>
            <div data-label="Price guidance"><strong>{business.priceGuide}</strong><small>Final scope confirmed in conversation</small></div>
            <div data-label="Credentials" className="evidence-list">{business.credentials.length ? business.credentials.map((item) => <span key={item}><FileCheck2 size={15} />{item}</span>) : <span>No credentials submitted</span>}</div>
            <footer><button className="primary-button" onClick={() => onOpen(business.id)}>View full profile</button></footer>
          </article>
        ))}
      </div>
    </div>
  );
}

function Profile({ business, selected, onBack, onToggle, onInquire }: { business: BusinessProfile; selected: boolean; onBack: () => void; onToggle: () => void; onInquire: () => void }) {
  return (
    <div className="page-container profile-page">
      <PageHeader title={business.name} back={onBack} actions={<button className={selected ? 'secondary-button selected' : 'secondary-button'} onClick={onToggle}><Bookmark size={17} fill={selected ? 'currentColor' : 'none'} />{selected ? 'In comparison' : 'Add to compare'}</button>} />
      <div className="profile-intro">
        <span className="business-logo profile-logo">{business.initials}</span>
        <div><TrustBadge level={business.verification} /><p>{business.descriptor}</p><span className="metadata"><MapPin size={15} />{business.location} · {business.distance}</span></div>
        <div className="profile-actions"><button className="primary-button" onClick={onInquire}>Send an inquiry <Send size={17} /></button><small>No commitment. Your brief stays private until you send it.</small></div>
      </div>
      {business.verification === 'unclaimed' && <div className="warning-strip"><CircleAlert size={19} /><span><strong>This business has not claimed its profile.</strong> Contact details and availability have not been confirmed by the business.</span><button className="text-button">Know this business?</button></div>}
      <div className="profile-layout">
        <div className="profile-body">
          <section><h2>Why this business appears</h2><div className="proof-grid"><div><h3>Evidence that fits</h3>{business.match.matched.map((item) => <p key={item}><CheckCircle2 size={17} />{item}</p>)}</div><div className="clarify"><h3>Worth clarifying</h3>{business.match.gaps.map((item) => <p key={item}><CircleAlert size={17} />{item}</p>)}</div></div><small className="evidence-date">{business.match.updated}</small></section>
          <section><h2>About</h2><p className="profile-copy">{business.about}</p><dl className="definition-grid"><div><dt>Established</dt><dd>{new Date().getFullYear() - business.yearsActive}</dd></div><div><dt>Typical response</dt><dd>{business.responseTime}</dd></div><div><dt>Availability</dt><dd>{business.availability}</dd></div><div><dt>Price guidance</dt><dd>{business.priceGuide}</dd></div></dl></section>
          <section><h2>Services</h2><div className="service-table">{business.services.map((service) => <div key={service}><strong>{service}</strong><span>Available for {business.industries.slice(0, 2).join(' and ').toLowerCase()} businesses</span><ChevronRight size={18} /></div>)}</div></section>
          <section><h2>Credentials and proof</h2>{business.credentials.length ? <div className="credential-list">{business.credentials.map((credential) => <div key={credential}><FileCheck2 size={20} /><span><strong>{credential}</strong><small>Checked against submitted records</small></span></div>)}</div> : <div className="inline-empty"><FileCheck2 size={22} /><span><strong>No credentials submitted</strong><small>Ask the business for evidence before engaging.</small></span></div>}<div className="proof-records">{business.proof.map((proof) => <span key={proof}>{proof}</span>)}</div></section>
        </div>
        <aside className="profile-sidebar">
          <h2>Start a conversation</h2><p>Send the approved brief and add anything this business should know.</p><button className="primary-button full" onClick={onInquire}>Send inquiry <ArrowRight size={17} /></button><hr /><dl><div><dt>Response</dt><dd>{business.responseTime}</dd></div><div><dt>Availability</dt><dd>{business.availability}</dd></div><div><dt>Price guidance</dt><dd>{business.priceGuide}</dd></div></dl><p className="sidebar-note"><ShieldCheck size={17} />Bharat Navya records the inquiry status. You choose when to share direct contact details.</p>
        </aside>
      </div>
    </div>
  );
}

function InquiryComposer({ business, brief, onBack, onSend }: { business: BusinessProfile; brief: SearchBrief; onBack: () => void; onSend: (inquiry: Inquiry) => void }) {
  const [message, setMessage] = useState('We are launching a packaged food brand and need GST registration plus monthly compliance. We would like to begin within two weeks.');
  const [contactMethod, setContactMethod] = useState<Inquiry['contactMethod']>('Bharat Navya');
  const [sending, setSending] = useState(false);
  function send() {
    if (!message.trim()) return;
    setSending(true);
    window.setTimeout(() => onSend({ id: `inq-${Date.now()}`, businessId: business.id, businessName: business.name, summary: message, contactMethod, status: 'Sent', sentAt: 'Just now' }), 550);
  }
  return (
    <div className="page-container inquiry-page">
      <PageHeader title={`Contact ${business.name}`} description="Review what will be shared. You can keep direct contact details private." back={onBack} />
      <div className="inquiry-layout">
        <form className="inquiry-form" onSubmit={(event) => { event.preventDefault(); send(); }}>
          <section><h2>Your message</h2><label htmlFor="inquiry-message">What should the business know?</label><textarea id="inquiry-message" rows={7} value={message} onChange={(event) => setMessage(event.target.value)} required /><div className="attachment-row"><button type="button" className="secondary-button"><Paperclip size={17} />Attach a file</button><span>PDF, DOCX, JPG or PNG · up to 10 MB</span></div></section>
          <section><h2>Preferred reply</h2><fieldset className="radio-list"><legend className="sr-only">Preferred reply method</legend>{(['Bharat Navya', 'Email', 'WhatsApp'] as const).map((method) => <label key={method} className={contactMethod === method ? 'radio-option selected' : 'radio-option'}><input type="radio" name="contact" value={method} checked={contactMethod === method} onChange={() => setContactMethod(method)} /><span className="radio-dot" /><span><strong>{method}</strong><small>{method === 'Bharat Navya' ? 'Keep the conversation and contact details private' : `Share your ${method.toLowerCase()} details with this business`}</small></span></label>)}</fieldset></section>
          <button className="primary-button send-button" type="submit" disabled={sending}>{sending ? 'Sending inquiry…' : 'Send inquiry'} {!sending && <Send size={17} />}</button>
        </form>
        <aside className="brief-summary"><div className="summary-business"><span className="business-logo">{business.initials}</span><span><strong>{business.name}</strong><TrustBadge level={business.verification} compact /></span></div><hr /><h2>Brief attached</h2><dl><div><dt>Service</dt><dd>{brief.serviceCategory}</dd></div><div><dt>Location</dt><dd>{brief.location}</dd></div><div><dt>Timing</dt><dd>{brief.timing}</dd></div><div><dt>Budget</dt><dd>{brief.budgetBand}</dd></div></dl><div className="privacy-note"><ShieldCheck size={18} /><p><strong>Shared only after you send</strong><br />This brief is visible to this business and recorded in your requests.</p></div></aside>
      </div>
    </div>
  );
}

function Requests({ inquiries, onDiscover }: { inquiries: Inquiry[]; onDiscover: () => void }) {
  return (
    <div className="page-container requests-page">
      <PageHeader title="Requests" description="Track conversations you started with businesses." actions={<button className="primary-button" onClick={onDiscover}><Plus size={17} />New search</button>} />
      {inquiries.length ? <div className="request-list"><div className="request-labels"><span>Business</span><span>Request</span><span>Status</span><span>Sent</span><span /></div>{inquiries.map((inquiry) => <article key={inquiry.id} className="request-row"><div><span className="business-logo mini">{inquiry.businessName.split(' ').map((word) => word[0]).slice(0, 2).join('')}</span><strong>{inquiry.businessName}</strong></div><p>{inquiry.summary}</p><span className={`status ${inquiry.status.toLowerCase()}`}>{inquiry.status}</span><time>{inquiry.sentAt}</time><button className="secondary-button">Open request</button></article>)}</div> : <div className="empty-state"><MessageSquare size={30} /><h2>No requests yet</h2><p>Find a business, review its evidence, and send a brief when you are ready.</p><button className="primary-button" onClick={onDiscover}>Find a business</button></div>}
    </div>
  );
}

function ProviderStart({ draft, setDraft, onContinue }: { draft: ProviderDraft; setDraft: React.Dispatch<React.SetStateAction<ProviderDraft>>; onContinue: () => void }) {
  return (
    <div className="provider-start page-container">
      <PageHeader title="Put your business where relevant work begins" description="Create a free evidence-backed profile, or claim a listing that already exists." />
      <div className="provider-choice-layout">
        <section className="provider-choice-form">
          <div className="segmented" role="group" aria-label="Choose listing type"><button className={draft.mode === 'create' ? 'active' : ''} onClick={() => setDraft((current) => ({ ...current, mode: 'create' }))}>Create a business</button><button className={draft.mode === 'claim' ? 'active' : ''} onClick={() => setDraft((current) => ({ ...current, mode: 'claim' }))}>Claim a listing</button></div>
          <h2>{draft.mode === 'create' ? 'Start with your business name' : 'Find your existing listing'}</h2>
          <p>{draft.mode === 'create' ? 'We will use this to check for possible duplicates before creating a new profile.' : 'Search public listings and claim the correct business after verification.'}</p>
          <label className="text-field" htmlFor="provider-business-name"><span>Business name</span><div><Building2 size={18} /><input id="provider-business-name" value={draft.businessName} onChange={(event) => setDraft((current) => ({ ...current, businessName: event.target.value }))} /></div></label>
          {draft.mode === 'claim' && <div className="claim-result"><span className="business-logo">AF</span><span><strong>Aroha Foods Private Limited</strong><small>Vastrapur, Ahmedabad · Public listing</small></span><button className="secondary-button" onClick={onContinue}>Claim this listing</button></div>}
          {draft.mode === 'create' && <button className="primary-button" onClick={onContinue} disabled={!draft.businessName.trim()}>Continue <ArrowRight size={17} /></button>}
        </section>
        <aside className="provider-value"><h2>A useful profile is more than a name.</h2><div><span>1</span><p><strong>Show what you do</strong><br />Services, industries, locations and availability.</p></div><div><span>2</span><p><strong>Separate claims from proof</strong><br />Identity, credentials and work evidence are marked clearly.</p></div><div><span>3</span><p><strong>Receive better inquiries</strong><br />Founders send a structured brief instead of a vague lead.</p></div><small>Basic listings and inquiries are free in this concept.</small></aside>
      </div>
    </div>
  );
}

const providerSteps = ['Identity', 'Services', 'Evidence', 'Availability'] as const;

function ProviderSetup({ draft, setDraft, step, setStep, onBack, onPreview }: { draft: ProviderDraft; setDraft: React.Dispatch<React.SetStateAction<ProviderDraft>>; step: number; setStep: React.Dispatch<React.SetStateAction<number>>; onBack: () => void; onPreview: () => void }) {
  const stepContent = [
    <div className="form-grid" key="identity"><TextField label="Legal business name" value={draft.businessName} setValue={(value) => setDraft((current) => ({ ...current, businessName: value }))} /><TextField label="Business phone" value={draft.phone} setValue={(value) => setDraft((current) => ({ ...current, phone: value }))} /><TextField label="GSTIN" value={draft.gstin} setValue={(value) => setDraft((current) => ({ ...current, gstin: value }))} hint="Used to verify the business identity. It is not displayed in full." /><TextField label="Primary location" value={draft.location} setValue={(value) => setDraft((current) => ({ ...current, location: value }))} /></div>,
    <div className="form-grid" key="services"><TextField label="Primary service" value={draft.service} setValue={(value) => setDraft((current) => ({ ...current, service: value }))} /><TextField label="Industries served" value={draft.industries} setValue={(value) => setDraft((current) => ({ ...current, industries: value }))} hint="Separate industries with commas." /><TextField label="Price guidance" value={draft.priceGuide} setValue={(value) => setDraft((current) => ({ ...current, priceGuide: value }))} /><label className="select-field"><span>Service area</span><select aria-label="Service area"><option>Ahmedabad and nearby</option><option>Across Gujarat</option><option>Across India</option></select></label></div>,
    <div className="evidence-upload" key="evidence"><div className="upload-zone"><FileCheck2 size={28} /><h3>Add a credential</h3><p>Upload a licence, registration or certificate. We show its status clearly while it is being reviewed.</p><button className="secondary-button"><Plus size={17} />Choose file</button></div><TextField label="Credential name" value={draft.credential} setValue={(value) => setDraft((current) => ({ ...current, credential: value }))} /><div className="submitted-proof"><FileCheck2 size={20} /><span><strong>{draft.credential}</strong><small>Ready to submit for review</small></span><span className="status pending">Pending</span></div></div>,
    <div className="form-grid" key="availability"><TextField label="Current availability" value={draft.availability} setValue={(value) => setDraft((current) => ({ ...current, availability: value }))} /><label className="select-field"><span>Usual response time</span><select aria-label="Usual response time"><option>Within 2 hours</option><option>Same business day</option><option>Within 24 hours</option></select></label><label className="select-field"><span>Preferred lead channel</span><select aria-label="Preferred lead channel"><option>Bharat Navya messages</option><option>Email</option><option>WhatsApp</option></select></label></div>,
  ];
  const canContinue = draft.businessName.trim() && draft.phone.trim() && draft.service.trim();
  return (
    <div className="page-container provider-setup">
      <PageHeader title="Build your business profile" description="Save a clear, trustworthy profile founders can evaluate quickly." back={onBack} actions={<span className="save-state"><Check size={15} />Draft saved</span>} />
      <div className="setup-layout">
        <nav className="step-nav" aria-label="Profile steps">{providerSteps.map((label, index) => <button key={label} className={index === step ? 'active' : index < step ? 'complete' : ''} aria-current={index === step ? 'step' : undefined} onClick={() => setStep(index)}><span>{index < step ? <Check size={15} /> : index + 1}</span><strong>{label}</strong><small>{index === 0 ? 'Business and contact' : index === 1 ? 'What you offer' : index === 2 ? 'Credentials and proof' : 'Capacity and replies'}</small></button>)}</nav>
        <section className="setup-form"><div className="setup-heading"><span>Step {step + 1} of {providerSteps.length}</span><h2>{providerSteps[step]}</h2><p>{step === 0 ? 'Confirm who the business is and how it can be reached.' : step === 1 ? 'Use the language customers use when they look for your work.' : step === 2 ? 'Evidence earns trust. Claims remain visible but are labelled until checked.' : 'Set expectations before a founder sends an inquiry.'}</p></div>{stepContent[step]}<div className="form-actions"><button className="secondary-button" onClick={() => step === 0 ? onBack() : setStep((value) => value - 1)}>Back</button>{step < providerSteps.length - 1 ? <button className="primary-button" onClick={() => setStep((value) => value + 1)} disabled={!canContinue}>Save and continue <ArrowRight size={17} /></button> : <button className="primary-button" onClick={onPreview}>Preview profile <ArrowRight size={17} /></button>}</div></section>
      </div>
    </div>
  );
}

function TextField({ label, value, setValue, hint }: { label: string; value: string; setValue: (value: string) => void; hint?: string }) {
  const id = `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const hintId = `${id}-hint`;
  return <label className="text-field" htmlFor={id}><span>{label}</span><input id={id} value={value} onChange={(event) => setValue(event.target.value)} aria-describedby={hint ? hintId : undefined} />{hint && <small id={hintId}>{hint}</small>}</label>;
}

function ProviderPreview({ draft, onBack, onPublish }: { draft: ProviderDraft; onBack: () => void; onPublish: () => void }) {
  return (
    <div className="page-container provider-preview">
      <PageHeader title="Preview your profile" description="This is what founders will see. Pending evidence is never shown as verified." back={onBack} actions={<button className="primary-button" onClick={onPublish}>Publish profile <ArrowRight size={17} /></button>} />
      <div className="preview-banner"><span>Preview mode</span><p>Everything below is based on your saved draft.</p><button className="text-button" onClick={onBack}><Pencil size={15} />Edit profile</button></div>
      <div className="profile-intro preview-intro"><span className="business-logo profile-logo">AF</span><div><span className="trust-badge claimed"><CheckCircle2 size={15} />Claimed business</span><h2>{draft.businessName}</h2><p>{draft.service}</p><span className="metadata"><MapPin size={15} />{draft.location}</span></div><div className="profile-actions"><button className="primary-button" disabled>Send an inquiry</button><small>Actions are disabled in preview.</small></div></div>
      <div className="profile-layout"><div className="profile-body"><section><h2>About the business</h2><p className="profile-copy">{draft.businessName} provides {draft.service.toLowerCase()} services for {draft.industries.toLowerCase()} businesses.</p><dl className="definition-grid"><div><dt>Availability</dt><dd>{draft.availability}</dd></div><div><dt>Price guidance</dt><dd>{draft.priceGuide}</dd></div><div><dt>Service area</dt><dd>{draft.location}</dd></div></dl></section><section><h2>Credentials and proof</h2><div className="submitted-proof"><FileCheck2 size={20} /><span><strong>{draft.credential}</strong><small>Visible as pending until reviewed</small></span><span className="status pending">Pending review</span></div></section></div><aside className="profile-sidebar"><h2>Profile readiness</h2><p>Your core profile is complete. Verification can continue after publishing.</p><div className="readiness" role="progressbar" aria-label="Profile readiness" aria-valuemin={0} aria-valuemax={100} aria-valuenow={82} aria-valuetext="82 percent complete"><span style={{ width: '82%' }} /><strong>82%</strong></div><ul><li><Check size={15} />Identity submitted</li><li><Check size={15} />Services added</li><li><Clock3 size={15} />Evidence pending review</li></ul></aside></div>
    </div>
  );
}

function ProviderDashboard({ published, draft, onOpenLead, onEdit, onNavigate }: { published: boolean; draft: ProviderDraft; onOpenLead: () => void; onEdit: () => void; onNavigate: (view: View) => void }) {
  return (
    <div className="page-container provider-dashboard">
      <PageHeader title="Business home" description="Keep your profile current and respond to qualified inquiries." actions={<button className="secondary-button" onClick={onEdit}><Pencil size={16} />Edit profile</button>} />
      {!published && <div className="activation-strip"><div><CircleAlert size={20} /><span><strong>Your business profile is not live yet.</strong><small>Complete the four profile steps and publish when you are ready.</small></span></div><button className="primary-button" onClick={onEdit}>Continue setup</button></div>}
      {published && <div className="activation-strip success"><div><CheckCircle2 size={20} /><span><strong>Your profile is live.</strong><small>Founders can find {draft.businessName} and send structured inquiries.</small></span></div><button className="secondary-button" onClick={onEdit}>View profile</button></div>}
      <div className="dashboard-layout">
        <section className="lead-section"><div className="section-heading"><div><h2>New inquiries</h2><p>One request needs your response.</p></div><button className="text-button">View all</button></div><button className="lead-row" onClick={onOpenLead}><span className="lead-avatar">MS</span><span className="lead-main"><strong>Meera Shah · Nori Foods</strong><small>Food packaging for a 10,000-unit pilot run</small><span><MapPin size={14} />Ahmedabad · Needed within 3 weeks</span></span><span className="lead-evidence"><strong>Brief includes</strong><small>Budget, material, quantity, timeline</small></span><span className="status sent">New</span><ChevronRight size={20} /></button><div className="empty-lead-note"><Clock3 size={18} /><p>Replying quickly improves the response expectation shown on your public profile.</p></div></section>
        <aside className="profile-health"><h2>Profile health</h2><div className="health-score"><span>82</span><small>of 100</small></div><p>Two additions would make this profile easier to evaluate.</p><button><Plus size={17} /><span><strong>Add a completed project</strong><small>Show the result and project scale</small></span><ChevronRight size={17} /></button><button><ShieldCheck size={17} /><span><strong>Complete evidence review</strong><small>{draft.credential}</small></span><ChevronRight size={17} /></button></aside>
      </div>
      <section className="provider-module-shortcuts" aria-labelledby="workspace-shortcuts-title"><div className="section-heading"><div><h2 id="workspace-shortcuts-title">Manage your workspace</h2><p>Keep the public profile, hiring, updates, and team activity connected.</p></div></div><div><button onClick={() => onNavigate('workspace-media')}><FileCheck2 size={19} /><span><strong>Media library</strong><small>Gallery and work samples</small></span><ChevronRight size={17} /></button><button onClick={() => onNavigate('workspace-reviews')}><BadgeCheck size={19} /><span><strong>Reviews</strong><small>Reply and request reviews</small></span><ChevronRight size={17} /></button><button onClick={() => onNavigate('workspace-updates')}><Sparkles size={19} /><span><strong>Updates</strong><small>Statuses and highlights</small></span><ChevronRight size={17} /></button><button onClick={() => onNavigate('workspace-recruitment')}><BriefcaseBusiness size={19} /><span><strong>Recruitment</strong><small>Jobs and candidates</small></span><ChevronRight size={17} /></button><button onClick={() => onNavigate('workspace-team')}><UsersRound size={19} /><span><strong>Team access</strong><small>Roles and permissions</small></span><ChevronRight size={17} /></button><button onClick={() => onNavigate('workspace-promotions')}><Sparkles size={19} /><span><strong>Promotion centre</strong><small>Eligible native placements</small></span><ChevronRight size={17} /></button></div></section>
    </div>
  );
}

function ProviderLead({ onBack, onRespond }: { onBack: () => void; onRespond: () => void }) {
  const [response, setResponse] = useState('Thanks, Meera. We can support a 10,000-unit pilot within your timeline. Could you share the pouch dimensions and preferred barrier material?');
  return (
    <div className="page-container provider-lead">
      <PageHeader title="Nori Foods" description="Food packaging for a 10,000-unit pilot run" back={onBack} />
      <div className="lead-layout"><section className="lead-brief"><div className="lead-sender"><span className="lead-avatar large">MS</span><span><h2>Meera Shah</h2><p>Founder, Nori Foods</p><small><MapPin size={14} />Ahmedabad, Gujarat</small></span><span className="status viewed">Identity confirmed</span></div><hr /><h2>Request brief</h2><dl><div><dt>Need</dt><dd>Printed stand-up pouches for packaged snacks</dd></div><div><dt>Quantity</dt><dd>10,000 units for pilot run</dd></div><div><dt>Timing</dt><dd>Within 3 weeks</dd></div><div><dt>Budget</dt><dd>₹1,20,000–₹1,80,000</dd></div><div><dt>Proof requested</dt><dd>Food-grade certification and similar work</dd></div></dl><div className="founder-message"><strong>Message from Meera</strong><p>We have final artwork and need help selecting a food-safe barrier material. If the pilot works, monthly quantities will increase.</p></div></section><aside className="reply-panel"><h2>Reply to this inquiry</h2><p>Your response stays in Bharat Navya until both sides choose to share direct contact information.</p><label htmlFor="provider-response">Message</label><textarea id="provider-response" rows={8} value={response} onChange={(event) => setResponse(event.target.value)} /><button className="secondary-button"><Paperclip size={17} />Attach capability deck</button><button className="primary-button full" onClick={onRespond} disabled={!response.trim()}>Send reply <Send size={17} /></button><small className="reply-policy"><ShieldCheck size={16} />The founder will be notified immediately.</small></aside></div>
    </div>
  );
}

export default App;

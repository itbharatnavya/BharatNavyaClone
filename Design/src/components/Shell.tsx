import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Bell,
  Bookmark,
  Building2,
  BriefcaseBusiness,
  BadgeIndianRupee,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Home,
  Images,
  Inbox,
  Search,
  Star,
  Megaphone,
  Menu,
  UsersRound,
  Settings,
  Moon,
  Sparkles,
  Store,
  Sun,
  UserRound,
} from 'lucide-react';
import { founderNavigation, providerNavigation } from '../navigation';
import type { NavigationIcon, ShellMode, View } from '../types';
import { HeaderSearchProvider } from '../design-system/product-home';

const icons: Record<NavigationIcon, typeof Search> = {
  search: Search,
  sparkles: Sparkles,
  bookmark: Bookmark,
  inbox: Inbox,
  home: Home,
  building: Building2,
  briefcase: BriefcaseBusiness,
  megaphone: Megaphone,
  users: UsersRound,
  images: Images,
  star: Star,
  badge: BadgeIndianRupee,
};

interface ShellProps {
  children: ReactNode;
  mode: ShellMode;
  view: View;
  shortlistCount: number;
  providerSidebarCollapsed: boolean;
  theme: 'light' | 'dark';
  onToggleProviderSidebar: () => void;
  onToggleTheme: () => void;
  onNavigate: (view: View) => void;
  signedIn: boolean;
  accountRole: 'applicant' | 'company';
  onAuthIntent: (mode: 'join' | 'signin', reason?: string) => void;
  onSignOut: () => void;
  onSwitchRole: (role: 'applicant' | 'company') => void;
}

export function Shell({ children, mode, view, shortlistCount, providerSidebarCollapsed, theme, onToggleProviderSidebar, onToggleTheme, onNavigate, signedIn, accountRole, onAuthIntent, onSignOut, onSwitchRole }: ShellProps) {
  const [openUtility, setOpenUtility] = useState<'notifications' | 'account' | null>(null);
  const [headerNavigationOpen, setHeaderNavigationOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState<ReactNode>(null);
  const utilityAreaRef = useRef<HTMLDivElement>(null);
  const headerNavigationRef = useRef<HTMLDivElement>(null);
  const headerNavigationTriggerRef = useRef<HTMLButtonElement>(null);
  const notificationTriggerRef = useRef<HTMLButtonElement>(null);
  const accountTriggerRef = useRef<HTMLButtonElement>(null);
  const navigation = mode === 'founder' ? founderNavigation : providerNavigation;
  const registerHeaderSearch = useCallback((content: ReactNode | null) => setHeaderSearch(() => content), []);

  useEffect(() => {
    if (!openUtility) return;
    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !utilityAreaRef.current?.contains(event.target)) setOpenUtility(null);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      const trigger = openUtility === 'notifications' ? notificationTriggerRef.current : accountTriggerRef.current;
      setOpenUtility(null);
      window.requestAnimationFrame(() => trigger?.focus());
    }
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openUtility]);

  useEffect(() => {
    if (!headerNavigationOpen) return;
    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !headerNavigationRef.current?.contains(event.target)) setHeaderNavigationOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setHeaderNavigationOpen(false);
      window.requestAnimationFrame(() => headerNavigationTriggerRef.current?.focus());
    }
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [headerNavigationOpen]);

  return (
    <div className={`app-shell ${mode === 'provider' ? 'provider-shell' : 'founder-shell'} ${providerSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="global-header">
        <button className="brand" onClick={() => onNavigate('home')} aria-label="Bharat Navya home">
          <img className="brand-mark-image" src="/bharat-navya-mark.png" alt="" />
          <span className="brand-name">Bharat Navya</span>
        </button>

        {mode === 'founder' && !headerSearch && (
          <nav className="founder-desktop-nav" aria-label="Founder navigation">
            {navigation.map((item) => {
              const active = item.matches.includes(view);
              return (
                <button key={item.route} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined} onClick={() => onNavigate(item.route)}>
                  {item.label}
                  {item.route === 'saved' && shortlistCount > 0 && <span className="nav-count">{shortlistCount}</span>}
                </button>
              );
            })}
          </nav>
        )}

        {mode === 'founder' && headerSearch}

        <div ref={utilityAreaRef} className="header-utilities">
          {mode === 'founder' && (
            <div ref={headerNavigationRef} className={`header-navigation-compact ${headerSearch ? 'is-docked' : 'is-responsive'}`}>
              <button ref={headerNavigationTriggerRef} className="icon-button" type="button" aria-label="Open page navigation" aria-expanded={headerNavigationOpen} aria-controls="header-navigation-popover" aria-haspopup="true" onClick={() => setHeaderNavigationOpen((current) => !current)}>
                <Menu size={20} aria-hidden="true" />
              </button>
              {headerNavigationOpen && <nav id="header-navigation-popover" className="header-navigation-popover" aria-label="Page navigation">
                {navigation.map((item) => {
                  const Icon = icons[item.icon];
                  const active = item.matches.includes(view);
                  return <button key={item.route} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined} onClick={() => { setHeaderNavigationOpen(false); onNavigate(item.route); }}><Icon size={18} aria-hidden="true" /><span>{item.label}</span>{item.route === 'saved' && shortlistCount > 0 && <span className="nav-count">{shortlistCount}</span>}</button>;
                })}
              </nav>}
            </div>
          )}
          {signedIn && <button className="workspace-switch" aria-label={mode === 'founder' ? 'Open company workspace' : 'Open personal workspace'} onClick={() => { const nextRole = mode === 'founder' ? 'company' : 'applicant'; onSwitchRole(nextRole); onNavigate(mode === 'founder' ? 'provider-dashboard' : 'applicant-dashboard'); }}>
            {mode === 'founder' ? <Store size={17} /> : <UserRound size={17} />}
            <span>{mode === 'founder' ? 'Company workspace' : 'Personal workspace'}</span>
          </button>}
          <button className="icon-button theme-toggle" aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} aria-pressed={theme === 'dark'} onClick={onToggleTheme}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {signedIn && <div className="utility-anchor">
            <button ref={notificationTriggerRef} className="icon-button" aria-label="Notifications" aria-expanded={openUtility === 'notifications'} aria-controls="notification-popover" aria-haspopup="true" onClick={() => setOpenUtility((current) => current === 'notifications' ? null : 'notifications')}>
              <Bell size={19} /><i className="unread-dot" />
            </button>
            {openUtility === 'notifications' && (
              <div id="notification-popover" className="utility-popover" role="region" aria-label="Notifications">
                <strong>Notifications</strong>
                <p>No new updates. We will let you know when a business replies.</p>
              </div>
            )}
          </div>}
          {signedIn ? <div className="utility-anchor">
            <button ref={accountTriggerRef} className="account-button" aria-label="Open account menu" aria-expanded={openUtility === 'account'} aria-controls="account-popover" aria-haspopup="true" onClick={() => setOpenUtility((current) => current === 'account' ? null : 'account')}>AK</button>
            {openUtility === 'account' && (
              <div id="account-popover" className="utility-popover account-popover" role="region" aria-label="Account menu">
                <span className="account-name"><strong>Amit Kumar</strong><small>{accountRole === 'company' ? 'Aroha Foods · company workspace' : 'Personal applicant workspace'}</small></span>
                <button onClick={() => { onSwitchRole('applicant'); onNavigate('applicant-dashboard'); setOpenUtility(null); }}><UserRound size={17} />Personal workspace</button>
                <button onClick={() => { onSwitchRole('company'); onNavigate('provider-dashboard'); setOpenUtility(null); }}><Building2 size={17} />Company workspace</button>
                <button onClick={() => setOpenUtility(null)}><Settings size={17} />Preferences</button>
                <button onClick={() => setOpenUtility(null)}><CircleHelp size={17} />Help centre</button>
                <button onClick={() => { onSignOut(); setOpenUtility(null); }}>Sign out</button>
              </div>
            )}
          </div> : <div className="guest-actions"><button className="join-button account-entry" onClick={() => onAuthIntent('join')}>Join / Sign in</button></div>}
        </div>
      </header>

      {mode === 'provider' && (
        <aside className="provider-sidebar" aria-label="Business workspace navigation">
          <div className="provider-sidebar-title"><span>Business workspace</span></div>
          <nav>
            {providerNavigation.map((item) => {
              const Icon = icons[item.icon];
              const active = item.matches.includes(view);
              return (
                <button key={item.route} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined} aria-label={providerSidebarCollapsed ? item.label : undefined} title={providerSidebarCollapsed ? item.label : undefined} onClick={() => onNavigate(item.route)}>
                  <Icon size={19} /><span>{item.label}</span>
                </button>
              );
            })}
          </nav>
          <button className="collapse-sidebar" onClick={onToggleProviderSidebar} aria-label={providerSidebarCollapsed ? 'Expand business navigation' : 'Collapse business navigation'}>
            {providerSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            <span>Collapse sidebar</span>
          </button>
        </aside>
      )}

      <HeaderSearchProvider register={registerHeaderSearch}>
        <main id="main-content" className="main-content" tabIndex={-1}>{children}</main>
      </HeaderSearchProvider>

      <nav className={`mobile-bottom-nav ${mode === 'founder' ? 'founder-mobile-nav' : ''}`} aria-label={`${mode} mobile navigation`}>
        {navigation.filter((item) => item.mobile).map((item) => {
          const Icon = icons[item.icon];
          const active = item.matches.includes(view);
          return (
            <button key={item.route} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined} onClick={() => onNavigate(item.route)}>
              <span><Icon size={20} />{item.route === 'compare' && shortlistCount > 0 && <i>{shortlistCount}</i>}</span>
              {item.label}
            </button>
          );
        })}
        {mode === 'provider' && <button onClick={() => signedIn ? onNavigate('home') : onAuthIntent('join', 'Join to open a company workspace.')}>
          <Search size={20} />
          Discover
        </button>}
      </nav>
    </div>
  );
}

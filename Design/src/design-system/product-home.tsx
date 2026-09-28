import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type HTMLAttributes,
  type Ref,
  type ReactNode,
} from 'react';
import { ArrowRight, ChevronRight, MapPin, Search, SlidersHorizontal, X } from 'lucide-react';
import { useModalBehavior } from './useModalBehavior';

export type SectionSearchState =
  | { kind: 'companies'; query: string; location: string }
  | { kind: 'jobs'; query: string; location: string; workplace: string };

export interface SectionSearchProps {
  state: SectionSearchState;
  locations: readonly string[];
  workplaces?: readonly string[];
  variant?: 'hero' | 'compact' | 'drawer';
  onChange: (state: SectionSearchState) => void;
  onSubmit: () => void;
  queryInputRef?: Ref<HTMLInputElement>;
}

const HeaderSearchContext = createContext<(content: ReactNode | null) => void>(() => undefined);

export function HeaderSearchProvider({ register, children }: { register: (content: ReactNode | null) => void; children: ReactNode }) {
  return <HeaderSearchContext.Provider value={register}>{children}</HeaderSearchContext.Provider>;
}

function useHeaderSearch(content: ReactNode, active: boolean) {
  const register = useContext(HeaderSearchContext);
  useEffect(() => {
    register(active ? content : null);
    return () => register(null);
  }, [active, content, register]);
}

export function useSectionSearchDock() {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [heroVisible, setHeroVisible] = useState(true);
  const [heroFocused, setHeroFocused] = useState(false);
  const [dockFocused, setDockFocused] = useState(false);

  useEffect(() => {
    const node = anchorRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setHeroVisible(entry.isIntersecting), { threshold: 0.08 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return {
    anchorRef,
    docked: (!heroVisible || dockFocused) && !heroFocused,
    heroInteractionProps: {
      onFocusCapture: () => setHeroFocused(true),
      onBlurCapture: (event: React.FocusEvent<HTMLDivElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHeroFocused(false);
      },
    },
    dockInteractionProps: {
      onFocusCapture: () => setDockFocused(true),
      onBlurCapture: (event: React.FocusEvent<HTMLDivElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDockFocused(false);
      },
    },
  };
}

export function SectionSearch({ state, locations, workplaces = [], variant = 'hero', onChange, onSubmit, queryInputRef }: SectionSearchProps) {
  const isJobs = state.kind === 'jobs';
  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form className={`section-search section-search--${variant} ${isJobs ? 'section-search--jobs' : ''}`} onSubmit={submit} aria-label={isJobs ? 'Search jobs' : 'Search companies'}>
      <label className="section-search__query">
        <Search size={variant === 'compact' ? 17 : 20} aria-hidden="true" />
        <span className="sr-only">{isJobs ? 'Role, skill or company' : 'Company or service'}</span>
        <input
          ref={queryInputRef}
          aria-label={isJobs ? 'Role, skill or company' : 'Company or service'}
          value={state.query}
          onChange={(event) => onChange({ ...state, query: event.target.value })}
          placeholder={isJobs ? 'Role, skill, or company' : 'What service or company do you need?'}
        />
      </label>
      <label className="section-search__select">
        <MapPin size={17} aria-hidden="true" />
        <span className="sr-only">Location</span>
        <select aria-label={isJobs ? 'Job location' : 'Company location'} value={state.location} onChange={(event) => onChange({ ...state, location: event.target.value })}>
          {locations.map((location) => <option key={location}>{location}</option>)}
        </select>
      </label>
      {state.kind === 'jobs' && (
        <label className="section-search__select">
          <SlidersHorizontal size={17} aria-hidden="true" />
          <span className="sr-only">Workplace preference</span>
          <select aria-label="Workplace preference" value={state.workplace} onChange={(event) => onChange({ ...state, workplace: event.target.value })}>
            {workplaces.map((workplace) => <option key={workplace}>{workplace}</option>)}
          </select>
        </label>
      )}
      <button className="section-search__submit" type="submit">
        <span>{variant === 'compact' ? 'Search' : isJobs ? 'Search jobs' : 'Search companies'}</span>
        {variant !== 'compact' && <ArrowRight size={17} aria-hidden="true" />}
      </button>
    </form>
  );
}

export function SearchDock({ active, search, interactionProps }: { active: boolean; search: SectionSearchProps; interactionProps?: HTMLAttributes<HTMLDivElement> }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerQueryRef = useRef<HTMLInputElement>(null);
  const { dialogRef } = useModalBehavior<HTMLElement>({ open: drawerOpen, onClose: () => setDrawerOpen(false), initialFocusRef: drawerQueryRef });
  const summary = search.state.query.trim() || (search.state.kind === 'jobs' ? 'Search jobs' : 'Search companies');
  const filters = search.state.kind === 'jobs'
    ? `${search.state.location} · ${search.state.workplace}`
    : search.state.location;

  const headerContent = useMemo(() => (
    <div className="header-search-dock" data-kind={search.state.kind} {...interactionProps}>
      <div className="header-search-dock__desktop"><SectionSearch {...search} variant="compact" /><button className="header-search-dock__filters" type="button" onClick={() => setDrawerOpen(true)} aria-label={`Change search filters: ${filters}`}><SlidersHorizontal size={17} aria-hidden="true" /><span>{filters}</span></button></div>
      <button className="header-search-dock__mobile" type="button" onClick={() => setDrawerOpen(true)} aria-label={`Edit ${summary}, ${filters}`}>
        <Search size={18} aria-hidden="true" />
        <span><strong>{summary}</strong><small>{filters}</small></span>
        <ChevronRight size={17} aria-hidden="true" />
      </button>
    </div>
  ), [filters, interactionProps, search, summary]);

  useHeaderSearch(headerContent, active);

  if (!drawerOpen) return null;
  return (
    <div className="section-search-drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDrawerOpen(false); }}>
      <section ref={dialogRef} className="section-search-drawer" role="dialog" aria-modal="true" aria-labelledby="section-search-drawer-title" tabIndex={-1}>
        <header>
          <div><span>Keep exploring</span><h2 id="section-search-drawer-title">{search.state.kind === 'jobs' ? 'Search jobs' : 'Search companies'}</h2></div>
          <button type="button" aria-label="Close search" onClick={() => setDrawerOpen(false)}><X size={19} /></button>
        </header>
        <SectionSearch
          {...search}
          variant="drawer"
          queryInputRef={drawerQueryRef}
          onSubmit={() => { setDrawerOpen(false); search.onSubmit(); }}
        />
      </section>
    </div>
  );
}

export const SectionHero = forwardRef<HTMLElement, { eyebrow: string; title: string; description: string; children: ReactNode; className?: string }>(
  function SectionHero({ eyebrow, title, description, children, className = '' }, ref) {
    return (
      <section ref={ref} className={`section-hero ${className}`}>
        <div className="section-hero__copy"><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>
        {children}
      </section>
    );
  },
);

export function TrustContract({ label, items }: { label: string; items: { icon: ReactNode; title: string; description: string }[] }) {
  return (
    <section className="trust-contract" aria-label={label}>
      <strong className="trust-contract__label">{label}</strong>
      <div>{items.map((item) => <article key={item.title}>{item.icon}<span><strong>{item.title}</strong><small>{item.description}</small></span></article>)}</div>
    </section>
  );
}

export function PathwayIndex({ title, description, items }: { title: string; description: string; items: { icon: ReactNode; title: string; outcome: string; detail: string; onSelect: () => void }[] }) {
  return (
    <section className="pathway-index" aria-labelledby={`${title.replace(/\W+/g, '-').toLowerCase()}-title`}>
      <header><h2 id={`${title.replace(/\W+/g, '-').toLowerCase()}-title`}>{title}</h2><p>{description}</p></header>
      <div>{items.map((item) => <button key={item.title} onClick={item.onSelect}>{item.icon}<span><strong>{item.title}</strong><em>{item.outcome}</em><small>{item.detail}</small></span><ArrowRight size={18} /></button>)}</div>
    </section>
  );
}

export function EvidenceLedger({ title, description, action, children }: { title: string; description: string; action?: ReactNode; children: ReactNode }) {
  return <section className="evidence-ledger"><header><div><h2>{title}</h2><p>{description}</p></div>{action}</header><div>{children}</div></section>;
}

export function GuidedJourney({ title, description, steps }: { title: string; description: string; steps: { title: string; description: string; icon: ReactNode }[] }) {
  return (
    <section className="guided-journey">
      <header><h2>{title}</h2><p>{description}</p></header>
      <ol>{steps.map((step) => <li key={step.title}>{step.icon}<span><strong>{step.title}</strong><small>{step.description}</small></span></li>)}</ol>
    </section>
  );
}

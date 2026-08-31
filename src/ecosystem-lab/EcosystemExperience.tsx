import { useMemo, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Bell,
  Bookmark,
  Box,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  FileCheck2,
  Filter,
  Landmark,
  MapPin,
  Megaphone,
  MessageSquare,
  Package,
  Plus,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Store,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { usePersistentState } from '../hooks/usePersistentState';
import type { View } from '../types';
import { activeBusiness, defaultFilters, opportunities, routePrompts } from './ecosystem-fixtures';
import type { Opportunity, OpportunityFilterState, OpportunityKind, TrustState } from './ecosystem-types';
import './ecosystem.css';

type EcosystemView = Extract<View, 'ecosystem-marketplace' | 'ecosystem-network' | 'ecosystem-hub'>;

interface EcosystemExperienceProps {
  view: EcosystemView;
  initialQuery?: string;
  onNavigate: (view: View) => void;
  onNotice: (message: string) => void;
}

const kindMeta: Record<OpportunityKind, { label: string; className: string; Icon: typeof Package }> = {
  service: { label: 'Service', className: 'service', Icon: BriefcaseBusiness },
  talent: { label: 'Talent', className: 'talent', Icon: UsersRound },
  finance: { label: 'Finance', className: 'finance', Icon: Landmark },
  product: { label: 'Product', className: 'product', Icon: Package },
  update: { label: 'Update', className: 'update', Icon: Megaphone },
};

const longRequest = 'We are launching a packaged-food brand in Ahmedabad and need eco-friendly packaging, an operations hire, and working capital.';

export function EcosystemExperience({ view, initialQuery, onNavigate, onNotice }: EcosystemExperienceProps) {
  const [query, setQuery] = useState(initialQuery || longRequest);
  const [savedIds, setSavedIds] = usePersistentState<string[]>('bharatconnect:ecosystem-lab:saved-opportunities', []);

  const openNetwork = (nextQuery = query, kind?: OpportunityKind) => {
    setQuery(nextQuery);
    if (kind) window.sessionStorage.setItem('bharatconnect:ecosystem-lab:requested-kind', kind);
    onNavigate('ecosystem-network');
  };
  const toggleSaved = (id: string) => setSavedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  return (
    <div className="ecosystem-lab">
      {view === 'ecosystem-marketplace' && <Marketplace query={query} setQuery={setQuery} onSearch={openNetwork} onNavigate={onNavigate} />}
      {view === 'ecosystem-hub' && <BusinessHub onNavigate={onNavigate} onNotice={onNotice} />}
      {view === 'ecosystem-network' && <OpportunityNetwork query={query} onBack={() => onNavigate('ecosystem-marketplace')} onNavigate={onNavigate} savedIds={savedIds} onToggleSaved={toggleSaved} onNotice={onNotice} />}
    </div>
  );
}

function Marketplace({ query, setQuery, onSearch, onNavigate }: { query: string; setQuery: Dispatch<SetStateAction<string>>; onSearch: (query?: string, kind?: OpportunityKind) => void; onNavigate: (view: View) => void }) {
  return <section className="ecosystem-page ecosystem-marketplace" aria-labelledby="ecosystem-home-title">
    <section className="ecosystem-hero">
      <span className="ecosystem-kicker"><Sparkles size={14} />All-in-one business marketplace</span>
      <h1 id="ecosystem-home-title">What does your business need next?</h1>
      <form className="ecosystem-composer" onSubmit={(event) => { event.preventDefault(); onSearch(query); }}>
        <label className="sr-only" htmlFor="ecosystem-query">Describe what your business needs</label>
        <textarea id="ecosystem-query" value={query} onChange={(event) => setQuery(event.target.value)} rows={3} />
        <button className="ecosystem-primary composer-action" type="submit">Search <ArrowRight size={18} /></button>
      </form>
      <div className="ecosystem-route-prompts" aria-label="Marketplace paths">
        {routePrompts.map(({ label, kind, prompt }) => <button key={kind} onClick={() => onSearch(prompt, kind)}><TypeIcon kind={kind} /><span><strong>{label}</strong><small>{kind === 'service' ? 'Experts for every need' : kind === 'talent' ? 'Skilled people, verified' : kind === 'finance' ? 'Loans, credit & more' : kind === 'product' ? 'Raw materials to equipment' : 'Reach your network'}</small></span></button>)}
      </div>
      <button className="marketplace-context-link" onClick={() => onNavigate('ecosystem-hub')}><Store size={15} />Using Aroha Foods <span>Open business hub <ArrowRight size={15} /></span></button>
    </section>

    <section className="ecosystem-scenario" aria-labelledby="scenario-title">
      <div className="scenario-request"><span>Real scenario</span><h2 id="scenario-title">Food startup in Ahmedabad needs sustainable packaging</h2><p><MapPin size={15} />Ahmedabad, Gujarat</p><p><Store size={15} />Food & beverages · Early stage</p><p><FileCheck2 size={15} />GST registered</p></div>
      <div className="scenario-matches"><div className="section-inline-heading"><h2>Top matching businesses</h2><button onClick={() => onSearch('Find sustainable packaging partners in Ahmedabad', 'service')}>View all matches <ArrowRight size={15} /></button></div>{opportunities.slice(0, 3).map((opportunity) => <div className="mini-match" key={opportunity.id}><span className="opportunity-avatar">{opportunity.initials}</span><span><strong>{opportunity.title}</strong><small>{opportunity.location}</small></span><TrustBadge trust={opportunity.trust} /></div>)}</div>
      <div className="scenario-evidence"><h2>Why these matches?</h2><EvidenceLine>Experience with food businesses</EvidenceLine><EvidenceLine>Sustainable materials</EvidenceLine><EvidenceLine>On-time delivery</EvidenceLine><div className="scenario-stat"><span><strong>34</strong><small>Projects completed</small></span><span><strong>4.6/5</strong><small>Average rating</small></span><span><strong>₹28L+</strong><small>Project value</small></span></div></div>
    </section>

    <section className="ecosystem-trust-band" aria-label="Marketplace trust principles"><span><ShieldCheck size={23} /><strong>Verified identity</strong><small>Business identity is clearly marked</small></span><span><ClipboardCheck size={23} /><strong>Evidence available</strong><small>Documents, work and records stay visible</small></span><span><CheckCircle2 size={23} /><strong>Clear disclosures</strong><small>Partner referrals and gaps are explicit</small></span><button onClick={() => onNavigate('discover')}>Try the Phase 1 directory <ArrowRight size={15} /></button></section>
  </section>;
}

function BusinessHub({ onNavigate, onNotice }: { onNavigate: (view: View) => void; onNotice: (message: string) => void }) {
  return <section className="ecosystem-page ecosystem-hub" aria-labelledby="business-hub-title">
    <BusinessContextStrip onNavigate={onNavigate} />
    <div className="hub-page-heading"><div><span className="ecosystem-kicker">Business hub</span><h1 id="business-hub-title">Your next opportunities, in one place.</h1></div><button className="ecosystem-secondary" onClick={() => onNavigate('ecosystem-network')}>Explore opportunities <ArrowRight size={16} /></button></div>
    <div className="hub-grid">
      <section className="hub-lead panel"><span className="section-label">Top lead for you</span><div className="lead-header"><span className="status-pill new">New lead</span><span>Received 20m ago</span><TrustBadge trust="verified" /></div><h2>Require sustainable food packaging</h2><p className="lead-company"><BriefcaseBusiness size={17} />GreenBite Café Pvt. Ltd. · Ahmedabad, Gujarat</p><p>Looking for compostable clamshell boxes for salads and meals.</p><dl className="hub-fact-row"><div><dt>Quantity</dt><dd>15,000 units/month</dd></div><div><dt>Budget</dt><dd>₹2.50–₹3.20 / unit</dd></div><div><dt>Timeline</dt><dd>Within 30 days</dd></div></dl><div className="chip-row"><span>Compostable</span><span>Clamshell box</span><span>ISO 14001 preferred</span></div><div className="lead-actions"><button className="ecosystem-quiet" onClick={() => onNotice('Buyer conversation opened in this concept.')}>Message buyer</button><button className="ecosystem-primary" onClick={() => onNotice('Quote drafting state opened in this concept.')}>Send quote <Send size={16} /></button></div></section>
      <div className="hub-side-stack"><section className="panel compact-opportunity"><span className="type-square talent"><UsersRound size={22} /></span><div><span className="section-label">Build your team</span><h2>Hiring: Operations Manager</h2><p>Full-time · Ahmedabad · 12 applicants</p><button className="ecosystem-quiet" onClick={() => onNotice('Candidate review opened in this concept.')}>View applicants <ChevronRight size={16} /></button></div></section><section className="panel compact-opportunity"><span className="type-square finance"><Banknote size={22} /></span><div><span className="section-label">Finance readiness</span><h2>Business loan up to ₹25L</h2><p>You’re pre-qualified through lending partners.</p><button className="ecosystem-quiet" onClick={() => onNotice('Referral detail opened. Eligibility remains to be confirmed.')}>Check offer details <ArrowRight size={16} /></button></div></section></div>
      <section className="panel catalogue-pulse"><span className="section-label">Your catalogue pulse</span><div><span className="catalogue-visual"><Package size={28} /></span><span><h2>Compostable Clamshell Box — 750ml</h2><p>Pack of 100 · Bagasse · Natural</p><strong>₹3.10 <small>/ unit ex. GST</small></strong><span className="availability-dot">In stock</span></span></div><button className="ecosystem-quiet" onClick={() => onNotice('Catalogue preview opened in this concept.')}>View catalogue <ArrowRight size={16} /></button></section>
      <section className="panel finance-centre"><span className="section-label">Finance centre</span><h2>Business hygiene</h2><p><CheckCircle2 size={16} />GST filing up to date <small>Next due: 20 May 2025</small></p><p><FileCheck2 size={16} />Invoices uploaded <small>12 of 12 for Apr 2025</small></p><button className="ecosystem-quiet" onClick={() => onNotice('Finance centre opened in this concept.')}>Go to finance centre <ArrowRight size={16} /></button></section>
      <section className="panel growth-checklist"><span className="section-label">Grow your business</span><Task icon={<Plus size={17} />} title="Add work sample" detail="Showcase your best work to build trust" state="Pending" onClick={() => onNotice('Evidence upload step opened in this concept.')} /><Task icon={<Megaphone size={17} />} title="Publish update" detail="Share news or offers with your network" state="Pending" onClick={() => onNotice('Business update composer opened in this concept.')} /><Task icon={<ShieldCheck size={17} />} title="Complete evidence review" detail="Pending documents need your action" state="Review" onClick={() => onNavigate('provider-setup')} /></section>
    </div>
    <div className="hub-identity-note"><ShieldCheck size={20} /><span><strong>One verified identity. All business opportunities.</strong><small>Your business profile connects you to trusted leads, partners and financial solutions.</small></span></div>
  </section>;
}

function OpportunityNetwork({ query, onBack, onNavigate, savedIds, onToggleSaved, onNotice }: { query: string; onBack: () => void; onNavigate: (view: View) => void; savedIds: string[]; onToggleSaved: (id: string) => void; onNotice: (message: string) => void }) {
  const requestedKind = window.sessionStorage.getItem('bharatconnect:ecosystem-lab:requested-kind') as OpportunityKind | null;
  const [filters, setFilters] = useState<OpportunityFilterState>(() => requestedKind ? { ...defaultFilters, service: requestedKind === 'service', talent: requestedKind === 'talent', finance: requestedKind === 'finance', product: requestedKind === 'product', update: requestedKind === 'update' } : defaultFilters);
  const [showFilters, setShowFilters] = useState(false);
  const visible = useMemo(() => opportunities.filter((item) => filters[item.kind] && (!filters.verifiedOnly || item.trust !== 'partner-referral')), [filters]);
  const toggle = (key: keyof OpportunityFilterState) => setFilters((current) => ({ ...current, [key]: !current[key] }));
  const reset = () => setFilters(defaultFilters);
  return <section className="ecosystem-page ecosystem-network" aria-labelledby="opportunity-network-title">
    <section className="network-query"><button className="ecosystem-icon-button" aria-label="Back to marketplace" onClick={onBack}><ChevronRight className="back-icon" size={18} /></button><span><small>Exploring your request</small><strong>{query}</strong></span><button className="ecosystem-quiet" onClick={onBack}>Edit</button><button className="ecosystem-secondary" onClick={() => onNotice('Search saved in this concept.')}><Bookmark size={16} />Save search</button><button className="ecosystem-primary" onClick={() => setShowFilters(true)}><SlidersHorizontal size={16} />Refine</button></section>
    <div className="network-mobile-heading"><div><span className="ecosystem-kicker">Opportunity network</span><h1 id="opportunity-network-title">Relevant next moves for Aroha Foods</h1></div><button className="ecosystem-secondary" onClick={() => setShowFilters(true)}><Filter size={16} />Filters</button></div>
    <div className="network-layout">
      <FilterRail filters={filters} onToggle={toggle} onReset={reset} />
      <section className="network-results" aria-label="Opportunity results"><div className="network-results-header"><span>Showing results across Services, Talent, Finance, Products and Updates</span><label>Sort by <select defaultValue="relevance" aria-label="Sort opportunities"><option value="relevance">Relevance</option><option value="recent">Most recent</option></select></label></div>{visible.map((opportunity) => <OpportunityRow key={opportunity.id} item={opportunity} saved={savedIds.includes(opportunity.id)} onToggleSaved={() => onToggleSaved(opportunity.id)} onAction={() => onNotice(`${opportunity.primaryAction} opened in this concept.`)} />)}{visible.length === 0 && <div className="network-empty"><Search size={28} /><h2>No opportunities match these filters</h2><p>Broaden a type or remove the verified-only filter.</p><button className="ecosystem-primary" onClick={reset}>Reset filters</button></div>}</section>
      <aside className="network-context"><section className="panel"><h2>What we found</h2><p>We explored your request across five opportunity types.</p><TypeCount kind="service" count={132} /><TypeCount kind="talent" count={57} /><TypeCount kind="finance" count={28} /><TypeCount kind="product" count={64} /><TypeCount kind="update" count={23} /><button className="ecosystem-quiet network-hub-link" onClick={() => onNavigate('ecosystem-hub')}>Open Aroha Foods hub <ArrowRight size={15} /></button></section><section className="panel disclosure-panel"><h2><CircleAlert size={17} />What needs confirmation</h2><p>A few details will help us narrow this down.</p><ul><li>Annual revenue or funding stage</li><li>Estimated working-capital amount</li><li>Preferred packaging material and specs</li><li>Team size and hiring timeline</li></ul><button className="ecosystem-secondary" onClick={() => onNavigate('brief')}>Update details</button></section><section className="panel network-method"><h2>About these results</h2><p>Results are ranked by relevance and verification. Partner referrals are subject to eligibility and final approval.</p><button className="ecosystem-quiet" onClick={() => onNotice('Matching methodology opened in this concept.')}>Learn how we match <ArrowRight size={15} /></button></section></aside>
    </div>
    {showFilters && <MobileFilterSheet filters={filters} onToggle={toggle} onReset={reset} onClose={() => setShowFilters(false)} />}
  </section>;
}

function BusinessContextStrip({ onNavigate }: { onNavigate: (view: View) => void }) {
  return <section className="business-context-strip"><span className="business-context-logo">{activeBusiness.initials}</span><span className="business-context-main"><h2>{activeBusiness.name} <TrustBadge trust="verified" /></h2><p><MapPin size={15} />{activeBusiness.city} <i /> <FileCheck2 size={15} />{activeBusiness.gstin}</p></span><span className="profile-health"><small>Profile health</small><strong>Good</strong><i><b style={{ width: `${activeBusiness.profileHealth}%` }} /></i><small>3 of 4 complete</small></span><button className="ecosystem-secondary" onClick={() => onNavigate('provider-preview')}>View business profile <ArrowRight size={16} /></button></section>;
}

function OpportunityRow({ item, saved, onToggleSaved, onAction }: { item: Opportunity; saved: boolean; onToggleSaved: () => void; onAction: () => void }) {
  const meta = kindMeta[item.kind];
  return <article className="opportunity-row"><div className={`opportunity-visual ${meta.className}`}><meta.Icon size={25} /></div><div className="opportunity-identity"><span className={`opportunity-kind ${meta.className}`}>{meta.label} · {item.subtitle}</span><div className="opportunity-title"><h2>{item.title}</h2><TrustBadge trust={item.trust} /></div>{item.location && <p><MapPin size={14} />{item.location}</p>}<p className="opportunity-detail">{item.detail}</p><div className="evidence-chip-row">{item.evidence.map((evidence) => <span key={evidence}>{evidence}</span>)}</div></div><dl className="opportunity-facts">{item.facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl><div className="opportunity-actions">{item.gap && <span className="status-pill warning">{item.gap}</span>}<button className="ecosystem-secondary" onClick={onAction}>{item.primaryAction}</button><button className={`ecosystem-icon-button save ${saved ? 'saved' : ''}`} aria-label={`${saved ? 'Remove' : 'Save'} ${item.title}`} aria-pressed={saved} onClick={onToggleSaved}><Bookmark size={17} fill={saved ? 'currentColor' : 'none'} /></button></div></article>;
}

function FilterRail({ filters, onToggle, onReset }: { filters: OpportunityFilterState; onToggle: (key: keyof OpportunityFilterState) => void; onReset: () => void }) {
  return <aside className="network-filter-rail"><div className="filter-rail-heading"><h2>Filters</h2><button onClick={onReset}>Clear all</button></div><fieldset><legend className="sr-only">Opportunity types</legend>{(['service', 'talent', 'finance', 'product', 'update'] as OpportunityKind[]).map((kind) => { const meta = kindMeta[kind]; return <label className="filter-type" key={kind}><span><TypeIcon kind={kind} /><strong>{meta.label}</strong></span><input type="checkbox" checked={filters[kind]} onChange={() => onToggle(kind)} /><i /></label>; })}</fieldset><label className="verified-toggle"><span><ShieldCheck size={18} />Verified only</span><input type="checkbox" checked={filters.verifiedOnly} onChange={() => onToggle('verifiedOnly')} /><i /></label></aside>;
}

function MobileFilterSheet({ filters, onToggle, onReset, onClose }: { filters: OpportunityFilterState; onToggle: (key: keyof OpportunityFilterState) => void; onReset: () => void; onClose: () => void }) {
  return <><div className="ecosystem-sheet-backdrop" aria-hidden="true" /><section className="ecosystem-filter-sheet" role="dialog" aria-modal="true" aria-labelledby="filter-sheet-title"><div><h2 id="filter-sheet-title">Refine opportunities</h2><button className="ecosystem-icon-button" aria-label="Close filters" onClick={onClose}><X size={18} /></button></div><FilterRail filters={filters} onToggle={onToggle} onReset={onReset} /><button className="ecosystem-primary sheet-apply" onClick={onClose}>Show matching opportunities</button></section></>;
}

function Task({ icon, title, detail, state, onClick }: { icon: ReactNode; title: string; detail: string; state: string; onClick: () => void }) {
  return <button className="growth-task" onClick={onClick}><span>{icon}</span><span><strong>{title}</strong><small>{detail}</small></span><i>{state}</i><ChevronRight size={16} /></button>;
}

function EvidenceLine({ children }: { children: React.ReactNode }) { return <p className="evidence-line"><Check size={15} />{children}</p>; }

function TypeIcon({ kind }: { kind: OpportunityKind }) { const Icon = kindMeta[kind].Icon; return <span className={`type-icon ${kindMeta[kind].className}`}><Icon size={19} /></span>; }

function TrustBadge({ trust }: { trust: TrustState }) { const label = trust === 'verified' ? 'Verified' : trust === 'identity' ? 'Identity verified' : 'Partner referral'; return <span className={`ecosystem-trust-badge ${trust}`}><BadgeCheck size={14} />{label}</span>; }

function TypeCount({ kind, count }: { kind: OpportunityKind; count: number }) { return <div className="type-count"><TypeIcon kind={kind} /><strong>{kindMeta[kind].label}</strong><span>{count} results</span></div>; }

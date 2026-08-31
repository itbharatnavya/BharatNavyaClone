import { useMemo, useRef, useState, type CSSProperties, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bookmark,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  FileCheck2,
  Filter,
  Globe2,
  Heart,
  Image as ImageIcon,
  Inbox,
  LockKeyhole,
  MapPin,
  Megaphone,
  MessageSquare,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Store,
  UsersRound,
  X,
} from 'lucide-react';
import { businesses } from '../data';
import { jobs, updates } from '../platform/platform-fixtures';
import { usePersistentState } from '../hooks/usePersistentState';
import { useModalBehavior } from '../design-system/useModalBehavior';
import { EvidenceLedger, GuidedJourney, PathwayIndex, SearchDock, SectionHero, SectionSearch, TrustContract, useSectionSearchDock, type SectionSearchState } from '../design-system/product-home';
import { Advertisement, EntityLogo, MediaFrame, PersonAvatar } from '../design-system/media';
import { thirdPartyAds } from '../visual-fixtures';
import type { BusinessProfile, Inquiry, ResultFilters, SearchBrief, VerificationLevel, View } from '../types';

interface FounderExperienceProps {
  view: View;
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  brief: SearchBrief;
  setBrief: Dispatch<SetStateAction<SearchBrief>>;
  shortlist: string[];
  setShortlist: Dispatch<SetStateAction<string[]>>;
  selectedBusinessId: string;
  setSelectedBusinessId: Dispatch<SetStateAction<string>>;
  inquiries: Inquiry[];
  setInquiries: Dispatch<SetStateAction<Inquiry[]>>;
  onNavigate: (view: View) => void;
  onNotice: (message: string) => void;
  signedIn: boolean;
  onAuthRequired: (reason: string) => void;
}

const prompts = [
  'Register for GST and manage monthly filings',
  'Find food-safe packaging for a pilot run',
  'Hire a launch marketing partner in Ahmedabad',
  'Plan a company event for 150 people',
];

const verificationCopy: Record<VerificationLevel, string> = {
  unclaimed: 'Unclaimed listing',
  claimed: 'Claimed business',
  identity: 'Identity verified',
  evidence: 'Evidence verified',
};

export function FounderExperience(props: FounderExperienceProps) {
  const selectedBusiness = businesses.find((business) => business.id === props.selectedBusinessId) ?? businesses[0];
  const shortlisted = businesses.filter((business) => props.shortlist.includes(business.id)).slice(0, 3);

  function startSearch(value = props.query) {
    const normalized = value.trim();
    if (!normalized) {
      props.onNotice('Describe what you need so we can prepare a useful brief.');
      return;
    }
    props.setQuery(normalized);
    props.setBrief((current) => ({ ...current, originalQuery: normalized }));
    props.onNavigate('results');
  }

  function toggleShortlist(id: string) {
    props.setShortlist((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 3) {
        props.onNotice('You can compare up to three businesses at a time.');
        return current;
      }
      return [...current, id];
    });
  }

  const shared = {
    onOpenBusiness: (id: string) => {
      props.setSelectedBusinessId(id);
      props.onNavigate('profile');
    },
    onToggleShortlist: toggleShortlist,
  };

  if (props.view === 'companies' || props.view === 'discover') return <CompaniesHome query={props.query} setQuery={props.setQuery} setBrief={props.setBrief} onSearch={startSearch} onNavigate={props.onNavigate} onOpenBusiness={shared.onOpenBusiness} />;
  if (props.view === 'brief') return <BriefBuilder brief={props.brief} setBrief={props.setBrief} onBack={() => props.onNavigate('companies')} onContinue={() => props.onNavigate('results')} />;
  if (props.view === 'results') return <Results brief={props.brief} shortlist={props.shortlist} onEditBrief={() => props.onNavigate('brief')} onCompare={() => props.onNavigate('compare')} {...shared} />;
  if (props.view === 'compare') return <Compare businesses={shortlisted} onBack={() => props.onNavigate('results')} {...shared} />;
  if (props.view === 'profile') return <Profile business={selectedBusiness} selected={props.shortlist.includes(selectedBusiness.id)} onBack={() => props.onNavigate('results')} onInquire={() => props.onNavigate('inquiry')} {...shared} />;
  if (props.view === 'inquiry') return <InquiryComposer business={selectedBusiness} brief={props.brief} onBack={() => props.onNavigate('profile')} onSend={(inquiry) => {
    props.setInquiries((current) => [inquiry, ...current]);
    props.onNotice(`Inquiry sent to ${inquiry.businessName}.`);
    props.onNavigate('requests');
  }} />;
  return <Requests inquiries={props.inquiries} onDiscover={() => props.onNavigate('companies')} />;
}

const companyCategories = [
  { title: 'Finance, Legal and Compliance', outcome: 'Register, file, and stay compliant', icon: FileCheck2, detail: 'GST, accounting, legal, registrations', sample: 'GST and compliance' },
  { title: 'Manufacturing and Suppliers', outcome: 'Source, make, and package', icon: Store, detail: 'Packaging, materials, production partners', sample: 'packaging manufacturer' },
  { title: 'Technology and Software', outcome: 'Build and improve digital products', icon: Globe2, detail: 'Web, product, automation, IT services', sample: 'website development' },
  { title: 'Marketing and Creative', outcome: 'Reach customers and strengthen your brand', icon: Megaphone, detail: 'Brand, performance, content, events', sample: 'marketing partner' },
  { title: 'Logistics and Operations', outcome: 'Move, fulfil, and run reliably', icon: BriefcaseBusiness, detail: 'Transport, fulfilment, warehousing, process', sample: 'logistics provider' },
  { title: 'Professional Business Services', outcome: 'Find specialist support for people and operations', icon: UsersRound, detail: 'Consulting, hiring, training, administration', sample: 'business consultant' },
] as const;

function CompaniesHome({ query, setQuery, setBrief, onSearch, onNavigate, onOpenBusiness }: { query: string; setQuery: Dispatch<SetStateAction<string>>; setBrief: Dispatch<SetStateAction<SearchBrief>>; onSearch: (query?: string) => void; onNavigate: (view: View) => void; onOpenBusiness: (id: string) => void }) {
  const [location, setLocation] = usePersistentState('bharatnavya:company-home-location', 'Ahmedabad');
  const searchDock = useSectionSearchDock();
  const needs = ['GST and compliance', 'Food-safe packaging', 'Website development', 'Marketing partner', 'Logistics provider'];
  const verified = businesses.filter((item) => item.verification === 'evidence' || item.verification === 'identity');
  const searchState: SectionSearchState = { kind: 'companies', query, location };

  function search(value = query) {
    setBrief((current) => ({ ...current, location, serviceCategory: value, originalQuery: value }));
    onSearch(value);
  }

  function openCategory(sample: string) {
    setQuery(sample);
    setBrief((current) => ({ ...current, location, serviceCategory: sample, originalQuery: sample }));
    onNavigate('results');
  }

  const sectionSearch = {
    state: searchState,
    locations: ['Ahmedabad', 'Gandhinagar', 'Vadodara', 'Anywhere in India'],
    onChange: (next: SectionSearchState) => {
      setQuery(next.query);
      setLocation(next.location);
    },
    onSubmit: () => search(),
  } as const;

  return <div className="product-home companies-home">
    <SearchDock active={searchDock.docked} search={sectionSearch} interactionProps={searchDock.dockInteractionProps} />
    <SectionHero eyebrow="Bharat Navya Companies" title="Find the right company for the work ahead." description="Discover startups, SMEs, suppliers, and service partners through evidence you can inspect—not a catalogue you have to decode.">
      <div ref={searchDock.anchorRef} className="section-hero-search-anchor" {...searchDock.heroInteractionProps} inert={searchDock.docked ? true : undefined} aria-hidden={searchDock.docked || undefined}>
        <SectionSearch {...sectionSearch} />
      </div>
      <div className="product-suggestions"><span>Popular needs</span>{needs.map((need) => <button key={need} onClick={() => { setQuery(need); search(need); }}>{need}</button>)}</div>
    </SectionHero>

    <TrustContract label="How company trust works" items={[
      { icon: <Building2 size={19} />, title: 'Claimed company', description: 'An authorized company member manages the listing.' },
      { icon: <ShieldCheck size={19} />, title: 'Identity verified', description: 'Core company identity has been checked.' },
      { icon: <BadgeCheck size={19} />, title: 'Evidence verified', description: 'Submitted proof supports specific public claims.' },
    ]} />

    <PathwayIndex title="Start with the work you need done" description="Choose a familiar service family. You will land directly in editable results, never an extra category page." items={companyCategories.map(({ title, outcome, icon: Icon, detail, sample }) => ({ icon: <Icon size={22} />, title, outcome, detail, onSelect: () => openCategory(sample) }))} />

    <EvidenceLedger title={`Popular needs near ${location}`} description="Useful buying context appears only when a company has supplied it." action={<button className="text-arrow" onClick={() => onNavigate('results')}>Browse all <ArrowRight size={16} /></button>}>
      <button className="evidence-ledger__row" onClick={() => openCategory('GST consultant')}><FileCheck2 size={21} /><span><strong>GST registration and filing</strong><small>12 providers · 8 evidence verified</small></span><span><small>Price guidance supplied</small><em>From ₹8,000</em></span><ArrowRight size={17} /></button>
      <button className="evidence-ledger__row" onClick={() => openCategory('packaging')}><Store size={21} /><span><strong>Food-safe packaging pilots</strong><small>9 suppliers · 5 available soon</small></span><span><small>Minimum order guidance</small><em>MOQ from 5,000</em></span><ArrowRight size={17} /></button>
      <button className="evidence-ledger__row" onClick={() => openCategory('marketing')}><Megaphone size={21} /><span><strong>Launch marketing partners</strong><small>17 agencies and specialists</small></span><span><small>Project guidance supplied</small><em>From ₹45,000</em></span><ArrowRight size={17} /></button>
    </EvidenceLedger>

    <GuidedJourney title="From an open-ended need to an accountable conversation" description="Bharat Navya keeps your original request visible while helping you inspect fit before sharing contact details." steps={[
      { icon: <Search size={20} />, title: 'Describe the need', description: 'Start in your own words, with location and timing.' },
      { icon: <FileCheck2 size={20} />, title: 'Inspect evidence', description: 'See verified facts, work samples, availability, and gaps.' },
      { icon: <Bookmark size={20} />, title: 'Shortlist', description: 'Compare up to three companies without losing the request.' },
      { icon: <MessageSquare size={20} />, title: 'Send an inquiry', description: 'Share a structured brief and keep a durable response record.' },
    ]} />

    <EvidenceLedger title="Companies with fresh trust signals" description="Verification provides context; it never hides missing evidence.">
      {verified.slice(0, 4).map((business) => <button className="evidence-ledger__row" key={business.id} onClick={() => onOpenBusiness(business.id)}><EntityLogo src={business.logoImage} name={business.name} initials={business.initials} /><span><strong>{business.name}</strong><small>{business.descriptor}</small></span><span><small>{business.location}</small><em><BadgeCheck size={13} />{verificationCopy[business.verification]}</em></span><ArrowRight size={17} /></button>)}
    </EvidenceLedger>

    <section className="company-mixed-discovery">
      <div className="availability-board"><span className="platform-eyebrow">Available to start soon</span><h2>Shorter paths to a useful reply</h2>{businesses.slice(0, 3).map((business) => <button key={business.id} onClick={() => onOpenBusiness(business.id)}><EntityLogo src={business.logoImage} name={business.name} initials={business.initials} size="small" /><span><strong>{business.name}</strong><small>{business.services[0]}</small></span><i>{business.availability}</i></button>)}</div>
      <div className="work-highlight"><MediaFrame src={businesses[0].gallery?.[0]?.src} alt={businesses[0].gallery?.[0]?.alt ?? `Work sample from ${businesses[0].name}`} ratio="wide" overlay="Verified work sample" /><div className="work-highlight__copy"><span className="platform-eyebrow">Work samples</span><h2>See the work before sending the brief.</h2><p>{businesses[0].portfolio?.[0]?.detail ?? 'Review evidence, outcomes, and company updates in one profile.'}</p><button className="button secondary" onClick={() => onOpenBusiness(businesses[0].id)}>View a company highlight <ArrowRight size={16} /></button></div></div>
    </section>

    <section className="company-updates-preview" aria-labelledby="company-updates-title"><header><div><span className="platform-eyebrow">Current offers, events and availability</span><h2 id="company-updates-title">What companies are doing now</h2></div><button className="text-arrow" onClick={() => onNavigate('updates')}>All Updates <ArrowRight size={16} /></button></header><div>{updates.filter((item) => !item.sponsored).slice(0, 3).map((update) => <article key={update.id}>{update.image && <MediaFrame src={update.image} alt={update.alt ?? `${update.companyName} update`} ratio="wide" />}<div className="company-update-card__copy"><span>{update.kind}</span><h3>{update.title}</h3><p>{update.body}</p><small>{update.companyName} · {update.age} ago</small></div></article>)}</div></section>

    <Advertisement ad={thirdPartyAds.companies} format="partner" className="product-home-ad" />

    <section className="product-help-cta"><div><span className="platform-eyebrow">Can’t find what you need?</span><h2>Describe the outcome, not the category.</h2><p>We will carry your words into the company results and keep the filters editable.</p></div><button className="button primary large" onClick={() => document.querySelector<HTMLInputElement>('.header-search-dock input, .section-search--hero input')?.focus()}>Search in your own words</button></section>
    <section className="product-owner-cta"><div><Building2 size={24} /><span><strong>Is your company already here?</strong><small>Claim an existing listing or create a company workspace.</small></span></div><button className="button secondary" onClick={() => onNavigate('provider-start')}>List or claim your company</button></section>
  </div>;
}

function Discover({ query, setQuery, onSearch, signedIn, onNavigate, onAuthRequired }: { query: string; setQuery: Dispatch<SetStateAction<string>>; onSearch: (query?: string) => void; signedIn: boolean; onNavigate: (view: View) => void; onAuthRequired: (reason: string) => void }) {
  const [city, setCity] = useState('Ahmedabad');
  const organicUpdates = updates.filter((update) => !update.sponsored).slice(0, 5);
  const sponsoredUpdate = updates.find((update) => update.sponsored);
  const feedUpdates = sponsoredUpdate ? [...organicUpdates, sponsoredUpdate] : organicUpdates;
  const localJobs = jobs.filter((job) => !job.sponsored).slice(0, 3);

  function openStory(companyName: string) {
    if (!signedIn) {
      onAuthRequired(`Join to watch the full update from ${companyName}. Your place on this page will be kept.`);
      return;
    }
    onNavigate('updates');
  }

  return (
    <div className="founder-page discovery-page">
      <section className="discovery-hero" aria-labelledby="discovery-title">
        <h1 id="discovery-title">What does your business need?</h1>
        <form className="hero-search-card" onSubmit={(event) => { event.preventDefault(); onSearch(); }}>
          <div className="hero-search-input">
            <textarea id="founder-query" aria-label="Describe what your business needs" placeholder="Describe what your business needs" value={query} onChange={(event) => setQuery(event.target.value)} rows={3} />
            <button className="composer-submit" type="submit" aria-label="Prepare my brief"><ArrowRight size={18} /></button>
          </div>
        </form>
        <div className="prompt-section" aria-label="Suggested searches">
          <span>Try a request</span>
          <div className="prompt-cloud">
            {prompts.map((prompt) => <button key={prompt} onClick={() => { setQuery(prompt); onSearch(prompt); }}>{prompt}</button>)}
          </div>
        </div>
      </section>

      <section className="local-pulse" aria-labelledby="local-pulse-title">
        <header className="local-pulse-header">
          <div>
            <span className="platform-eyebrow">Your city, in motion</span>
            <h2 id="local-pulse-title">Happening near {city}</h2>
            <p>Fresh work, hiring, events, and availability from verified local businesses and their named recruiters.</p>
          </div>
          <label className="city-picker">
            <MapPin size={17} aria-hidden="true" />
            <span className="sr-only">Local activity city</span>
            <select aria-label="Local activity city" value={city} onChange={(event) => setCity(event.target.value)}>
              <option>Ahmedabad</option>
              <option>Bengaluru</option>
              <option>Pune</option>
            </select>
            <ChevronDown size={15} aria-hidden="true" />
          </label>
        </header>

        <div className="home-story-rail" aria-label={`Story previews near ${city}`}>
          {updates.filter((update) => !update.sponsored).slice(0, 6).map((update) => (
            <button className="home-story-preview" key={update.id} onClick={() => openStory(update.companyName)} aria-label={`Preview ${update.companyName}: ${update.title}`}>
              <span className="home-story-visual">
                {update.image ? <img src={update.image} alt="" loading="lazy" /> : <span className="story-monogram" aria-hidden="true">{update.companyInitials}</span>}
                <span className="story-kind">{update.kind}</span>
                <span className="story-lock"><LockKeyhole size={13} aria-hidden="true" /><span className="sr-only">Sign in required to watch</span></span>
              </span>
              <span className="home-story-copy"><strong>{update.companyName}</strong><small>{update.title}</small><time>{update.age} ago</time></span>
            </button>
          ))}
        </div>
        <p className="story-preview-note"><LockKeyhole size={14} aria-hidden="true" />Previews are public. Join or sign in to watch the full update.</p>

        <div className="local-briefing-grid">
          <section className="activity-ledger" aria-labelledby="activity-ledger-title">
            <div className="local-section-heading">
              <div><span className="platform-eyebrow">Local briefing</span><h3 id="activity-ledger-title">What changed today</h3></div>
              <button onClick={() => onNavigate('updates')}>View Updates <ArrowRight size={16} aria-hidden="true" /></button>
            </div>
            <div className="home-activity-list">
              {feedUpdates.map((update, index) => (
                <article className={`home-activity-row ${update.sponsored ? 'sponsored' : ''} ${update.image ? 'has-media' : ''}`} key={update.id}>
                  {update.image && <button className="activity-media" onClick={() => openStory(update.companyName)} aria-label={`Preview ${update.companyName}: ${update.title}`}><img src={update.image} alt={update.alt ?? ''} loading="lazy" /></button>}
                  <div className="activity-marker" aria-hidden="true">{update.kind === 'Hiring' ? <BriefcaseBusiness size={18} /> : update.kind === 'Event' ? <CalendarDays size={18} /> : update.sponsored ? <Megaphone size={18} /> : <Building2 size={18} />}</div>
                  <div className="activity-copy">
                    <div className="activity-meta"><span>{update.sponsored ? 'Sponsored update' : update.kind}</span><time>{update.age} ago</time></div>
                    <h4>{update.title.replace(/^Sponsored:\s*/i, '')}</h4>
                    <p>{update.body}</p>
                    <button onClick={() => openStory(update.companyName)}>{update.companyName}<BadgeCheck size={14} aria-label="Verified company" /><ArrowRight size={15} aria-hidden="true" /></button>
                    {update.sponsored && <small className="sponsor-disclosure">Paid placement · verification and organic relevance are unchanged.</small>}
                  </div>
                  <span className="activity-position sr-only">{update.sponsored ? `Sponsored placement after ${index} organic updates` : `Organic update ${index + 1}`}</span>
                </article>
              ))}
            </div>
          </section>

          <aside className="local-briefing-aside" aria-label={`More activity near ${city}`}>
            <section className="local-jobs-brief">
              <div className="local-section-heading compact"><div><span className="platform-eyebrow">Open this week</span><h3>Local roles</h3></div><BriefcaseBusiness size={20} aria-hidden="true" /></div>
              <div>{localJobs.map((job) => <button key={job.id} onClick={() => onNavigate('jobs')}><span><strong>{job.title}</strong><small>{job.companyName} · {job.workplace}</small></span><span>{job.salary}<ArrowRight size={14} aria-hidden="true" /></span></button>)}</div>
            </section>
            <section className="newly-verified">
              <div className="local-section-heading compact"><div><span className="platform-eyebrow">Newly verified</span><h3>Trust signals added</h3></div><BadgeCheck size={20} aria-hidden="true" /></div>
              {businesses.filter((business) => ['identity', 'evidence'].includes(business.verification)).slice(0, 3).map((business) => <button key={business.id} onClick={() => onNavigate('discover')}><span className="business-logo-v2">{business.initials}</span><span><strong>{business.name}</strong><small>{business.location}</small></span><TrustBadge level={business.verification} compact /></button>)}
            </section>
          </aside>
        </div>

        <section className="city-follow-cta" aria-labelledby="city-follow-title">
          <div><span className="platform-eyebrow">Make the city feed yours</span><h3 id="city-follow-title">Follow the work you care about in {city}.</h3><p>Save companies, track local roles, and get new updates without turning discovery into another noisy social feed.</p></div>
          <button className="button primary large" onClick={() => signedIn ? onNavigate('updates') : onAuthRequired(`Join to follow companies and activity in ${city}.`)}>{signedIn ? 'Open my updates' : 'Join to follow'} <ArrowRight size={17} aria-hidden="true" /></button>
        </section>
      </section>

      <section className="trust-story" aria-labelledby="trust-story-title">
        <div><ShieldCheck size={26} /><h2 id="trust-story-title">Know what is claimed—and what is checked.</h2></div>
        <p>Every listing separates basic identity, verified business information, and supporting credentials. Missing evidence stays visible instead of being hidden behind a recommendation score.</p>
        <div className="trust-steps" aria-label="Verification levels">
          <TrustBadge level="unclaimed" /><span />
          <TrustBadge level="claimed" /><span />
          <TrustBadge level="identity" /><span />
          <TrustBadge level="evidence" />
        </div>
      </section>
    </div>
  );
}

function BriefBuilder({ brief, setBrief, onBack, onContinue }: { brief: SearchBrief; setBrief: Dispatch<SetStateAction<SearchBrief>>; onBack: () => void; onContinue: () => void }) {
  const fields: Array<[keyof Pick<SearchBrief, 'serviceCategory' | 'location' | 'timing' | 'budgetBand' | 'providerType'>, string, string[]]> = [
    ['serviceCategory', 'Service', ['GST consultant', 'Tax and compliance firm', 'Business registration']],
    ['location', 'Location', ['Ahmedabad', 'Gandhinagar', 'Remote / anywhere in India']],
    ['timing', 'When do you need to start?', ['As soon as possible', 'Within 2 weeks', 'Within a month', 'Just exploring']],
    ['budgetBand', 'Budget guidance', ['Not decided', 'Under ₹25,000', '₹25,000–₹60,000', '₹60,000–₹1,00,000']],
    ['providerType', 'Provider type', ['Either', 'Independent expert', 'CA firm']],
  ];
  const proofOptions = ['GST registration experience', 'Food or FMCG clients', 'Available for in-person meetings', 'At least 5 years in business'];

  return (
    <div className="founder-page focused-page">
      <PageHeader title="Edit search details" description="Optional details can refine the businesses already shown." onBack={onBack} />
      <div className="brief-shell">
        <section className="request-quote">
          <span>Your request</span><p>“{brief.originalQuery}”</p><button className="button quiet" onClick={onBack}><Pencil size={16} />Edit words</button>
        </section>
        <section className="soft-panel brief-criteria">
          <div className="section-title-row"><div><h2>Core criteria</h2><p>These details shape the result order.</p></div><span>All editable</span></div>
          <div className="field-grid">
            {fields.map(([key, label, options]) => <label className="field" key={key}><span>{label}</span><select aria-label={label} value={String(brief[key])} onChange={(event) => setBrief((current) => ({ ...current, [key]: event.target.value }))}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>)}
          </div>
        </section>
        <section className="soft-panel proof-criteria">
          <div className="section-title-row"><div><h2>What should businesses prove?</h2><p>Optional evidence requests help explain why a result appears.</p></div><button className="button quiet" onClick={() => setBrief((current) => ({ ...current, proofRequirements: [] }))}>Skip all</button></div>
          <fieldset className="check-list"><legend className="sr-only">Proof requirements</legend>{proofOptions.map((requirement) => {
            const checked = brief.proofRequirements.includes(requirement);
            return <label key={requirement} className={checked ? 'checked' : ''}><input type="checkbox" checked={checked} onChange={() => setBrief((current) => ({ ...current, proofRequirements: checked ? current.proofRequirements.filter((item) => item !== requirement) : [...current.proofRequirements, requirement] }))} /><span><Check size={15} /></span>{requirement}</label>;
          })}</fieldset>
        </section>
        <div className="brief-actions"><span><ShieldCheck size={17} />These preferences stay private until you send an inquiry.</span><button className="button primary large" onClick={onContinue}>Apply and return to results <ArrowRight size={18} /></button></div>
      </div>
    </div>
  );
}

function Results({ brief, shortlist, onToggleShortlist, onCompare, onOpenBusiness, onEditBrief }: { brief: SearchBrief; shortlist: string[]; onToggleShortlist: (id: string) => void; onCompare: () => void; onOpenBusiness: (id: string) => void; onEditBrief: () => void }) {
  const emptyFilters: ResultFilters = { verifiedOnly: false, evidenceOnly: false, nearbyOnly: false, availableSoon: false, pricingShown: false };
  const [filters, setFilters] = usePersistentState<ResultFilters>('bharatnavya:company-filters', emptyFilters);
  const [sort, setSort] = usePersistentState<'evidence' | 'response' | 'experience'>('bharatnavya:company-sort', 'evidence');
  const [showFilters, setShowFilters] = useState(false);
  const filterCloseRef = useRef<HTMLButtonElement>(null);
  const { dialogRef: filterDialogRef } = useModalBehavior<HTMLDialogElement>({ open: showFilters, onClose: () => setShowFilters(false), initialFocusRef: filterCloseRef });
  const [previewId, setPreviewId] = useState(businesses[0].id);

  const results = useMemo(() => {
    let next = businesses.filter((business) => !filters.verifiedOnly || ['identity', 'evidence'].includes(business.verification));
    next = next.filter((business) => !filters.evidenceOnly || business.verification === 'evidence');
    const searchText = `${brief.originalQuery} ${brief.serviceCategory}`.toLowerCase();
    const categoryAliases: Array<[RegExp, string[]]> = [
      [/gst|tax|compliance|legal|finance/, ['gst', 'tax', 'compliance', 'accounting']],
      [/packag|manufactur|supplier|material/, ['packaging', 'manufacturing', 'supplier', 'materials']],
      [/tech|software|website|automation/, ['technology', 'software', 'website', 'automation']],
      [/market|creative|brand|event/, ['marketing', 'creative', 'brand', 'event']],
      [/logistic|operations|warehouse|fulfil/, ['logistics', 'operations', 'warehouse', 'fulfilment']],
    ];
    const aliases = categoryAliases.find(([pattern]) => pattern.test(searchText))?.[1] ?? searchText.split(/\W+/).filter((word) => word.length > 3 && !['need', 'find', 'company', 'service', 'business', 'ahmedabad'].includes(word));
    if (aliases.length) next = next.filter((business) => {
      const haystack = [business.name, business.descriptor, business.location, ...business.services, ...business.industries].join(' ').toLowerCase();
      return aliases.some((term) => haystack.includes(term));
    });
    next = next.filter((business) => !filters.nearbyOnly || Number.parseFloat(business.distance) <= 25);
    next = next.filter((business) => !filters.availableSoon || !/not confirmed|not available/i.test(business.availability));
    next = next.filter((business) => !filters.pricingShown || Boolean(business.priceGuide));
    if (sort === 'experience') next = [...next].sort((a, b) => b.yearsActive - a.yearsActive);
    if (sort === 'response') next = [...next].sort((a, b) => Number.parseInt(a.responseTime) - Number.parseInt(b.responseTime));
    return next;
  }, [brief.originalQuery, brief.serviceCategory, filters, sort]);

  const organicResults = results.filter((business) => !business.promoted);
  const promotedResults = results.filter((business) => business.promoted);
  const orderedResults = [...organicResults.slice(0, 3), ...promotedResults, ...organicResults.slice(3)];
  const filterCount = Object.values(filters).filter(Boolean).length;
  const toggleFilter = (key: keyof ResultFilters) => setFilters((current) => ({ ...current, [key]: !current[key] }));
  const preview = orderedResults.find((business) => business.id === previewId) ?? orderedResults[0];

  return (
    <div className={`founder-page results-page-v2 ${shortlist.length ? 'has-shortlist-tray' : ''}`}>
      <h1 className="sr-only">Businesses that fit your brief</h1>
      <section className="results-toolbar">
        <div className="result-query"><Search size={19} /><span><small>Searching for</small><strong>{brief.serviceCategory}</strong></span><i /><MapPin size={18} /><span><small>Near</small><strong>{brief.location}</strong></span></div>
        <button className="button secondary" onClick={() => setShowFilters(true)}><SlidersHorizontal size={17} />Filters{filterCount > 0 && <span className="nav-count">{filterCount}</span>}</button>
      </section>
      <div className="index-heading">
        <div><strong>{results.length} businesses fit</strong><span>Evidence and gaps are shown without an opaque score.</span></div>
        <label className="sort-control"><span>Sort</span><select aria-label="Sort businesses" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="evidence">Best evidence</option><option value="response">Fastest response</option><option value="experience">Most experience</option></select></label>
      </div>

      {results.length ? (
        <div className="results-workbench">
          <section className="index-list-panel" aria-label="Matching businesses">
            {orderedResults.map((business, index) => <div className="company-result-slot" key={business.id}>
              <BusinessIndexItem business={business} active={preview?.id === business.id} selected={shortlist.includes(business.id)} onSelect={() => setPreviewId(business.id)} onToggle={() => onToggleShortlist(business.id)} onOpen={() => onOpenBusiness(business.id)} organicPosition={index + 1} />
              {orderedResults.slice(0, index + 1).filter((item) => !item.promoted).length === 8 && <Advertisement ad={thirdPartyAds.companies} format="inline" className="results-inline-ad" />}
            </div>)}
          </section>
          {preview && <BusinessPreview business={preview} selected={shortlist.includes(preview.id)} onToggle={() => onToggleShortlist(preview.id)} onOpen={() => onOpenBusiness(preview.id)} />}
          {preview && <div className="results-context-rail"><DecisionContext business={preview} brief={brief} onEditBrief={onEditBrief} />{organicResults.length >= 8 && <Advertisement ad={thirdPartyAds.companies} format="rail" />}</div>}
        </div>
      ) : <div className="empty-results"><Search size={28} /><h2>No businesses fit every criterion</h2><p>Your search words or one of the active filters removed the available fixtures. Edit the search or broaden a filter.</p><button className="button primary" onClick={() => setFilters(emptyFilters)}>Clear filters</button></div>}

      {shortlist.length > 0 && <div className="shortlist-tray" role="status" aria-live="polite"><div className="shortlist-avatars">{businesses.filter((business) => shortlist.includes(business.id)).map((business) => <span key={business.id}>{business.initials}</span>)}</div><span><strong>{shortlist.length} shortlisted</strong><small>Select up to three to compare evidence</small></span><button className="button primary" onClick={onCompare} disabled={shortlist.length < 2}>Compare businesses <ArrowRight size={17} /></button></div>}

      {showFilters && <><div className="filter-backdrop" aria-hidden="true" onMouseDown={() => setShowFilters(false)} /><dialog ref={filterDialogRef} className="filter-dialog" open aria-modal="true" aria-labelledby="filter-title" tabIndex={-1}><div className="dialog-heading"><div><h2 id="filter-title">Filter results</h2><p>Everything here is optional. Apply only what matters.</p></div><button ref={filterCloseRef} className="icon-button" aria-label="Close filters" onClick={() => setShowFilters(false)}><X size={19} /></button></div><fieldset className="dialog-options"><legend>Business evidence and fit</legend><label><input type="checkbox" checked={filters.verifiedOnly} onChange={() => toggleFilter('verifiedOnly')} />Verified identity or stronger</label><label><input type="checkbox" checked={filters.evidenceOnly} onChange={() => toggleFilter('evidenceOnly')} />Evidence verified</label><label><input type="checkbox" checked={filters.nearbyOnly} onChange={() => toggleFilter('nearbyOnly')} />Serves within 25 km</label><label><input type="checkbox" checked={filters.availableSoon} onChange={() => toggleFilter('availableSoon')} />Can start soon</label><label><input type="checkbox" checked={filters.pricingShown} onChange={() => toggleFilter('pricingShown')} />Shows price guidance</label></fieldset><button className="edit-search-details" onClick={onEditBrief}><Pencil size={16} /><span><strong>Edit search details</strong><small>Location, timing, budget, and proof</small></span><ArrowRight size={16} /></button><div className="dialog-actions"><button className="button quiet" onClick={() => setFilters(emptyFilters)}>Reset</button><button className="button primary" onClick={() => setShowFilters(false)}>Show {results.length} businesses</button></div></dialog></>}
    </div>
  );
}

function BusinessIndexItem({ business, active, selected, onSelect, onToggle, onOpen, organicPosition }: { business: BusinessProfile; active: boolean; selected: boolean; onSelect: () => void; onToggle: () => void; onOpen: () => void; organicPosition: number }) {
  return (
    <article className={`index-item ${active ? 'active' : ''}`}>
      <button className="index-item-main" onClick={onSelect} aria-pressed={active}>
        <EntityLogo src={business.logoImage} name={business.name} initials={business.initials} />
        <span className="index-item-copy">
          {business.promoted && <small className="sponsored-label">Sponsored · position {organicPosition}</small>}
          <span className="business-title-line"><strong>{business.name}</strong><TrustBadge level={business.verification} compact /></span>
          <small>{business.descriptor}</small>
          <span className="location-line"><MapPin size={14} />{business.location} · {business.distance}</span>
          <span className="index-match"><CheckCircle2 size={14} />{business.match.matched[0]}</span>
          <span className="index-gap"><CircleAlert size={14} />{business.match.gaps[0]}</span>
        </span>
      </button>
      <div className="index-item-actions">
        <span>{business.priceGuide}</span>
        <button className={`save-button ${selected ? 'selected' : ''}`} aria-pressed={selected} aria-label={`${selected ? 'Remove' : 'Add'} ${business.name} ${selected ? 'from' : 'to'} shortlist`} onClick={onToggle}><Bookmark size={17} fill={selected ? 'currentColor' : 'none'} /></button>
        <button className="index-open-mobile" onClick={onOpen}>View profile</button>
      </div>
    </article>
  );
}

function BusinessPreview({ business, selected, onToggle, onOpen }: { business: BusinessProfile; selected: boolean; onToggle: () => void; onOpen: () => void }) {
  return (
    <article className="business-preview">
      <header>
        <div className="preview-identity"><EntityLogo src={business.logoImage} name={business.name} initials={business.initials} size="large" /><span><TrustBadge level={business.verification} /><h2>{business.name}</h2><p>{business.descriptor}</p><span className="location-line"><MapPin size={14} />{business.location} · {business.distance}</span>{business.rating && <span className="preview-rating"><Star size={13} fill="currentColor" />{business.rating} · {business.reviewCount} verified reviews</span>}</span></div>
        <div className="preview-actions"><button className={`save-button ${selected ? 'selected' : ''}`} onClick={onToggle} aria-label={selected ? 'Remove from shortlist' : 'Add to shortlist'}><Bookmark size={17} fill={selected ? 'currentColor' : 'none'} /></button><button className="button primary" onClick={onOpen}>View full profile</button></div>
      </header>
      {business.coverImage && <MediaFrame src={business.coverImage} alt={business.coverImageAlt ?? `${business.name} workplace`} ratio="wide" className="business-preview-media" />}
      <dl className="preview-facts"><div><dt>Experience</dt><dd>{business.yearsActive} years</dd></div><div><dt>Response</dt><dd>{business.responseTime}</dd></div><div><dt>Availability</dt><dd>{business.availability}</dd></div><div><dt>Price guide</dt><dd>{business.priceGuide}</dd></div></dl>
      <section><h3>About</h3><p>{business.about}</p></section>
      <section><h3>Relevant services</h3><div className="preview-services">{business.services.map((service) => <span key={service}>{service}</span>)}</div></section>
      <section><h3>Proof and credentials</h3><div className="preview-proof">{business.credentials.length ? business.credentials.slice(0, 3).map((credential) => <span key={credential}><FileCheck2 size={16} />{credential}</span>) : <span><CircleAlert size={16} />No credentials submitted</span>}</div></section>
      <section><h3>Why it matches</h3><div className="preview-match">{business.match.matched.map((item) => <span key={item}><CheckCircle2 size={15} />{item}</span>)}</div></section>
      {business.activeStatus && <section className="preview-latest-update"><h3>Live update · {business.activeStatus.age}</h3><button onClick={onOpen}><span><strong>{business.activeStatus.title}</strong><small>{business.activeStatus.detail}</small></span><ArrowRight size={16} /></button></section>}
      {!!business.openJobs?.length && <section><h3>Open roles</h3><p>{business.openJobs.length} roles · named recruiter · visible salary bands</p></section>}
    </article>
  );
}

function DecisionContext({ business, brief, onEditBrief }: { business: BusinessProfile; brief: SearchBrief; onEditBrief: () => void }) {
  return (
    <aside className="decision-context">
      <section><div className="context-heading"><h2>Your brief</h2><button onClick={onEditBrief}>Edit</button></div><dl><div><dt>Location</dt><dd>{brief.location}</dd></div><div><dt>Timing</dt><dd>{brief.timing}</dd></div><div><dt>Budget</dt><dd>{brief.budgetBand}</dd></div></dl></section>
      <section><h2>Decision signals</h2><p className="context-positive"><CheckCircle2 size={16} />{business.match.matched.length} requirements have supporting evidence</p><p className="context-warning"><CircleAlert size={16} />{business.match.gaps[0]}</p></section>
      <section><h2>Current availability</h2><strong>{business.availability}</strong><p>Typical response: {business.responseTime}</p></section>
      <section><h2>Price context</h2><strong>{business.priceGuide}</strong><p>Guidance only. Confirm scope and taxes directly with the business.</p></section>
    </aside>
  );
}

function Compare({ businesses: items, onBack, onToggleShortlist, onOpenBusiness }: { businesses: BusinessProfile[]; onBack: () => void; onToggleShortlist: (id: string) => void; onOpenBusiness: (id: string) => void }) {
  if (items.length < 2) return <div className="founder-page focused-page"><PageHeader title="Your shortlist" description="Add at least two businesses to compare their evidence." onBack={onBack} /><div className="empty-results"><Bookmark size={30} /><h2>Shortlist two businesses</h2><p>Return to results and save the businesses you want to evaluate side by side.</p><button className="button primary" onClick={onBack}>Browse results</button></div></div>;
  const rows = [
    ['Relevant evidence', (business: BusinessProfile) => business.match.matched],
    ['Worth clarifying', (business: BusinessProfile) => business.match.gaps],
    ['Credentials', (business: BusinessProfile) => business.credentials.length ? business.credentials : ['No credentials submitted']],
    ['Availability', (business: BusinessProfile) => [business.availability]],
    ['Response', (business: BusinessProfile) => [business.responseTime]],
    ['Price guide', (business: BusinessProfile) => [business.priceGuide]],
  ] as const;
  return <div className="founder-page compare-page-v2"><PageHeader title="Compare your shortlist" description="Look for differences in evidence, availability, and unanswered questions." onBack={onBack} /><div className="comparison-v2" style={{ '--compare-count': items.length } as CSSProperties}><div className="compare-label-column"><span>Business</span>{rows.map(([label]) => <strong key={label}>{label}</strong>)}</div>{items.map((business) => <article className="compare-business" key={business.id}><header><span className="business-logo-v2">{business.initials}</span><div><h2>{business.name}</h2><TrustBadge level={business.verification} compact /></div><button className="icon-button" aria-label={`Remove ${business.name}`} onClick={() => onToggleShortlist(business.id)}><X size={17} /></button></header>{rows.map(([label, getValue]) => <div key={label} data-label={label}>{getValue(business).map((value) => <span key={value}><Check size={14} />{value}</span>)}</div>)}<footer><button className="button primary" onClick={() => onOpenBusiness(business.id)}>View business</button></footer></article>)}</div></div>;
}

function Profile({ business, selected, onBack, onToggleShortlist, onInquire }: { business: BusinessProfile; selected: boolean; onBack: () => void; onToggleShortlist: (id: string) => void; onInquire: () => void }) {
  const [showStatus, setShowStatus] = useState(false);
  const statusCloseRef = useRef<HTMLButtonElement>(null);
  const { dialogRef: statusDialogRef } = useModalBehavior<HTMLElement>({ open: showStatus, onClose: () => setShowStatus(false), initialFocusRef: statusCloseRef });
  return <div className="founder-page profile-page-v2 rich-company-profile">
    <PageHeader title="Business profile" description="Ownership, proof, work, reviews, and current activity in one accountable profile." onBack={onBack} />
    {business.coverImage && <div className="company-cover"><img src={business.coverImage} alt={business.coverImageAlt ?? `Workplace for ${business.name}`} /><span>Illustrative prototype media</span></div>}
    <section className="profile-hero-v2"><div className="profile-brand-block">{business.activeStatus ? <button className="status-ring company-profile-ring" aria-label={`View live update from ${business.name}`} onClick={() => setShowStatus(true)}><EntityLogo src={business.logoImage} name={business.name} initials={business.initials} size="large" /></button> : <EntityLogo src={business.logoImage} name={business.name} initials={business.initials} size="large" />}<div><TrustBadge level={business.verification} /><h1>{business.name}</h1><p>{business.descriptor}</p><span className="location-line"><MapPin size={15} />{business.location} · {business.distance}</span><div className="profile-social-proof">{business.rating && <span><Star size={14} fill="currentColor" />{business.rating} · {business.reviewCount} reviews</span>}<span><Clock3 size={14} />{business.match.updated}</span></div></div></div><div className="profile-hero-actions"><button className="button secondary"><Heart size={17} />Follow</button><button className={`button secondary ${selected ? 'selected' : ''}`} onClick={() => onToggleShortlist(business.id)}><Bookmark size={17} fill={selected ? 'currentColor' : 'none'} />{selected ? 'Shortlisted' : 'Shortlist'}</button><button className="button primary large" onClick={onInquire}>Send inquiry <ArrowRight size={17} /></button></div></section>
    {business.verification === 'unclaimed' && <div className="profile-warning"><CircleAlert size={19} /><span><strong>This listing is unclaimed.</strong> Availability and contact details have not been confirmed by the business.</span></div>}
    {showStatus && business.activeStatus && <section ref={statusDialogRef} className="inline-status-viewer" role="dialog" aria-modal="true" aria-labelledby="company-status-title" tabIndex={-1}><button ref={statusCloseRef} className="icon-button" aria-label="Close live update" onClick={() => setShowStatus(false)}><X size={18} /></button><span className="status-ring"><i>{business.initials}</i></span><span className="platform-eyebrow">Live update · {business.activeStatus.age}</span><h2 id="company-status-title">{business.activeStatus.title}</h2><p>{business.activeStatus.detail}</p><button className="button primary">Send an inquiry</button></section>}
    {!!business.highlights?.length && <section className="company-highlight-row" aria-label="Company highlights">{business.highlights.map((highlight, index) => <button key={highlight}><span>{index === 0 ? <ImageIcon size={18} /> : index === 1 ? <FileCheck2 size={18} /> : <UsersRound size={18} />}</span><strong>{highlight}</strong></button>)}</section>}
    <div className="profile-content-v2"><div className="profile-main-v2">
      <section className="profile-section"><h2>Why this business appears</h2><div className="match-panels"><div><h3>Evidence that fits</h3>{business.match.matched.map((item) => <p key={item}><CheckCircle2 size={17} />{item}</p>)}</div><div><h3>Worth clarifying</h3>{business.match.gaps.map((item) => <p key={item}><CircleAlert size={17} />{item}</p>)}</div></div><small>{business.match.updated}</small></section>
      <section className="profile-section"><h2>About the business</h2><p className="long-copy">{business.about}</p><dl className="profile-facts"><div><dt>Founded</dt><dd>{business.founded ?? 'Not confirmed'}</dd></div><div><dt>Team</dt><dd>{business.teamSize ?? 'Not confirmed'}</dd></div><div><dt>Availability</dt><dd>{business.availability}</dd></div><div><dt>Response</dt><dd>{business.responseTime}</dd></div><div><dt>Price guidance</dt><dd>{business.priceGuide}</dd></div><div><dt>Website</dt><dd><Globe2 size={13} />{business.website ?? 'Not provided'}</dd></div></dl></section>
      {!!business.gallery?.length && <section className="profile-section"><div className="profile-section-heading"><div><h2>Photos and work</h2><p>Media supplied for this fictional prototype profile.</p></div><button className="button secondary">View all</button></div><div className="company-gallery">{business.gallery.map((media) => <figure key={media.id}><img src={media.src} alt={media.alt} /><figcaption>{media.category}</figcaption></figure>)}</div></section>}
      <section className="profile-section"><h2>Services</h2><div className="profile-service-list">{business.services.map((service) => <div key={service}><span><strong>{service}</strong><small>{business.industries.join(' · ')}</small></span><CheckCircle2 size={18} /></div>)}</div></section>
      <section className="profile-section"><h2>Credentials and proof</h2><div className="credential-grid-v2">{business.credentials.length ? business.credentials.map((credential) => <div key={credential}><FileCheck2 size={20} /><span><strong>{credential}</strong><small>Checked against submitted records</small></span><span className="evidence-state">Checked</span></div>) : <div><CircleAlert size={20} /><span><strong>No credentials submitted</strong><small>Ask for evidence before engaging.</small></span></div>}</div><div className="proof-tags">{business.proof.map((proof) => <span key={proof}>{proof}</span>)}</div></section>
      {!!business.portfolio?.length && <section className="profile-section"><h2>Selected client work</h2><div className="portfolio-list">{business.portfolio.map((item) => <article key={item.title}><span><BriefcaseBusiness size={18} /></span><div><strong>{item.title}</strong><p>{item.detail}</p><small><CheckCircle2 size={14} />{item.outcome}</small></div></article>)}</div></section>}
      {!!business.reviews?.length && <section className="profile-section"><div className="profile-section-heading"><div><h2>Verified reviews</h2><p>Reviews tied to a recorded inquiry or engagement.</p></div><span className="profile-review-score"><Star size={17} fill="currentColor" />{business.rating}</span></div><div className="public-review-list">{business.reviews.map((review) => <article key={review.id}><header><span className="review-avatar">{review.author.split(' ').map((part) => part[0]).slice(0,2).join('')}</span><div><strong>{review.author}</strong><small>{review.role}</small></div><span><Star size={14} fill="currentColor" />{review.rating}.0</span></header><p>{review.text}</p>{review.response && <div><strong>Response from {business.name}</strong><p>{review.response}</p></div>}<footer><time>{review.date}</time><button>Helpful</button><button>Report</button></footer></article>)}</div></section>}
      {!!business.openJobs?.length && <section className="profile-section"><div className="profile-section-heading"><div><h2>Open roles</h2><p>Every role has a named recruiter and visible salary band.</p></div></div><div className="company-job-list">{business.openJobs.map((job) => <article key={job.id}><BriefcaseBusiness size={19} /><div><strong>{job.title}</strong><small>{job.location} · {job.salary}</small></div><button className="button secondary">View role</button></article>)}</div>{business.recruiter && <div className="profile-recruiter"><PersonAvatar src={business.recruiter.avatar} name={business.recruiter.name} initials={business.recruiter.name.split(' ').map((part) => part[0]).join('')} /><div><strong>{business.recruiter.name}</strong><small>{business.recruiter.title} · association verified</small><small>{business.recruiter.response}</small></div><ShieldCheck size={18} /></div>}</section>}
    </div><aside className="contact-panel-v2"><h2>Start a useful conversation</h2><p>Your approved brief is attached automatically. Add a message when you are ready.</p><button className="button primary large full" onClick={onInquire}>Send inquiry <Send size={17} /></button><dl><div><dt>Typical response</dt><dd>{business.responseTime}</dd></div><div><dt>Current availability</dt><dd>{business.availability}</dd></div><div><dt>Verification</dt><dd>{verificationCopy[business.verification]}</dd></div></dl><small><ShieldCheck size={16} />You decide when to share direct contact details.</small><button className="button quiet full">Report profile</button></aside></div>
  </div>;
}

function InquiryComposer({ business, brief, onBack, onSend }: { business: BusinessProfile; brief: SearchBrief; onBack: () => void; onSend: (inquiry: Inquiry) => void }) {
  const [message, setMessage] = useState('We are launching a packaged food brand and need GST registration plus monthly compliance. We would like to begin within two weeks.');
  const [contactMethod, setContactMethod] = useState<Inquiry['contactMethod']>('Bharat Navya');
  const [attachment, setAttachment] = useState(false);
  const [sending, setSending] = useState(false);
  function submit() { setSending(true); window.setTimeout(() => onSend({ id: `inq-${Date.now()}`, businessId: business.id, businessName: business.name, summary: message, contactMethod, status: 'Sent', sentAt: 'Just now' }), 450); }
  return <div className="founder-page inquiry-page-v2"><PageHeader title={`Contact ${business.name}`} description="Review exactly what will be shared before sending." onBack={onBack} /><div className="inquiry-layout-v2"><form className="soft-panel inquiry-form-v2" onSubmit={(event) => { event.preventDefault(); submit(); }}><section><h2>Your message</h2><label className="field"><span>What should the business know?</span><textarea aria-label="Message to the business" value={message} onChange={(event) => setMessage(event.target.value)} rows={7} required /></label><button type="button" className="button secondary" onClick={() => setAttachment((current) => !current)}><Paperclip size={17} />{attachment ? 'Capability-brief.pdf attached' : 'Attach a file'}{attachment && <Check size={16} />}</button></section><section><h2>Preferred reply</h2><fieldset className="reply-options"><legend className="sr-only">Preferred reply method</legend>{(['Bharat Navya', 'Email', 'WhatsApp'] as const).map((method) => <label key={method} className={contactMethod === method ? 'selected' : ''}><input type="radio" name="contact-method" checked={contactMethod === method} onChange={() => setContactMethod(method)} /><span><strong>{method}</strong><small>{method === 'Bharat Navya' ? 'Keep contact details private' : `Share your ${method.toLowerCase()} details`}</small></span></label>)}</fieldset></section><button className="button primary large full" type="submit" disabled={sending || !message.trim()}>{sending ? 'Sending inquiry…' : 'Send inquiry'} {!sending && <Send size={17} />}</button></form><aside className="brief-card-v2"><div><span className="business-logo-v2">{business.initials}</span><span><strong>{business.name}</strong><TrustBadge level={business.verification} compact /></span></div><h2>Brief attached</h2><dl><div><dt>Service</dt><dd>{brief.serviceCategory}</dd></div><div><dt>Location</dt><dd>{brief.location}</dd></div><div><dt>Timing</dt><dd>{brief.timing}</dd></div><div><dt>Budget</dt><dd>{brief.budgetBand}</dd></div></dl><p><ShieldCheck size={17} /><span><strong>Shared only after you send</strong><br />The business receives this brief and your message.</span></p></aside></div></div>;
}

function Requests({ inquiries, onDiscover }: { inquiries: Inquiry[]; onDiscover: () => void }) {
  const [openId, setOpenId] = useState<string | null>(inquiries[0]?.id ?? null);
  return <div className="founder-page requests-page-v2"><PageHeader title="Requests" description="Track the conversations you started with businesses." actions={<button className="button primary" onClick={onDiscover}><Plus size={17} />New search</button>} />{inquiries.length ? <div className="request-cards-v2">{inquiries.map((inquiry) => <article key={inquiry.id} className={openId === inquiry.id ? 'open' : ''}><button className="request-summary" onClick={() => setOpenId((current) => current === inquiry.id ? null : inquiry.id)} aria-expanded={openId === inquiry.id}><span className="business-logo-v2">{inquiry.businessName.split(' ').map((word) => word[0]).slice(0, 2).join('')}</span><span><strong>{inquiry.businessName}</strong><small>{inquiry.summary}</small></span><Status value={inquiry.status} /><time>{inquiry.sentAt}</time><ChevronDown size={18} /></button>{openId === inquiry.id && <div className="request-detail"><div><MessageSquare size={18} /><span><strong>Conversation is ready</strong><small>The business can review your brief and reply inside Bharat Navya.</small></span></div><dl><div><dt>Preferred reply</dt><dd>{inquiry.contactMethod}</dd></div><div><dt>Status</dt><dd>{inquiry.status}</dd></div></dl></div>}</article>)}</div> : <div className="empty-results"><Inbox size={30} /><h2>No requests yet</h2><p>Find a business, review its evidence, and send a brief when you are ready.</p><button className="button primary" onClick={onDiscover}>Find a business</button></div>}</div>;
}

function PageHeader({ title, description, onBack, actions }: { title: string; description: string; onBack?: () => void; actions?: ReactNode }) {
  return <header className="page-header-v2"><div>{onBack && <button className="icon-button back" aria-label="Go back" onClick={onBack}><ArrowLeft size={20} /></button>}<span>{title === 'Business profile' ? <p className="page-title-v2">{title}</p> : <h1 className="page-title-v2">{title}</h1>}<p>{description}</p></span></div>{actions}</header>;
}

function TrustBadge({ level, compact = false }: { level: VerificationLevel; compact?: boolean }) {
  const Icon = level === 'evidence' ? BadgeCheck : level === 'identity' ? ShieldCheck : level === 'claimed' ? CheckCircle2 : CircleAlert;
  return <span className={`trust-badge-v2 ${level} ${compact ? 'compact' : ''}`}><Icon size={compact ? 13 : 15} />{verificationCopy[level]}</span>;
}

function Status({ value }: { value: Inquiry['status'] }) {
  return <span className={`request-status ${value.toLowerCase()}`}>{value}</span>;
}

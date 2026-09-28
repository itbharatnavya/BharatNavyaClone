import { useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Clock3,
  FileCheck2,
  LockKeyhole,
  MapPin,
  Megaphone,
  Search,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
} from 'lucide-react';
import { businesses } from '../data';
import { applications, jobs, recruiters, updates } from '../platform/platform-fixtures';
import type { View } from '../types';
import './home.css';

interface HomeExperienceProps {
  signedIn: boolean;
  onNavigate: (view: View) => void;
  onSearch: (value: string) => void;
  onAuthRequired: (reason: string) => void;
}

type ProofStoryId = 'company' | 'recruiter' | 'closure';

interface ProofStory {
  id: ProofStoryId;
  label: string;
  title: string;
  description: string;
  evidence: string[];
  meta: string;
  icon: typeof ShieldCheck;
}

const parentPrompts = [
  'GST consultant in Ahmedabad',
  'Operations manager jobs',
  'Food-safe packaging supplier',
  'Remote product design roles',
];

export function HomeExperience({ signedIn, onNavigate, onSearch, onAuthRequired }: HomeExperienceProps) {
  const [query, setQuery] = useState('');
  const [activeProofId, setActiveProofId] = useState<ProofStoryId>('company');
  const organicUpdates = updates.filter((item) => !item.sponsored).slice(0, 5);
  const [selectedUpdateId, setSelectedUpdateId] = useState(organicUpdates[0]?.id ?? '');
  const sponsored = updates.find((item) => item.sponsored);
  const selectedUpdate = organicUpdates.find((item) => item.id === selectedUpdateId) ?? organicUpdates[0];
  const featuredCompany = businesses.find((item) => item.id === 'ledgercraft') ?? businesses[0];
  const featuredJob = jobs.find((item) => item.id === 'job-ops') ?? jobs[0];
  const featuredRecruiter = recruiters.find((item) => item.id === featuredJob?.recruiterId) ?? recruiters[0];
  const featuredApplication = applications.find((item) => item.id === 'a1') ?? applications[0];

  const proofStories: ProofStory[] = [
    {
      id: 'company',
      label: 'Company proof',
      title: featuredCompany.name,
      description: 'Owner claims and checked evidence stay separate, so the profile shows what is known and what still needs verification.',
      evidence: featuredCompany.proof.slice(0, 2),
      meta: `${featuredCompany.match.updated} · ${featuredCompany.availability}`,
      icon: ShieldCheck,
    },
    {
      id: 'recruiter',
      label: 'Named recruiter',
      title: `${featuredRecruiter.name} · ${featuredRecruiter.title}`,
      description: 'Every role belongs to an authorized company workspace and a visible person responsible for the hiring process.',
      evidence: [featuredRecruiter.responseRate, featuredRecruiter.responseTime],
      meta: `${featuredRecruiter.activeJobs} active roles at ${featuredRecruiter.companyName}`,
      icon: UserRoundCheck,
    },
    {
      id: 'closure',
      label: 'Clear next step',
      title: `${featuredApplication.jobTitle} · ${featuredApplication.stage}`,
      description: 'Applicants retain a private record and can see the current stage, latest movement, and what happens next.',
      evidence: [featuredApplication.updated, featuredApplication.nextStep],
      meta: `${featuredApplication.companyName} · Application progress stays visible`,
      icon: CheckCircle2,
    },
  ];
  const activeProof = proofStories.find((story) => story.id === activeProofId) ?? proofStories[0];
  const ActiveProofIcon = activeProof.icon;

  function submit(value = query) {
    onSearch(value);
  }

  function openStory(companyName: string) {
    if (!signedIn) {
      onAuthRequired(`Join to watch the full update from ${companyName}. The preview will stay here when you return.`);
      return;
    }
    onNavigate('updates');
  }

  return <div className="parent-home">
    <section className="parent-stage" aria-labelledby="parent-home-title">
      <div className="parent-stage-main">
        <div className="parent-hero-copy">
          <span className="parent-kicker"><Sparkles size={15} /> Companies, work, and opportunity—connected</span>
          <h1 id="parent-home-title">Move your next business decision forward.</h1>
        </div>
        <div className="parent-hero-actions">
          <p>Find credible companies, useful services, and transparent startup and SME roles across India.</p>
          <form className="parent-search" onSubmit={(event) => { event.preventDefault(); submit(); }}>
            <Search size={22} aria-hidden="true" />
            <label className="sr-only" htmlFor="parent-search-input">Search companies or jobs</label>
            <input id="parent-search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try ‘GST consultant in Ahmedabad’ or ‘operations jobs’" />
            <button type="submit" aria-label="Search Bharat Navya"><ArrowRight size={20} /></button>
          </form>
          <div className="parent-prompts" aria-label="Suggested searches">
            <span>Try</span>{parentPrompts.map((prompt) => <button key={prompt} onClick={() => { setQuery(prompt); submit(prompt); }}>{prompt}</button>)}
          </div>
        </div>
      </div>

      <nav className="stage-gateways" aria-label="Browse Bharat Navya">
        <div>
          <button className="product-gateway companies-gateway" onClick={() => onNavigate('companies')} aria-label="Explore companies">
            <span className="gateway-icon"><Building2 size={23} /></span>
            <strong>Companies</strong>
          </button>
          <button className="product-gateway jobs-gateway" onClick={() => onNavigate('jobs')} aria-label="Explore jobs">
            <span className="gateway-icon"><BriefcaseBusiness size={23} /></span>
            <strong>Jobs</strong>
          </button>
        </div>
      </nav>
    </section>

    <section className="parent-proof" aria-labelledby="parent-value-title">
      <div className="proof-intro">
        <span className="section-label">Why Bharat Navya</span>
        <h2 id="parent-value-title">Confidence comes from seeing what is actually true.</h2>
        <p>Every company, role, recruiter, review, and update connects back to one accountable business identity.</p>
      </div>
      <div className="proof-story">
        <div className="proof-story-tabs" role="group" aria-label="Bharat Navya trust principles">
          {proofStories.map((story) => {
            const StoryIcon = story.icon;
            const active = story.id === activeProofId;
            return <button
              key={story.id}
              className={active ? 'active' : ''}
              aria-pressed={active}
              onClick={() => setActiveProofId(story.id)}
              onFocus={() => setActiveProofId(story.id)}
              onMouseEnter={() => setActiveProofId(story.id)}
            >
              <StoryIcon size={19} /><span><strong>{story.label}</strong><small>{story.description}</small></span><ArrowRight size={16} />
            </button>;
          })}
        </div>
        <article className="proof-artifact" aria-live="polite">
          <header><span><ActiveProofIcon size={18} /> {activeProof.label}</span><BadgeCheck size={20} /></header>
          <div><small>Accountable identity</small><h3>{activeProof.title}</h3><p>{activeProof.description}</p></div>
          <ul>{activeProof.evidence.map((item) => <li key={item}><CheckCircle2 size={16} />{item}</li>)}</ul>
          <footer><Clock3 size={15} />{activeProof.meta}</footer>
        </article>
      </div>
    </section>

    <section className="platform-journey" aria-labelledby="capabilities-title">
      <header><span>One connected journey</span><h2 id="capabilities-title">From an honest need to a useful next step.</h2><p>The platform keeps context visible while you move—from discovering an option to making a decision.</p></header>
      <ol>
        <li><span>01</span><Search size={24} /><div><h3>Describe the need</h3><p>Use everyday language or enter through Companies and Jobs.</p><small>“GST help in Ahmedabad”</small></div></li>
        <li><span>02</span><FileCheck2 size={24} /><div><h3>Judge the evidence</h3><p>See fit, proof, freshness, people, salary, and known gaps.</p><small>3 matched needs · 1 gap shown</small></div></li>
        <li><span>03</span><ArrowRight size={24} /><div><h3>Take the next step</h3><p>Save, inquire, apply, follow, and return without losing progress.</p><small>Application · Interview</small></div></li>
      </ol>
    </section>

    <section className="home-city" aria-labelledby="home-city-title">
      <header><div><span className="section-label">Your city, in motion</span><h2 id="home-city-title">Happening in Ahmedabad</h2><p>Fresh work, hiring, events, and availability from local companies—shown with a clear source and timestamp.</p></div><button className="text-arrow" onClick={() => onNavigate('updates')}>Open Updates <ArrowRight size={16} /></button></header>

      {selectedUpdate && <div className="city-pulse">
        <article className={`featured-update ${selectedUpdate.image ? 'has-image' : ''}`}>
          {selectedUpdate.image && <img src={selectedUpdate.image} alt={selectedUpdate.alt ?? ''} loading="lazy" />}
          <div className="featured-update-shade" />
          <div className="featured-update-copy">
            <span>{selectedUpdate.kind} · {selectedUpdate.age} ago</span>
            <h3>{selectedUpdate.title}</h3>
            <p>{selectedUpdate.body}</p>
            <footer><strong>{selectedUpdate.companyName}</strong><button onClick={() => openStory(selectedUpdate.companyName)}>Watch full status <LockKeyhole size={14} /></button></footer>
          </div>
        </article>

        <div className="update-selector" aria-label="Update previews in Ahmedabad">
          <header><strong>Live local signals</strong><small>Select a preview</small></header>
          {organicUpdates.map((update) => {
            const selected = update.id === selectedUpdate.id;
            return <button
              key={update.id}
              className={selected ? 'active' : ''}
              aria-label={`Preview ${update.companyName}: ${update.title}`}
              aria-pressed={selected}
              onClick={() => setSelectedUpdateId(update.id)}
              onFocus={() => setSelectedUpdateId(update.id)}
              onMouseEnter={() => setSelectedUpdateId(update.id)}
            >
              <span className="update-thumb">{update.image ? <img src={update.image} alt="" loading="lazy" /> : update.companyInitials}</span>
              <span><small>{update.kind} · {update.age} ago</small><strong>{update.companyName}</strong><em>{update.title}</em></span>
              {selected ? <CircleDot size={16} /> : <ArrowRight size={15} />}
            </button>;
          })}
          <p className="preview-rule"><LockKeyhole size={14} /> Previews are public. Join or sign in to watch a full status.</p>
        </div>
      </div>}

      <div className="city-editorial">
        <section className="city-events">
          <span className="section-label">Events and opportunities</span>
          <h3>Worth leaving your feed for</h3>
          <article><time><strong>29</strong>AUG</time><div><h4>Ahmedabad founder operations circle</h4><p>Prahlad Nagar · 6:30 PM · Small-group event</p></div><CalendarDays size={19} /></article>
          <article><time><strong>02</strong>SEP</time><div><h4>Open product critique with OrbitDesk</h4><p>Online · 5:00 PM · Designers and product teams</p></div><CalendarDays size={19} /></article>
        </section>
        <section className="city-snapshot">
          <span className="section-label">Fresh near you</span><h3>New reasons to look again</h3>
          <dl><div><dt>Verified companies</dt><dd>{businesses.filter((item) => item.verification === 'evidence' || item.verification === 'identity').length}</dd></div><div><dt>Fresh jobs</dt><dd>{jobs.filter((item) => !item.sponsored).length}</dd></div><div><dt>Live updates</dt><dd>{organicUpdates.length}</dd></div></dl>
          <button onClick={() => onNavigate('companies')}>Explore Ahmedabad <MapPin size={15} /></button>
        </section>
      </div>

      {sponsored && <article className="parent-sponsored">
        <span><Megaphone size={18} /><strong>Sponsored</strong></span><div><h3>{sponsored.title.replace(/^Sponsored:\s*/i, '')}</h3><p>{sponsored.body}</p></div><button onClick={() => openStory(sponsored.companyName)}>{sponsored.cta} <ArrowRight size={16} /></button><small>Paid placement. Verification and organic relevance are unchanged.</small>
      </article>}
    </section>

    <section className="parent-closing"><div><span className="section-label">Start with one honest question</span><h2>What are you trying to move forward?</h2><p>Explore companies, find work, or ask the Bharat Navya assistant where to begin.</p></div><div><button className="button primary large" onClick={() => onNavigate('companies')}>Discover Companies <ArrowRight size={17} /></button><button className="button secondary large" onClick={() => onNavigate('jobs')}>Find Jobs</button></div></section>
  </div>;
}

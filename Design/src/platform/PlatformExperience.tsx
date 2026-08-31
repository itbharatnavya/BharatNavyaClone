import { useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import {
  ArrowLeft, ArrowRight, BadgeCheck, BarChart3, BellRing, Bookmark, BriefcaseBusiness, Building2, CalendarDays,
  Check, CheckCircle2, ChevronDown, ChevronRight, CircleAlert, Clock3, Eye, FileCheck2, Filter, Flag, Globe2,
  Heart, Image as ImageIcon, Inbox, IndianRupee, Link2, ListFilter, MapPin, Megaphone, MessageSquare, MoreHorizontal,
  Pause, Pencil, Play, Plus, Search, Send, Settings, ShieldCheck, Sparkles, Star, Target, UserRound, UsersRound, Volume2, X,
} from 'lucide-react';
import type { View } from '../types';
import { ComponentGallery } from '../design-system/ComponentGallery';
import { PageHeader } from '../design-system/components';
import { EvidenceLedger, GuidedJourney, PathwayIndex, SearchDock, SectionHero, SectionSearch, TrustContract, useSectionSearchDock, type SectionSearchState } from '../design-system/product-home';
import { useModalBehavior } from '../design-system/useModalBehavior';
import { Advertisement, EntityLogo, MediaFrame, PersonAvatar } from '../design-system/media';
import { usePersistentState } from '../hooks/usePersistentState';
import { companyMedia, thirdPartyAds } from '../visual-fixtures';
import { applications, campaigns, candidates, jobs, recruiters, updates } from './platform-fixtures';
import type { ApplicationStage, CandidateProfile, JobPosting, StatusUpdate } from './platform-types';
import './platform.css';

interface PlatformExperienceProps {
  view: View;
  signedIn: boolean;
  selectedJobId: string;
  savedJobIds: string[];
  followedCompanyIds: string[];
  onNavigate: (view: View) => void;
  onSelectJob: (id: string) => void;
  onToggleSavedJob: (id: string) => void;
  onToggleFollow: (id: string) => void;
  onAuthRequired: (reason: string) => void;
  onNotice: (message: string) => void;
  jobQuery: string;
  setJobQuery: Dispatch<SetStateAction<string>>;
}

export function PlatformExperience(props: PlatformExperienceProps) {
  const { view } = props;
  if (view === 'jobs') return <JobsHomePage {...props} />;
  if (view === 'job-results') return <JobsPage {...props} />;
  if (view === 'job-detail') return <JobDetailPage {...props} />;
  if (view === 'updates') return <UpdatesPage {...props} />;
  if (view === 'saved') return <SavedPage {...props} />;
  if (view === 'applicant-dashboard') return <ApplicantDashboard {...props} />;
  if (view === 'applicant-profile') return <ApplicantProfile {...props} />;
  if (view === 'recruiter-dashboard') return <RecruiterDashboard {...props} />;
  if (view === 'recruiter-pipeline') return <RecruiterPipeline {...props} />;
  if (view === 'recruiter-job-editor') return <JobEditor {...props} />;
  if (view === 'component-gallery') return <ComponentGallery />;
  if (['workspace-media', 'workspace-reviews', 'workspace-updates', 'workspace-recruitment', 'workspace-team', 'workspace-promotions'].includes(view)) {
    return <WorkspaceModule {...props} />;
  }
  return null;
}

const roleFamilies = [
  { name: 'Engineering and Product', outcome: 'Build products and the systems behind them', detail: 'Engineering, product management, QA, data', icon: Sparkles, query: 'engineer product design' },
  { name: 'Sales and Marketing', outcome: 'Create demand and grow customer relationships', detail: 'Sales, growth, content, partnerships', icon: Target, query: 'sales marketing growth' },
  { name: 'Finance and Compliance', outcome: 'Keep decisions and obligations accountable', detail: 'Finance, accounting, audit, compliance', icon: IndianRupee, query: 'finance GST compliance client' },
  { name: 'Operations and Supply Chain', outcome: 'Make the business run reliably', detail: 'Operations, procurement, logistics, process', icon: Settings, query: 'operations supply chain process' },
  { name: 'HR and Administration', outcome: 'Support people and company operations', detail: 'People operations, recruiting, administration', icon: UsersRound, query: 'HR administration people operations' },
  { name: 'Design and Creative', outcome: 'Shape useful products and clear communication', detail: 'Product design, brand, content, research', icon: Sparkles, query: 'design creative product designer' },
] as const;

function JobsHomePage(props: PlatformExperienceProps) {
  const [location, setLocation] = usePersistentState('bharatnavya:job-location', 'Ahmedabad');
  const [workplace, setWorkplace] = usePersistentState('bharatnavya:job-workplace', 'All workplaces');
  const [, setRoleFamily] = usePersistentState('bharatnavya:job-role-family', 'All role families');
  const [, setExperience] = usePersistentState('bharatnavya:job-experience', 'All experience');
  const [, setMinimumSalary] = usePersistentState('bharatnavya:job-salary', 'Any salary');
  const searchDock = useSectionSearchDock();
  const organic = jobs.filter((item) => !item.sponsored);
  const fresh = organic.slice(0, 4);
  const searchState: SectionSearchState = { kind: 'jobs', query: props.jobQuery, location, workplace };

  function search(value = props.jobQuery, filters?: { roleFamily?: string; experience?: string; workplace?: string; salary?: string }) {
    props.setJobQuery(value);
    if (filters?.roleFamily) setRoleFamily(filters.roleFamily);
    if (filters?.experience) setExperience(filters.experience);
    if (filters?.workplace) setWorkplace(filters.workplace);
    if (filters?.salary) setMinimumSalary(filters.salary);
    props.onNavigate('job-results');
  }

  const sectionSearch = {
    state: searchState,
    locations: ['All locations', 'Ahmedabad', 'Bengaluru', 'Pune', 'Anywhere in India'],
    workplaces: ['All workplaces', 'On-site', 'Hybrid', 'Remote'],
    onChange: (next: SectionSearchState) => {
      if (next.kind !== 'jobs') return;
      props.setJobQuery(next.query);
      setLocation(next.location);
      setWorkplace(next.workplace);
    },
    onSubmit: () => search(),
  } as const;

  return <div className="platform-page product-home jobs-home">
    <SearchDock active={searchDock.docked} search={sectionSearch} interactionProps={searchDock.dockInteractionProps} />
    <SectionHero eyebrow="Bharat Navya Jobs" title="Find work where the context is part of the opportunity." description="Explore startup and SME roles with the pay, people, freshness, and hiring process visible before you apply.">
      <div ref={searchDock.anchorRef} className="section-hero-search-anchor" {...searchDock.heroInteractionProps} inert={searchDock.docked ? true : undefined} aria-hidden={searchDock.docked || undefined}>
        <SectionSearch {...sectionSearch} />
      </div>
      <div className="product-suggestions"><span>Popular searches</span>{['Operations jobs in Ahmedabad', 'Remote product design roles', 'Entry-level sales jobs', 'Finance roles at verified startups'].map((item) => <button key={item} onClick={() => search(item)}>{item}</button>)}</div>
    </SectionHero>

    <TrustContract label="What every normal job should tell you" items={[
      { icon: <IndianRupee size={19} />, title: 'Salary range', description: 'See the stated band before investing in an application.' },
      { icon: <UserRound size={19} />, title: 'Named recruiter', description: 'Know the accountable person associated with the company.' },
      { icon: <Clock3 size={19} />, title: 'Freshness and closure', description: 'Published, reviewed, closing, and terminal-stage context.' },
    ]} />

    <PathwayIndex title="Browse by the work you want to do" description="Role families stay familiar and predictable. Each one opens the existing result workbench with editable filters." items={roleFamilies.map(({ name, outcome, detail, icon: Icon, query }) => ({ icon: <Icon size={22} />, title: name, outcome, detail, onSelect: () => search(query, { roleFamily: name }) }))} />

    <section className="job-discovery-strips" aria-label="Job discovery shortcuts"><button onClick={() => search('remote hybrid', { workplace: 'All workplaces' })}><Globe2 size={20} /><span><strong>Remote and hybrid</strong><small>Flexible roles across India</small></span><ArrowRight size={16} /></button><button onClick={() => search('', { experience: 'Entry level' })}><Sparkles size={20} /><span><strong>Start your career</strong><small>Entry-level and associate roles</small></span><ArrowRight size={16} /></button><button onClick={() => search('', { salary: '₹6L+' })}><IndianRupee size={20} /><span><strong>Salary-transparent</strong><small>Roles with a visible pay band</small></span><ArrowRight size={16} /></button></section>

    <EvidenceLedger title="Fresh roles with decision context" description="The facts applicants need to decide whether opening a role is worth their time." action={<button className="bn-text-button" onClick={() => search('')}>Browse all jobs <ArrowRight size={16} /></button>}>
      {fresh.map((job) => <button className="evidence-ledger__row" key={job.id} onClick={() => { props.onSelectJob(job.id); props.onNavigate('job-detail'); }}><EntityLogo src={job.companyLogo} name={job.companyName} initials={job.companyInitials} /><span><strong>{job.title}</strong><small>{job.companyName} · {job.location} · {job.workplace}</small></span><span><small>{recruiters.find((item) => item.id === job.recruiterId)?.name} · closes {job.closes}</small><em><BadgeCheck size={13} />{job.salary} · {job.published}</em></span><ArrowRight size={17} /></button>)}
    </EvidenceLedger>

    <GuidedJourney title="An application should not disappear into a black box" description="The public role and the applicant record share the same accountable hiring context." steps={[
      { icon: <Eye size={20} />, title: 'Inspect the role', description: 'Review pay, recruiter, requirements, freshness, and process.' },
      { icon: <Send size={20} />, title: 'Apply with context', description: 'Answer focused questions and review before submission.' },
      { icon: <BellRing size={20} />, title: 'Follow the stage', description: 'See updates, interviews, requests, and decisions.' },
      { icon: <CheckCircle2 size={20} />, title: 'Receive closure', description: 'Withdrawals, hires, and rejections remain explicit records.' },
    ]} />

    <EvidenceLedger title="Verified companies building teams" description="Company identity and recruiter association stay connected to every role.">
      {recruiters.map((recruiter) => <button className="evidence-ledger__row" key={recruiter.id} onClick={() => search(recruiter.companyName)}><PersonAvatar src={recruiter.avatar} name={recruiter.name} initials={recruiter.initials} /><span><strong>{recruiter.companyName}</strong><small>{recruiter.name} · named recruiter</small></span><span><small>{recruiter.responseTime}</small><em><BadgeCheck size={13} />{recruiter.activeJobs} active roles</em></span><ArrowRight size={17} /></button>)}
    </EvidenceLedger>

    <section className="recruiter-updates-preview"><header><div><span className="platform-eyebrow">Recruiter updates and hiring events</span><h2>Hear what teams are hiring for now</h2></div><button className="bn-text-button" onClick={() => props.onNavigate('updates')}>Open Updates <ArrowRight size={16} /></button></header><div>{updates.filter((item) => item.kind === 'Hiring' || item.kind === 'Event').slice(0, 4).map((update) => <article key={update.id}>{update.image && <MediaFrame src={update.image} alt={update.alt ?? `${update.companyName} hiring update`} ratio="wide" />}<div className="recruiter-update-card__copy"><span>{update.kind}</span><h3>{update.title}</h3><p>{update.body}</p><small>{update.recruiterName ?? update.companyName} · {update.age} ago</small></div></article>)}</div></section>

    <Advertisement ad={thirdPartyAds.jobs} format="partner" className="product-home-ad" />

    <section className="job-home-actions"><div><UserRound size={24} /><span><strong>Let the right roles find you.</strong><small>Create a lightweight applicant profile with privacy controls.</small></span><button className="bn-button primary" onClick={() => protect(props.signedIn, 'Join to build an applicant profile and track applications.', props.onAuthRequired, () => props.onNavigate('applicant-profile'))}>Create applicant profile</button></div><div><Building2 size={24} /><span><strong>Hiring for an authorized company?</strong><small>Post with salary, freshness, and named ownership.</small></span><button className="bn-button secondary" onClick={() => protect(props.signedIn, 'Join or sign in to post from an authorized company workspace.', props.onAuthRequired, () => props.onNavigate('recruiter-job-editor'))}>Post a job</button></div></section>
  </div>;
}

function protect(signedIn: boolean, reason: string, onAuthRequired: (reason: string) => void, action: () => void) {
  if (!signedIn) return onAuthRequired(reason);
  action();
}

function PageHeading({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description: string; actions?: ReactNode }) {
  return <PageHeader className="platform-page-heading" eyebrow={eyebrow} title={title} description={description} actions={actions} />;
}

function JobsPage(props: PlatformExperienceProps) {
  const [workplace, setWorkplace] = usePersistentState('bharatnavya:job-workplace', 'All workplaces');
  const [location, setLocation] = usePersistentState('bharatnavya:job-location', 'All locations');
  const [roleFamily, setRoleFamily] = usePersistentState('bharatnavya:job-role-family', 'All role families');
  const [experience, setExperience] = usePersistentState('bharatnavya:job-experience', 'All experience');
  const [minimumSalary, setMinimumSalary] = usePersistentState('bharatnavya:job-salary', 'Any salary');
  const [companyStage, setCompanyStage] = usePersistentState('bharatnavya:job-company-stage', 'All stages');
  const [companySize, setCompanySize] = usePersistentState('bharatnavya:job-company-size', 'All sizes');
  const [verifiedOnly, setVerifiedOnly] = usePersistentState('bharatnavya:job-verified', true);
  const [selectedId, setSelectedId] = useState(props.selectedJobId || jobs[0].id);
  const terms = props.jobQuery.toLowerCase().split(/\W+/).filter((word) => word.length > 2 && !['jobs', 'job', 'roles', 'role', 'near', 'verified', 'startups'].includes(word));
  const filtered = jobs.filter((job) => {
    const workplaceMatch = workplace === 'All workplaces' || job.workplace === workplace;
    const locationMatch = location === 'All locations' || job.location.toLowerCase().includes(location.toLowerCase());
    const roleMatch = roleFamily === 'All role families' || job.roleFamily === roleFamily;
    const lowerExperience = Number.parseInt(job.experience);
    const experienceMatch = experience === 'All experience' || (experience === 'Entry level' && lowerExperience <= 2) || (experience === 'Mid level' && lowerExperience >= 3 && lowerExperience <= 4) || (experience === 'Senior' && lowerExperience >= 5);
    const lowerSalary = Number.parseInt(job.salary.match(/₹(\d+)/)?.[1] ?? '0');
    const salaryFloor = Number.parseInt(minimumSalary.match(/\d+/)?.[0] ?? '0');
    const salaryMatch = minimumSalary === 'Any salary' || lowerSalary >= salaryFloor;
    const stageMatch = companyStage === 'All stages' || job.companyStage === companyStage;
    const sizeMatch = companySize === 'All sizes' || job.companySize === companySize;
    const haystack = [job.title, job.companyName, job.location, job.workplace, job.experience, ...job.skills].join(' ').toLowerCase();
    const queryMatch = !terms.length || terms.some((term) => haystack.includes(term) || (term === 'operations' && /process|supply/.test(haystack)) || (term === 'finance' && /gst|client/.test(haystack)));
    return workplaceMatch && locationMatch && roleMatch && experienceMatch && salaryMatch && stageMatch && sizeMatch && queryMatch;
  });
  const organic = filtered.filter((job) => !job.sponsored);
  const promoted = filtered.filter((job) => job.sponsored);
  const visible = [...organic.slice(0, 4), ...promoted, ...organic.slice(4)];
  const selected = jobs.find((job) => job.id === selectedId) ?? visible[0];

  function openJob(job: JobPosting) {
    setSelectedId(job.id);
    props.onSelectJob(job.id);
  }

  return <div className="platform-page jobs-page">
    <PageHeading eyebrow="Job search" title="Find work with context, not guesswork" description="Fresh roles, named recruiters, salary bands, and clear next steps from verified companies." actions={<button className="bn-button secondary" onClick={() => protect(props.signedIn, 'Create your applicant profile to get relevant job recommendations.', props.onAuthRequired, () => props.onNavigate('applicant-dashboard'))}><UserRound size={17} />Applicant dashboard</button>} />
    <section className="job-search-panel" aria-label="Job search">
      <label className="bn-search-field"><Search size={20} /><span className="sr-only">Search jobs</span><input aria-label="Search jobs" value={props.jobQuery} onChange={(event) => props.setJobQuery(event.target.value)} placeholder="Role, skill, or company" /></label>
      <label className="bn-select-field"><MapPin size={17} /><span className="sr-only">Location</span><select aria-label="Job result location" value={location} onChange={(event) => setLocation(event.target.value)}><option>All locations</option><option>Ahmedabad</option><option>Vadodara</option><option>Bengaluru</option><option>Pune</option></select></label>
      <label className="bn-select-field"><MapPin size={17} /><span className="sr-only">Workplace</span><select aria-label="Workplace" value={workplace} onChange={(event) => setWorkplace(event.target.value)}><option>All workplaces</option><option>On-site</option><option>Hybrid</option><option>Remote</option></select></label>
      <button className="bn-button primary"><Search size={17} />Search jobs</button>
    </section>
    <fieldset className="job-filter-strip"><legend className="sr-only">Job filters</legend><span className="filter-label"><ListFilter size={16} />Filters</span><label><span className="sr-only">Role family</span><select aria-label="Role family" value={roleFamily} onChange={(event) => setRoleFamily(event.target.value)}><option>All role families</option>{roleFamilies.map((item) => <option key={item.name}>{item.name}</option>)}</select></label><label><span className="sr-only">Experience level</span><select aria-label="Experience level" value={experience} onChange={(event) => setExperience(event.target.value)}><option>All experience</option><option>Entry level</option><option>Mid level</option><option>Senior</option></select></label><label><span className="sr-only">Minimum salary</span><select aria-label="Minimum salary" value={minimumSalary} onChange={(event) => setMinimumSalary(event.target.value)}><option>Any salary</option><option>₹6L+</option><option>₹10L+</option><option>₹14L+</option></select></label><label><span className="sr-only">Company stage</span><select aria-label="Company stage" value={companyStage} onChange={(event) => setCompanyStage(event.target.value)}><option>All stages</option><option>Early-stage</option><option>Growth-stage</option><option>Established SME</option></select></label><label><span className="sr-only">Company size</span><select aria-label="Company size" value={companySize} onChange={(event) => setCompanySize(event.target.value)}><option>All sizes</option><option>1–10</option><option>11–50</option><option>51–200</option><option>201–500</option></select></label><label><input type="checkbox" checked={verifiedOnly} onChange={() => setVerifiedOnly((current) => !current)} />Verified companies</label><span className="filter-result-count">{visible.length} relevant roles</span></fieldset>
    <div className="job-workbench">
      <section className="job-result-list" aria-label="Job results">
        {visible.map((job, index) => <div className="job-result-slot" key={job.id}><JobRow job={job} active={selected?.id === job.id} saved={props.savedJobIds.includes(job.id)} onOpen={() => openJob(job)} onSave={() => protect(props.signedIn, 'Join Bharat Navya to save roles and track applications.', props.onAuthRequired, () => props.onToggleSavedJob(job.id))} organicPosition={index + 1} />{visible.slice(0, index + 1).filter((item) => !item.sponsored).length === 10 && <Advertisement ad={thirdPartyAds.jobs} format="inline" className="results-inline-ad" />}</div>)}
      </section>
      {selected && <div className="job-preview-rail"><JobPreview job={selected} saved={props.savedJobIds.includes(selected.id)} onSave={() => protect(props.signedIn, 'Join Bharat Navya to save this role.', props.onAuthRequired, () => props.onToggleSavedJob(selected.id))} onOpen={() => { props.onSelectJob(selected.id); props.onNavigate('job-detail'); }} />{organic.length >= 10 && <Advertisement ad={thirdPartyAds.jobs} format="rail" />}</div>}
    </div>
  </div>;
}

function JobRow({ job, active, saved, onOpen, onSave, organicPosition }: { job: JobPosting; active: boolean; saved: boolean; onOpen: () => void; onSave: () => void; organicPosition: number }) {
  return <article className={`job-row ${active ? 'active' : ''} ${job.sponsored ? 'sponsored' : ''}`}>
    <button className="job-row-main" onClick={onOpen} aria-pressed={active}>
      <EntityLogo src={job.companyLogo} name={job.companyName} initials={job.companyInitials} />
      <span className="job-row-copy">{job.sponsored && <small className="sponsored-label">Promoted · position {organicPosition}</small>}<strong>{job.title}</strong><span>{job.companyName} <BadgeCheck size={14} aria-label="Verified company" /></span><small><MapPin size={14} />{job.location} · {job.workplace}</small><small><IndianRupee size={14} />{job.salary} · {job.experience}</small><span className="skill-chips">{job.skills.slice(0, 3).map((skill) => <i key={skill}>{skill}</i>)}</span><small className="freshness"><Clock3 size={14} />{job.published} · {job.reviewed}</small></span>
    </button>
    <button className={`bn-icon-button ${saved ? 'selected' : ''}`} aria-label={`${saved ? 'Remove' : 'Save'} ${job.title}`} aria-pressed={saved} onClick={onSave}><Bookmark size={18} fill={saved ? 'currentColor' : 'none'} /></button>
  </article>;
}

function JobPreview({ job, saved, onSave, onOpen }: { job: JobPosting; saved: boolean; onSave: () => void; onOpen: () => void }) {
  const recruiter = recruiters.find((item) => item.id === job.recruiterId)!;
  return <aside className="job-preview" aria-label={`Preview ${job.title}`}>
    {job.sponsored && <div className="promotion-disclosure"><Megaphone size={15} /><span><strong>Promoted job</strong><small>Paid visibility does not change its verification or fit.</small></span></div>}
    <header><EntityLogo src={job.companyLogo} name={job.companyName} initials={job.companyInitials} size="large" /><div><span className="verified-line"><BadgeCheck size={15} />Verified company</span><h2>{job.title}</h2><p>{job.companyName}</p></div><button className={`bn-icon-button ${saved ? 'selected' : ''}`} onClick={onSave} aria-label={saved ? 'Remove saved job' : 'Save job'}><Bookmark size={18} fill={saved ? 'currentColor' : 'none'} /></button></header>
    {job.careersImage && <MediaFrame src={job.careersImage} alt={job.careersImageAlt ?? `${job.companyName} workplace`} ratio="wide" className="job-preview-media" />}
    <dl className="job-facts"><div><dt>Salary</dt><dd>{job.salary}</dd></div><div><dt>Workplace</dt><dd>{job.workplace}</dd></div><div><dt>Experience</dt><dd>{job.experience}</dd></div><div><dt>Closes</dt><dd>{job.closes}</dd></div></dl>
    <section><h3>Why this may fit</h3>{job.matched.map((item) => <p className="positive-line" key={item}><CheckCircle2 size={16} />{item}</p>)}{job.gaps.map((item) => <p className="warning-line" key={item}><CircleAlert size={16} />{item}</p>)}</section>
    <section><h3>Hiring contact</h3><div className="recruiter-compact"><PersonAvatar src={recruiter.avatar} name={recruiter.name} initials={recruiter.initials} /><div><strong>{recruiter.name}</strong><small>{recruiter.title} · {recruiter.companyName}</small><small>{recruiter.responseTime}</small></div><ShieldCheck size={17} aria-label="Company association verified" /></div></section>
    <button className="bn-button primary full" onClick={onOpen}>View role and apply <ArrowRight size={17} /></button>
  </aside>;
}

function JobDetailPage(props: PlatformExperienceProps) {
  const job = jobs.find((item) => item.id === props.selectedJobId) ?? jobs[0];
  const recruiter = recruiters.find((item) => item.id === job.recruiterId)!;
  const [applied, setApplied] = useState(false);
  const [answer, setAnswer] = useState('I have led weekly vendor planning across three fulfilment partners and reduced late dispatches by 18%.');
  return <div className="platform-page focused-platform-page">
    <button className="bn-back-link" onClick={() => props.onNavigate('job-results')}><ArrowLeft size={17} />Back to job results</button>
    <section className="job-detail-hero"><div><EntityLogo src={job.companyLogo} name={job.companyName} initials={job.companyInitials} size="large" /><span><span className="verified-line"><BadgeCheck size={15} />Verified company · reviewed {job.reviewed.replace('Recruiter active ', '')}</span><h1>{job.title}</h1><p>{job.companyName} · {job.location} · {job.workplace}</p><div className="detail-chip-row"><span>{job.salary}</span><span>{job.experience}</span><span>{job.employmentType}</span></div></span></div><div><button className="bn-button secondary" onClick={() => protect(props.signedIn, 'Join to save this role.', props.onAuthRequired, () => props.onToggleSavedJob(job.id))}><Bookmark size={17} />{props.savedJobIds.includes(job.id) ? 'Saved' : 'Save'}</button><button className="bn-button primary" onClick={() => protect(props.signedIn, 'Join Bharat Navya to apply and track every stage.', props.onAuthRequired, () => document.getElementById('application-form')?.scrollIntoView({ behavior: 'smooth' }))}>Apply now</button></div></section>
    {job.careersImage && <MediaFrame src={job.careersImage} alt={job.careersImageAlt ?? `${job.companyName} workplace`} ratio="wide" className="job-detail-media" />}
    <div className="job-detail-layout"><main>
      <section className="bn-section"><h2>What you will own</h2><ul className="clean-list">{job.responsibilities.map((item) => <li key={item}><Check size={16} />{item}</li>)}</ul></section>
      <section className="bn-section requirement-grid"><div><h2>Must-have</h2>{job.mustHave.map((item) => <p key={item}><CheckCircle2 size={16} />{item}</p>)}</div><div><h2>Preferred</h2>{job.preferred.map((item) => <p key={item}><Sparkles size={16} />{item}</p>)}</div></section>
      <section className="bn-section"><h2>Your visible fit</h2><p className="section-intro">Based on the prototype profile—not an opaque score.</p>{job.matched.map((item) => <p className="positive-line" key={item}><CheckCircle2 size={17} />{item}</p>)}{job.gaps.map((item) => <p className="warning-line" key={item}><CircleAlert size={17} />{item}</p>)}</section>
      <form id="application-form" className="bn-section application-form" onSubmit={(event) => { event.preventDefault(); protect(props.signedIn, 'Join Bharat Navya to submit and track this application.', props.onAuthRequired, () => { setApplied(true); props.onNotice('Application submitted. You can track it from your applicant dashboard.'); }); }}><span className="platform-eyebrow">One focused question</span><h2>Apply with context</h2><label><span>Tell the recruiter about a recent operations problem you owned.</span><textarea aria-label="Role-specific application answer" value={answer} onChange={(event) => setAnswer(event.target.value)} rows={5} required /></label><div><small>Your saved profile and résumé will be attached.</small><button className="bn-button primary" type="submit" disabled={applied}>{applied ? <><Check size={17} />Application submitted</> : <>Submit application <Send size={17} /></>}</button></div></form>
    </main><aside className="job-context-aside">
      <section><h2>Freshness</h2><p><Clock3 size={16} />Published {job.published}</p><p><Eye size={16} />{job.reviewed}</p><p><CalendarDays size={16} />Closes {job.closes}</p></section>
      <section><h2>Named recruiter</h2><div className="recruiter-card"><PersonAvatar src={recruiter.avatar} name={recruiter.name} initials={recruiter.initials} size="large" /><h3>{recruiter.name}</h3><p>{recruiter.title}</p><small><ShieldCheck size={14} />Association verified</small><small>{recruiter.responseRate}</small></div></section>
      <section><h2>Hiring process</h2><ol className="process-list"><li><span>1</span>Profile review</li><li><span>2</span>Hiring manager conversation</li><li><span>3</span>Practical discussion</li><li><span>4</span>Decision and closure</li></ol></section>
      <button className="bn-text-button"><Flag size={15} />Report this job</button>
    </aside></div>
  </div>;
}

function UpdatesPage(props: PlatformExperienceProps) {
  const [activeUpdate, setActiveUpdate] = useState<StatusUpdate | null>(null);
  return <div className="platform-page updates-page">
    <PageHeading eyebrow="Live for 24 hours" title="Updates from businesses building now" description="Hiring, work samples, availability, milestones, and events—connected to verified company profiles." actions={<button className="bn-button secondary" onClick={() => protect(props.signedIn, 'Join to publish from an authorized company workspace.', props.onAuthRequired, () => props.onNavigate('workspace-updates'))}><Plus size={17} />Publish update</button>} />
    <div className="highlight-rail" aria-label="Active company updates">{updates.filter((item) => !item.sponsored).slice(0, 6).map((update) => <button key={update.id} onClick={() => setActiveUpdate(update)}><span className="status-ring"><EntityLogo src={update.companyLogo} name={update.companyName} initials={update.companyInitials} size="small" /></span><strong>{update.companyName}</strong><small>{update.kind}</small></button>)}</div>
    <div className="updates-layout"><section className="updates-feed" aria-label="Public updates">{updates.map((update, index) => <UpdateCard key={update.id} update={update} position={index + 1} followed={props.followedCompanyIds.includes(update.companyId)} onOpen={() => setActiveUpdate(update)} onFollow={() => protect(props.signedIn, `Join to follow ${update.companyName}.`, props.onAuthRequired, () => props.onToggleFollow(update.companyId))} />)}</section><aside className="updates-context"><span className="platform-eyebrow">Why this feed is different</span><h2>Useful proof, not a social popularity contest</h2><p>Updates are ranked by freshness, relevance, verification, and the companies you follow. Paid placement is visibly labelled.</p><dl><div><dt>Active now</dt><dd>{updates.length - 1}</dd></div><div><dt>Verified publishers</dt><dd>100%</dd></div><div><dt>Sponsored</dt><dd>1</dd></div></dl><button className="bn-button secondary full" onClick={() => protect(props.signedIn, 'Join to build a followed-company feed.', props.onAuthRequired, () => props.onNotice('Your feed now prioritizes companies you follow.'))}>Personalize this feed</button></aside></div>
    {activeUpdate && <StoryViewer update={activeUpdate} onClose={() => setActiveUpdate(null)} />}
  </div>;
}

function UpdateCard({ update, position, followed, onOpen, onFollow }: { update: StatusUpdate; position: number; followed: boolean; onOpen: () => void; onFollow: () => void }) {
  return <article className={`update-card ${update.sponsored ? 'sponsored' : ''}`}>{update.sponsored && <div className="promotion-disclosure"><Megaphone size={15} /><span><strong>Sponsored update · position {position}</strong><small>Paid visibility, independently labelled.</small></span></div>}<header><button className="status-ring small" onClick={onOpen} aria-label={`View ${update.companyName} status`}><EntityLogo src={update.companyLogo} name={update.companyName} initials={update.companyInitials} size="small" /></button><span><strong>{update.companyName}</strong><small>{update.kind} · {update.age} ago · expires in {update.expiresIn}</small></span><button className="bn-text-button" onClick={onFollow}>{followed ? 'Following' : 'Follow'}</button></header>{update.image && <button className="update-image" onClick={onOpen} aria-label={`Open update: ${update.title}`}><img src={update.image} alt={update.alt ?? ''} loading="lazy" /></button>}<div className="update-copy"><span className="update-kind">{update.kind}</span><h2>{update.title}</h2><p>{update.body}</p><div><button className="bn-button secondary" onClick={onOpen}>{update.cta}</button><span><Eye size={15} />{update.views.toLocaleString()} views</span></div></div></article>;
}

function StoryViewer({ update, onClose }: { update: StatusUpdate; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [paused, setPaused] = useState(false);
  const { dialogRef } = useModalBehavior<HTMLElement>({ open: true, onClose, initialFocusRef: closeRef });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === ' ') { event.preventDefault(); setPaused((current) => !current); }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
  }, []);
  return <div className="story-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><article ref={dialogRef} className="story-viewer" role="dialog" aria-modal="true" aria-labelledby="story-title" tabIndex={-1}><div className="story-progress" aria-label={paused ? 'Status paused' : 'Status playing'}><span className={paused ? 'paused' : ''} /></div><header><span className="company-monogram">{update.companyInitials}</span><span><strong>{update.companyName}</strong><small>{update.age} ago · {update.expiresIn} left</small></span><button className="bn-icon-button" onClick={() => setPaused((current) => !current)} aria-label={paused ? 'Play status' : 'Pause status'}>{paused ? <Play size={18} /> : <Pause size={18} />}</button><button className="bn-icon-button" aria-label="Mute status"><Volume2 size={18} /></button><button ref={closeRef} className="bn-icon-button" onClick={onClose} aria-label="Close status"><X size={20} /></button></header>{update.image ? <img src={update.image} alt={update.alt ?? ''} /> : <div className="story-text-visual"><span>{update.kind}</span></div>}<footer><span className="update-kind">{update.kind}</span><h2 id="story-title">{update.title}</h2><p>{update.body}</p><button className="bn-button primary full">{update.cta}</button><small>Use Space to pause and Escape to close.</small></footer></article></div>;
}

function SavedPage(props: PlatformExperienceProps) {
  const savedJobs = jobs.filter((job) => props.savedJobIds.includes(job.id));
  return <div className="platform-page"><PageHeading title="Saved for later" description="Companies, jobs, and updates you want to return to without losing context." /><div className="saved-tabs" role="tablist" aria-label="Saved items"><button role="tab" aria-selected="true">Jobs <span>{savedJobs.length}</span></button><button role="tab" aria-selected="false">Companies <span>2</span></button><button role="tab" aria-selected="false">Updates <span>1</span></button></div>{props.signedIn ? <section className="saved-grid">{savedJobs.length ? savedJobs.map((job) => <article className="saved-item" key={job.id}><span className="company-monogram">{job.companyInitials}</span><div><span className="verified-line"><BadgeCheck size={14} />Verified company</span><h2>{job.title}</h2><p>{job.companyName} · {job.location}</p><small>{job.salary} · closes {job.closes}</small></div><button className="bn-button secondary" onClick={() => { props.onSelectJob(job.id); props.onNavigate('job-detail'); }}>Open role</button></article>) : <EmptyState icon={<Bookmark />} title="No saved jobs yet" copy="Save a role from job discovery and it will stay here with its freshness and application context." action={<button className="bn-button primary" onClick={() => props.onNavigate('jobs')}>Browse jobs</button>} />}</section> : <EmptyState icon={<Bookmark />} title="Join to keep your shortlist" copy="Save companies, roles, and updates across devices and return without rebuilding your search." action={<button className="bn-button primary" onClick={() => props.onAuthRequired('Join Bharat Navya to save and follow useful work.')}>Join Bharat Navya</button>} />}</div>;
}

function ApplicantDashboard(props: PlatformExperienceProps) {
  return <div className="platform-page dashboard-page"><PageHeading eyebrow="Personal workspace" title="Good afternoon, Amit" description="Four applications, one interview, and fresh roles from companies you follow." actions={<button className="bn-button secondary" onClick={() => props.onNavigate('applicant-profile')}><Pencil size={16} />Edit profile</button>} /><section className="dashboard-priority"><div><span className="platform-eyebrow">Next action</span><h2>Operations Manager interview</h2><p>Aroha Foods · 29 Aug at 11:30 AM · Video call</p></div><button className="bn-button primary"><CalendarDays size={17} />View interview</button></section><div className="dashboard-grid"><section className="dashboard-main"><div className="section-heading-inline"><div><h2>Applications</h2><p>Every stage remains visible, including closure.</p></div><button className="bn-text-button" onClick={() => props.onNavigate('jobs')}>Find more roles <ArrowRight size={15} /></button></div><div className="application-list">{applications.map((application) => <article key={application.id}><span className="company-monogram">{application.companyInitials}</span><div><strong>{application.jobTitle}</strong><small>{application.companyName}</small><p>{application.nextStep}</p></div><span className={`stage-badge ${application.stage.toLowerCase()}`}>{application.stage}</span><time>{application.updated}</time></article>)}</div></section><aside className="dashboard-side"><section><h2>Profile strength</h2><div className="profile-score"><strong>78</strong><span><i style={{ width: '78%' }} /></span></div><p>Add one quantified project to make your operations experience easier to assess.</p><button className="bn-button secondary full" onClick={() => props.onNavigate('applicant-profile')}>Complete profile</button></section><section><h2>Profile activity</h2><dl><div><dt>Recruiter views</dt><dd>14</dd></div><div><dt>Search appearances</dt><dd>39</dd></div><div><dt>Followed companies</dt><dd>{props.followedCompanyIds.length + 2}</dd></div></dl></section></aside></div></div>;
}

function ApplicantProfile(props: PlatformExperienceProps) {
  const [discoverable, setDiscoverable] = useState(true);
  return <div className="platform-page focused-platform-page"><PageHeading eyebrow="Applicant profile" title="Show enough proof to start a useful conversation" description="Recruiters see this profile only when you apply or allow discovery." actions={<button className="bn-button primary" onClick={() => props.onNotice('Applicant profile saved locally in this prototype.')}><Check size={17} />Save profile</button>} /><div className="profile-editor-layout"><nav className="editor-nav" aria-label="Profile sections"><button className="active">Basics</button><button>Experience</button><button>Projects</button><button>Preferences</button><button>Privacy</button></nav><form className="profile-editor"><section><h2>Professional basics</h2><div className="form-grid-2"><label><span>Headline</span><input aria-label="Headline" defaultValue="Operations lead · D2C and FMCG" /></label><label><span>Location</span><input aria-label="Location" defaultValue="Ahmedabad, Gujarat" /></label><label><span>Availability</span><select aria-label="Availability" defaultValue="30 days"><option>Immediate</option><option>15 days</option><option>30 days</option><option>60+ days</option></select></label><label><span>Expected salary</span><input aria-label="Expected salary" defaultValue="₹10L–₹12L" /></label></div></section><section><h2>Skills recruiters can verify</h2><div className="editable-chips"><span>Vendor operations <button aria-label="Remove Vendor operations"><X size={13} /></button></span><span>Inventory planning <button aria-label="Remove Inventory planning"><X size={13} /></button></span><span>FMCG <button aria-label="Remove FMCG"><X size={13} /></button></span><button><Plus size={14} />Add skill</button></div></section><section><h2>Work sample</h2><div className="upload-panel"><FileCheck2 size={24} /><div><strong>Q2 fulfilment improvement</strong><p>Reduced late dispatches from 14% to 6% across three vendor partners.</p></div><button className="bn-text-button">Edit</button></div></section><section><h2>Privacy</h2><label className="toggle-row"><span><strong>Allow verified recruiters to discover me</strong><small>Your contact details stay private until you reply.</small></span><input type="checkbox" checked={discoverable} onChange={() => setDiscoverable((current) => !current)} /></label></section></form></div></div>;
}

function RecruiterDashboard(props: PlatformExperienceProps) {
  return <div className="platform-page dashboard-page"><PageHeading eyebrow="Recruitment workspace" title="Hiring at Aroha Foods" description="Named recruiters, fresh jobs, and applicant closure in one accountable workspace." actions={<button className="bn-button primary" onClick={() => props.onNavigate('recruiter-job-editor')}><Plus size={17} />Post a job</button>} /><section className="metric-strip"><div><span>Open jobs</span><strong>3</strong><small>1 closes this week</small></div><div><span>New applicants</span><strong>12</strong><small>5 need review today</small></div><div><span>Interviews</span><strong>4</strong><small>Next: 29 Aug</small></div><div><span>Median response</span><strong>19h</strong><small>Better than last week</small></div></section><div className="dashboard-grid recruiter-grid"><section className="dashboard-main"><div className="section-heading-inline"><div><h2>Open roles</h2><p>Freshness and closure affect public distribution.</p></div><button className="bn-text-button">View all</button></div><div className="recruiter-job-list">{jobs.filter((job) => job.companyId === 'aroha').map((job) => <article key={job.id}><span className={`state-dot ${job.state.toLowerCase()}`} /><div><strong>{job.title}</strong><small>{job.location} · closes {job.closes}</small></div><dl><div><dt>Applicants</dt><dd>{job.applicantCount}</dd></div><div><dt>New</dt><dd>{job.id === 'job-ops' ? 5 : 3}</dd></div></dl><button className="bn-button secondary" onClick={() => props.onNavigate('recruiter-pipeline')}>Review candidates</button><button className="bn-icon-button" aria-label={`More actions for ${job.title}`}><MoreHorizontal size={18} /></button></article>)}</div></section><aside className="dashboard-side"><section><h2>Today’s hiring work</h2><ul className="task-list"><li><span>5</span><div><strong>Review new applicants</strong><small>Operations Manager</small></div><ChevronRight size={16} /></li><li><span>2</span><div><strong>Send interview closure</strong><small>Growth Marketing Lead</small></div><ChevronRight size={16} /></li><li><CalendarDays size={18} /><div><strong>Prepare interview</strong><small>Riya Patel · tomorrow</small></div><ChevronRight size={16} /></li></ul></section><section><h2>Applicant experience</h2><p><ShieldCheck size={16} />91% received a response</p><p><Clock3 size={16} />19h median first action</p><p><CheckCircle2 size={16} />No overdue closed roles</p></section></aside></div></div>;
}

const pipelineStages: ApplicationStage[] = ['Submitted', 'Viewed', 'Shortlisted', 'Interview'];

function RecruiterPipeline(props: PlatformExperienceProps) {
  const [records, setRecords] = useState(candidates);
  const [selected, setSelected] = useState<CandidateProfile | null>(records[0]);
  function advance(candidate: CandidateProfile) {
    const currentIndex = pipelineStages.indexOf(candidate.stage);
    const next = pipelineStages[Math.min(currentIndex + 1, pipelineStages.length - 1)];
    setRecords((items) => items.map((item) => item.id === candidate.id ? { ...item, stage: next } : item));
    setSelected({ ...candidate, stage: next });
    props.onNotice(`${candidate.name} moved to ${next}.`);
  }
  return <div className="platform-page pipeline-page"><PageHeading eyebrow="Operations Manager" title="Candidate pipeline" description="Explainable evidence and accountable decisions—without a hidden fit score." actions={<><button className="bn-button secondary"><Search size={16} />Search talent</button><button className="bn-button primary" onClick={() => props.onNavigate('recruiter-job-editor')}><Pencil size={16} />Edit job</button></>} /><div className="pipeline-toolbar"><label className="bn-search-field compact"><Search size={17} /><span className="sr-only">Search candidates</span><input aria-label="Search candidates" placeholder="Search candidates" /></label><button className="bn-button secondary"><Filter size={16} />Filters</button><span>{records.length} candidates · 2 need action</span></div><div className="pipeline-board" aria-label="Candidate stages">{pipelineStages.map((stage) => <section key={stage}><header><h2>{stage}</h2><span>{records.filter((record) => record.stage === stage).length}</span></header>{records.filter((record) => record.stage === stage).map((candidate) => <button key={candidate.id} className={selected?.id === candidate.id ? 'candidate-card active' : 'candidate-card'} onClick={() => setSelected(candidate)}><span className="candidate-avatar">{candidate.initials}</span><strong>{candidate.name}</strong><small>{candidate.headline}</small><span>{candidate.experience} · {candidate.location}</span><i><CheckCircle2 size={13} />{candidate.matched[0]}</i></button>)}</section>)}</div>{selected && <aside className="candidate-drawer" aria-label={`Candidate details for ${selected.name}`}><header><span className="candidate-avatar large">{selected.initials}</span><div><h2>{selected.name}</h2><p>{selected.headline}</p><small>{selected.location} · {selected.experience}</small></div><button className="bn-icon-button" aria-label="Close candidate details" onClick={() => setSelected(null)}><X size={18} /></button></header><dl><div><dt>Availability</dt><dd>{selected.availability}</dd></div><div><dt>Expected</dt><dd>{selected.salary}</dd></div><div><dt>Applied</dt><dd>{selected.applied}</dd></div></dl><section><h3>Evidence that fits</h3>{selected.matched.map((item) => <p className="positive-line" key={item}><CheckCircle2 size={15} />{item}</p>)}</section><section><h3>Worth clarifying</h3>{selected.gaps.map((item) => <p className="warning-line" key={item}><CircleAlert size={15} />{item}</p>)}</section><label><span>Private hiring note</span><textarea aria-label="Private hiring note" rows={4} placeholder="Visible only to the hiring team" /></label><div className="drawer-actions"><button className="bn-button secondary">Send message</button><button className="bn-button primary" onClick={() => advance(selected)}>Move forward <ArrowRight size={16} /></button></div></aside>}</div>;
}

function JobEditor(props: PlatformExperienceProps) {
  const [step, setStep] = useState(0);
  const steps = ['Role basics', 'Requirements', 'Application', 'Review'];
  return <div className="platform-page focused-platform-page"><PageHeading eyebrow="Draft job" title="Post a role candidates can evaluate" description="Salary, freshness, named ownership, and closure are part of the job—not optional polish." /><div className="job-editor-layout"><nav className="stepper-nav" aria-label="Job creation steps">{steps.map((label, index) => <button key={label} className={index === step ? 'active' : index < step ? 'complete' : ''} aria-current={index === step ? 'step' : undefined} onClick={() => setStep(index)}><span>{index < step ? <Check size={15} /> : index + 1}</span><strong>{label}</strong></button>)}</nav><form className="job-editor-form" onSubmit={(event) => { event.preventDefault(); if (step < steps.length - 1) setStep((value) => value + 1); else { props.onNotice('Job submitted for prototype review.'); props.onNavigate('recruiter-dashboard'); } }}><span className="platform-eyebrow">Step {step + 1} of {steps.length}</span>{step === 0 && <><h2>Role basics</h2><div className="form-grid-2"><label><span>Job title</span><input aria-label="Job title" defaultValue="Operations Manager" required /></label><label><span>Workplace</span><select aria-label="Workplace" defaultValue="On-site"><option>On-site</option><option>Hybrid</option><option>Remote</option></select></label><label><span>Location</span><input aria-label="Location" defaultValue="Ahmedabad, Gujarat" required /></label><label><span>Employment type</span><select aria-label="Employment type" defaultValue="Full-time"><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option></select></label><label><span>Salary from</span><input aria-label="Salary from" defaultValue="₹8L" required /></label><label><span>Salary to</span><input aria-label="Salary to" defaultValue="₹11L" required /></label></div></>}{step === 1 && <><h2>Requirements</h2><label><span>Responsibilities</span><textarea aria-label="Responsibilities" rows={6} defaultValue={'Own weekly production planning\nCoordinate vendors and quality checks\nImprove fulfilment reliability'} /></label><label><span>Must-have skills</span><input aria-label="Must-have skills" defaultValue="Vendor operations, Inventory planning, Advanced Excel" /></label><p className="editor-guidance"><CircleAlert size={17} />Keep flexible requirements out of must-have filters so qualified candidates are not silently hidden.</p></>}{step === 2 && <><h2>Application and ownership</h2><label><span>One focused application question</span><textarea aria-label="Focused application question" rows={4} defaultValue="Tell us about a recent operations problem you owned and what changed." /></label><label><span>Assigned recruiter</span><select aria-label="Assigned recruiter" defaultValue="Neha Iyer"><option>Neha Iyer · Talent Lead</option></select></label><label><span>Closing date</span><input aria-label="Closing date" type="date" defaultValue="2026-09-12" /></label></>}{step === 3 && <><h2>Review before submitting</h2><div className="review-checklist"><p><CheckCircle2 size={17} /><span><strong>Salary band is visible</strong><small>₹8L–₹11L</small></span></p><p><CheckCircle2 size={17} /><span><strong>Named recruiter</strong><small>Neha Iyer · association verified</small></span></p><p><CheckCircle2 size={17} /><span><strong>Freshness controls</strong><small>Closes 12 Sep · review reminder after 7 days</small></span></p><p><ShieldCheck size={17} /><span><strong>Normal distribution eligible</strong><small>Required transparency fields are complete.</small></span></p></div></>}<div className="editor-actions"><button type="button" className="bn-button secondary" onClick={() => step === 0 ? props.onNavigate('recruiter-dashboard') : setStep((value) => value - 1)}>Back</button><button className="bn-button primary" type="submit">{step === steps.length - 1 ? 'Submit for review' : 'Save and continue'} <ArrowRight size={16} /></button></div></form></div></div>;
}

function WorkspaceModule(props: PlatformExperienceProps) {
  if (props.view === 'workspace-media') return <MediaWorkspace {...props} />;
  if (props.view === 'workspace-reviews') return <ReviewsWorkspace {...props} />;
  if (props.view === 'workspace-updates') return <UpdatesWorkspace {...props} />;
  if (props.view === 'workspace-recruitment') return <RecruitmentWorkspace {...props} />;
  if (props.view === 'workspace-team') return <TeamWorkspace {...props} />;
  return <PromotionsWorkspace {...props} />;
}

function WorkspaceHeader({ title, copy, action }: { title: string; copy: string; action?: ReactNode }) {
  return <PageHeading eyebrow="Aroha Foods · company workspace" title={title} description={copy} actions={action} />;
}

function MediaWorkspace(props: PlatformExperienceProps) {
  const media = [
    [companyMedia.aroha.cover, companyMedia.aroha.coverAlt, 'Workplace'],
    [companyMedia.aroha.careers, companyMedia.aroha.careersAlt, 'Team'],
    [companyMedia.packwise.cover, companyMedia.packwise.coverAlt, 'Workplace'],
    [companyMedia.aroha.work, companyMedia.aroha.workAlt, 'Work samples'],
  ];
  return <div className="platform-page"><WorkspaceHeader title="Media library" copy="Show the workplace, people, and work behind the company profile." action={<button className="bn-button primary" onClick={() => props.onNotice('Upload state opened in this prototype.')}><Plus size={17} />Add media</button>} /><div className="media-toolbar"><span>{media.length} assets</span><button className="bn-button secondary"><Filter size={16} />All categories</button><button className="bn-button secondary">Reorder gallery</button></div><section className="media-grid">{media.map(([src, alt, category]) => <article key={src}><img src={src} alt={alt} /><div><span>{category}</span><button className="bn-icon-button" aria-label={`Edit ${alt}`}><Pencil size={16} /></button></div></article>)}</section></div>;
}

function ReviewsWorkspace(props: PlatformExperienceProps) {
  return <div className="platform-page"><WorkspaceHeader title="Reviews" copy="Verified interactions carry more weight, and every response remains accountable." action={<button className="bn-button primary" onClick={() => props.onNotice('A review-request link was prepared.')}>Request a review</button>} /><section className="review-summary-panel"><div><strong>4.8</strong><span>{[1,2,3,4,5].map((item) => <Star key={item} size={16} fill="currentColor" />)}</span><small>28 verified interactions</small></div><dl><div><dt>Quality</dt><dd>4.9</dd></div><div><dt>Communication</dt><dd>4.8</dd></div><div><dt>Value</dt><dd>4.6</dd></div><div><dt>Reliability</dt><dd>4.8</dd></div></dl></section><section className="workspace-review-list"><article><header><span className="candidate-avatar">MS</span><div><strong>Meera Shah</strong><small>Nori Foods · verified client engagement</small></div><span className="rating-inline"><Star size={15} fill="currentColor" />5.0</span></header><p>Clear milestones, practical material guidance, and no surprises in the pilot quote.</p><div className="owner-response"><strong>Response from Aroha Foods</strong><p>Thank you, Meera. We appreciated the clear pilot brief and are glad the material review helped.</p></div><footer><time>18 Aug 2026</time><button className="bn-text-button"><Flag size={14} />Report</button><button className="bn-text-button"><Pencil size={14} />Edit response</button></footer></article><article><header><span className="candidate-avatar">AK</span><div><strong>Arjun Khanna</strong><small>Verified inquiry · engagement not confirmed</small></div><span className="rating-inline"><Star size={15} fill="currentColor" />4.0</span></header><p>The first response was helpful. Final availability took a little longer to confirm.</p><footer><time>7 Aug 2026</time><button className="bn-button secondary">Respond</button></footer></article></section></div>;
}

function UpdatesWorkspace(props: PlatformExperienceProps) {
  const [kind, setKind] = useState('Hiring');
  const [title, setTitle] = useState('We are building our first operations leadership team');
  return <div className="platform-page"><WorkspaceHeader title="Updates and highlights" copy="Publish useful 24-hour updates and preserve selected proof in permanent highlights." action={<button className="bn-button secondary" onClick={() => props.onNavigate('updates')}><Eye size={17} />View public feed</button>} /><div className="updates-workspace-layout"><form className="status-composer" onSubmit={(event) => { event.preventDefault(); props.onNotice('Update published for 24 hours in this prototype.'); }}><span className="platform-eyebrow">New 24-hour update</span><h2>Share what changed</h2><label><span>Update type</span><select aria-label="Update type" value={kind} onChange={(event) => setKind(event.target.value)}><option>Hiring</option><option>Work sample</option><option>Milestone</option><option>Availability</option><option>Event</option><option>Offer</option></select></label><label><span>Headline</span><input aria-label="Update headline" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={90} /><small>{title.length}/90</small></label><label><span>Details</span><textarea aria-label="Update details" rows={5} defaultValue="Three Ahmedabad roles are now open with salary bands and a two-stage interview process." /></label><div className="composer-media"><button type="button"><ImageIcon size={18} />Add image</button><button type="button"><Link2 size={18} />Add link</button><button type="button"><BriefcaseBusiness size={18} />Attach job</button></div><label><span>Image description</span><input aria-label="Image description" defaultValue="A small operations team planning around a table" /></label><button className="bn-button primary full" type="submit">Publish for 24 hours <Send size={16} /></button></form><aside><section className="live-status-panel"><div><span className="status-ring"><i>AF</i></span><span><strong>1 update live</strong><small>Expires in 23h</small></span></div><h2>{updates[0].title}</h2><dl><div><dt>Views</dt><dd>438</dd></div><div><dt>Profile visits</dt><dd>61</dd></div><div><dt>Job opens</dt><dd>24</dd></div></dl><button className="bn-button secondary full">Save to highlight</button></section><section className="highlight-manager"><h2>Highlights</h2>{['Life at Aroha', 'Client work', 'Open roles'].map((item, index) => <button key={item}><span>{index + 1}</span><strong>{item}</strong><small>{index === 0 ? '4 updates' : '2 updates'}</small><MoreHorizontal size={16} /></button>)}</section></aside></div></div>;
}

function RecruitmentWorkspace(props: PlatformExperienceProps) {
  return <div className="platform-page"><WorkspaceHeader title="Recruitment" copy="Jobs, candidates, recruiters, and response expectations connected to the company identity." action={<button className="bn-button primary" onClick={() => props.onNavigate('recruiter-job-editor')}><Plus size={17} />Post a job</button>} /><div className="workspace-shortcuts"><button onClick={() => props.onNavigate('recruiter-dashboard')}><BarChart3 size={22} /><span><strong>Recruiter dashboard</strong><small>Jobs, priorities, and applicant experience</small></span><ArrowRight size={17} /></button><button onClick={() => props.onNavigate('recruiter-pipeline')}><UsersRound size={22} /><span><strong>Candidate pipeline</strong><small>Five applicants for Operations Manager</small></span><ArrowRight size={17} /></button><button><UserRound size={22} /><span><strong>Recruiter profiles</strong><small>Three authorized hiring contacts</small></span><ArrowRight size={17} /></button><button><MessageSquare size={22} /><span><strong>Templates and interviews</strong><small>Closure, scheduling, and follow-up</small></span><ArrowRight size={17} /></button></div></div>;
}

function TeamWorkspace(props: PlatformExperienceProps) {
  const members = [['AP','Amit Patel','Owner','Full access'],['NI','Neha Iyer','Recruiter','Jobs and candidates'],['KS','Kavya Shah','Content manager','Profile and updates'],['RM','Rohit Mehta','Analyst','View analytics']];
  return <div className="platform-page"><WorkspaceHeader title="Team and permissions" copy="Every public action remains tied to an accountable person and authorized company role." action={<button className="bn-button primary" onClick={() => props.onNotice('Invite form opened in this prototype.')}><Plus size={17} />Invite member</button>} /><section className="team-list"><div className="team-list-head"><span>Member</span><span>Role</span><span>Access</span><span>Status</span><span /></div>{members.map(([initials,name,role,access]) => <article key={name}><span className="candidate-avatar">{initials}</span><div><strong>{name}</strong><small>{name.toLowerCase().replace(' ','@')}.in</small></div><span>{role}</span><span>{access}</span><span className="stage-badge live">Active</span><button className="bn-icon-button" aria-label={`Manage ${name}`}><MoreHorizontal size={17} /></button></article>)}</section></div>;
}

function PromotionsWorkspace(props: PlatformExperienceProps) {
  return <div className="platform-page"><WorkspaceHeader title="Promotion centre" copy="Paid visibility is clearly labelled and never changes verification, reviews, or organic fit." action={<button className="bn-button primary" onClick={() => props.onNotice('Campaign setup opened in this prototype.')}><Plus size={17} />Create campaign</button>} /><div className="promotion-policy"><ShieldCheck size={20} /><div><strong>Eligible to promote</strong><p>Identity verified · profile 82% complete · information reviewed 8 days ago.</p></div><button className="bn-text-button">View placement policy</button></div><section className="campaign-list"><header><span>Campaign</span><span>Type</span><span>Audience</span><span>Budget</span><span>Results</span><span>Status</span></header>{campaigns.map((campaign) => <article key={campaign.id}><div><strong>{campaign.name}</strong><small>Paid visibility only</small></div><span>{campaign.kind}</span><span>{campaign.audience}</span><span>{campaign.budget}</span><span><strong>{campaign.impressions}</strong><small>{campaign.actions}</small></span><span className={`stage-badge ${campaign.status.toLowerCase().replace(' ','-')}`}>{campaign.status}</span></article>)}</section><section className="placement-map"><span className="platform-eyebrow">Reserved inventory</span><h2>Where promotions may appear</h2><div><p><strong>Company discovery</strong><small>After 3 organic results, then no more than 1 per 8.</small></p><p><strong>Job discovery</strong><small>After 4 organic roles, then no more than 1 per 10.</small></p><p><strong>Updates feed</strong><small>After 5 organic updates, then no more than 1 per 10.</small></p></div><small>No promotion inventory exists inside profiles, comparison, inquiry, application, messages, reviews, or recruiter pipelines.</small></section></div>;
}

function EmptyState({ icon, title, copy, action }: { icon: ReactNode; title: string; copy: string; action: ReactNode }) {
  return <div className="platform-empty">{icon}<h2>{title}</h2><p>{copy}</p>{action}</div>;
}

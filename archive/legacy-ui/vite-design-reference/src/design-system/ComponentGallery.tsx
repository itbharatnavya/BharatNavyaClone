import { useState } from 'react';
import { ArrowRight, BadgeCheck, Bookmark, Building2, Clock3, FileCheck2, Search, Star } from 'lucide-react';
import { Badge, Button, CheckboxField, DataList, Dialog, Field, IconButton, Notice, PageHeader, Panel, ProgressBar, RadioGroup, SelectField, Skeleton, StatePanel, TextareaField } from './components';
import { GuidedJourney, PathwayIndex, SectionSearch, TrustContract, type SectionSearchState } from './product-home';
import { Advertisement, EntityLogo, MediaFrame, MediaRecord, MediaStrip, PersonAvatar } from './media';
import { thirdPartyAds } from '../visual-fixtures';

const tokenGroups = [
  ['Colour', 'Canvas, surface, text, action, trust, warning, danger, sponsored'],
  ['Type', 'Display, page title, section title, body, label, metadata'],
  ['Space', '4px primitive scale with semantic control, panel and section aliases'],
  ['Shape', 'Control, field, panel and round radius roles'],
  ['Motion', 'Fast, normal and slow durations with reduced-motion overrides'],
  ['Layout', 'Page gutters, containers, breakpoints and responsive density'],
];

export function ComponentGallery() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [accountContext, setAccountContext] = useState('personal');
  const [gallerySearch, setGallerySearch] = useState<SectionSearchState>({ kind: 'companies', query: 'GST filing support', location: 'Ahmedabad' });

  return (
    <div className="platform-page component-gallery-page">
      <PageHeader
        eyebrow="Design system · v1.4.0"
        title="Bharat Navya component contract"
        description="The live source of truth for foundations, interaction states, composition patterns and product-specific UI. Every new section starts here."
        actions={<Button variant="secondary" onClick={() => document.getElementById('patterns')?.scrollIntoView()}>View page patterns</Button>}
      />

      <section className="gallery-section" aria-labelledby="foundations-title">
        <h2 id="foundations-title">Foundations</h2>
        <div className="token-swatches" aria-label="Semantic colour tokens">
          <span className="canvas">Canvas</span><span className="surface">Surface</span><span className="action">Action</span><span className="trust">Trust</span><span className="warning">Warning</span><span className="danger">Danger</span><span className="sponsored">Sponsored</span>
        </div>
        <DataList label="Foundation token groups" headers={['System', 'Contract']} rows={tokenGroups.map(([name, contract]) => [<strong>{name}</strong>, contract])} />
      </section>

      <section className="gallery-section" aria-labelledby="media-title">
        <h2 id="media-title">Identity, media and advertising</h2>
        <p>Images provide evidence or identification. Fixed ratios reserve space before loading, and every component has a governed missing-media fallback.</p>
        <div className="gallery-row">
          <EntityLogo src="/seed-media/logos/company-1.svg" name="LedgerCraft Advisory" initials="LC" />
          <EntityLogo name="Missing media example" initials="MM" />
          <PersonAvatar src="/seed-media/people/person-1.jpg" name="Neha Iyer" initials="NI" />
          <PersonAvatar name="Portrait unavailable" initials="PA" />
        </div>
        <MediaStrip label="Media ratio examples" items={[
          { src: '/seed-media/work/work-1.jpg', alt: 'Team reviewing a prototype at a shared table', label: 'Work sample' },
          { src: '/seed-media/company/company-1.jpg', alt: 'Company team working in a bright office', label: 'Workplace' },
          { alt: 'Unavailable media example', label: 'Missing-media state' },
        ]} />
        <MediaRecord media={{ src: '/seed-media/work/work-2.jpg', alt: 'Packaging prototypes prepared for review' }} action={<Button size="small" variant="secondary">Inspect proof</Button>}><span className="ds-eyebrow">Evidence record</span><h3>Food-safe packaging pilot</h3><p>Stable media, resilient copy and one contextual action.</p></MediaRecord>
        <div className="gallery-ad-grid">
          <Advertisement ad={thirdPartyAds.companies} format="partner" />
          <Advertisement ad={thirdPartyAds.jobs} format="inline" />
          <Advertisement ad={thirdPartyAds.general} format="rail" />
          <Advertisement ad={thirdPartyAds.general} format="inline" blocked />
        </div>
      </section>

      <section className="gallery-section" aria-labelledby="controls-title">
        <h2 id="controls-title">Controls and their states</h2>
        <div className="gallery-row">
          <Button trailingIcon={<ArrowRight size={16} />}>Primary action</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="quiet">Quiet action</Button>
          <Button variant="danger">Destructive</Button>
          <Button loading>Saving</Button>
          <Button disabled>Disabled</Button>
          <IconButton label="Save example"><Bookmark size={18} /></IconButton>
        </div>
        <div className="gallery-form-grid">
          <Field label="Search" placeholder="Search companies or roles" leadingIcon={<Search size={17} />} hint="Results update after submission." />
          <Field label="Email address" type="email" defaultValue="amit@example.com" />
          <Field label="Company website" defaultValue="not-a-url" error="Enter a complete website address." />
          <Field label="Disabled field" defaultValue="Managed by your company" disabled />
          <SelectField label="Application stage" defaultValue="review" hint="Changing the stage should always create a history record.">
            <option value="new">New</option><option value="review">In review</option><option value="interview">Interview</option>
          </SelectField>
          <TextareaField label="Private note" placeholder="Add context for authorized teammates" hint="Private notes are never visible to applicants." />
          <CheckboxField label="Email me when the applicant replies" defaultChecked hint="Notification preferences remain reversible." />
          <RadioGroup
            legend="Default workspace"
            name="gallery-workspace"
            value={accountContext}
            onChange={setAccountContext}
            options={[
              { value: 'personal', label: 'Personal', description: 'Applications and saved companies' },
              { value: 'company', label: 'Company', description: 'Profile, inquiries and recruitment' },
            ]}
          />
        </div>
      </section>

      <section className="gallery-section" aria-labelledby="feedback-title">
        <h2 id="feedback-title">Feedback, progress and overlays</h2>
        <div className="gallery-state-grid">
          <Notice title="Profile draft saved">Your changes are stored locally until you publish.</Notice>
          <Notice tone="success" title="Application submitted">The applicant can now track a durable submission record.</Notice>
          <Notice tone="warning" title="Role closes soon">Explain the deadline without creating artificial urgency.</Notice>
          <Notice tone="error" title="Upload failed" action={<Button size="small" variant="secondary">Try again</Button>}>Keep the selected file and provide a safe retry.</Notice>
        </div>
        <Panel>
          <span className="ds-eyebrow">Stable loading layout</span>
          <h3>Record placeholder</h3>
          <Skeleton lines={4} />
        </Panel>
        <Panel>
          <span className="ds-eyebrow">Semantic progress</span>
          <h3>Profile readiness</h3>
          <ProgressBar label="Company profile readiness" value={82} valueText="82 percent complete" />
        </Panel>
        <div className="gallery-row">
          <Button variant="secondary" onClick={() => setDialogOpen(true)}>Open dialog example</Button>
        </div>
        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          title="Pause this job?"
          description="Applicants can still see their existing application, but new applications will stop."
          actions={<><Button variant="secondary" onClick={() => setDialogOpen(false)}>Keep active</Button><Button variant="danger" onClick={() => setDialogOpen(false)}>Pause job</Button></>}
        >
          <Notice tone="warning" title="This action is reversible">The job can be made active again from jobs management.</Notice>
        </Dialog>
      </section>

      <section className="gallery-section" aria-labelledby="meaning-title">
        <h2 id="meaning-title">Trust, status and meaning</h2>
        <div className="gallery-row">
          <Badge tone="trust"><BadgeCheck size={13} /> Evidence verified</Badge>
          <Badge tone="action">Interview</Badge>
          <Badge tone="warning">Needs review</Badge>
          <Badge tone="danger">Rejected</Badge>
          <Badge tone="sponsored">Sponsored</Badge>
          <span className="rating-inline"><Star size={15} fill="currentColor" />4.8</span>
        </div>
        <div className="gallery-state-grid">
          <StatePanel tone="empty" title="Nothing here yet" description="Use an explicit first action instead of leaving a blank surface." />
          <StatePanel tone="loading" title="Loading records" description="Keep the page structure stable while data is requested." />
          <StatePanel tone="error" title="Records could not load" description="Explain what failed and provide a safe retry." action={<Button size="small" variant="secondary">Try again</Button>} />
          <StatePanel tone="restricted" title="Company access required" description="Explain the required role without exposing private information." />
          <StatePanel tone="success" title="Changes saved" description="Confirm the durable outcome and the next useful action." />
        </div>
      </section>

      <section className="gallery-section gallery-product-home" aria-labelledby="product-home-patterns-title">
        <h2 id="product-home-patterns-title">Product-home discovery patterns</h2>
        <p>Hero and docked searches share one state contract. Trust, pathways, records, and journeys stay reusable across Companies and Jobs.</p>
        <Panel className="gallery-search-stage">
          <SectionSearch state={gallerySearch} locations={['Ahmedabad', 'Gandhinagar', 'Anywhere in India']} onChange={setGallerySearch} onSubmit={() => undefined} />
          <div className="gallery-compact-search"><span>Compact header state</span><SectionSearch state={gallerySearch} locations={['Ahmedabad', 'Gandhinagar', 'Anywhere in India']} variant="compact" onChange={setGallerySearch} onSubmit={() => undefined} /></div>
        </Panel>
        <TrustContract label="Trust contract" items={[
          { icon: <Building2 size={18} />, title: 'Claimed company', description: 'Managed by an authorized member.' },
          { icon: <BadgeCheck size={18} />, title: 'Identity verified', description: 'Core identity has been checked.' },
          { icon: <FileCheck2 size={18} />, title: 'Evidence verified', description: 'Proof supports a specific claim.' },
        ]} />
        <PathwayIndex title="Recognizable pathways" description="Stable taxonomy paired with plain-language outcomes." items={[
          { icon: <FileCheck2 size={20} />, title: 'Finance, Legal and Compliance', outcome: 'Register, file, and stay compliant', detail: 'GST, accounting, legal, registrations', onSelect: () => undefined },
          { icon: <Building2 size={20} />, title: 'Manufacturing and Suppliers', outcome: 'Source, make, and package', detail: 'Materials, packaging, production', onSelect: () => undefined },
        ]} />
        <GuidedJourney title="A real four-step journey" description="Numbers and arrows are reserved for genuinely ordered processes." steps={[
          { icon: <Search size={18} />, title: 'Describe', description: 'Begin in familiar language.' },
          { icon: <FileCheck2 size={18} />, title: 'Inspect', description: 'Review proof and gaps.' },
          { icon: <Bookmark size={18} />, title: 'Shortlist', description: 'Keep useful records.' },
          { icon: <Clock3 size={18} />, title: 'Track', description: 'Retain the outcome.' },
        ]} />
      </section>

      <section id="patterns" className="gallery-section" aria-labelledby="patterns-title">
        <h2 id="patterns-title">Approved page-composition patterns</h2>
        <div className="gallery-pattern-grid">
          {[
            ['Public landing', 'Focused promise → primary task → evidence → pathways → closing action'],
            ['Product home', 'Promise → search → trust contract → recognizable pathways → records → guided proof → participation'],
            ['Search and results', 'Query context → optional refinement → list → selected detail → decision context'],
            ['Entity profile', 'Identity and trust → evidence → sections → contextual action'],
            ['Multi-step form', 'Purpose → progress → one decision group → review → outcome'],
            ['Dashboard overview', 'Urgent work → current state → recent activity → secondary management'],
            ['List and detail', 'Search/filter → responsive records → selected record → accountable actions'],
            ['Pipeline', 'Scope and filters → stages → record drawer → explicit status change'],
            ['Admin queue', 'Operational context → filters → dense records → evidence → confirmed action'],
          ].map(([title, description]) => <Panel key={title}><span className="ds-eyebrow">Pattern</span><h3>{title}</h3><p>{description}</p></Panel>)}
        </div>
      </section>

      <section className="gallery-section" aria-labelledby="rules-title">
        <h2 id="rules-title">Non-negotiable usage rules</h2>
        <ul className="clean-list">
          <li><BadgeCheck size={16} />Use semantic or component tokens; raw visual values require a documented exception.</li>
          <li><BadgeCheck size={16} />Use cobalt only for action and current state.</li>
          <li><BadgeCheck size={16} />Pair every status colour with text or an icon.</li>
          <li><BadgeCheck size={16} />Label native paid placement “Sponsored” and third-party inventory “Advertisement”.</li>
          <li><BadgeCheck size={16} />Never place advertising in profiles, applications, messages, dashboards, workspaces, billing or moderation decisions.</li>
          <li><BadgeCheck size={16} />Prefer rows and sections over nested card grids.</li>
          <li><BadgeCheck size={16} />Keep every interactive target at least 44px.</li>
          <li><BadgeCheck size={16} />Ship component, documentation, decision log and gallery updates together.</li>
        </ul>
      </section>
    </div>
  );
}

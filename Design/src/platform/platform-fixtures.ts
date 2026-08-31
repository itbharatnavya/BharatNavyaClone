import type { ApplicationRecord, CandidateProfile, JobPosting, PromotionCampaign, RecruiterProfile, StatusUpdate } from './platform-types';
import { companyMedia, peopleMedia } from '../visual-fixtures';

function seededJob(input: Pick<JobPosting, 'id' | 'title' | 'companyId' | 'companyName' | 'companyInitials' | 'recruiterId' | 'roleFamily'> & Partial<JobPosting>): JobPosting {
  const media = companyMedia[input.companyId];
  return {
    location: 'Ahmedabad, Gujarat', workplace: 'Hybrid', employmentType: 'Full-time', salary: '₹7L–₹10L', experience: '2–5 years',
    companyStage: 'Growth-stage', companySize: '11–50', skills: ['Collaboration', 'Problem solving', 'Clear communication'],
    mustHave: ['Relevant practical experience', 'Clear written communication'], preferred: ['Startup or SME experience'],
    responsibilities: ['Own a clear operating outcome', 'Work across a small accountable team', 'Document decisions and follow-through'],
    matched: ['Relevant experience is visible', 'Location matches your preferences'], gaps: ['One role-specific example needs clarification'],
    published: '3 days ago', reviewed: 'Recruiter active today', closes: '24 Sep 2026', applicantCount: 12, state: 'Live',
    companyLogo: media?.logo, careersImage: media?.careers, careersImageAlt: media?.careersAlt,
    ...input,
  };
}

export const recruiters: RecruiterProfile[] = ([
  {
    id: 'r-neha', name: 'Neha Iyer', title: 'Talent Lead', companyId: 'aroha', companyName: 'Aroha Foods', initials: 'NI', verified: true,
    responseTime: 'Usually within 1 day', responseRate: 'Replies to 91% of applicants', activeJobs: 3,
    summary: 'Building Aroha’s early operations, growth, and product teams across Ahmedabad and Bengaluru.',
  },
  {
    id: 'r-rahul', name: 'Rahul Mehta', title: 'Founder & hiring manager', companyId: 'ledgercraft', companyName: 'LedgerCraft Tax Advisors LLP', initials: 'RM', verified: true,
    responseTime: 'Usually within 2 days', responseRate: 'Replies to 84% of applicants', activeJobs: 2,
    summary: 'Hiring client-facing operators who can make compliance simpler for growing businesses.',
  },
  {
    id: 'r-sana', name: 'Sana Sheikh', title: 'People Operations', companyId: 'packwise', companyName: 'Packwise Materials', initials: 'SS', verified: true,
    responseTime: 'Usually within 8 hours', responseRate: 'Replies to 95% of applicants', activeJobs: 4,
    summary: 'Helping a sustainable materials company grow its manufacturing and commercial teams.',
  },
  { id: 'r-aditi', name: 'Aditi Menon', title: 'Head of People', companyId: 'orbit', companyName: 'OrbitDesk', initials: 'AM', verified: true, responseTime: 'Usually within 2 days', responseRate: 'Replies to 88% of applicants', activeJobs: 3, summary: 'Building product and engineering teams for a workflow software company.' },
  { id: 'r-vikram', name: 'Vikram Sethi', title: 'Plant Talent Partner', companyId: 'brightforge', companyName: 'BrightForge Components', initials: 'VS', verified: true, responseTime: 'Usually within 1 day', responseRate: 'Replies to 89% of applicants', activeJobs: 2, summary: 'Hiring quality, production, and commercial talent for precision manufacturing.' },
  { id: 'r-meera', name: 'Meera Nair', title: 'People Partner', companyId: 'pixelharbor', companyName: 'PixelHarbor Studio', initials: 'MN', verified: true, responseTime: 'Usually within 1 day', responseRate: 'Replies to 94% of applicants', activeJobs: 2, summary: 'Growing a multidisciplinary product and brand studio.' },
  { id: 'r-kabir', name: 'Kabir Arora', title: 'Operations Recruiter', companyId: 'routegrid', companyName: 'RouteGrid Logistics', initials: 'KA', verified: true, responseTime: 'Usually within 8 hours', responseRate: 'Replies to 92% of applicants', activeJobs: 2, summary: 'Hiring regional operations and fulfilment teams across western India.' },
  { id: 'r-tara', name: 'Tara Bose', title: 'Talent Advisor', companyId: 'peoplemint', companyName: 'PeopleMint Advisory', initials: 'TB', verified: true, responseTime: 'Usually within 1 day', responseRate: 'Replies to 90% of applicants', activeJobs: 2, summary: 'Building consulting and people-operations teams for growing companies.' },
] satisfies RecruiterProfile[]).map((recruiter) => ({ ...recruiter, avatar: peopleMedia[recruiter.id], companyLogo: companyMedia[recruiter.companyId]?.logo }));

export const jobs: JobPosting[] = ([
  {
    id: 'job-ops', title: 'Operations Manager', companyId: 'aroha', companyName: 'Aroha Foods', companyInitials: 'AF', recruiterId: 'r-neha',
    location: 'Ahmedabad, Gujarat', workplace: 'On-site', employmentType: 'Full-time', salary: '₹8L–₹11L', experience: '4–7 years', roleFamily: 'Operations and Supply Chain', companyStage: 'Growth-stage', companySize: '51–200',
    skills: ['Vendor operations', 'FMCG', 'Inventory planning', 'Excel'], mustHave: ['4+ years in operations', 'Vendor coordination', 'Advanced spreadsheets'],
    preferred: ['Food or FMCG experience', 'ERP exposure'], responsibilities: ['Own weekly production planning', 'Coordinate vendors and quality checks', 'Improve fulfilment reliability'],
    matched: ['Your operations experience meets the requirement', 'Ahmedabad is inside your preferred locations'], gaps: ['FMCG experience is not shown on your profile'],
    published: '2 days ago', reviewed: 'Recruiter active 3 hours ago', closes: '12 Sep 2026', applicantCount: 18, state: 'Live',
  },
  {
    id: 'job-growth', title: 'Growth Marketing Lead', companyId: 'aroha', companyName: 'Aroha Foods', companyInitials: 'AF', recruiterId: 'r-neha',
    location: 'Ahmedabad / Hybrid', workplace: 'Hybrid', employmentType: 'Full-time', salary: '₹10L–₹14L', experience: '5–8 years', roleFamily: 'Sales and Marketing', companyStage: 'Growth-stage', companySize: '51–200',
    skills: ['D2C', 'Performance marketing', 'Retention', 'Analytics'], mustHave: ['D2C growth ownership', 'Paid media experience'], preferred: ['Food brand experience'],
    responsibilities: ['Own acquisition and retention', 'Build the growth reporting rhythm', 'Partner with creative teams'], matched: ['Your D2C background is relevant'], gaps: ['No food-category work is listed'],
    published: 'Today', reviewed: 'Recruiter active 1 hour ago', closes: '18 Sep 2026', applicantCount: 11, state: 'Live', sponsored: true,
  },
  {
    id: 'job-client', title: 'Client Success Associate', companyId: 'ledgercraft', companyName: 'LedgerCraft Tax Advisors LLP', companyInitials: 'LC', recruiterId: 'r-rahul',
    location: 'Ahmedabad, Gujarat', workplace: 'Hybrid', employmentType: 'Full-time', salary: '₹5L–₹7L', experience: '2–4 years', roleFamily: 'Finance and Compliance', companyStage: 'Established SME', companySize: '11–50',
    skills: ['Client success', 'GST basics', 'Documentation'], mustHave: ['Strong written communication', '2+ years client-facing experience'], preferred: ['GST or accounting exposure'],
    responsibilities: ['Guide new clients through onboarding', 'Track compliance requests', 'Improve response quality'], matched: ['Your client support experience fits'], gaps: ['GST knowledge is not evidenced'],
    published: '4 days ago', reviewed: 'Recruiter active yesterday', closes: '9 Sep 2026', applicantCount: 24, state: 'Live',
  },
  {
    id: 'job-engineer', title: 'Process Improvement Engineer', companyId: 'packwise', companyName: 'Packwise Materials', companyInitials: 'PM', recruiterId: 'r-sana',
    location: 'Vadodara, Gujarat', workplace: 'On-site', employmentType: 'Full-time', salary: '₹9L–₹13L', experience: '4–6 years', roleFamily: 'Engineering and Product', companyStage: 'Growth-stage', companySize: '51–200',
    skills: ['Lean manufacturing', 'Quality systems', 'Packaging'], mustHave: ['Manufacturing process ownership', 'Root-cause analysis'], preferred: ['Sustainable materials'],
    responsibilities: ['Reduce line waste', 'Own improvement experiments', 'Document quality controls'], matched: ['Your manufacturing background fits'], gaps: ['Vadodara is outside your saved locations'],
    published: '1 week ago', reviewed: 'Recruiter active 6 hours ago', closes: '6 Sep 2026', applicantCount: 9, state: 'Live',
  },
  {
    id: 'job-designer', title: 'Product Designer', companyId: 'orbit', companyName: 'OrbitDesk', companyInitials: 'OD', recruiterId: 'r-neha',
    location: 'Bengaluru, Karnataka', workplace: 'Remote', employmentType: 'Full-time', salary: '₹14L–₹19L', experience: '4–7 years', roleFamily: 'Design and Creative', companyStage: 'Early-stage', companySize: '11–50',
    skills: ['Product design', 'Research', 'Design systems'], mustHave: ['B2B product portfolio', 'Research experience'], preferred: ['Marketplace experience'],
    responsibilities: ['Own core workflows', 'Run evaluative research', 'Maintain the design system'], matched: ['Your design-system work fits'], gaps: ['B2B portfolio depth needs clarification'],
    published: '3 days ago', reviewed: 'Recruiter active today', closes: '15 Sep 2026', applicantCount: 31, state: 'Live',
  },
  {
    id: 'job-sales', title: 'Regional Sales Executive', companyId: 'packwise', companyName: 'Packwise Materials', companyInitials: 'PM', recruiterId: 'r-sana',
    location: 'Pune, Maharashtra', workplace: 'Hybrid', employmentType: 'Full-time', salary: '₹6L–₹9L + incentives', experience: '3–5 years', roleFamily: 'Sales and Marketing', companyStage: 'Growth-stage', companySize: '51–200',
    skills: ['B2B sales', 'Manufacturing', 'CRM'], mustHave: ['3+ years field sales', 'CRM discipline'], preferred: ['Packaging buyer network'],
    responsibilities: ['Develop SME accounts', 'Run product trials', 'Maintain pipeline hygiene'], matched: ['Your B2B sales background fits'], gaps: ['Packaging network is not listed'],
    published: '6 days ago', reviewed: 'Recruiter active 2 days ago', closes: '10 Sep 2026', applicantCount: 15, state: 'Live',
  },
  seededJob({ id: 'job-product', title: 'Product Manager', companyId: 'orbit', companyName: 'OrbitDesk', companyInitials: 'OD', recruiterId: 'r-aditi', roleFamily: 'Engineering and Product', salary: '₹16L–₹22L', experience: '5–8 years', location: 'Bengaluru, Karnataka', workplace: 'Hybrid', skills: ['Product strategy', 'B2B SaaS', 'Research'] }),
  seededJob({ id: 'job-frontend', title: 'Frontend Engineer', companyId: 'orbit', companyName: 'OrbitDesk', companyInitials: 'OD', recruiterId: 'r-aditi', roleFamily: 'Engineering and Product', salary: '₹13L–₹18L', experience: '3–6 years', location: 'Bengaluru, Karnataka', workplace: 'Remote', skills: ['React', 'TypeScript', 'Accessibility'] }),
  seededJob({ id: 'job-quality', title: 'Quality Systems Lead', companyId: 'brightforge', companyName: 'BrightForge Components', companyInitials: 'BF', recruiterId: 'r-vikram', roleFamily: 'Operations and Supply Chain', salary: '₹11L–₹15L', experience: '6–9 years', location: 'Pune, Maharashtra', workplace: 'On-site', skills: ['ISO 9001', 'Root-cause analysis', 'Supplier quality'] }),
  seededJob({ id: 'job-finance', title: 'Finance Operations Analyst', companyId: 'ledgercraft', companyName: 'LedgerCraft Tax Advisors LLP', companyInitials: 'LC', recruiterId: 'r-rahul', roleFamily: 'Finance and Compliance', salary: '₹6L–₹9L', experience: '2–4 years', skills: ['Reconciliation', 'GST', 'Excel'] }),
  seededJob({ id: 'job-accountant', title: 'Senior Accountant', companyId: 'ledgercraft', companyName: 'LedgerCraft Tax Advisors LLP', companyInitials: 'LC', recruiterId: 'r-rahul', roleFamily: 'Finance and Compliance', salary: '₹8L–₹12L', experience: '4–7 years', skills: ['Accounting', 'Compliance', 'Client advisory'] }),
  seededJob({ id: 'job-copy', title: 'Brand Copywriter', companyId: 'pixelharbor', companyName: 'PixelHarbor Studio', companyInitials: 'PH', recruiterId: 'r-meera', roleFamily: 'Design and Creative', salary: '₹7L–₹10L', experience: '3–5 years', location: 'Bengaluru, Karnataka', workplace: 'Remote', skills: ['Brand voice', 'Campaigns', 'Editing'] }),
  seededJob({ id: 'job-research', title: 'UX Researcher', companyId: 'pixelharbor', companyName: 'PixelHarbor Studio', companyInitials: 'PH', recruiterId: 'r-meera', roleFamily: 'Design and Creative', salary: '₹10L–₹14L', experience: '4–6 years', location: 'Bengaluru, Karnataka', workplace: 'Hybrid', skills: ['Qualitative research', 'Synthesis', 'B2B'] }),
  seededJob({ id: 'job-warehouse', title: 'Warehouse Operations Lead', companyId: 'routegrid', companyName: 'RouteGrid Logistics', companyInitials: 'RG', recruiterId: 'r-kabir', roleFamily: 'Operations and Supply Chain', salary: '₹7L–₹10L', experience: '4–7 years', workplace: 'On-site', skills: ['Warehouse operations', 'WMS', 'Team leadership'] }),
  seededJob({ id: 'job-partnerships', title: 'Business Partnerships Manager', companyId: 'routegrid', companyName: 'RouteGrid Logistics', companyInitials: 'RG', recruiterId: 'r-kabir', roleFamily: 'Sales and Marketing', salary: '₹9L–₹13L', experience: '4–7 years', workplace: 'Hybrid', skills: ['B2B partnerships', 'Logistics', 'Negotiation'] }),
  seededJob({ id: 'job-people', title: 'People Operations Partner', companyId: 'peoplemint', companyName: 'PeopleMint Advisory', companyInitials: 'PA', recruiterId: 'r-tara', roleFamily: 'HR and Administration', salary: '₹8L–₹12L', experience: '4–7 years', location: 'Mumbai, Maharashtra', workplace: 'Hybrid', skills: ['People operations', 'Policy', 'Manager support'] }),
  seededJob({ id: 'job-recruiter', title: 'Recruitment Coordinator', companyId: 'peoplemint', companyName: 'PeopleMint Advisory', companyInitials: 'PA', recruiterId: 'r-tara', roleFamily: 'HR and Administration', salary: '₹5L–₹7L', experience: '1–3 years', location: 'Mumbai, Maharashtra', workplace: 'Remote', skills: ['Scheduling', 'Candidate experience', 'ATS'] }),
  seededJob({ id: 'job-admin', title: 'Business Administration Associate', companyId: 'aroha', companyName: 'Aroha Foods', companyInitials: 'AF', recruiterId: 'r-neha', roleFamily: 'HR and Administration', salary: '₹4.5L–₹6.5L', experience: '1–3 years', workplace: 'On-site', skills: ['Administration', 'Coordination', 'Documentation'] }),
] satisfies JobPosting[]).map((job) => ({ ...job, companyLogo: job.companyLogo ?? companyMedia[job.companyId]?.logo, careersImage: job.careersImage ?? companyMedia[job.companyId]?.careers, careersImageAlt: job.careersImageAlt ?? companyMedia[job.companyId]?.careersAlt }));

export const candidates: CandidateProfile[] = ([
  { id: 'c1', name: 'Riya Patel', initials: 'RP', headline: 'Operations lead · D2C and FMCG', location: 'Ahmedabad', experience: '6 years', availability: '30 days', salary: '₹10L–₹12L', skills: ['Vendor operations', 'FMCG', 'Inventory planning'], matched: ['6 years relevant experience', 'Ahmedabad based', 'FMCG operations'], gaps: ['ERP ownership not shown'], stage: 'Shortlisted', applied: '2 days ago', jobId: 'job-ops' },
  { id: 'c2', name: 'Dev Shah', initials: 'DS', headline: 'Supply chain analyst', location: 'Vadodara', experience: '4 years', availability: 'Immediate', salary: '₹8L–₹10L', skills: ['Planning', 'Excel', 'Procurement'], matched: ['Strong planning background', 'Advanced Excel'], gaps: ['No food-sector work'], stage: 'Viewed', applied: 'Yesterday', jobId: 'job-ops' },
  { id: 'c3', name: 'Ananya Rao', initials: 'AR', headline: 'Plant operations manager', location: 'Ahmedabad', experience: '8 years', availability: '45 days', salary: '₹12L–₹14L', skills: ['Plant operations', 'Quality', 'Team leadership'], matched: ['Operations leadership', 'Local candidate'], gaps: ['Salary above current band'], stage: 'Interview', applied: '4 days ago', jobId: 'job-ops' },
  { id: 'c4', name: 'Kunal Verma', initials: 'KV', headline: 'Marketplace operations specialist', location: 'Remote', experience: '5 years', availability: '15 days', salary: '₹9L–₹11L', skills: ['Marketplace ops', 'SOPs', 'Analytics'], matched: ['Process ownership', 'Fits salary band'], gaps: ['Relocation not confirmed'], stage: 'Submitted', applied: '3 hours ago', jobId: 'job-ops' },
  { id: 'c5', name: 'Mehak Gill', initials: 'MG', headline: 'Customer operations manager', location: 'Ahmedabad', experience: '5 years', availability: 'Immediate', salary: '₹9L–₹11L', skills: ['Customer ops', 'Vendor escalation', 'Reporting'], matched: ['Local candidate', 'Strong stakeholder work'], gaps: ['Inventory planning not evidenced'], stage: 'Submitted', applied: '5 hours ago', jobId: 'job-ops' },
  { id: 'c6', name: 'Arjun Rao', initials: 'AR', headline: 'Production planning specialist', location: 'Pune', experience: '6 years', availability: '30 days', salary: '₹11L–₹13L', skills: ['Planning', 'Lean', 'Quality'], matched: ['Strong production ownership'], gaps: ['Food experience not listed'], stage: 'Viewed', applied: 'Yesterday', jobId: 'job-ops' },
  { id: 'c7', name: 'Ishita Sen', initials: 'IS', headline: 'Operations analyst', location: 'Ahmedabad', experience: '3 years', availability: '15 days', salary: '₹7L–₹9L', skills: ['Analytics', 'Excel', 'SOPs'], matched: ['Local and analytical'], gaps: ['Leadership scope unclear'], stage: 'Submitted', applied: 'Today', jobId: 'job-ops' },
  { id: 'c8', name: 'Nikhil Jain', initials: 'NJ', headline: 'Fulfilment team lead', location: 'Surat', experience: '7 years', availability: '45 days', salary: '₹10L–₹12L', skills: ['Fulfilment', 'WMS', 'Team leadership'], matched: ['Relevant fulfilment leadership'], gaps: ['Relocation not confirmed'], stage: 'Interview', applied: '5 days ago', jobId: 'job-ops' },
  { id: 'c9', name: 'Sanya Kapoor', initials: 'SK', headline: 'D2C supply chain manager', location: 'Mumbai', experience: '6 years', availability: '30 days', salary: '₹12L–₹14L', skills: ['D2C', 'Planning', 'Vendors'], matched: ['Strong category relevance'], gaps: ['Salary above band'], stage: 'Shortlisted', applied: '3 days ago', jobId: 'job-ops' },
  { id: 'c10', name: 'Harsh Vora', initials: 'HV', headline: 'Procurement and vendor manager', location: 'Ahmedabad', experience: '8 years', availability: '60 days', salary: '₹11L–₹13L', skills: ['Procurement', 'Negotiation', 'Vendor audits'], matched: ['Local vendor experience'], gaps: ['Notice period is long'], stage: 'Viewed', applied: '2 days ago', jobId: 'job-ops' },
  { id: 'c11', name: 'Diya Krishnan', initials: 'DK', headline: 'Business operations generalist', location: 'Remote', experience: '4 years', availability: 'Immediate', salary: '₹8L–₹10L', skills: ['Operations', 'Projects', 'Analytics'], matched: ['Immediate availability'], gaps: ['On-site preference unclear'], stage: 'Submitted', applied: '6 hours ago', jobId: 'job-ops' },
  { id: 'c12', name: 'Rohan Batra', initials: 'RB', headline: 'Retail operations supervisor', location: 'Vadodara', experience: '5 years', availability: '30 days', salary: '₹8L–₹10L', skills: ['Retail ops', 'Scheduling', 'Inventory'], matched: ['Regional operations experience'], gaps: ['FMCG production not shown'], stage: 'Submitted', applied: '8 hours ago', jobId: 'job-ops' },
] satisfies CandidateProfile[]).map((candidate, index) => ({ ...candidate, avatar: peopleMedia[candidate.id] ?? peopleMedia[`c${(index % 8) + 1}`], workSampleImage: `/seed-media/work/work-${(index % 6) + 1}.jpg` }));

export const applications: ApplicationRecord[] = ([
  { id: 'a1', jobId: 'job-ops', jobTitle: 'Operations Manager', companyName: 'Aroha Foods', companyInitials: 'AF', stage: 'Interview', updated: 'Interview confirmed today', nextStep: 'Video interview · 29 Aug, 11:30 AM' },
  { id: 'a2', jobId: 'job-client', jobTitle: 'Client Success Associate', companyName: 'LedgerCraft Tax Advisors', companyInitials: 'LC', stage: 'Viewed', updated: 'Viewed yesterday', nextStep: 'Awaiting recruiter decision' },
  { id: 'a3', jobId: 'job-designer', jobTitle: 'Product Designer', companyName: 'OrbitDesk', companyInitials: 'OD', stage: 'Submitted', updated: 'Submitted 3 days ago', nextStep: 'Recruiter typically replies within 2 days' },
  { id: 'a4', jobId: 'job-sales', jobTitle: 'Regional Sales Executive', companyName: 'Packwise Materials', companyInitials: 'PM', stage: 'Rejected', updated: 'Closed 1 week ago', nextStep: 'Application retained privately' },
] satisfies ApplicationRecord[]).map((application) => ({ ...application, companyLogo: companyMedia[jobs.find((job) => job.id === application.jobId)?.companyId ?? '']?.logo }));

export const updates: StatusUpdate[] = ([
  { id: 'u1', companyId: 'aroha', companyName: 'Aroha Foods', companyInitials: 'AF', recruiterName: 'Neha Iyer', kind: 'Hiring', title: 'We are building our first operations leadership team', body: 'Three Ahmedabad roles are now open with salary bands and a two-stage interview process.', age: '1h', expiresIn: '23h', image: companyMedia.aroha.careers, alt: companyMedia.aroha.careersAlt, cta: 'View open roles', views: 438, savedToHighlight: 'Life at Aroha' },
  { id: 'u2', companyId: 'ledgercraft', companyName: 'LedgerCraft Tax Advisors', companyInitials: 'LC', kind: 'Work sample', title: 'A GST onboarding checklist that reduced back-and-forth', body: 'A practical look at how we moved a food startup from scattered documents to a clean filing rhythm.', age: '3h', expiresIn: '21h', image: companyMedia.ledgercraft.work, alt: companyMedia.ledgercraft.workAlt, cta: 'See the case study', views: 291, savedToHighlight: 'Client work' },
  { id: 'u3', companyId: 'packwise', companyName: 'Packwise Materials', companyInitials: 'PM', kind: 'Milestone', title: 'Our second low-waste packaging line is live', body: 'The new line expands pilot capacity for food and personal-care SMEs across western India.', age: '5h', expiresIn: '19h', image: companyMedia.packwise.work, alt: companyMedia.packwise.workAlt, cta: 'Explore capabilities', views: 517 },
  { id: 'u4', companyId: 'orbit', companyName: 'OrbitDesk', companyInitials: 'OD', kind: 'Event', title: 'Open product critique this Friday', body: 'Designers and PMs can bring one workflow for a focused 15-minute peer review.', age: '8h', expiresIn: '16h', cta: 'View event', views: 166 },
  { id: 'u5', companyId: 'taxbridge', companyName: 'TaxBridge Professionals', companyInitials: 'TB', kind: 'Availability', title: 'Two onboarding slots open for September', body: 'Best suited to multi-state GST operations that need a senior-led transition.', age: '10h', expiresIn: '14h', cta: 'Send an inquiry', views: 204 },
  { id: 'u6', companyId: 'packwise', companyName: 'Packwise Materials', companyInitials: 'PM', kind: 'Offer', title: 'Sponsored: complimentary packaging audit for pilot runs', body: 'For verified food and D2C businesses planning a first run above 5,000 units.', age: '2h', expiresIn: '22h', cta: 'Check eligibility', sponsored: true, views: 812 },
  { id: 'u7', companyId: 'aroha', companyName: 'Aroha Foods', companyInitials: 'AF', kind: 'Milestone', title: 'First 100 retail partners onboarded', body: 'A quick thank-you to the operations partners who helped us reach six Gujarat cities.', age: '12h', expiresIn: '12h', cta: 'Follow Aroha', views: 624 },
  { id: 'u8', companyId: 'orbit', companyName: 'OrbitDesk', companyInitials: 'OD', recruiterName: 'Aditi Menon', kind: 'Hiring', title: 'Product and frontend roles now include the full interview loop', body: 'Candidates can see each stage, the interview owners, and expected response windows before applying.', age: '4h', expiresIn: '20h', image: companyMedia.orbit.careers, alt: companyMedia.orbit.careersAlt, cta: 'See open roles', views: 344 },
  { id: 'u9', companyId: 'brightforge', companyName: 'BrightForge Components', companyInitials: 'BF', kind: 'Work sample', title: 'A small-batch quality review from drawing to dispatch', body: 'See the inspection points used to keep a precision pilot accountable.', age: '6h', expiresIn: '18h', image: companyMedia.brightforge.work, alt: companyMedia.brightforge.workAlt, cta: 'Inspect the work', views: 278 },
  { id: 'u10', companyId: 'pixelharbor', companyName: 'PixelHarbor Studio', companyInitials: 'PH', recruiterName: 'Meera Nair', kind: 'Event', title: 'Open research critique for early product teams', body: 'Bring one research question and leave with a clearer evaluative plan.', age: '7h', expiresIn: '17h', image: companyMedia.pixelharbor.work, alt: companyMedia.pixelharbor.workAlt, cta: 'View event', views: 193 },
  { id: 'u11', companyId: 'routegrid', companyName: 'RouteGrid Logistics', companyInitials: 'RG', kind: 'Availability', title: 'Two west-region fulfilment onboarding slots open', body: 'For businesses that can share weekly volume, service areas, and handling requirements.', age: '9h', expiresIn: '15h', image: companyMedia.routegrid.cover, alt: companyMedia.routegrid.coverAlt, cta: 'Send a brief', views: 421 },
  { id: 'u12', companyId: 'peoplemint', companyName: 'PeopleMint Advisory', companyInitials: 'PA', recruiterName: 'Tara Bose', kind: 'Hiring', title: 'Recruitment coordinator and people partner roles are live', body: 'Both roles include salary bands, working model, and a named hiring owner.', age: '11h', expiresIn: '13h', image: companyMedia.peoplemint.careers, alt: companyMedia.peoplemint.careersAlt, cta: 'View roles', views: 238 },
] satisfies StatusUpdate[]).map((update) => ({ ...update, companyLogo: companyMedia[update.companyId]?.logo }));

export const campaigns: PromotionCampaign[] = [
  { id: 'p1', name: 'Ahmedabad service discovery', kind: 'Company', status: 'Active', audience: 'Food and D2C founders · Ahmedabad', budget: '₹12,000 / month', impressions: '18.4k', actions: '126 inquiries' },
  { id: 'p2', name: 'Growth Marketing Lead', kind: 'Job', status: 'Review', audience: 'D2C marketers · Gujarat', budget: '₹6,000 total', impressions: '—', actions: 'Pending approval' },
  { id: 'p3', name: 'Packaging audit update', kind: 'Update', status: 'Paused', audience: 'Verified food SMEs · West India', budget: '₹3,500 spent', impressions: '9.1k', actions: '74 profile visits' },
];

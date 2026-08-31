export interface SeedMedia {
  logo: string;
  cover: string;
  coverAlt: string;
  careers: string;
  careersAlt: string;
  work: string;
  workAlt: string;
}

const logo = (index: number) => `/seed-media/logos/company-${index}.svg`;
const company = (index: number) => `/seed-media/company/company-${index}.jpg`;
const work = (index: number) => `/seed-media/work/work-${index}.jpg`;

export const companyMedia: Record<string, SeedMedia> = {
  ledgercraft: { logo: logo(1), cover: company(1), coverAlt: 'Bright meeting space used for client workshops', careers: company(5), careersAlt: 'Colleagues reviewing work around a shared table', work: work(1), workAlt: 'Organised compliance documents prepared for review' },
  taxbridge: { logo: logo(2), cover: company(2), coverAlt: 'Open office for a professional advisory team', careers: company(6), careersAlt: 'Advisory team collaborating in a meeting', work: work(1), workAlt: 'Financial records arranged for a client review' },
  finacle: { logo: logo(3), cover: company(3), coverAlt: 'Contemporary workspace with shared desks', careers: company(12), careersAlt: 'Team taking part in a planning meeting', work: work(4), workAlt: 'Business reporting dashboard on a laptop' },
  rightcomply: { logo: '', cover: '', coverAlt: '', careers: '', careersAlt: '', work: '', workAlt: '' },
  aroha: { logo: logo(4), cover: company(5), coverAlt: 'Food company team collaborating around a table', careers: company(11), careersAlt: 'Young team working together in a bright studio', work: work(5), workAlt: 'Team planning a product launch with notes and samples' },
  packwise: { logo: logo(5), cover: company(7), coverAlt: 'Distribution vehicles arranged at a logistics facility', careers: company(8), careersAlt: 'Engineer working in a modern production environment', work: work(2), workAlt: 'Clean production equipment on a manufacturing floor' },
  orbit: { logo: logo(6), cover: company(4), coverAlt: 'Product team workspace with large windows', careers: company(11), careersAlt: 'Design and product team collaborating at a shared desk', work: work(4), workAlt: 'Product analytics and research displayed on a laptop' },
  brightforge: { logo: logo(7), cover: company(8), coverAlt: 'Engineer inspecting equipment in a workshop', careers: company(6), careersAlt: 'Manufacturing team discussing a work plan', work: work(3), workAlt: 'Industrial equipment prepared for inspection' },
  northstar: { logo: logo(8), cover: company(10), coverAlt: 'Operations event with people gathering in a large venue', careers: company(12), careersAlt: 'Consulting team reviewing a client plan', work: work(6), workAlt: 'Workshop participants reviewing notes together' },
  pixelharbor: { logo: logo(9), cover: company(11), coverAlt: 'Creative team working together at a studio table', careers: company(4), careersAlt: 'Software team collaborating in an open office', work: work(5), workAlt: 'Design workshop with sketches and planning notes' },
  routegrid: { logo: logo(10), cover: company(7), coverAlt: 'Freight vehicles at a regional logistics hub', careers: company(9), careersAlt: 'Operations professional working at a fulfilment desk', work: work(3), workAlt: 'Warehouse and process equipment in operation' },
  peoplemint: { logo: logo(11), cover: company(12), coverAlt: 'People consulting team in a structured workshop', careers: company(5), careersAlt: 'Hiring team speaking around a meeting table', work: work(6), workAlt: 'Facilitated team session with shared notes' },
  launchlane: { logo: logo(12), cover: company(6), coverAlt: 'Marketing team collaborating in a bright office', careers: company(11), careersAlt: 'Creative team planning a campaign together', work: work(5), workAlt: 'Campaign planning session with cards and notes' },
};

export const peopleMedia: Record<string, string> = {
  'r-neha': '/seed-media/people/person-1.jpg',
  'r-rahul': '/seed-media/people/person-2.jpg',
  'r-sana': '/seed-media/people/person-3.jpg',
  'r-aditi': '/seed-media/people/person-4.jpg',
  'r-vikram': '/seed-media/people/person-5.jpg',
  'r-meera': '/seed-media/people/person-6.jpg',
  'r-kabir': '/seed-media/people/person-7.jpg',
  'r-tara': '/seed-media/people/person-8.jpg',
  c1: '/seed-media/people/person-5.jpg',
  c2: '/seed-media/people/person-6.jpg',
  c3: '/seed-media/people/person-7.jpg',
  c4: '/seed-media/people/person-8.jpg',
  c5: '/seed-media/people/person-1.jpg',
  c6: '/seed-media/people/person-2.jpg',
  c7: '/seed-media/people/person-3.jpg',
  c8: '/seed-media/people/person-4.jpg',
};

export interface ThirdPartyAdFixture {
  id: string;
  advertiser: string;
  headline: string;
  body: string;
  cta: string;
  href: string;
  logo: string;
  creative: string;
  creativeAlt: string;
  context: string;
}

export const thirdPartyAds: Record<'companies' | 'jobs' | 'general', ThirdPartyAdFixture> = {
  companies: { id: 'ad-opsdesk', advertiser: 'OpsDesk Cloud', headline: 'Keep vendor documents and renewals in one accountable workspace.', body: 'A contextual partner for growing operations teams. Prototype advertisement.', cta: 'Explore OpsDesk', href: 'https://example.com/opsdesk', logo: logo(10), creative: '/seed-media/ads/operations-partner.jpg', creativeAlt: 'Freight vehicles at an operations facility', context: 'Shown because you are browsing business services.' },
  jobs: { id: 'ad-skillspring', advertiser: 'SkillSpring', headline: 'Practice interviews built around the role you actually want.', body: 'Career preparation for startup and SME applicants. Prototype advertisement.', cta: 'View practice tracks', href: 'https://example.com/skillspring', logo: logo(11), creative: '/seed-media/ads/career-partner.jpg', creativeAlt: 'Team members collaborating in a bright workplace', context: 'Shown because you are browsing jobs and career content.' },
  general: { id: 'ad-signalworks', advertiser: 'SignalWorks', headline: 'Turn operating data into a weekly decision rhythm.', body: 'Reporting tools for small business teams. Prototype display advertisement.', cta: 'See the reporting guide', href: 'https://example.com/signalworks', logo: logo(9), creative: '/seed-media/ads/analytics-partner.jpg', creativeAlt: 'Analytics dashboard displayed on a laptop', context: 'Shown from the public section you are viewing, not from private account data.' },
};


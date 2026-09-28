export type AccountRole = 'guest' | 'applicant' | 'company';

export type JobState = 'Live' | 'Paused' | 'Closed' | 'Expired';
export type ApplicationStage = 'Draft' | 'Submitted' | 'Viewed' | 'Shortlisted' | 'Interview' | 'Offer' | 'Hired' | 'Rejected' | 'Withdrawn' | 'Closed';
export type UpdateKind = 'Hiring' | 'Work sample' | 'Milestone' | 'Availability' | 'Event' | 'Offer';

export interface RecruiterProfile {
  id: string;
  name: string;
  title: string;
  companyId: string;
  companyName: string;
  initials: string;
  avatar?: string;
  companyLogo?: string;
  verified: boolean;
  responseTime: string;
  responseRate: string;
  activeJobs: number;
  summary: string;
}

export interface JobPosting {
  id: string;
  title: string;
  companyId: string;
  companyName: string;
  companyInitials: string;
  companyLogo?: string;
  careersImage?: string;
  careersImageAlt?: string;
  recruiterId: string;
  location: string;
  workplace: 'On-site' | 'Hybrid' | 'Remote';
  employmentType: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
  salary: string;
  experience: string;
  roleFamily: 'Engineering and Product' | 'Sales and Marketing' | 'Finance and Compliance' | 'Operations and Supply Chain' | 'HR and Administration' | 'Design and Creative';
  companyStage: 'Early-stage' | 'Growth-stage' | 'Established SME';
  companySize: '1–10' | '11–50' | '51–200' | '201–500';
  skills: string[];
  mustHave: string[];
  preferred: string[];
  responsibilities: string[];
  matched: string[];
  gaps: string[];
  published: string;
  reviewed: string;
  closes: string;
  applicantCount: number;
  state: JobState;
  sponsored?: boolean;
}

export interface CandidateProfile {
  id: string;
  name: string;
  initials: string;
  avatar?: string;
  workSampleImage?: string;
  headline: string;
  location: string;
  experience: string;
  availability: string;
  salary: string;
  skills: string[];
  matched: string[];
  gaps: string[];
  stage: ApplicationStage;
  applied: string;
  jobId: string;
}

export interface ApplicationRecord {
  id: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  companyInitials: string;
  companyLogo?: string;
  stage: ApplicationStage;
  updated: string;
  nextStep: string;
}

export interface StatusUpdate {
  id: string;
  companyId: string;
  companyName: string;
  companyInitials: string;
  companyLogo?: string;
  recruiterName?: string;
  kind: UpdateKind;
  title: string;
  body: string;
  age: string;
  expiresIn: string;
  image?: string;
  alt?: string;
  cta: string;
  sponsored?: boolean;
  savedToHighlight?: string;
  views: number;
}

export interface PromotionCampaign {
  id: string;
  name: string;
  kind: 'Company' | 'Job' | 'Update';
  status: 'Eligibility check' | 'Review' | 'Active' | 'Paused' | 'Completed' | 'Rejected';
  audience: string;
  budget: string;
  impressions: string;
  actions: string;
}

export type OpportunityKind = 'service' | 'talent' | 'finance' | 'product' | 'update';
export type TrustState = 'verified' | 'identity' | 'partner-referral';

export interface BusinessContext {
  id: string;
  name: string;
  initials: string;
  city: string;
  gstin: string;
  profileHealth: number;
}

export interface Opportunity {
  id: string;
  kind: OpportunityKind;
  title: string;
  subtitle: string;
  location?: string;
  initials?: string;
  trust: TrustState;
  detail: string;
  evidence: string[];
  facts: Array<{ label: string; value: string }>;
  gap?: string;
  primaryAction: string;
}

export interface OpportunityFilterState {
  service: boolean;
  talent: boolean;
  finance: boolean;
  product: boolean;
  update: boolean;
  verifiedOnly: boolean;
}

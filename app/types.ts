export type Expert = {
  id: string;
  name: string;
  handle: string;
  role: string;
  roleRu: string;
  tagline: string;
  taglineRu: string;
  character: string;
  characterRu: string;
  voice: string;
  beliefs: string[];
  tension: string;
  identityUrl: string;
  avatar: string;
  color: string;
  reviewedAt: string;
};
export type Evidence = {
  id: string;
  title: string;
  summary: string;
  kind: string;
  confidence: string;
  retrievedAt: string;
  url: string | null;
  locator: string;
};
export type Turn = {
  id: string;
  seat: string;
  round: string;
  text: string;
  challenge: string;
  stance: string;
  evidenceIds: string[];
  fictional: true;
};
export type Action = {
  id: string;
  title: string;
  why: string;
  priority: string;
  confidence: string;
  owner: string;
  effort: string;
  acceptance: string;
  evidenceIds: string[];
  experiment: Record<string, string> | null;
};
export type Session = {
  schemaVersion: number;
  id: string;
  revision: number;
  title: string;
  question: string;
  context: string;
  mode: string;
  language: string;
  seats: string[];
  stage: string;
  status: string;
  demo: boolean;
  createdAt: string;
  updatedAt: string;
  assumptions: string[];
  evidence: Evidence[];
  turns: Turn[];
  actions: Action[];
  verdict: {
    decision: string;
    summary: string;
    dissent: string;
    unknowns: string;
    evidenceIds: string[];
  } | null;
};
export type Summary = Pick<
  Session,
  'id' | 'title' | 'stage' | 'status' | 'updatedAt' | 'revision' | 'demo'
>;

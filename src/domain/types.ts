export type Role = "learner" | "tutor" | "guardian" | "champion" | "admin";
export type Language = "English" | "हिन्दी" | "मराठी" | "తెలుగు";
export type Subject = "Mathematics" | "Science" | "English" | "Social Science";
export type Tier = "Helper" | "Explainer" | "Mentor" | "Village Guide";
export interface Tutor {
  id: string;
  name: string;
  initials: string;
  grade: number;
  subjects: Subject[];
  languages: Language[];
  tss: number;
  sessions: number;
  available: boolean;
  verified: boolean;
  bio: string;
  color: string;
  approach: string;
  slots: string[];
  tier: Tier;
}
export interface Lesson {
  id: string;
  subject: Subject;
  title: string;
  subtitle: string;
  grade: number;
  minutes: number;
  concept: string;
  steps: string[];
  example: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  keywords: string[];
}
export type MatchStatus =
  "pending" | "accepted" | "declined" | "expired" | "cancelled";
export interface MatchRequest {
  id: string;
  tutorId: string;
  subject: Subject;
  topic: string;
  status: MatchStatus;
  createdAt: number;
  scheduled: string | null;
}
export type SessionStatus =
  "active" | "reconnecting" | "completed" | "terminated";
export interface TimelineEvent {
  id: string;
  at: number;
  type: "message" | "elic" | "system";
  sender: "learner" | "tutor" | "system";
  text: string;
}
export interface Evaluation {
  correctness: number;
  completeness: number;
  clarity: number;
  reasoning: number;
  tone: number;
}
export interface CompletedSession {
  id: string;
  tutorId: string;
  topic: string;
  date: number;
  minutes: number;
  elic: number;
  rating: number;
  evaluation: Evaluation;
}

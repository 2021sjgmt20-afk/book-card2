export interface ReflectionNote {
  id: string;
  userId: string;
  userEmail?: string;
  date: string; // YYYY-MM-DD
  subject: string;
  wellDone: string;
  improvement: string;
  studentReaction: string;
  aiActionSuggestion: string;
  aiFeedback?: string;
  positiveKeywords?: string[];
  createdAt?: string;
  updatedAt?: string;
  isActionCompleted?: boolean;
}

export interface ReflectionFormData {
  date: string;
  subject: string;
  customSubject?: string;
  wellDone: string;
  improvement: string;
  studentReaction: string;
}

export interface AiSuggestionResult {
  actionSuggestion: string;
  feedback: string;
  positiveKeywords: string[];
}

export interface SubjectStat {
  subject: string;
  count: number;
  percentage: number;
  color: string;
}

export interface WordFrequency {
  word: string;
  count: number;
  sampleSnippets?: string[];
}

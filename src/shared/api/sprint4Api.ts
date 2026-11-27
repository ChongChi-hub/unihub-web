export interface SummaryDto {
  id: string;
  studentId: string;
  semesterId: string;
  courseSectionId: string;
  attendanceRate: number;
  currentScore: number;
  progressPercent: number;
  updatedAt: string;
}

export interface AlertRuleDto {
  id: string;
  name: string;
  maxAbsences: number;
  minScore: number;
  active: boolean;
}

export interface AcademicAlertDto {
  id: string;
  studentId: string;
  courseSectionId: string;
  ruleId: string;
  reason: string;
  resolved: boolean;
  createdAt: string;
}

export interface CitationDto {
  chunkId: string;
  lessonId: string | null;
  fileId: string | null;
  chunkIndex: number;
  excerpt: string;
}

export interface ChatResponse {
  conversationId: string;
  messageId: string;
  answer: string;
  citations: CitationDto[];
}

export interface ConversationDto {
  id: string;
  courseSectionId: string;
  title: string;
  createdAt: string;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  citations: CitationDto[];
  createdAt: string;
}

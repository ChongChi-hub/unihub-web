export interface QuestionDto {
  id: string;
  subjectId: string;
  createdBy: string;
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';
  content: string;
  options: string[];
  correctAnswers: string[];
  difficulty: string;
  topic: string | null;
  tags: string[];
  createdAt: string;
}

export interface QuizQuestionView {
  questionId: string;
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';
  content: string;
  options: string[];
  sortOrder: number;
  points: number;
}

export interface QuizDto {
  id: string;
  courseSectionId: string;
  title: string;
  durationMinutes: number;
  maxAttempts: number;
  shuffleQuestions: boolean;
  showCorrectAnswers: boolean;
  openAt: string | null;
  closeAt: string | null;
  published: boolean;
  createdAt: string;
  questions: QuizQuestionView[];
}

export interface QuizAnswerResultDto {
  questionId: string;
  selectedAnswers: string[];
  correctAnswers: string[];
  correct: boolean;
  earnedPoints: number;
}

export interface QuizAttemptDto {
  id: string;
  quizId: string;
  studentId: string;
  attemptNumber: number;
  startedAt: string;
  submittedAt: string | null;
  score: number | null;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED';
  answers: QuizAnswerResultDto[];
}

export interface GradeComponentDto {
  id: string;
  courseSectionId: string;
  name: string;
  weightPercent: number;
  linkedType: string;
  linkedId: string | null;
  locked: boolean;
}

export interface StudentGradeDto {
  id: string;
  courseSectionId: string;
  studentId: string;
  componentId: string;
  score: number;
  locked: boolean;
  updatedBy: string;
  updatedAt: string;
}

export interface AttendanceRecordDto {
  sessionId: string;
  studentId: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  note: string | null;
}

export interface AttendanceSessionDto {
  id: string;
  courseSectionId: string;
  sessionDate: string;
  topic: string | null;
  createdBy: string;
  createdAt: string;
  records: AttendanceRecordDto[];
}

export interface NotificationDto {
  id: string;
  recipientId: string;
  type: string;
  title: string;
  body: string;
  referenceType: string | null;
  referenceId: string | null;
  read: boolean;
  createdAt: string;
}

export interface AnnouncementDto {
  id: string;
  courseSectionId: string;
  authorId: string;
  title: string;
  content: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

import { API_ORIGIN, getStoredTokens, http, type ApiEnvelope } from './http';

export interface ProfileDto {
  id: string;
  email: string;
  fullName: string;
  code: string | null;
  avatarFileId: string | null;
  roles: string[];
}

export interface SemesterDto {
  id: string;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  active: boolean;
}

export interface SubjectDto {
  id: string;
  code: string;
  name: string;
  credits: number;
  facultyName?: string;
}

export interface ScheduleDto {
  dayOfWeek: number;
  startPeriod: number;
  endPeriod: number;
  room: string;
}

export interface CourseSectionDto {
  id: string;
  semesterId: string;
  semesterCode: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  credits: number;
  code: string;
  maxCapacity: number;
  enrolledCount: number;
  room: string | null;
  status: 'OPEN' | 'CLOSED' | 'CANCELLED';
  lecturerIds: string[];
  schedules: ScheduleDto[];
}

export interface EnrollmentDto {
  id: string;
  courseSectionId: string;
  sectionCode: string;
  subjectCode: string;
  subjectName: string;
  credits: number;
  studentId: string;
  status: 'ENROLLED' | 'DROPPED';
  enrolledAt: string;
}

export interface TimetableSlotDto {
  courseSectionId: string;
  sectionCode: string;
  subjectCode: string;
  subjectName: string;
  dayOfWeek: number;
  startPeriod: number;
  endPeriod: number;
  room: string | null;
  lecturerIds: string[];
}

export interface AttachmentDto {
  id: string;
  fileId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
}

export interface LessonDto {
  id: string;
  chapterId: string;
  title: string;
  content: string | null;
  videoUrl: string | null;
  videoFileId: string | null;
  sortOrder: number;
  published: boolean;
  attachments: AttachmentDto[];
}

export interface ChapterDto {
  id: string;
  courseSectionId: string;
  title: string;
  sortOrder: number;
  published: boolean;
  lessons: LessonDto[];
}

export interface ProgressSummaryDto {
  courseSectionId: string;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
}

export interface AssignmentDto {
  id: string;
  courseSectionId: string;
  title: string;
  description: string | null;
  attachmentFileId: string | null;
  dueAt: string;
  maxScore: number;
  allowLate: boolean;
  published: boolean;
  createdAt: string;
}

export interface SubmissionDto {
  id: string;
  assignmentId: string;
  studentId: string;
  fileId: string | null;
  textContent: string | null;
  version: number;
  late: boolean;
  score: number | null;
  feedback: string | null;
  submittedAt: string;
  gradedAt: string | null;
}

export interface UploadedFileResult {
  fileId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
}

export async function uploadFileToMinio(file: File): Promise<UploadedFileResult> {
  const contentType = file.type || 'application/octet-stream';
  const presignRes = await http.post<
    ApiEnvelope<{ fileId: string; objectKey: string; uploadUrl: string; filename: string }>
  >('/api/v1/files/presign-upload', {
    filename: file.name,
    contentType,
    sizeBytes: file.size,
  });

  const { fileId, uploadUrl, filename } = presignRes.data.data;

  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  });
  if (!putRes.ok) {
    throw new Error(`Upload lên MinIO thất bại (HTTP ${putRes.status})`);
  }

  await http.post(`/api/v1/files/${fileId}/confirm`);
  return { fileId, filename, contentType, sizeBytes: file.size };
}

export async function downloadPresignedFile(fileId: string): Promise<void> {
  const res = await http.get<
    ApiEnvelope<{ fileId: string; filename: string; contentType: string; downloadUrl: string }>
  >(`/api/v1/files/${fileId}/presign-download`);
  window.open(res.data.data.downloadUrl, '_blank', 'noopener,noreferrer');
}

export async function downloadSectionRosterExcel(
  sectionId: string,
  sectionCode: string,
): Promise<void> {
  const { accessToken } = getStoredTokens();
  const res = await fetch(`${API_ORIGIN}/api/v1/academic/sections/${sectionId}/students/export`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
  if (!res.ok) {
    throw new Error(`Xuất Excel thất bại (HTTP ${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `roster-${sectionCode || sectionId}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const DAY_LABELS: Record<number, string> = {
  2: 'Thứ 2',
  3: 'Thứ 3',
  4: 'Thứ 4',
  5: 'Thứ 5',
  6: 'Thứ 6',
  7: 'Thứ 7',
  8: 'Chủ nhật',
};

export function formatSchedule(schedules: ScheduleDto[]): string {
  if (!schedules || schedules.length === 0) return 'Chưa có lịch';
  return schedules
    .map(
      (s) =>
        `${DAY_LABELS[s.dayOfWeek] ?? `Thứ ${s.dayOfWeek}`} (Tiết ${s.startPeriod}-${s.endPeriod}${s.room ? `, ${s.room}` : ''})`,
    )
    .join('; ');
}

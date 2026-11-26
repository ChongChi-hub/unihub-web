import { BookOpen, CheckCircle, ClipboardList, Download, Upload } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { extractErrorMessage, http, type ApiEnvelope } from '../../shared/api/http';
import {
  downloadPresignedFile,
  uploadFileToMinio,
  type AssignmentDto,
  type ChapterDto,
  type ProgressSummaryDto,
  type SemesterDto,
  type SubmissionDto,
  type TimetableSlotDto,
} from '../../shared/api/sprint2Api';
import { Modal } from '../../shared/components/Modal';
import { StateView } from '../../shared/components/StateView';
import { useToast } from '../../shared/components/ToastProvider';

interface EnrolledCourseSummary {
  courseSectionId: string;
  sectionCode: string;
  subjectCode: string;
  subjectName: string;
}

export function StudentCoursesPage() {
  const { showToast } = useToast();
  const [semesters, setSemesters] = useState<SemesterDto[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState('');
  const [courses, setCourses] = useState<EnrolledCourseSummary[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');

  const [tab, setTab] = useState<'lms' | 'assignments'>('lms');
  const [chapters, setChapters] = useState<ChapterDto[]>([]);
  const [progress, setProgress] = useState<ProgressSummaryDto | null>(null);
  const [assignments, setAssignments] = useState<AssignmentDto[]>([]);
  const [mySubmissions, setMySubmissions] = useState<Record<string, SubmissionDto[]>>({});

  const [loading, setLoading] = useState(true);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Submit modal
  const [submitAssignment, setSubmitAssignment] = useState<AssignmentDto | null>(null);
  const [textContent, setTextContent] = useState('');
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadSemesters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await http.get<ApiEnvelope<{ items: SemesterDto[] }>>(
        '/api/v1/academic/semesters',
      );
      const items = res.data.data.items ?? [];
      setSemesters(items);
      const active = items.find((s) => s.active) ?? items[0];
      if (active) setSelectedSemesterId(active.id);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMyCourses = useCallback(async (semesterId: string) => {
    if (!semesterId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await http.get<ApiEnvelope<TimetableSlotDto[]>>(
        `/api/v1/academic/timetable?semesterId=${semesterId}`,
      );
      const map = new Map<string, EnrolledCourseSummary>();
      for (const slot of res.data.data ?? []) {
        if (!map.has(slot.courseSectionId)) {
          map.set(slot.courseSectionId, {
            courseSectionId: slot.courseSectionId,
            sectionCode: slot.sectionCode,
            subjectCode: slot.subjectCode,
            subjectName: slot.subjectName,
          });
        }
      }
      const list = Array.from(map.values());
      setCourses(list);
      setSelectedCourseId((prev) =>
        list.some((c) => c.courseSectionId === prev) ? prev : (list[0]?.courseSectionId ?? ''),
      );
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadWorkspace = useCallback(
    async (courseSectionId: string) => {
      if (!courseSectionId) return;
      setWorkspaceLoading(true);
      try {
        const [outlineRes, progRes, asmRes] = await Promise.all([
          http.get<ApiEnvelope<ChapterDto[]>>(
            `/api/v1/learning/sections/${courseSectionId}/outline`,
          ),
          http.get<ApiEnvelope<ProgressSummaryDto>>(
            `/api/v1/learning/sections/${courseSectionId}/progress`,
          ),
          http.get<ApiEnvelope<AssignmentDto[]>>(`/api/v1/assignments/section/${courseSectionId}`),
        ]);
        setChapters(outlineRes.data.data ?? []);
        setProgress(progRes.data.data ?? null);
        const asmList = asmRes.data.data ?? [];
        setAssignments(asmList);

        const subsEntries = await Promise.all(
          asmList.map(async (asm) => {
            try {
              const r = await http.get<ApiEnvelope<SubmissionDto[]>>(
                `/api/v1/assignments/${asm.id}/my-submissions`,
              );
              return [asm.id, r.data.data ?? []] as const;
            } catch {
              return [asm.id, []] as const;
            }
          }),
        );
        setMySubmissions(Object.fromEntries(subsEntries));
      } catch (err) {
        showToast(extractErrorMessage(err), 'error');
      } finally {
        setWorkspaceLoading(false);
      }
    },
    [showToast],
  );

  useEffect(() => {
    void loadSemesters();
  }, [loadSemesters]);

  useEffect(() => {
    if (selectedSemesterId) void loadMyCourses(selectedSemesterId);
  }, [selectedSemesterId, loadMyCourses]);

  useEffect(() => {
    if (selectedCourseId) void loadWorkspace(selectedCourseId);
  }, [selectedCourseId, loadWorkspace]);

  const handleMarkComplete = async (lessonId: string) => {
    try {
      await http.post(`/api/v1/learning/lessons/${lessonId}/complete`);
      showToast('Đã đánh dấu hoàn thành bài học', 'success');
      await loadWorkspace(selectedCourseId);
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadFileToMinio(file);
      setUploadedFileId(res.fileId);
      setUploadedFileName(res.filename);
      showToast('Đã tải tệp bài làm lên thành công', 'success');
    } catch (err) {
      showToast(extractErrorMessage(err, 'Tải tệp thất bại'), 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitAssignment = async (e: FormEvent) => {
    e.preventDefault();
    if (!submitAssignment) return;
    if (!uploadedFileId && !textContent.trim()) {
      showToast('Vui lòng đính kèm tệp hoặc nhập nội dung bài làm', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await http.post(`/api/v1/assignments/${submitAssignment.id}/submit`, {
        fileId: uploadedFileId,
        textContent: textContent.trim() || null,
      });
      showToast('Nộp bài thành công', 'success');
      setSubmitAssignment(null);
      setTextContent('');
      setUploadedFileId(null);
      setUploadedFileName(null);
      await loadWorkspace(selectedCourseId);
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCourse = useMemo(
    () => courses.find((c) => c.courseSectionId === selectedCourseId) ?? null,
    [courses, selectedCourseId],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <h2 style={{ margin: 0 }}>Lớp học & Bài tập (LMS)</h2>
        <select
          className="input"
          style={{ width: 220 }}
          value={selectedSemesterId}
          onChange={(e) => setSelectedSemesterId(e.target.value)}
        >
          {semesters.map((s) => (
            <option key={s.id} value={s.id}>
              {s.code} - {s.name}
            </option>
          ))}
        </select>
      </div>

      <StateView
        loading={loading}
        error={error}
        empty={courses.length === 0}
        emptyText="Bạn chưa đăng ký lớp học phần nào trong học kỳ này."
        onRetry={() => loadMyCourses(selectedSemesterId)}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '260px 1fr',
            gap: 16,
            alignItems: 'start',
          }}
        >
          <div
            className="card"
            style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-muted)',
                padding: '4px 8px',
              }}
            >
              LỚP HỌC CỦA TÔI
            </div>
            {courses.map((c) => (
              <button
                key={c.courseSectionId}
                type="button"
                className="btn"
                style={{
                  justifyContent: 'flex-start',
                  textAlign: 'left',
                  background:
                    c.courseSectionId === selectedCourseId ? 'var(--primary-soft)' : 'transparent',
                  color:
                    c.courseSectionId === selectedCourseId
                      ? 'var(--primary)'
                      : 'var(--text-primary)',
                }}
                onClick={() => setSelectedCourseId(c.courseSectionId)}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{c.subjectName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.sectionCode}</div>
                </div>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {selectedCourse && (
              <div
                className="card"
                style={{
                  padding: 16,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: 18 }}>{selectedCourse.subjectName}</h3>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {selectedCourse.sectionCode} • {selectedCourse.subjectCode}
                  </div>
                </div>
                {progress && (
                  <div style={{ minWidth: 200 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 12,
                        marginBottom: 4,
                      }}
                    >
                      <span>Tiến độ học tập</span>
                      <strong>
                        {progress.completedLessons}/{progress.totalLessons} bài (
                        {progress.progressPercent}%)
                      </strong>
                    </div>
                    <div
                      style={{
                        height: 8,
                        borderRadius: 99,
                        background: 'var(--bg-subtle)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${progress.progressPercent}%`,
                          height: '100%',
                          background: 'var(--primary)',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className={`btn ${tab === 'lms' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setTab('lms')}
              >
                <BookOpen size={16} />
                <span>Bài giảng ({chapters.length} chương)</span>
              </button>
              <button
                type="button"
                className={`btn ${tab === 'assignments' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setTab('assignments')}
              >
                <ClipboardList size={16} />
                <span>Bài tập ({assignments.length})</span>
              </button>
            </div>

            <StateView
              loading={workspaceLoading}
              error={null}
              empty={tab === 'lms' ? chapters.length === 0 : assignments.length === 0}
              emptyText={
                tab === 'lms' ? 'Giảng viên chưa đăng bài giảng nào.' : 'Chưa có bài tập nào.'
              }
            >
              {tab === 'lms' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {chapters.map((ch) => (
                    <div key={ch.id} className="card" style={{ padding: 16 }}>
                      <h4 style={{ margin: '0 0 12px 0' }}>{ch.title}</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {ch.lessons.map((ls) => (
                          <div
                            key={ls.id}
                            style={{
                              padding: 12,
                              borderRadius: 8,
                              background: 'var(--bg-subtle)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 8,
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: 8,
                              }}
                            >
                              <strong>{ls.title}</strong>
                              <button
                                type="button"
                                className="btn btn-ghost"
                                style={{ padding: '4px 10px', fontSize: 12 }}
                                onClick={() => void handleMarkComplete(ls.id)}
                              >
                                <CheckCircle size={14} />
                                <span>Hoàn thành</span>
                              </button>
                            </div>
                            {ls.content && (
                              <p
                                style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}
                              >
                                {ls.content}
                              </p>
                            )}
                            {ls.videoUrl && (
                              <a
                                href={ls.videoUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{ fontSize: 13, color: 'var(--primary)' }}
                              >
                                Xem video bài giảng
                              </a>
                            )}
                            {ls.attachments.length > 0 && (
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {ls.attachments.map((att) => (
                                  <button
                                    key={att.id}
                                    type="button"
                                    className="btn btn-ghost"
                                    style={{ padding: '4px 8px', fontSize: 12 }}
                                    onClick={() => void downloadPresignedFile(att.fileId)}
                                  >
                                    <Download size={13} />
                                    <span>{att.fileName}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {assignments.map((asm) => {
                    const subs = mySubmissions[asm.id] ?? [];
                    const latest = subs[0];
                    return (
                      <div
                        key={asm.id}
                        className="card"
                        style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: 12,
                          }}
                        >
                          <div>
                            <h4 style={{ margin: 0 }}>{asm.title}</h4>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                              Hạn nộp: {new Date(asm.dueAt).toLocaleString('vi-VN')} • Điểm tối đa:{' '}
                              {asm.maxScore}
                              {asm.allowLate ? ' • Cho phép nộp trễ' : ''}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ padding: '6px 12px', fontSize: 13 }}
                            onClick={() => setSubmitAssignment(asm)}
                          >
                            <Upload size={14} />
                            <span>{latest ? 'Nộp lại' : 'Nộp bài'}</span>
                          </button>
                        </div>

                        {asm.description && (
                          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                            {asm.description}
                          </p>
                        )}

                        {asm.attachmentFileId && (
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ width: 'fit-content', padding: '4px 8px', fontSize: 12 }}
                            onClick={() => void downloadPresignedFile(asm.attachmentFileId!)}
                          >
                            <Download size={13} />
                            <span>Tải đề bài đính kèm</span>
                          </button>
                        )}

                        {subs.length > 0 && (
                          <div
                            style={{
                              borderTop: '1px solid var(--border-color)',
                              paddingTop: 10,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 6,
                            }}
                          >
                            <div style={{ fontSize: 12, fontWeight: 600 }}>
                              Lịch sử nộp bài ({subs.length} lần)
                            </div>
                            {subs.map((s) => (
                              <div
                                key={s.id}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  fontSize: 13,
                                  padding: '6px 10px',
                                  borderRadius: 6,
                                  background: 'var(--bg-subtle)',
                                }}
                              >
                                <div>
                                  <span>
                                    Lần #{s.version} •{' '}
                                    {new Date(s.submittedAt).toLocaleString('vi-VN')}
                                  </span>
                                  {s.late && (
                                    <span className="badge badge-warning" style={{ marginLeft: 8 }}>
                                      Nộp trễ
                                    </span>
                                  )}
                                  {s.feedback && (
                                    <div
                                      style={{
                                        fontSize: 12,
                                        color: 'var(--text-muted)',
                                        marginTop: 2,
                                      }}
                                    >
                                      Nhận xét: {s.feedback}
                                    </div>
                                  )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  {s.fileId && (
                                    <button
                                      type="button"
                                      className="btn btn-ghost"
                                      style={{ padding: '3px 8px', fontSize: 12 }}
                                      onClick={() => void downloadPresignedFile(s.fileId!)}
                                    >
                                      Tệp đã nộp
                                    </button>
                                  )}
                                  <span
                                    className={`badge ${s.score !== null ? 'badge-success' : 'badge-primary'}`}
                                  >
                                    {s.score !== null
                                      ? `${s.score}/${asm.maxScore} điểm`
                                      : 'Chờ chấm'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </StateView>
          </div>
        </div>
      </StateView>

      <Modal
        open={!!submitAssignment}
        title={`Nộp bài: ${submitAssignment?.title ?? ''}`}
        onClose={() => setSubmitAssignment(null)}
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setSubmitAssignment(null)}
            >
              Hủy
            </button>
            <button
              type="submit"
              form="submit-assignment-form"
              className="btn btn-primary"
              disabled={submitting || uploading}
            >
              {submitting ? 'Đang nộp...' : 'Xác nhận nộp bài'}
            </button>
          </>
        }
      >
        <form
          id="submit-assignment-form"
          onSubmit={handleSubmitAssignment}
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <div>
            <label style={{ fontSize: 13, fontWeight: 500 }}>Tệp bài làm</label>
            <input type="file" className="input" disabled={uploading} onChange={handleFileChange} />
            {uploading && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Đang tải tệp lên MinIO...
              </div>
            )}
            {uploadedFileName && (
              <div style={{ fontSize: 12, color: 'var(--success)', marginTop: 4 }}>
                Đã tải: {uploadedFileName}
              </div>
            )}
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500 }}>Ghi chú / Nội dung trả lời</label>
            <textarea
              className="input"
              rows={4}
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Nhập câu trả lời hoặc ghi chú cho giảng viên..."
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}

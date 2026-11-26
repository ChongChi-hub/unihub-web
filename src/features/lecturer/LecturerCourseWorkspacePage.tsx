import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Award,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  Download,
  HelpCircle,
  Megaphone,
  Paperclip,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  LecturerAnnouncementsPanel,
  LecturerAttendancePanel,
  LecturerGradesPanel,
  LecturerQuizzesPanel,
} from './LecturerAssessmentPanels';
import { Link, useParams } from 'react-router-dom';
import { extractErrorMessage, http, type ApiEnvelope } from '../../shared/api/http';
import {
  downloadPresignedFile,
  downloadSectionRosterExcel,
  uploadFileToMinio,
  type AssignmentDto,
  type ChapterDto,
  type EnrollmentDto,
  type SubmissionDto,
} from '../../shared/api/sprint2Api';
import { Modal } from '../../shared/components/Modal';
import { LessonCommentsPanel } from '../../shared/components/LessonCommentsPanel';
import { StateView } from '../../shared/components/StateView';
import { useToast } from '../../shared/components/ToastProvider';

export function LecturerCourseWorkspacePage() {
  const { sectionId = '' } = useParams();
  const { showToast } = useToast();

  const [tab, setTab] = useState<
    'lms' | 'assignments' | 'quizzes' | 'grades' | 'attendance' | 'announcements' | 'students'
  >('lms');
  const [chapters, setChapters] = useState<ChapterDto[]>([]);
  const [assignments, setAssignments] = useState<AssignmentDto[]>([]);
  const [students, setStudents] = useState<EnrollmentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chapter modal
  const [chapterOpen, setChapterOpen] = useState(false);
  const [chapterTitle, setChapterTitle] = useState('');

  // Lesson modal
  const [lessonChapterId, setLessonChapterId] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonContent, setLessonContent] = useState('');
  const [lessonVideoUrl, setLessonVideoUrl] = useState('');

  // Assignment modal
  const [asmOpen, setAsmOpen] = useState(false);
  const [asmTitle, setAsmTitle] = useState('');
  const [asmDesc, setAsmDesc] = useState('');
  const [asmDueAt, setAsmDueAt] = useState('');
  const [asmMaxScore, setAsmMaxScore] = useState(10);
  const [asmAllowLate, setAsmAllowLate] = useState(true);
  const [asmFileId, setAsmFileId] = useState<string | null>(null);

  // Submissions & grading modal
  const [activeAsm, setActiveAsm] = useState<AssignmentDto | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionDto[]>([]);
  const [gradingSub, setGradingSub] = useState<SubmissionDto | null>(null);
  const [score, setScore] = useState('10');
  const [feedback, setFeedback] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadAll = useCallback(async () => {
    if (!sectionId) return;
    setLoading(true);
    setError(null);
    try {
      const [outlineRes, asmRes, stuRes] = await Promise.all([
        http.get<ApiEnvelope<ChapterDto[]>>(`/api/v1/learning/sections/${sectionId}/outline`),
        http.get<ApiEnvelope<AssignmentDto[]>>(`/api/v1/assignments/section/${sectionId}`),
        http.get<ApiEnvelope<EnrollmentDto[]>>(`/api/v1/academic/sections/${sectionId}/students`),
      ]);
      setChapters(outlineRes.data.data ?? []);
      setAssignments(asmRes.data.data ?? []);
      setStudents(stuRes.data.data ?? []);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [sectionId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleCreateChapter = async (e: FormEvent) => {
    e.preventDefault();
    if (!chapterTitle.trim()) return;
    setSubmitting(true);
    try {
      await http.post('/api/v1/learning/chapters', {
        courseSectionId: sectionId,
        title: chapterTitle.trim(),
        sortOrder: chapters.length + 1,
        published: true,
      });
      showToast('Đã tạo chương mới', 'success');
      setChapterTitle('');
      setChapterOpen(false);
      await loadAll();
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMoveChapter = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= chapters.length) return;
    const reordered = [...chapters];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(target, 0, moved);
    try {
      await http.put('/api/v1/learning/chapters/reorder', {
        orderedIds: reordered.map((c) => c.id),
      });
      setChapters(reordered);
      showToast('Đã cập nhật thứ tự chương', 'success');
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    }
  };

  const handleCreateLesson = async (e: FormEvent) => {
    e.preventDefault();
    if (!lessonChapterId || !lessonTitle.trim()) return;
    setSubmitting(true);
    try {
      const ch = chapters.find((c) => c.id === lessonChapterId);
      await http.post('/api/v1/learning/lessons', {
        chapterId: lessonChapterId,
        title: lessonTitle.trim(),
        content: lessonContent.trim() || null,
        videoUrl: lessonVideoUrl.trim() || null,
        videoFileId: null,
        sortOrder: (ch?.lessons.length ?? 0) + 1,
        published: true,
      });
      showToast('Đã thêm bài giảng mới', 'success');
      setLessonChapterId(null);
      setLessonTitle('');
      setLessonContent('');
      setLessonVideoUrl('');
      await loadAll();
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAttachLessonFile = async (lessonId: string, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await uploadFileToMinio(file);
      await http.post(`/api/v1/learning/lessons/${lessonId}/attachments`, {
        fileId: uploaded.fileId,
        fileName: uploaded.filename,
        contentType: uploaded.contentType,
        fileSize: uploaded.sizeBytes,
      });
      showToast('Đã đính kèm tài liệu', 'success');
      await loadAll();
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      await http.delete(`/api/v1/learning/attachments/${attachmentId}`);
      showToast('Đã xóa tài liệu đính kèm', 'info');
      await loadAll();
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    }
  };

  const handleUploadAsmFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await uploadFileToMinio(file);
      setAsmFileId(uploaded.fileId);
      showToast('Đã tải tệp đề bài lên MinIO', 'success');
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleCreateAssignment = async (e: FormEvent) => {
    e.preventDefault();
    if (!asmTitle.trim() || !asmDueAt) return;
    setSubmitting(true);
    try {
      await http.post('/api/v1/assignments', {
        courseSectionId: sectionId,
        title: asmTitle.trim(),
        description: asmDesc.trim() || null,
        attachmentFileId: asmFileId,
        dueAt: new Date(asmDueAt).toISOString(),
        maxScore: Number(asmMaxScore),
        allowLate: asmAllowLate,
        published: true,
      });
      showToast('Đã giao bài tập mới', 'success');
      setAsmOpen(false);
      setAsmTitle('');
      setAsmDesc('');
      setAsmFileId(null);
      await loadAll();
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openSubmissionsModal = async (asm: AssignmentDto) => {
    setActiveAsm(asm);
    try {
      const res = await http.get<ApiEnvelope<SubmissionDto[]>>(
        `/api/v1/assignments/${asm.id}/submissions`,
      );
      setSubmissions(res.data.data ?? []);
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    }
  };

  const handleGradeSubmission = async (e: FormEvent) => {
    e.preventDefault();
    if (!gradingSub || !activeAsm) return;
    setSubmitting(true);
    try {
      await http.put(`/api/v1/assignments/submissions/${gradingSub.id}/grade`, {
        score: Number(score),
        feedback: feedback.trim() || null,
      });
      showToast('Đã chấm điểm bài nộp', 'success');
      setGradingSub(null);
      await openSubmissionsModal(activeAsm);
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link to="/lecturer" className="btn btn-ghost" style={{ padding: '6px 10px' }}>
            <ArrowLeft size={16} />
          </Link>
          <h2 style={{ margin: 0 }}>Quản lý Lớp học phần</h2>
        </div>

        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => void downloadSectionRosterExcel(sectionId, sectionId)}
        >
          <Download size={16} />
          <span>Xuất danh sách Excel</span>
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`btn ${tab === 'lms' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setTab('lms')}
        >
          <BookOpen size={16} />
          <span>Đề cương & Bài giảng ({chapters.length})</span>
        </button>
        <button
          type="button"
          className={`btn ${tab === 'assignments' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setTab('assignments')}
        >
          <ClipboardList size={16} />
          <span>Bài tập & Chấm điểm ({assignments.length})</span>
        </button>
        <button
          type="button"
          className={`btn ${tab === 'students' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setTab('students')}
        >
          <Users size={16} />
          <span>Sinh viên ({students.length})</span>
        </button>
        <button
          type="button"
          className={`btn ${tab === 'quizzes' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setTab('quizzes')}
        >
          <HelpCircle size={16} />
          <span>Quiz</span>
        </button>
        <button
          type="button"
          className={`btn ${tab === 'grades' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setTab('grades')}
        >
          <Award size={16} />
          <span>Bảng điểm</span>
        </button>
        <button
          type="button"
          className={`btn ${tab === 'attendance' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setTab('attendance')}
        >
          <CalendarCheck size={16} />
          <span>Điểm danh</span>
        </button>
        <button
          type="button"
          className={`btn ${tab === 'announcements' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setTab('announcements')}
        >
          <Megaphone size={16} />
          <span>Thông báo lớp</span>
        </button>
      </div>

      <StateView loading={loading} error={error} empty={false} onRetry={loadAll}>
        {tab === 'quizzes' && <LecturerQuizzesPanel courseSectionId={sectionId} />}
        {tab === 'grades' && (
          <LecturerGradesPanel courseSectionId={sectionId} students={students} />
        )}
        {tab === 'attendance' && (
          <LecturerAttendancePanel courseSectionId={sectionId} students={students} />
        )}
        {tab === 'announcements' && <LecturerAnnouncementsPanel courseSectionId={sectionId} />}
        {tab === 'lms' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setChapterOpen(true)}
              >
                <Plus size={16} />
                <span>Thêm chương mới</span>
              </button>
            </div>

            {chapters.length === 0 ? (
              <div
                className="card"
                style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}
              >
                Chưa có chương học nào. Nhấn "Thêm chương mới" để bắt đầu.
              </div>
            ) : (
              chapters.map((ch, idx) => (
                <div
                  key={ch.id}
                  className="card"
                  style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <h4 style={{ margin: 0 }}>{ch.title}</h4>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ padding: '4px 8px' }}
                        disabled={idx === 0}
                        onClick={() => void handleMoveChapter(idx, -1)}
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ padding: '4px 8px' }}
                        disabled={idx === chapters.length - 1}
                        onClick={() => void handleMoveChapter(idx, 1)}
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: '5px 10px', fontSize: 12 }}
                        onClick={() => setLessonChapterId(ch.id)}
                      >
                        <Plus size={14} />
                        <span>Thêm bài giảng</span>
                      </button>
                    </div>
                  </div>

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
                        <label
                          className="btn btn-ghost"
                          style={{ padding: '4px 8px', fontSize: 12 }}
                        >
                          <Paperclip size={13} />
                          <span>{uploading ? 'Đang tải...' : 'Đính kèm tệp'}</span>
                          <input
                            type="file"
                            hidden
                            disabled={uploading}
                            onChange={(e) => void handleAttachLessonFile(ls.id, e)}
                          />
                        </label>
                      </div>
                      {ls.content && (
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                          {ls.content}
                        </p>
                      )}
                      {ls.attachments.length > 0 && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {ls.attachments.map((att) => (
                            <div
                              key={att.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                background: 'var(--bg-surface)',
                                padding: '3px 8px',
                                borderRadius: 6,
                                border: '1px solid var(--border-color)',
                                fontSize: 12,
                              }}
                            >
                              <button
                                type="button"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  padding: 0,
                                  cursor: 'pointer',
                                  color: 'var(--primary)',
                                }}
                                onClick={() => void downloadPresignedFile(att.fileId)}
                              >
                                {att.fileName}
                              </button>
                              <button
                                type="button"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  padding: 0,
                                  cursor: 'pointer',
                                  color: 'var(--danger)',
                                }}
                                onClick={() => void handleDeleteAttachment(att.id)}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <LessonCommentsPanel lessonId={ls.id} canModerate />
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'assignments' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-primary" onClick={() => setAsmOpen(true)}>
                <Plus size={16} />
                <span>Giao bài tập mới</span>
              </button>
            </div>

            {assignments.length === 0 ? (
              <div
                className="card"
                style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}
              >
                Chưa có bài tập nào được giao.
              </div>
            ) : (
              assignments.map((asm) => (
                <div
                  key={asm.id}
                  className="card"
                  style={{
                    padding: 16,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div>
                    <h4 style={{ margin: 0 }}>{asm.title}</h4>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      Hạn nộp: {new Date(asm.dueAt).toLocaleString('vi-VN')} • Điểm tối đa:{' '}
                      {asm.maxScore}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ fontSize: 13 }}
                    onClick={() => void openSubmissionsModal(asm)}
                  >
                    <Award size={15} />
                    <span>Xem & Chấm bài</span>
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'students' && (
          <div
            className="card"
            style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            {students.length === 0 ? (
              <div style={{ color: 'var(--text-muted)' }}>
                Chưa có sinh viên nào đăng ký lớp này.
              </div>
            ) : (
              students.map((st) => (
                <div
                  key={st.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 6,
                    background: 'var(--bg-subtle)',
                    fontSize: 13,
                  }}
                >
                  <span>Sinh viên ID: {st.studentId}</span>
                  <span className="badge badge-success">{st.status}</span>
                </div>
              ))
            )}
          </div>
        )}
      </StateView>

      <Modal
        open={chapterOpen}
        title="Thêm chương mới"
        onClose={() => setChapterOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setChapterOpen(false)}>
              Hủy
            </button>
            <button
              type="submit"
              form="create-chapter-form"
              className="btn btn-primary"
              disabled={submitting}
            >
              Tạo chương
            </button>
          </>
        }
      >
        <form id="create-chapter-form" onSubmit={handleCreateChapter}>
          <label style={{ fontSize: 13, fontWeight: 500 }}>Tên chương</label>
          <input
            className="input"
            value={chapterTitle}
            onChange={(e) => setChapterTitle(e.target.value)}
            required
            placeholder="Ví dụ: Chương 1 - Giới thiệu"
          />
        </form>
      </Modal>

      <Modal
        open={!!lessonChapterId}
        title="Thêm bài giảng mới"
        onClose={() => setLessonChapterId(null)}
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setLessonChapterId(null)}
            >
              Hủy
            </button>
            <button
              type="submit"
              form="create-lesson-form"
              className="btn btn-primary"
              disabled={submitting}
            >
              Tạo bài giảng
            </button>
          </>
        }
      >
        <form
          id="create-lesson-form"
          onSubmit={handleCreateLesson}
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <div>
            <label style={{ fontSize: 13, fontWeight: 500 }}>Tiêu đề bài giảng</label>
            <input
              className="input"
              value={lessonTitle}
              onChange={(e) => setLessonTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500 }}>Nội dung</label>
            <textarea
              className="input"
              rows={3}
              value={lessonContent}
              onChange={(e) => setLessonContent(e.target.value)}
            />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500 }}>Link video (tùy chọn)</label>
            <input
              className="input"
              value={lessonVideoUrl}
              onChange={(e) => setLessonVideoUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={asmOpen}
        title="Giao bài tập mới"
        onClose={() => setAsmOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setAsmOpen(false)}>
              Hủy
            </button>
            <button
              type="submit"
              form="create-asm-form"
              className="btn btn-primary"
              disabled={submitting || uploading}
            >
              Giao bài tập
            </button>
          </>
        }
      >
        <form
          id="create-asm-form"
          onSubmit={handleCreateAssignment}
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <div>
            <label style={{ fontSize: 13, fontWeight: 500 }}>Tiêu đề bài tập</label>
            <input
              className="input"
              value={asmTitle}
              onChange={(e) => setAsmTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500 }}>Mô tả yêu cầu</label>
            <textarea
              className="input"
              rows={3}
              value={asmDesc}
              onChange={(e) => setAsmDesc(e.target.value)}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500 }}>Hạn nộp</label>
              <input
                type="datetime-local"
                className="input"
                value={asmDueAt}
                onChange={(e) => setAsmDueAt(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500 }}>Điểm tối đa</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                className="input"
                value={asmMaxScore}
                onChange={(e) => setAsmMaxScore(Number(e.target.value))}
                required
              />
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <input
              type="checkbox"
              checked={asmAllowLate}
              onChange={(e) => setAsmAllowLate(e.target.checked)}
            />
            <span>Cho phép nộp trễ</span>
          </label>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500 }}>Đính kèm đề bài (tùy chọn)</label>
            <input
              type="file"
              className="input"
              disabled={uploading}
              onChange={handleUploadAsmFile}
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={!!activeAsm}
        title={`Bài nộp: ${activeAsm?.title ?? ''}`}
        onClose={() => {
          setActiveAsm(null);
          setGradingSub(null);
        }}
        footer={
          <button type="button" className="btn btn-ghost" onClick={() => setActiveAsm(null)}>
            Đóng
          </button>
        }
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            maxHeight: 360,
            overflowY: 'auto',
          }}
        >
          {submissions.length === 0 ? (
            <div style={{ color: 'var(--text-muted)' }}>Chưa có sinh viên nào nộp bài.</div>
          ) : (
            submissions.map((sub) => (
              <div
                key={sub.id}
                style={{
                  padding: 10,
                  borderRadius: 8,
                  background: 'var(--bg-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 13,
                  }}
                >
                  <strong>
                    SV: {sub.studentId.slice(0, 8)}... (v{sub.version})
                  </strong>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {sub.late && <span className="badge badge-warning">Nộp trễ</span>}
                    <span
                      className={`badge ${sub.score !== null ? 'badge-success' : 'badge-primary'}`}
                    >
                      {sub.score !== null ? `${sub.score}/${activeAsm?.maxScore}` : 'Chưa chấm'}
                    </span>
                  </div>
                </div>
                {sub.textContent && (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {sub.textContent}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  {sub.fileId && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ padding: '4px 8px', fontSize: 12 }}
                      onClick={() => void downloadPresignedFile(sub.fileId!)}
                    >
                      <Download size={13} />
                      <span>Tải bài</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ padding: '4px 8px', fontSize: 12 }}
                    onClick={() => {
                      setGradingSub(sub);
                      setScore(
                        sub.score !== null ? String(sub.score) : String(activeAsm?.maxScore ?? 10),
                      );
                      setFeedback(sub.feedback ?? '');
                    }}
                  >
                    Chấm điểm
                  </button>
                </div>
              </div>
            ))
          )}

          {gradingSub && (
            <form
              onSubmit={handleGradeSubmission}
              style={{
                borderTop: '1px solid var(--border-color)',
                paddingTop: 10,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                Chấm điểm bài nộp v{gradingSub.version}
              </div>
              <input
                type="number"
                step="0.25"
                min="0"
                max={activeAsm?.maxScore ?? 100}
                className="input"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="Điểm"
                required
              />
              <input
                className="input"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Nhận xét cho sinh viên..."
              />
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                Lưu điểm
              </button>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
}

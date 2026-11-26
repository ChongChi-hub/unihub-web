import { Lock, Megaphone, Pin, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { extractErrorMessage, http, type ApiEnvelope } from '../../shared/api/http';
import type { EnrollmentDto } from '../../shared/api/sprint2Api';
import type {
  AnnouncementDto,
  AttendanceSessionDto,
  GradeComponentDto,
  QuestionDto,
  QuizDto,
  StudentGradeDto,
} from '../../shared/api/sprint3Api';
import { Modal } from '../../shared/components/Modal';
import { StateView } from '../../shared/components/StateView';
import { useToast } from '../../shared/components/ToastProvider';

export function LecturerQuizzesPanel({ courseSectionId }: { courseSectionId: string }) {
  const { showToast } = useToast();
  const [quizzes, setQuizzes] = useState<QuizDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [maxAttempts, setMaxAttempts] = useState(2);
  const [subjectId, setSubjectId] = useState('');
  const [qContent, setQContent] = useState('');
  const [qOptions, setQOptions] = useState('A,B,C,D');
  const [qCorrect, setQCorrect] = useState('A');
  const [submitting, setSubmitting] = useState(false);

  const loadQuizzes = useCallback(async () => {
    setLoading(true);
    try {
      const [quizRes, secRes] = await Promise.all([
        http.get<ApiEnvelope<QuizDto[]>>(`/api/v1/quizzes/section/${courseSectionId}`),
        http.get<ApiEnvelope<{ id: string; subjectId: string }[]>>('/api/v1/academic/sections'),
      ]);
      setQuizzes(quizRes.data.data ?? []);
      const sec = (secRes.data.data ?? []).find((s) => s.id === courseSectionId);
      if (sec?.subjectId) setSubjectId(sec.subjectId);
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [courseSectionId, showToast]);

  useEffect(() => {
    void loadQuizzes();
  }, [loadQuizzes]);

  const handleCreateQuiz = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !qContent.trim() || !subjectId) return;
    setSubmitting(true);
    try {
      const qRes = await http.post<ApiEnvelope<QuestionDto>>('/api/v1/questions', {
        subjectId,
        type: 'SINGLE_CHOICE',
        content: qContent.trim(),
        options: qOptions
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        correctAnswers: qCorrect
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        difficulty: 'MEDIUM',
      });
      await http.post('/api/v1/quizzes', {
        courseSectionId,
        title: title.trim(),
        durationMinutes: Number(durationMinutes),
        maxAttempts: Number(maxAttempts),
        shuffleQuestions: false,
        showCorrectAnswers: true,
        published: true,
        questions: [{ questionId: qRes.data.data.id, sortOrder: 1, points: 10 }],
      });
      showToast('Đã tạo Quiz mới', 'success');
      setCreateOpen(false);
      setTitle('');
      setQContent('');
      await loadQuizzes();
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(true)}>
          <Plus size={16} />
          <span>Tạo Quiz nhanh</span>
        </button>
      </div>

      <StateView
        loading={loading}
        error={null}
        empty={quizzes.length === 0}
        emptyText="Chưa có bài Quiz nào."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {quizzes.map((q) => (
            <div
              key={q.id}
              className="card"
              style={{
                padding: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h4 style={{ margin: 0 }}>{q.title}</h4>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  {q.durationMinutes} phút • {q.questions.length} câu hỏi • Tối đa {q.maxAttempts}{' '}
                  lần
                </div>
              </div>
              <span className={`badge ${q.published ? 'badge-success' : 'badge-warning'}`}>
                {q.published ? 'Đã phát hành' : 'Nháp'}
              </span>
            </div>
          ))}
        </div>
      </StateView>

      <Modal
        open={createOpen}
        title="Tạo Quiz mới"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setCreateOpen(false)}>
              Hủy
            </button>
            <button
              type="submit"
              form="create-quiz-form"
              className="btn btn-primary"
              disabled={submitting}
            >
              Tạo Quiz
            </button>
          </>
        }
      >
        <form
          id="create-quiz-form"
          onSubmit={handleCreateQuiz}
          style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          <div>
            <label style={{ fontSize: 13, fontWeight: 500 }}>Tiêu đề Quiz</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500 }}>Thời gian (phút)</label>
              <input
                type="number"
                min={1}
                className="input"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500 }}>Số lần tối đa</label>
              <input
                type="number"
                min={1}
                className="input"
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(Number(e.target.value))}
                required
              />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500 }}>Câu hỏi trắc nghiệm mẫu</label>
            <input
              className="input"
              value={qContent}
              onChange={(e) => setQContent(e.target.value)}
              placeholder="Nội dung câu hỏi..."
              required
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500 }}>Đáp án (cách nhau dấu phẩy)</label>
              <input
                className="input"
                value={qOptions}
                onChange={(e) => setQOptions(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500 }}>Đáp án đúng</label>
              <input
                className="input"
                value={qCorrect}
                onChange={(e) => setQCorrect(e.target.value)}
                required
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function LecturerGradesPanel({
  courseSectionId,
  students,
}: {
  courseSectionId: string;
  students: EnrollmentDto[];
}) {
  const { showToast } = useToast();
  const [components, setComponents] = useState<GradeComponentDto[]>([]);
  const [grades, setGrades] = useState<StudentGradeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [compOpen, setCompOpen] = useState(false);
  const [compName, setCompName] = useState('');
  const [weightPercent, setWeightPercent] = useState(30);

  const loadGrades = useCallback(async () => {
    setLoading(true);
    try {
      const [compRes, gradeRes] = await Promise.all([
        http.get<ApiEnvelope<GradeComponentDto[]>>(
          `/api/v1/grades/section/${courseSectionId}/components`,
        ),
        http.get<ApiEnvelope<StudentGradeDto[]>>(`/api/v1/grades/section/${courseSectionId}`),
      ]);
      setComponents(compRes.data.data ?? []);
      setGrades(gradeRes.data.data ?? []);
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [courseSectionId, showToast]);

  useEffect(() => {
    void loadGrades();
  }, [loadGrades]);

  const handleCreateComponent = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await http.post('/api/v1/grades/components', {
        courseSectionId,
        name: compName.trim(),
        weightPercent: Number(weightPercent),
        linkedType: 'MANUAL',
      });
      showToast('Đã thêm cột điểm', 'success');
      setCompOpen(false);
      setCompName('');
      await loadGrades();
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    }
  };

  const handleLockComponent = async (componentId: string) => {
    try {
      await http.patch(`/api/v1/grades/components/${componentId}/lock`);
      showToast('Đã khóa cột điểm', 'info');
      await loadGrades();
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    }
  };

  const handleScoreChange = async (studentId: string, componentId: string, value: string) => {
    const score = Number(value);
    if (Number.isNaN(score) || score < 0 || score > 10) return;
    try {
      await http.put('/api/v1/grades', { courseSectionId, studentId, componentId, score });
      showToast('Đã lưu điểm', 'success');
      await loadGrades();
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-primary" onClick={() => setCompOpen(true)}>
          <Plus size={16} />
          <span>Thêm cột điểm</span>
        </button>
      </div>

      <StateView
        loading={loading}
        error={null}
        empty={components.length === 0}
        emptyText="Chưa có cột điểm nào."
      >
        <div className="card" style={{ padding: 16, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ textAlign: 'left', padding: 8 }}>Sinh viên</th>
                {components.map((c) => (
                  <th key={c.id} style={{ textAlign: 'left', padding: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>
                        {c.name} ({c.weightPercent}%)
                      </span>
                      {!c.locked && (
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ padding: 2 }}
                          title="Khóa cột điểm"
                          onClick={() => void handleLockComponent(c.id)}
                        >
                          <Lock size={12} />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((st) => (
                <tr key={st.studentId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: 8 }}>{st.studentId.slice(0, 8)}...</td>
                  {components.map((c) => {
                    const existing = grades.find(
                      (g) => g.studentId === st.studentId && g.componentId === c.id,
                    );
                    return (
                      <td key={c.id} style={{ padding: 8 }}>
                        <input
                          type="number"
                          step="0.25"
                          min="0"
                          max="10"
                          className="input"
                          style={{ width: 80, padding: '4px 8px' }}
                          defaultValue={existing?.score ?? ''}
                          disabled={c.locked}
                          onBlur={(e) => {
                            if (e.target.value !== '') {
                              void handleScoreChange(st.studentId, c.id, e.target.value);
                            }
                          }}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </StateView>

      <Modal
        open={compOpen}
        title="Thêm cột điểm mới"
        onClose={() => setCompOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setCompOpen(false)}>
              Hủy
            </button>
            <button type="submit" form="create-comp-form" className="btn btn-primary">
              Thêm
            </button>
          </>
        }
      >
        <form
          id="create-comp-form"
          onSubmit={handleCreateComponent}
          style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          <div>
            <label style={{ fontSize: 13, fontWeight: 500 }}>Tên cột điểm</label>
            <input
              className="input"
              value={compName}
              onChange={(e) => setCompName(e.target.value)}
              placeholder="Ví dụ: Giữa kỳ"
              required
            />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500 }}>Trọng số (%)</label>
            <input
              type="number"
              min={1}
              max={100}
              className="input"
              value={weightPercent}
              onChange={(e) => setWeightPercent(Number(e.target.value))}
              required
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function LecturerAttendancePanel({
  courseSectionId,
  students,
}: {
  courseSectionId: string;
  students: EnrollmentDto[];
}) {
  const { showToast } = useToast();
  const [sessions, setSessions] = useState<AttendanceSessionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [topic, setTopic] = useState('');
  const [statuses, setStatuses] = useState<
    Record<string, 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'>
  >({});

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await http.get<ApiEnvelope<AttendanceSessionDto[]>>(
        `/api/v1/attendance/section/${courseSectionId}`,
      );
      setSessions(res.data.data ?? []);
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [courseSectionId, showToast]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const handleCreateSession = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await http.post('/api/v1/attendance/sessions', {
        courseSectionId,
        sessionDate,
        topic: topic.trim() || null,
        records: students.map((s) => ({
          studentId: s.studentId,
          status: statuses[s.studentId] ?? 'PRESENT',
          note: null,
        })),
      });
      showToast('Đã lưu buổi điểm danh', 'success');
      setOpen(false);
      setTopic('');
      await loadSessions();
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
          <Plus size={16} />
          <span>Điểm danh buổi mới</span>
        </button>
      </div>

      <StateView
        loading={loading}
        error={null}
        empty={sessions.length === 0}
        emptyText="Chưa có buổi điểm danh nào."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sessions.map((s) => (
            <div
              key={s.id}
              className="card"
              style={{
                padding: 14,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <strong>{s.sessionDate}</strong>
                {s.topic && (
                  <span style={{ color: 'var(--text-secondary)', marginLeft: 8 }}>— {s.topic}</span>
                )}
              </div>
              <span className="badge badge-primary">{s.records.length} sinh viên</span>
            </div>
          ))}
        </div>
      </StateView>

      <Modal
        open={open}
        title="Điểm danh lớp học"
        onClose={() => setOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              Hủy
            </button>
            <button type="submit" form="create-attendance-form" className="btn btn-primary">
              Lưu điểm danh
            </button>
          </>
        }
      >
        <form
          id="create-attendance-form"
          onSubmit={handleCreateSession}
          style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500 }}>Ngày học</label>
              <input
                type="date"
                className="input"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500 }}>Chủ đề</label>
              <input className="input" value={topic} onChange={(e) => setTopic(e.target.value)} />
            </div>
          </div>
          <div
            style={{
              maxHeight: 240,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            {students.map((st) => (
              <div
                key={st.studentId}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 8px',
                  background: 'var(--bg-subtle)',
                  borderRadius: 6,
                }}
              >
                <span style={{ fontSize: 13 }}>{st.studentId.slice(0, 8)}...</span>
                <select
                  className="input"
                  style={{ width: 140, padding: '4px 8px' }}
                  value={statuses[st.studentId] ?? 'PRESENT'}
                  onChange={(e) =>
                    setStatuses((prev) => ({
                      ...prev,
                      [st.studentId]: e.target.value as 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED',
                    }))
                  }
                >
                  <option value="PRESENT">Có mặt</option>
                  <option value="LATE">Đi trễ</option>
                  <option value="EXCUSED">Có phép</option>
                  <option value="ABSENT">Vắng</option>
                </select>
              </div>
            ))}
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function LecturerAnnouncementsPanel({ courseSectionId }: { courseSectionId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<AnnouncementDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pinned, setPinned] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await http.get<ApiEnvelope<AnnouncementDto[]>>(
        `/api/v1/announcements/section/${courseSectionId}`,
      );
      setItems(res.data.data ?? []);
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [courseSectionId, showToast]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await http.post('/api/v1/announcements', {
        courseSectionId,
        title: title.trim(),
        content: content.trim(),
        pinned,
      });
      showToast('Đã đăng thông báo lớp', 'success');
      setOpen(false);
      setTitle('');
      setContent('');
      setPinned(false);
      await loadItems();
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await http.delete(`/api/v1/announcements/${id}`);
      showToast('Đã xóa thông báo', 'info');
      await loadItems();
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
          <Plus size={16} />
          <span>Đăng thông báo lớp</span>
        </button>
      </div>

      <StateView
        loading={loading}
        error={null}
        empty={items.length === 0}
        emptyText="Chưa có thông báo nào."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((a) => (
            <div
              key={a.id}
              className="card"
              style={{
                padding: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Megaphone size={16} color="var(--primary)" />
                  <strong>{a.title}</strong>
                  {a.pinned && (
                    <span className="badge badge-warning">
                      <Pin size={11} style={{ marginRight: 4 }} />
                      Ghim
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                  {a.content}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: 6, color: 'var(--danger)' }}
                onClick={() => void handleDelete(a.id)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </StateView>

      <Modal
        open={open}
        title="Đăng thông báo lớp học"
        onClose={() => setOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              Hủy
            </button>
            <button type="submit" form="create-ann-form" className="btn btn-primary">
              Đăng
            </button>
          </>
        }
      >
        <form
          id="create-ann-form"
          onSubmit={handleCreate}
          style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          <div>
            <label style={{ fontSize: 13, fontWeight: 500 }}>Tiêu đề</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500 }}>Nội dung</label>
            <textarea
              className="input"
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
            <span>Ghim thông báo lên đầu</span>
          </label>
        </form>
      </Modal>
    </div>
  );
}

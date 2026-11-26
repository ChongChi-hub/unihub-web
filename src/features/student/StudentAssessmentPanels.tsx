import { CheckCircle2, Clock, Megaphone, Pin, Play } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { extractErrorMessage, http, type ApiEnvelope } from '../../shared/api/http';
import type {
  AnnouncementDto,
  AttendanceSessionDto,
  GradeComponentDto,
  QuizAttemptDto,
  QuizDto,
  StudentGradeDto,
} from '../../shared/api/sprint3Api';
import { Modal } from '../../shared/components/Modal';
import { StateView } from '../../shared/components/StateView';
import { useToast } from '../../shared/components/ToastProvider';

export function StudentQuizzesPanel({ courseSectionId }: { courseSectionId: string }) {
  const { showToast } = useToast();
  const [quizzes, setQuizzes] = useState<QuizDto[]>([]);
  const [attemptsByQuiz, setAttemptsByQuiz] = useState<Record<string, QuizAttemptDto[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeQuiz, setActiveQuiz] = useState<QuizDto | null>(null);
  const [activeAttempt, setActiveAttempt] = useState<QuizAttemptDto | null>(null);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  const loadQuizzes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await http.get<ApiEnvelope<QuizDto[]>>(
        `/api/v1/quizzes/section/${courseSectionId}`,
      );
      const list = (res.data.data ?? []).filter((q) => q.published);
      setQuizzes(list);
      const entries = await Promise.all(
        list.map(async (q) => {
          try {
            const r = await http.get<ApiEnvelope<QuizAttemptDto[]>>(
              `/api/v1/quizzes/${q.id}/my-attempts`,
            );
            return [q.id, r.data.data ?? []] as const;
          } catch {
            return [q.id, []] as const;
          }
        }),
      );
      setAttemptsByQuiz(Object.fromEntries(entries));
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [courseSectionId, showToast]);

  useEffect(() => {
    void loadQuizzes();
  }, [loadQuizzes]);

  const handleStartQuiz = async (quiz: QuizDto) => {
    try {
      const [detailRes, attemptRes] = await Promise.all([
        http.get<ApiEnvelope<QuizDto>>(`/api/v1/quizzes/${quiz.id}`),
        http.post<ApiEnvelope<QuizAttemptDto>>(`/api/v1/quizzes/${quiz.id}/attempts`),
      ]);
      setActiveQuiz(detailRes.data.data);
      setActiveAttempt(attemptRes.data.data);
      setAnswers({});
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    }
  };

  const toggleAnswer = (questionId: string, option: string, isMultiple: boolean) => {
    setAnswers((prev) => {
      const current = prev[questionId] ?? [];
      if (!isMultiple) {
        return { ...prev, [questionId]: [option] };
      }
      return {
        ...prev,
        [questionId]: current.includes(option)
          ? current.filter((x) => x !== option)
          : [...current, option],
      };
    });
  };

  const handleSubmitQuiz = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeAttempt || !activeQuiz) return;
    setSubmitting(true);
    try {
      const payload = {
        answers: activeQuiz.questions.map((q) => ({
          questionId: q.questionId,
          selectedAnswers: answers[q.questionId] ?? [],
        })),
      };
      const res = await http.post<ApiEnvelope<QuizAttemptDto>>(
        `/api/v1/quizzes/attempts/${activeAttempt.id}/submit`,
        payload,
      );
      showToast(`Đã nộp bài! Điểm: ${res.data.data.score ?? 0}`, 'success');
      setActiveQuiz(null);
      setActiveAttempt(null);
      await loadQuizzes();
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <StateView
      loading={loading}
      error={null}
      empty={quizzes.length === 0}
      emptyText="Chưa có bài kiểm tra (Quiz) nào."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {quizzes.map((q) => {
          const attempts = attemptsByQuiz[q.id] ?? [];
          return (
            <div
              key={q.id}
              className="card"
              style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div>
                  <h4 style={{ margin: 0 }}>{q.title}</h4>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--text-muted)',
                      marginTop: 4,
                      display: 'flex',
                      gap: 10,
                      alignItems: 'center',
                    }}
                  >
                    <span>
                      <Clock size={12} style={{ verticalAlign: 'middle' }} /> {q.durationMinutes}{' '}
                      phút
                    </span>
                    <span>• {q.questions.length} câu hỏi</span>
                    <span>• Tối đa {q.maxAttempts} lần làm</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ padding: '6px 12px', fontSize: 13 }}
                  disabled={attempts.length >= q.maxAttempts}
                  onClick={() => void handleStartQuiz(q)}
                >
                  <Play size={14} />
                  <span>{attempts.length >= q.maxAttempts ? 'Hết lượt' : 'Làm bài'}</span>
                </button>
              </div>

              {attempts.length > 0 && (
                <div
                  style={{
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  {attempts.map((a) => (
                    <div
                      key={a.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 13,
                        padding: '6px 10px',
                        borderRadius: 6,
                        background: 'var(--bg-subtle)',
                      }}
                    >
                      <span>
                        Lần #{a.attemptNumber} • {new Date(a.startedAt).toLocaleString('vi-VN')}
                      </span>
                      <span className="badge badge-success">
                        <CheckCircle2 size={12} style={{ marginRight: 4 }} />
                        {a.score !== null ? `${a.score} điểm` : a.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Modal
        open={!!activeQuiz}
        title={activeQuiz?.title ?? 'Làm bài Quiz'}
        onClose={() => {
          setActiveQuiz(null);
          setActiveAttempt(null);
        }}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setActiveQuiz(null)}>
              Hủy
            </button>
            <button
              type="submit"
              form="take-quiz-form"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Đang nộp...' : 'Nộp bài'}
            </button>
          </>
        }
      >
        <form
          id="take-quiz-form"
          onSubmit={handleSubmitQuiz}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            maxHeight: 400,
            overflowY: 'auto',
          }}
        >
          {activeQuiz?.questions.map((q, idx) => {
            const isMultiple = q.type === 'MULTIPLE_CHOICE';
            const selected = answers[q.questionId] ?? [];
            return (
              <div
                key={q.questionId}
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: 'var(--bg-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  Câu {idx + 1} ({q.points} điểm): {q.content}
                </div>
                {q.options.map((opt) => (
                  <label
                    key={opt}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type={isMultiple ? 'checkbox' : 'radio'}
                      name={`q-${q.questionId}`}
                      checked={selected.includes(opt)}
                      onChange={() => toggleAnswer(q.questionId, opt, isMultiple)}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            );
          })}
        </form>
      </Modal>
    </StateView>
  );
}

export function StudentGradesPanel({ courseSectionId }: { courseSectionId: string }) {
  const { showToast } = useToast();
  const [components, setComponents] = useState<GradeComponentDto[]>([]);
  const [grades, setGrades] = useState<StudentGradeDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      http.get<ApiEnvelope<GradeComponentDto[]>>(
        `/api/v1/grades/section/${courseSectionId}/components`,
      ),
      http.get<ApiEnvelope<StudentGradeDto[]>>(`/api/v1/grades/section/${courseSectionId}/my`),
    ])
      .then(([compRes, gradeRes]) => {
        setComponents(compRes.data.data ?? []);
        setGrades(gradeRes.data.data ?? []);
      })
      .catch((err) => showToast(extractErrorMessage(err), 'error'))
      .finally(() => setLoading(false));
  }, [courseSectionId, showToast]);

  const gradeByComp = new Map(grades.map((g) => [g.componentId, g]));

  return (
    <StateView
      loading={loading}
      error={null}
      empty={components.length === 0}
      emptyText="Giảng viên chưa cấu hình bảng điểm."
    >
      <div
        className="card"
        style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        {components.map((c) => {
          const g = gradeByComp.get(c.id);
          return (
            <div
              key={c.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                borderRadius: 6,
                background: 'var(--bg-subtle)',
              }}
            >
              <div>
                <strong>{c.name}</strong>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
                  ({c.weightPercent}%)
                </span>
              </div>
              <span className={`badge ${g ? 'badge-success' : 'badge-primary'}`}>
                {g ? `${g.score} / 10` : 'Chưa có điểm'}
              </span>
            </div>
          );
        })}
      </div>
    </StateView>
  );
}

export function StudentAttendancePanel({ courseSectionId }: { courseSectionId: string }) {
  const { showToast } = useToast();
  const [sessions, setSessions] = useState<AttendanceSessionDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    http
      .get<ApiEnvelope<AttendanceSessionDto[]>>(`/api/v1/attendance/section/${courseSectionId}`)
      .then((res) => setSessions(res.data.data ?? []))
      .catch((err) => showToast(extractErrorMessage(err), 'error'))
      .finally(() => setLoading(false));
  }, [courseSectionId, showToast]);

  return (
    <StateView
      loading={loading}
      error={null}
      empty={sessions.length === 0}
      emptyText="Chưa có buổi điểm danh nào."
    >
      <div
        className="card"
        style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}
      >
        {sessions.map((s) => (
          <div
            key={s.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderRadius: 6,
              background: 'var(--bg-subtle)',
              fontSize: 13,
            }}
          >
            <div>
              <strong>{s.sessionDate}</strong>
              {s.topic && (
                <span style={{ color: 'var(--text-secondary)', marginLeft: 8 }}>— {s.topic}</span>
              )}
            </div>
            <span className="badge badge-primary">{s.records.length} SV ghi nhận</span>
          </div>
        ))}
      </div>
    </StateView>
  );
}

export function StudentAnnouncementsPanel({ courseSectionId }: { courseSectionId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<AnnouncementDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    http
      .get<ApiEnvelope<AnnouncementDto[]>>(`/api/v1/announcements/section/${courseSectionId}`)
      .then((res) => setItems(res.data.data ?? []))
      .catch((err) => showToast(extractErrorMessage(err), 'error'))
      .finally(() => setLoading(false));
  }, [courseSectionId, showToast]);

  return (
    <StateView
      loading={loading}
      error={null}
      empty={items.length === 0}
      emptyText="Chưa có thông báo lớp học nào."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((a) => (
          <div
            key={a.id}
            className="card"
            style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}
          >
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
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>{a.content}</p>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {new Date(a.createdAt).toLocaleString('vi-VN')}
            </div>
          </div>
        ))}
      </div>
    </StateView>
  );
}

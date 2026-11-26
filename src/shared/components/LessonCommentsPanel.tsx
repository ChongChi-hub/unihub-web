import { Award, EyeOff, MessageSquare, Send } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { extractErrorMessage, http, type ApiEnvelope } from '../api/http';
import { useToast } from './ToastProvider';

export interface LessonCommentDto {
  id: string;
  lessonId: string;
  parentId: string | null;
  authorId: string;
  content: string;
  bestAnswer: boolean;
  hidden: boolean;
  createdAt: string;
}

export function LessonCommentsPanel({
  lessonId,
  canModerate = false,
}: {
  lessonId: string;
  canModerate?: boolean;
}) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<LessonCommentDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await http.get<ApiEnvelope<LessonCommentDto[]>>(
        `/api/v1/learning/lessons/${lessonId}/comments`,
      );
      setComments(res.data.data ?? []);
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [lessonId, showToast]);

  useEffect(() => {
    if (open) void loadComments();
  }, [open, loadComments]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    try {
      await http.post(`/api/v1/learning/lessons/${lessonId}/comments`, {
        parentId: replyToId,
        content: content.trim(),
      });
      setContent('');
      setReplyToId(null);
      await loadComments();
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    }
  };

  const handleToggleBest = async (commentId: string) => {
    try {
      await http.patch(`/api/v1/learning/comments/${commentId}/best-answer`);
      await loadComments();
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    }
  };

  const handleToggleHide = async (commentId: string) => {
    try {
      await http.patch(`/api/v1/learning/comments/${commentId}/hide`);
      await loadComments();
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    }
  };

  return (
    <div style={{ marginTop: 4 }}>
      <button
        type="button"
        className="btn btn-ghost"
        style={{ padding: '4px 8px', fontSize: 12 }}
        onClick={() => setOpen((v) => !v)}
      >
        <MessageSquare size={13} />
        <span>{open ? 'Ẩn hỏi đáp' : 'Hỏi đáp bài giảng'}</span>
      </button>

      {open && (
        <div
          style={{
            marginTop: 8,
            padding: 10,
            borderRadius: 8,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {loading ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Đang tải bình luận...</div>
          ) : comments.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Chưa có câu hỏi nào cho bài giảng này.
            </div>
          ) : (
            comments.map((c) => (
              <div
                key={c.id}
                style={{
                  marginLeft: c.parentId ? 20 : 0,
                  padding: '6px 10px',
                  borderRadius: 6,
                  background: 'var(--bg-subtle)',
                  opacity: c.hidden ? 0.55 : 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 11,
                    color: 'var(--text-muted)',
                  }}
                >
                  <span>
                    {c.authorId.slice(0, 8)}... • {new Date(c.createdAt).toLocaleString('vi-VN')}
                  </span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {c.bestAnswer && <span className="badge badge-success">Câu trả lời hay</span>}
                    {c.hidden && <span className="badge badge-warning">Đã ẩn</span>}
                  </div>
                </div>
                <div style={{ fontSize: 13 }}>{c.content}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {!c.parentId && (
                    <button
                      type="button"
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        fontSize: 11,
                        color: 'var(--primary)',
                      }}
                      onClick={() => setReplyToId(c.id)}
                    >
                      Trả lời
                    </button>
                  )}
                  {canModerate && (
                    <>
                      <button
                        type="button"
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          fontSize: 11,
                          color: 'var(--success)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                        }}
                        onClick={() => void handleToggleBest(c.id)}
                      >
                        <Award size={11} />
                        <span>{c.bestAnswer ? 'Bỏ chọn hay' : 'Đánh dấu hay'}</span>
                      </button>
                      <button
                        type="button"
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          fontSize: 11,
                          color: 'var(--text-muted)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                        }}
                        onClick={() => void handleToggleHide(c.id)}
                      >
                        <EyeOff size={11} />
                        <span>{c.hidden ? 'Hiện' : 'Ẩn'}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}

          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}
          >
            {replyToId && (
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: '4px 8px', fontSize: 11 }}
                onClick={() => setReplyToId(null)}
              >
                Hủy trả lời
              </button>
            )}
            <input
              className="input"
              style={{ padding: '6px 10px', fontSize: 13 }}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={replyToId ? 'Nhập câu trả lời...' : 'Đặt câu hỏi về bài giảng...'}
              required
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '6px 10px' }}>
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

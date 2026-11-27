import { Bot, BookPlus, Send } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { extractErrorMessage, http, type ApiEnvelope } from '../api/http';
import type { ChatResponse, ConversationDto, MessageDto } from '../api/sprint4Api';
import { useToast } from './ToastProvider';

export function AiAssistantPanel({
  courseSectionId,
  canIndex = false,
}: {
  courseSectionId: string;
  canIndex?: boolean;
}) {
  const { showToast } = useToast();
  const [conversations, setConversations] = useState<ConversationDto[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [question, setQuestion] = useState('');
  const [sending, setSending] = useState(false);

  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');
  const [indexing, setIndexing] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      const res = await http.get<ApiEnvelope<ConversationDto[]>>(
        `/api/v1/ai/conversations?courseSectionId=${courseSectionId}`,
      );
      const list = res.data.data ?? [];
      setConversations(list);
      if (list.length > 0 && !activeConvId) {
        setActiveConvId(list[0].id);
      }
    } catch {
      // ignore if ai-service is offline
    }
  }, [courseSectionId, activeConvId]);

  const loadMessages = useCallback(
    async (convId: string) => {
      try {
        const res = await http.get<ApiEnvelope<MessageDto[]>>(
          `/api/v1/ai/conversations/${convId}/messages`,
        );
        setMessages(res.data.data ?? []);
      } catch (err) {
        showToast(extractErrorMessage(err), 'error');
      }
    },
    [showToast],
  );

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (activeConvId) void loadMessages(activeConvId);
    else setMessages([]);
  }, [activeConvId, loadMessages]);

  const handleChat = async (e: FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setSending(true);
    try {
      const res = await http.post<ApiEnvelope<ChatResponse>>('/api/v1/ai/chat', {
        courseSectionId,
        conversationId: activeConvId,
        question: question.trim(),
      });
      setQuestion('');
      setActiveConvId(res.data.data.conversationId);
      await loadConversations();
      await loadMessages(res.data.data.conversationId);
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    } finally {
      setSending(false);
    }
  };

  const handleIndexDoc = async (e: FormEvent) => {
    e.preventDefault();
    if (!docContent.trim()) return;
    setIndexing(true);
    try {
      const res = await http.post<ApiEnvelope<{ chunksIndexed: number }>>(
        '/api/v1/ai/documents/index',
        {
          courseSectionId,
          title: docTitle.trim() || 'Tài liệu lớp học',
          content: docContent.trim(),
        },
      );
      showToast(
        `Đã lập chỉ mục ${res.data.data.chunksIndexed} đoạn tài liệu cho AI RAG`,
        'success',
      );
      setDocTitle('');
      setDocContent('');
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    } finally {
      setIndexing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {canIndex && (
        <form
          className="card"
          style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}
          onSubmit={handleIndexDoc}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
            <BookPlus size={17} color="var(--primary)" />
            <span>Nạp tài liệu cho Trợ giảng AI (RAG)</span>
          </div>
          <input
            className="input"
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            placeholder="Tiêu đề tài liệu / chương..."
          />
          <textarea
            className="input"
            rows={3}
            value={docContent}
            onChange={(e) => setDocContent(e.target.value)}
            placeholder="Dán nội dung bài giảng hoặc tóm tắt kiến thức để AI trả lời sinh viên..."
            required
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={indexing}>
              {indexing ? 'Đang xử lý...' : 'Lập chỉ mục tài liệu'}
            </button>
          </div>
        </form>
      )}

      <div
        className="card"
        style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
            <Bot size={18} color="var(--primary)" />
            <span>Trợ giảng AI (Hỏi đáp theo tài liệu lớp)</span>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {conversations.length > 0 && (
              <select
                className="input"
                style={{ width: 200, padding: '4px 8px', fontSize: 12 }}
                value={activeConvId ?? ''}
                onChange={(e) => setActiveConvId(e.target.value || null)}
              >
                {conversations.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              className="btn btn-ghost"
              style={{ padding: '4px 10px', fontSize: 12 }}
              onClick={() => setActiveConvId(null)}
            >
              Cuộc trò chuyện mới
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            maxHeight: 340,
            overflowY: 'auto',
            padding: 8,
            borderRadius: 8,
            background: 'var(--bg-subtle)',
          }}
        >
          {messages.length === 0 ? (
            <div
              style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}
            >
              Hãy đặt câu hỏi về nội dung bài giảng trong lớp học phần này.
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                style={{
                  alignSelf: m.role === 'USER' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: m.role === 'USER' ? 'var(--primary)' : 'var(--bg-surface)',
                  color: m.role === 'USER' ? '#fff' : 'var(--text-primary)',
                  border: m.role === 'USER' ? 'none' : '1px solid var(--border-color)',
                  fontSize: 13,
                }}
              >
                <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
                {m.citations && m.citations.length > 0 && (
                  <div
                    style={{
                      marginTop: 6,
                      paddingTop: 6,
                      borderTop: '1px solid var(--border-color)',
                      fontSize: 11,
                      color: 'var(--text-muted)',
                    }}
                  >
                    Trích dẫn ({m.citations.length}):{' '}
                    {m.citations.map((c) => `#${c.chunkIndex}`).join(', ')}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleChat} style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Nhập câu hỏi cho Trợ giảng AI..."
            disabled={sending}
            required
          />
          <button type="submit" className="btn btn-primary" disabled={sending}>
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}

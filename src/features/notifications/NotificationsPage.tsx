import { Bell, CheckCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { extractErrorMessage, http, type ApiEnvelope } from '../../shared/api/http';
import type { NotificationDto } from '../../shared/api/sprint3Api';
import { StateView } from '../../shared/components/StateView';
import { useToast } from '../../shared/components/ToastProvider';

export function NotificationsPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await http.get<ApiEnvelope<NotificationDto[]>>('/api/v1/notifications');
      setItems(res.data.data ?? []);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const handleMarkRead = async (id: string) => {
    try {
      await http.patch(`/api/v1/notifications/${id}/read`);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await http.patch('/api/v1/notifications/read-all');
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      showToast('Đã đánh dấu tất cả thông báo là đã đọc', 'success');
    } catch (err) {
      showToast(extractErrorMessage(err), 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 800 }}>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Bell size={22} color="var(--primary)" />
          <h2 style={{ margin: 0 }}>Thông báo</h2>
        </div>
        {items.some((n) => !n.read) && (
          <button type="button" className="btn btn-ghost" onClick={() => void handleMarkAllRead()}>
            <CheckCheck size={16} />
            <span>Đánh dấu tất cả đã đọc</span>
          </button>
        )}
      </div>

      <StateView
        loading={loading}
        error={error}
        empty={items.length === 0}
        emptyText="Bạn chưa có thông báo nào."
        onRetry={loadNotifications}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((n) => (
            <div
              key={n.id}
              className="card"
              style={{
                padding: 16,
                borderLeft: n.read ? '1px solid var(--border-color)' : '4px solid var(--primary)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <strong>{n.title}</strong>
                  <span className="badge badge-primary">{n.type}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{n.body}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {new Date(n.createdAt).toLocaleString('vi-VN')}
                </div>
              </div>
              {!n.read && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ padding: '4px 10px', fontSize: 12, flexShrink: 0 }}
                  onClick={() => void handleMarkRead(n.id)}
                >
                  Đã đọc
                </button>
              )}
            </div>
          ))}
        </div>
      </StateView>
    </div>
  );
}

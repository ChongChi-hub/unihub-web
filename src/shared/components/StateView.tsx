import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

interface StateViewProps {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyText?: string;
  onRetry?: () => void;
  children: ReactNode;
}

export function StateView({
  loading,
  error,
  empty,
  emptyText = 'Không có dữ liệu hiển thị.',
  onRetry,
  children,
}: StateViewProps) {
  if (loading) {
    return (
      <div
        className="card"
        style={{ padding: '48px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
      >
        <Loader2 size={20} className="spin" />
        <span style={{ color: 'var(--text-secondary)' }}>Đang tải dữ liệu...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="card"
        style={{
          padding: '32px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          textAlign: 'center',
        }}
      >
        <AlertTriangle size={28} color="var(--danger)" />
        <div style={{ fontWeight: 600 }}>Không thể tải dữ liệu</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{error}</div>
        {onRetry && (
          <button type="button" className="btn btn-ghost" onClick={onRetry}>
            Thử lại
          </button>
        )}
      </div>
    );
  }

  if (empty) {
    return (
      <div
        className="card"
        style={{
          padding: '40px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          color: 'var(--text-muted)',
        }}
      >
        <Inbox size={28} />
        <span style={{ fontSize: 14 }}>{emptyText}</span>
      </div>
    );
  }

  return <>{children}</>;
}

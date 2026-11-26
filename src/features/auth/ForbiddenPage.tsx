import { ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getHomeRouteForRoles, useAuth } from './AuthContext';

export function ForbiddenPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 24,
        textAlign: 'center',
      }}
    >
      <ShieldAlert size={42} color="var(--danger)" />
      <h1 style={{ margin: 0, fontSize: 24 }}>403 — Không có quyền truy cập</h1>
      <p style={{ margin: 0, color: 'var(--text-secondary)', maxWidth: 420 }}>
        Tài khoản hiện tại không có quyền vào trang này.
      </p>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => navigate(user ? getHomeRouteForRoles(user.roles) : '/login')}
      >
        Quay về trang chính
      </button>
    </div>
  );
}

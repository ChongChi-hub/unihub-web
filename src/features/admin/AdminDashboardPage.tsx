import { useAuth } from '../../features/auth/AuthContext';

export function AdminDashboardPage() {
  const { user } = useAuth();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ margin: 0 }}>Cổng Quản trị viên</h2>
      <div className="card" style={{ padding: 20 }}>
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
          Xin chào <strong>{user?.fullName}</strong>. Chọn mục <strong>Người dùng</strong> hoặc{' '}
          <strong>Danh mục học thuật</strong> ở thanh bên trái để quản lý dữ liệu Sprint 1.
        </p>
      </div>
    </div>
  );
}

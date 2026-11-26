import { useAuth } from '../../features/auth/AuthContext';

export function StudentDashboardPage() {
  const { user } = useAuth();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ margin: 0 }}>Cổng Sinh viên</h2>
      <div className="card" style={{ padding: 20 }}>
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
          Xin chào Sinh viên <strong>{user?.fullName}</strong>. Các tính năng đăng ký học phần, thời
          khóa biểu và học tập sẽ được mở ở Sprint 2.
        </p>
      </div>
    </div>
  );
}

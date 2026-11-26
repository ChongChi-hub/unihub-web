import { useAuth } from '../../features/auth/AuthContext';

export function LecturerDashboardPage() {
  const { user } = useAuth();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ margin: 0 }}>Cổng Giảng viên</h2>
      <div className="card" style={{ padding: 20 }}>
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
          Xin chào Giảng viên <strong>{user?.fullName}</strong>. Các tính năng lớp học phần, bài
          giảng và chấm bài sẽ được mở ở Sprint 2.
        </p>
      </div>
    </div>
  );
}

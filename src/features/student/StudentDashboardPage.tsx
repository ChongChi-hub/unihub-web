import { BookOpen, Calendar, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';

export function StudentDashboardPage() {
  const { user } = useAuth();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h2 style={{ margin: 0 }}>Cổng Sinh viên</h2>
      <div className="card" style={{ padding: 20 }}>
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
          Xin chào Sinh viên <strong>{user?.fullName}</strong>. Chọn chức năng bên dưới để bắt đầu
          đăng ký học phần, xem thời khóa biểu và học tập trực tuyến.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
        }}
      >
        <Link
          to="/student/enroll"
          className="card"
          style={{
            padding: 20,
            textDecoration: 'none',
            color: 'inherit',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <Calendar size={24} color="var(--primary)" />
          <div style={{ fontWeight: 600, fontSize: 16 }}>Đăng ký học phần & TKB</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Xem danh sách lớp mở, đăng ký/hủy môn và theo dõi thời khóa biểu tuần.
          </div>
        </Link>

        <Link
          to="/student/courses"
          className="card"
          style={{
            padding: 20,
            textDecoration: 'none',
            color: 'inherit',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <BookOpen size={24} color="var(--primary)" />
          <div style={{ fontWeight: 600, fontSize: 16 }}>Lớp học & Bài tập (LMS)</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Xem bài giảng, tải tài liệu, đánh dấu tiến độ và nộp bài tập trực tuyến.
          </div>
        </Link>

        <Link
          to="/profile"
          className="card"
          style={{
            padding: 20,
            textDecoration: 'none',
            color: 'inherit',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <UserCheck size={24} color="var(--primary)" />
          <div style={{ fontWeight: 600, fontSize: 16 }}>Hồ sơ cá nhân</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Cập nhật họ tên và ảnh đại diện sinh viên.
          </div>
        </Link>
      </div>
    </div>
  );
}

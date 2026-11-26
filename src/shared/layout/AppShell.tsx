import {
  BookOpen,
  Calendar,
  GraduationCap,
  Layers,
  LayoutDashboard,
  LogOut,
  Moon,
  Sun,
  UserCircle,
  Users,
} from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth, type UserRole } from '../../features/auth/AuthContext';
import { useTheme } from '../theme/ThemeProvider';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { to: '/admin', label: 'Tổng quan Admin', icon: LayoutDashboard, roles: ['ADMIN'] },
  { to: '/admin/users', label: 'Người dùng', icon: Users, roles: ['ADMIN'] },
  { to: '/admin/academic', label: 'Danh mục học thuật', icon: BookOpen, roles: ['ADMIN'] },
  { to: '/admin/sections', label: 'Lớp học phần', icon: Layers, roles: ['ADMIN'] },
  { to: '/lecturer', label: 'Cổng Giảng viên', icon: GraduationCap, roles: ['LECTURER'] },
  { to: '/student', label: 'Cổng Sinh viên', icon: LayoutDashboard, roles: ['STUDENT'] },
  { to: '/student/enroll', label: 'Đăng ký & TKB', icon: Calendar, roles: ['STUDENT'] },
  { to: '/student/courses', label: 'Lớp học & LMS', icon: BookOpen, roles: ['STUDENT'] },
  {
    to: '/profile',
    label: 'Hồ sơ cá nhân',
    icon: UserCircle,
    roles: ['ADMIN', 'LECTURER', 'STUDENT'],
  },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const visibleNav = NAV_ITEMS.filter((item) =>
    item.roles.some((role) => user?.roles.includes(role)),
  );

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside
        style={{
          width: 248,
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          padding: 16,
          gap: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 8px' }}>
          <GraduationCap size={24} color="var(--primary)" />
          <span style={{ fontWeight: 700, fontSize: 18 }}>Unihub</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          {visibleNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/admin' || item.to === '/student' || item.to === '/lecturer'}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: 500,
                  background: isActive ? 'var(--primary-soft)' : 'transparent',
                  color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                })}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div
          style={{
            borderTop: '1px solid var(--border-color)',
            paddingTop: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.fullName}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user?.email}</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {user?.roles.map((r) => (
              <span key={r} className="badge badge-primary">
                {r}
              </span>
            ))}
          </div>
        </div>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header
          style={{
            height: 60,
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '0 24px',
            gap: 10,
          }}
        >
          <button
            type="button"
            className="btn btn-ghost"
            onClick={toggleTheme}
            title="Đổi giao diện"
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <button type="button" className="btn btn-ghost" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Đăng xuất</span>
          </button>
        </header>

        <main style={{ flex: 1, padding: 24 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

import { ArrowRight, BookOpen, CalendarDays, Eye, EyeOff, GraduationCap, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { extractErrorMessage } from '../../shared/api/http';
import { getHomeRouteForRoles, useAuth } from './AuthContext';

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) {
    return <Navigate to={getHomeRouteForRoles(user.roles)} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const loggedIn = await login(email.trim(), password);
      navigate(getHomeRouteForRoles(loggedIn.roles), { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err, 'Email hoặc mật khẩu không chính xác'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-shell">
      <section className="login-brand-panel" aria-label="Giới thiệu cổng Unihub">
        <div className="login-brand-grid" aria-hidden="true" />
        <div className="login-brand-inner">
          <div className="login-wordmark">
            <span className="login-mark">
              <GraduationCap size={20} />
            </span>
            <span>Unihub</span>
          </div>

          <div className="login-hero-copy">
            <p className="login-eyebrow">Cổng đào tạo đại học</p>
            <h1 className="login-headline">
              Không gian học tập và quản trị học vụ thống nhất.
            </h1>
            <p className="login-lead">
              Kết nối phòng đào tạo, giảng viên và sinh viên trên cùng một hệ thống xuyên suốt từ
              đăng ký học phần đến đánh giá kết quả.
            </p>
          </div>

          <div className="login-pillars">
            <div className="login-pillar">
              <CalendarDays size={18} color="#5ab9fc" />
              <div>
                <div className="login-pillar-title">Quản lý đào tạo</div>
                <div className="login-pillar-desc">Chương trình khung, học kỳ và thời khóa biểu</div>
              </div>
            </div>
            <div className="login-pillar">
              <BookOpen size={18} color="#5ab9fc" />
              <div>
                <div className="login-pillar-title">Học tập &amp; Bài tập</div>
                <div className="login-pillar-desc">Tài liệu môn học, tiến độ và nộp bài trực tuyến</div>
              </div>
            </div>
            <div className="login-pillar">
              <ShieldCheck size={18} color="#5ab9fc" />
              <div>
                <div className="login-pillar-title">Phân quyền theo vai trò</div>
                <div className="login-pillar-desc">Tự động điều hướng cổng Quản trị, Giảng viên, Sinh viên</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="login-form-panel">
        <div className="login-card">
          <div className="login-card-header">
            <div className="login-mobile-brand">
              <GraduationCap size={20} color="#5ab9fc" />
              <span>Unihub</span>
            </div>
            <h2 className="login-card-title">Đăng nhập hệ thống</h2>
            <p className="login-card-subtitle">Sử dụng tài khoản trường cấp để truy cập cổng của bạn.</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {error && (
              <div className="login-error" role="alert">
                {error}
              </div>
            )}

            <div className="login-field">
              <label htmlFor="login-email" className="login-label">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                className="login-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="login-field">
              <label htmlFor="login-password" className="login-label">
                Mật khẩu
              </label>
              <div className="login-password-wrap">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="login-input login-input-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="login-eye-btn"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="login-submit" disabled={submitting}>
              <span>{submitting ? 'Đang xác thực...' : 'Đăng nhập'}</span>
              {!submitting && <ArrowRight size={16} />}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

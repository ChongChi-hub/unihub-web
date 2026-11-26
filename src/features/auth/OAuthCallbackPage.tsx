import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getHomeRouteForRoles, useAuth } from './AuthContext';

export function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const { loginWithTokens } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const oauthError = params.get('oauthError');

    if (oauthError) {
      navigate(`/login?oauthError=${encodeURIComponent(oauthError)}`, { replace: true });
      return;
    }

    if (!accessToken || !refreshToken) {
      navigate('/login', { replace: true });
      return;
    }

    void loginWithTokens(accessToken, refreshToken)
      .then((user) => navigate(getHomeRouteForRoles(user.roles), { replace: true }))
      .catch(() => navigate('/login', { replace: true }));
  }, [loginWithTokens, navigate, params]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0d14',
        color: '#e9edf3',
        fontSize: 15,
      }}
    >
      Đang hoàn tất đăng nhập...
    </div>
  );
}

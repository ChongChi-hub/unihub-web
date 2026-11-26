import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AdminAcademicPage } from './features/admin/AdminAcademicPage';
import { AdminDashboardPage } from './features/admin/AdminDashboardPage';
import { AdminUsersPage } from './features/admin/AdminUsersPage';
import { AuthProvider, getHomeRouteForRoles, useAuth } from './features/auth/AuthContext';
import { ForbiddenPage } from './features/auth/ForbiddenPage';
import { LoginPage } from './features/auth/LoginPage';
import { ProtectedRoute } from './features/auth/ProtectedRoute';
import { LecturerDashboardPage } from './features/lecturer/LecturerDashboardPage';
import { StudentDashboardPage } from './features/student/StudentDashboardPage';
import { ToastProvider } from './shared/components/ToastProvider';
import { AppShell } from './shared/layout/AppShell';
import { ThemeProvider } from './shared/theme/ThemeProvider';

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={getHomeRouteForRoles(user.roles)} replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/403" element={<ForbiddenPage />} />

              <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                <Route element={<AppShell />}>
                  <Route path="/admin" element={<AdminDashboardPage />} />
                  <Route path="/admin/users" element={<AdminUsersPage />} />
                  <Route path="/admin/academic" element={<AdminAcademicPage />} />
                </Route>
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['LECTURER']} />}>
                <Route element={<AppShell />}>
                  <Route path="/lecturer" element={<LecturerDashboardPage />} />
                </Route>
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['STUDENT']} />}>
                <Route element={<AppShell />}>
                  <Route path="/student" element={<StudentDashboardPage />} />
                </Route>
              </Route>

              <Route path="*" element={<RootRedirect />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

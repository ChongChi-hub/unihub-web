import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AdminAcademicPage } from './features/admin/AdminAcademicPage';
import { AdminDashboardPage } from './features/admin/AdminDashboardPage';
import { AdminSectionsPage } from './features/admin/AdminSectionsPage';
import { AdminUsersPage } from './features/admin/AdminUsersPage';
import { AuthProvider, getHomeRouteForRoles, useAuth } from './features/auth/AuthContext';
import { ForbiddenPage } from './features/auth/ForbiddenPage';
import { LoginPage } from './features/auth/LoginPage';
import { OAuthCallbackPage } from './features/auth/OAuthCallbackPage';
import { ProtectedRoute } from './features/auth/ProtectedRoute';
import { LecturerCourseWorkspacePage } from './features/lecturer/LecturerCourseWorkspacePage';
import { LecturerDashboardPage } from './features/lecturer/LecturerDashboardPage';
import { NotificationsPage } from './features/notifications/NotificationsPage';
import { ProfilePage } from './features/profile/ProfilePage';
import { StudentCoursesPage } from './features/student/StudentCoursesPage';
import { StudentDashboardPage } from './features/student/StudentDashboardPage';
import { StudentEnrollPage } from './features/student/StudentEnrollPage';
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
              <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
              <Route path="/403" element={<ForbiddenPage />} />

              <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                <Route element={<AppShell />}>
                  <Route path="/admin" element={<AdminDashboardPage />} />
                  <Route path="/admin/users" element={<AdminUsersPage />} />
                  <Route path="/admin/academic" element={<AdminAcademicPage />} />
                  <Route path="/admin/sections" element={<AdminSectionsPage />} />
                </Route>
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['LECTURER']} />}>
                <Route element={<AppShell />}>
                  <Route path="/lecturer" element={<LecturerDashboardPage />} />
                  <Route
                    path="/lecturer/sections/:sectionId"
                    element={<LecturerCourseWorkspacePage />}
                  />
                </Route>
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['STUDENT']} />}>
                <Route element={<AppShell />}>
                  <Route path="/student" element={<StudentDashboardPage />} />
                  <Route path="/student/enroll" element={<StudentEnrollPage />} />
                  <Route path="/student/courses" element={<StudentCoursesPage />} />
                </Route>
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'LECTURER', 'STUDENT']} />}>
                <Route element={<AppShell />}>
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
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

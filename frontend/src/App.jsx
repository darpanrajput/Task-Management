import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/common/ProtectedRoute.jsx'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import AdminLoginPage from './pages/AdminLoginPage.jsx'
import UserLoginPage from './pages/UserLoginPage.jsx'
import UnauthorizedPage from './pages/UnauthorizedPage.jsx'
import AdminDashboardPage from './pages/AdminDashboardPage.jsx'
import UserDashboardPage from './pages/UserDashboardPage.jsx'

function HomeRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login/user" replace />
  return <Navigate to={user.role === 'Admin' ? '/admin' : '/user'} replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login/admin" element={<AdminLoginPage />} />
      <Route path="/login/user" element={<UserLoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['Admin']}>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user"
        element={
          <ProtectedRoute allowedRoles={['User', 'Manager']}>
            <UserDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App

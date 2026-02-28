import { Link } from 'react-router-dom'
import AuthForm from '../components/auth/AuthForm.jsx'

function AdminLoginPage() {
  return (
    <main className="auth-shell">
      <AuthForm
        expectedRole="Admin"
        title="Admin Login"
        subtitle="Use an Admin account to manage users, tasks, assignment, and seeding."
      />
      <p className="switch-link">
        Normal user? <Link to="/login/user">Go to User Login</Link>
      </p>
    </main>
  )
}

export default AdminLoginPage

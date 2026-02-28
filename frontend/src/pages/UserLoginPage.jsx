import { Link } from "react-router-dom";
import AuthForm from "../components/auth/AuthForm.jsx";

function UserLoginPage() {
  return (
    <main className="auth-shell">
      <AuthForm expectedRole="User" title="User Login" subtitle="" />
      <p className="switch-link">
        Admin? <Link to="/login/admin">Go to Admin Login</Link>
      </p>
    </main>
  );
}

export default UserLoginPage;

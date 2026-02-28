import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

function TopNav({ title }) {
  const { user, logout } = useAuth()

  return (
    <header className="top-nav">
      <div>
        <h1>{title}</h1>
        <p>
          {user?.name} ({user?.role})
        </p>
      </div>
      <div className="top-nav-actions">
        {user?.role === 'Admin' ? <Link to="/admin">Admin Dashboard</Link> : <Link to="/user">User Dashboard</Link>}
        <button onClick={logout}>Logout</button>
      </div>
    </header>
  )
}

export default TopNav

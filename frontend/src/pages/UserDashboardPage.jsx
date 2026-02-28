import { useEffect, useMemo, useState } from 'react'
import TopNav from '../components/layout/TopNav.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { apiRequest } from '../lib/api.js'

const statusOptions = ['Todo', 'In Progress', 'Done']

function statusClass(status) {
  if (status === 'Todo') return 'status-todo'
  if (status === 'In Progress') return 'status-inprogress'
  if (status === 'Done') return 'status-done'
  return ''
}

function normalizeId(value) {
  if (!value) return ''
  if (typeof value === 'object') return value._id || ''
  return value
}

function getAssigneeName(task) {
  const assignee = task?.assignedUserId
  if (!assignee) return 'Unassigned'
  if (typeof assignee === 'object') return assignee.name || assignee.email || assignee._id || 'Unassigned'
  return String(assignee)
}

function initials(name) {
  if (!name || name === 'Unassigned') return 'UA'
  return name
    .split(' ')
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() || '')
    .join('')
}

function UserDashboardPage() {
  const { token, user } = useAuth()
  const [activeTab, setActiveTab] = useState('board')
  const [tasks, setTasks] = useState([])
  const [myEligibleTasks, setMyEligibleTasks] = useState([])
  const [dragTaskId, setDragTaskId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [filter, setFilter] = useState({ search: '', status: 'All' })

  const load = async () => {
    setMessage('')
    setError('')
    try {
      const [allTasks, eligibleTasks] = await Promise.all([
        apiRequest('/tasks'),
        apiRequest('/tasks/my-eligible-tasks', { token }),
      ])
      setTasks(allTasks.tasks || [])
      setMyEligibleTasks(Array.isArray(eligibleTasks) ? eligibleTasks : [])
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filteredEligibleTasks = useMemo(() => {
    return myEligibleTasks.filter((task) => {
      if (filter.status !== 'All' && task.status !== filter.status) return false
      if (!filter.search.trim()) return true
      const text = `${task.title} ${task.description || ''}`.toLowerCase()
      return text.includes(filter.search.toLowerCase())
    })
  }, [myEligibleTasks, filter])

  const groupedTasks = useMemo(() => {
    const map = { Todo: [], 'In Progress': [], Done: [] }
    for (const task of filteredEligibleTasks) map[task.status]?.push(task)
    return map
  }, [filteredEligibleTasks])

  const stats = useMemo(() => {
    const done = myEligibleTasks.filter((task) => task.status === 'Done').length
    const inProgress = myEligibleTasks.filter((task) => task.status === 'In Progress').length
    return [
      { label: 'My Visible Tasks', value: myEligibleTasks.length },
      { label: 'In Progress', value: inProgress },
      { label: 'Done', value: done },
    ]
  }, [myEligibleTasks])

  const canUpdateTask = (task) => {
    const assigneeId = normalizeId(task.assignedUserId)
    const creatorId = normalizeId(task.createdBy)
    return user?.role === 'Admin' || assigneeId === user?._id || creatorId === user?._id
  }

  const updateStatus = async (taskId, nextStatus) => {
    setMessage('')
    setError('')
    try {
      await apiRequest(`/tasks/${taskId}`, {
        method: 'PATCH',
        token,
        body: { status: nextStatus },
      })
      setMessage('Task status updated.')
      load()
    } catch (err) {
      setError(err.message)
      load()
    }
  }

  const completeTask = async (taskId) => {
    setMessage('')
    setError('')
    try {
      await apiRequest(`/assignments/${taskId}/complete`, { method: 'POST', token })
      setMessage('Task completed.')
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDragStart = (task) => {
    if (!canUpdateTask(task)) return
    setDragTaskId(task._id)
  }

  const handleDropOnStatus = async (nextStatus) => {
    if (!dragTaskId) return
    const current = filteredEligibleTasks.find((task) => task._id === dragTaskId)
    setDragTaskId('')
    if (!current || current.status === nextStatus) return
    if (!canUpdateTask(current)) {
      setError('You are not allowed to change this task status.')
      return
    }
    await updateStatus(dragTaskId, nextStatus)
  }

  const canCompleteTask = (task) => normalizeId(task.assignedUserId) === user?._id

  return (
    <main className="dashboard-shell jira-shell">
      <TopNav title="My Tasks" />

      {message ? <p className="success-banner">{message}</p> : null}
      {error ? <p className="error-banner">{error}</p> : null}

      <section className="jira-stats user-stats">
        {stats.map((stat) => (
          <article key={stat.label} className="stat-card">
            <p>{stat.label}</p>
            <h3>{stat.value}</h3>
          </article>
        ))}
      </section>

      <section className="panel tabs-panel">
        <div className="tabs-row">
          <button className={activeTab === 'board' ? 'tab-btn active' : 'tab-btn'} onClick={() => setActiveTab('board')}>
            Task Board
          </button>
          <button className={activeTab === 'all' ? 'tab-btn active' : 'tab-btn'} onClick={() => setActiveTab('all')}>
            All Tasks
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="row">
          <h2>{activeTab === 'board' ? 'Task Board' : 'All Tasks'}</h2>
          <button onClick={load}>Refresh</button>
        </div>

        <div className="filters jira-filters">
          <input
            placeholder="Search tasks"
            value={filter.search}
            onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
          />
          <select value={filter.status} onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}>
            <option value="All">All statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        {activeTab === 'board' ? (
          <div className="kanban-grid jira-board">
            {statusOptions.map((status) => (
              <section
                key={status}
                className={`kanban-col ${dragTaskId ? 'drop-active' : ''}`}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => handleDropOnStatus(status)}
              >
                <header>
                  <h3 className={`status-pill ${statusClass(status)}`}>{status}</h3>
                  <span>{groupedTasks[status].length}</span>
                </header>
                <div className="kanban-list">
                  {groupedTasks[status].map((task) => {
                    const assignee = getAssigneeName(task)
                    const isEditable = canUpdateTask(task)
                    return (
                      <article
                        key={task._id}
                        className={`kanban-card jira-card ${isEditable ? '' : 'disabled-drag'}`}
                        draggable={isEditable}
                        onDragStart={() => handleDragStart(task)}
                      >
                        <div className="jira-card-head">
                          <span className={`status-pill ${statusClass(task.status)}`}>{task.status}</span>
                          <span className={`pill priority-${String(task.priority || 'Low').toLowerCase()}`}>
                            {task.priority || 'Low'}
                          </span>
                          <span className="muted">#{task._id?.slice(-5)}</span>
                        </div>
                        <h4>{task.title}</h4>
                        <p>{task.description || 'No description'}</p>
                        <div className="jira-assignee">Assignee: {assignee}</div>
                        <div className="jira-meta">
                          <span>Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}</span>
                          <span className="avatar">{initials(assignee)}</span>
                        </div>
                      </article>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="task-table-wrap">
            <table className="task-table">
              <thead>
                <tr>
                  <th>Issue</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Assignee</th>
                  <th>Due</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEligibleTasks.map((task) => (
                  <tr key={task._id}>
                    <td>
                      <strong>{task.title}</strong>
                      <div className="muted">{task.description || 'No description'}</div>
                      <div className="muted">#{task._id?.slice(-8)}</div>
                    </td>
                    <td>
                      <select
                        className={statusClass(task.status)}
                        value={task.status}
                        onChange={(e) => updateStatus(task._id, e.target.value)}
                        disabled={!canUpdateTask(task)}
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{task.priority || 'Low'}</td>
                    <td>{getAssigneeName(task)}</td>
                    <td>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}</td>
                    <td>
                      <button onClick={() => completeTask(task._id)} disabled={!canCompleteTask(task)}>
                        Complete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </main>
  )
}

export default UserDashboardPage

import { useEffect, useMemo, useState } from 'react'
import TopNav from '../components/layout/TopNav.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { apiRequest } from '../lib/api.js'

const statusOptions = ['Todo', 'In Progress', 'Done']
const priorityOptions = ['Low', 'Medium', 'High']
const departmentOptions = ['', 'Finance', 'HR', 'IT', 'Operations']

function statusClass(status) {
  if (status === 'Todo') return 'status-todo'
  if (status === 'In Progress') return 'status-inprogress'
  if (status === 'Done') return 'status-done'
  return ''
}

function getAssigneeName(task, userMap) {
  const assigned = task?.assignedUserId
  if (!assigned) return 'Unassigned'
  if (typeof assigned === 'object') return assigned.name || assigned.email || assigned._id || 'Unassigned'
  return userMap.get(String(assigned)) || 'Unassigned'
}

function initials(name) {
  if (!name || name === 'Unassigned') return 'UA'
  return name
    .split(' ')
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() || '')
    .join('')
}

function AdminDashboardPage() {
  const { token } = useAuth()
  const [activeTab, setActiveTab] = useState('board')
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  const [eligibleByTask, setEligibleByTask] = useState({})
  const [draft, setDraft] = useState({})
  const [dragTaskId, setDragTaskId] = useState('')
  const [filter, setFilter] = useState({ search: '', status: 'All', priority: 'All' })
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    dueDate: '',
    department: '',
    minExperience: '',
    maxActiveTasks: '',
    location: '',
  })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [forceModal, setForceModal] = useState({
    open: false,
    taskId: '',
    action: 'assign',
    selectedUserId: '',
    reason: '',
    reasons: [],
    taskTitle: '',
  })
  const [forcingAssign, setForcingAssign] = useState(false)

  const resetFeedback = () => {
    setMessage('')
    setError('')
  }

  const load = async () => {
    resetFeedback()
    try {
      const [taskRes, userRes] = await Promise.all([
        apiRequest('/tasks'),
        apiRequest('/users', { token }),
      ])
      setTasks(taskRes.tasks || [])
      setUsers(Array.isArray(userRes) ? userRes : [])
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (filter.status !== 'All' && task.status !== filter.status) return false
      if (filter.priority !== 'All' && task.priority !== filter.priority) return false
      if (!filter.search.trim()) return true
      const text = `${task.title} ${task.description || ''}`.toLowerCase()
      return text.includes(filter.search.toLowerCase())
    })
  }, [tasks, filter])

  const groupedTasks = useMemo(() => {
    const map = { Todo: [], 'In Progress': [], Done: [] }
    for (const task of filteredTasks) map[task.status]?.push(task)
    return map
  }, [filteredTasks])

  const userNameById = useMemo(() => {
    const map = new Map()
    for (const user of users) {
      map.set(String(user._id), user.name || user.email || String(user._id))
    }
    return map
  }, [users])

  const stats = useMemo(() => {
    const doneCount = tasks.filter((task) => task.status === 'Done').length
    const inProgress = tasks.filter((task) => task.status === 'In Progress').length
    const overdue = tasks.filter((task) => {
      if (!task.dueDate || task.status === 'Done') return false
      return new Date(task.dueDate) < new Date()
    }).length
    return [
      { label: 'Total Issues', value: tasks.length },
      { label: 'In Progress', value: inProgress },
      { label: 'Done', value: doneCount },
      { label: 'Overdue', value: overdue },
    ]
  }, [tasks])

  const createTask = async (event) => {
    event.preventDefault()
    resetFeedback()
    try {
      await apiRequest('/tasks', {
        method: 'POST',
        token,
        body: {
          title: taskForm.title,
          description: taskForm.description || undefined,
          priority: taskForm.priority,
          dueDate: taskForm.dueDate || undefined,
          rules: {
            department: taskForm.department || undefined,
            minExperience: taskForm.minExperience === '' ? undefined : Number(taskForm.minExperience),
            maxActiveTasks: taskForm.maxActiveTasks === '' ? undefined : Number(taskForm.maxActiveTasks),
            location: taskForm.location || undefined,
          },
        },
      })
      setTaskForm({
        title: '',
        description: '',
        priority: 'Medium',
        dueDate: '',
        department: '',
        minExperience: '',
        maxActiveTasks: '',
        location: '',
      })
      setMessage('Task created.')
      setActiveTab('board')
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const patchTask = async (id, body) => {
    resetFeedback()
    try {
      await apiRequest(`/tasks/${id}`, { method: 'PATCH', token, body })
      setMessage('Task updated.')
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const removeTask = async (id) => {
    if (!window.confirm('Delete this task?')) return
    resetFeedback()
    try {
      await apiRequest(`/tasks/${id}`, { method: 'DELETE', token })
      setMessage('Task deleted.')
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const fetchEligible = async (taskId) => {
    resetFeedback()
    try {
      const res = await apiRequest(`/eligibility/${taskId}`)
      setEligibleByTask((current) => ({ ...current, [taskId]: res.data || [] }))
    } catch (err) {
      setError(err.message)
    }
  }

  const recomputeTask = async (taskId) => {
    resetFeedback()
    try {
      await apiRequest(`/eligibility/${taskId}/recompute`, { method: 'POST' })
      setMessage('Recompute queued.')
    } catch (err) {
      setError(err.message)
    }
  }

  const completeTask = async (taskId) => {
    resetFeedback()
    try {
      await apiRequest(`/assignments/${taskId}/complete`, { method: 'POST', token })
      setMessage('Task completed.')
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const assignTask = async (task) => {
    const taskDraft = draft[task._id] || {}
    const selectedUserId = taskDraft.userId
    if (!selectedUserId) {
      setError('Select a user first.')
      return
    }

    const action = task.assignedUserId ? 'reassign' : 'assign'
    const body =
      action === 'assign'
        ? { userId: selectedUserId, reason: taskDraft.reason || 'Assigned by admin', forceAssign: false }
        : { newUserId: selectedUserId, reason: taskDraft.reason || 'Reassigned by admin', forceAssign: false }

    resetFeedback()

    try {
      await apiRequest(`/assignments/${task._id}/${action}`, { method: 'POST', token, body })
      setMessage('Task assigned.')
      load()
    } catch (err) {
      if (err.payload?.code === 'USER_NOT_ELIGIBLE' && err.payload?.canForceAssign) {
        setForceModal({
          open: true,
          taskId: task._id,
          action,
          selectedUserId,
          reason: taskDraft.reason || '',
          reasons: err.payload.reasons || ['Eligibility criteria not met'],
          taskTitle: task.title,
        })
      } else {
        setError(err.message)
      }
    }
  }

  const forceAssignFromModal = async () => {
    setForcingAssign(true)
    try {
      const forcedBody =
        forceModal.action === 'assign'
          ? {
              userId: forceModal.selectedUserId,
              reason: forceModal.reason || 'Forced assign',
              forceAssign: true,
            }
          : {
              newUserId: forceModal.selectedUserId,
              reason: forceModal.reason || 'Forced reassign',
              forceAssign: true,
            }

      await apiRequest(`/assignments/${forceModal.taskId}/${forceModal.action}`, {
        method: 'POST',
        token,
        body: forcedBody,
      })
      setForceModal((prev) => ({ ...prev, open: false }))
      setMessage('Task force-assigned.')
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setForcingAssign(false)
    }
  }

  const setTaskDraft = (taskId, key, value) => {
    setDraft((current) => ({ ...current, [taskId]: { ...current[taskId], [key]: value } }))
  }

  const handleDragStart = (taskId) => setDragTaskId(taskId)

  const handleDropOnStatus = async (nextStatus) => {
    if (!dragTaskId) return
    const current = tasks.find((task) => task._id === dragTaskId)
    setDragTaskId('')
    if (!current || current.status === nextStatus) return
    await patchTask(dragTaskId, { status: nextStatus })
  }

  return (
    <main className="dashboard-shell jira-shell">
      <TopNav title="Project Dashboard" />

      {message ? <p className="success-banner">{message}</p> : null}
      {error ? <p className="error-banner">{error}</p> : null}

      <section className="jira-stats">
        {stats.map((stat) => (
          <article key={stat.label} className="stat-card">
            <p>{stat.label}</p>
            <h3>{stat.value}</h3>
          </article>
        ))}
      </section>

      <section className="panel">
        <div className="row">
          <h2>Quick Actions</h2>
          <div className="row compact">
            <button onClick={load}>Refresh</button>
          </div>
        </div>
      </section>

      <section className="panel tabs-panel">
        <div className="tabs-row">
          <button className={activeTab === 'create' ? 'tab-btn active' : 'tab-btn'} onClick={() => setActiveTab('create')}>
            Create Task
          </button>
          <button className={activeTab === 'board' ? 'tab-btn active' : 'tab-btn'} onClick={() => setActiveTab('board')}>
            Task Board
          </button>
          <button className={activeTab === 'all' ? 'tab-btn active' : 'tab-btn'} onClick={() => setActiveTab('all')}>
            All Tasks
          </button>
        </div>
      </section>

      {activeTab === 'create' ? (
        <section className="panel">
          <h2>Create Task</h2>
          <form className="create-form" onSubmit={createTask}>
            <input
              placeholder="Title"
              value={taskForm.title}
              onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
            <input
              placeholder="Description"
              value={taskForm.description}
              onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))}
            />
            <select
              value={taskForm.priority}
              onChange={(e) => setTaskForm((f) => ({ ...f, priority: e.target.value }))}
            >
              {priorityOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={taskForm.dueDate}
              onChange={(e) => setTaskForm((f) => ({ ...f, dueDate: e.target.value }))}
            />
            <select
              value={taskForm.department}
              onChange={(e) => setTaskForm((f) => ({ ...f, department: e.target.value }))}
            >
              {departmentOptions.map((value) => (
                <option key={value || 'all'} value={value}>
                  {value || 'Any department'}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              placeholder="Min experience"
              value={taskForm.minExperience}
              onChange={(e) => setTaskForm((f) => ({ ...f, minExperience: e.target.value }))}
            />
            <input
              type="number"
              min="0"
              placeholder="Max active tasks"
              value={taskForm.maxActiveTasks}
              onChange={(e) => setTaskForm((f) => ({ ...f, maxActiveTasks: e.target.value }))}
            />
            <input
              placeholder="Location rule"
              value={taskForm.location}
              onChange={(e) => setTaskForm((f) => ({ ...f, location: e.target.value }))}
            />
            <button type="submit">Create Task</button>
          </form>
        </section>
      ) : null}

      {activeTab === 'board' ? (
        <section className="panel">
          <div className="filters jira-filters">
            <input
              placeholder="Search issues"
              value={filter.search}
              onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
            />
            <select value={filter.status} onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}>
              <option value="All">All statuses</option>
              {statusOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <select value={filter.priority} onChange={(e) => setFilter((f) => ({ ...f, priority: e.target.value }))}>
              <option value="All">All priorities</option>
              {priorityOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          <h2>Task Board</h2>
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
                    const assignee = getAssigneeName(task, userNameById)
                    return (
                      <article
                        key={task._id}
                        className="kanban-card jira-card"
                        draggable
                        onDragStart={() => handleDragStart(task._id)}
                      >
                        <div className="jira-card-head">
                          <span className={`status-pill ${statusClass(task.status)}`}>{task.status}</span>
                          <span className={`pill priority-${task.priority.toLowerCase()}`}>{task.priority}</span>
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
        </section>
      ) : null}

      {activeTab === 'all' ? (
        <section className="panel">
          <div className="filters jira-filters">
            <input
              placeholder="Search issues"
              value={filter.search}
              onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
            />
            <select value={filter.status} onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}>
              <option value="All">All statuses</option>
              {statusOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <select value={filter.priority} onChange={(e) => setFilter((f) => ({ ...f, priority: e.target.value }))}>
              <option value="All">All priorities</option>
              {priorityOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          <h2>All Tasks</h2>
          <div className="task-table-wrap">
            <table className="task-table">
              <thead>
                <tr>
                  <th>Issue</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Assignee</th>
                  <th>Due</th>
                  <th>Assignment</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => {
                  const taskDraft = draft[task._id] || {}
                  const eligible = eligibleByTask[task._id] || []
                  return (
                    <tr key={task._id}>
                      <td>
                        <strong>{task.title}</strong>
                        <div className="muted">{task.description || 'No description'}</div>
                        <div className="muted">#{task._id?.slice(-8)}</div>
                        {eligible.length ? (
                          <div className="muted">
                            Eligible: {eligible.map((entry) => entry.userId?.name || entry.userId?.email).join(', ')}
                          </div>
                        ) : null}
                      </td>
                      <td>
                        <select
                          className={statusClass(task.status)}
                          value={task.status}
                          onChange={(e) => patchTask(task._id, { status: e.target.value })}
                        >
                          {statusOptions.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select value={task.priority} onChange={(e) => patchTask(task._id, { priority: e.target.value })}>
                          {priorityOptions.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>{getAssigneeName(task, userNameById)}</td>
                      <td>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}</td>
                      <td>
                        <div className="assignment-fields">
                          <select
                            value={taskDraft.userId || ''}
                            onChange={(e) => setTaskDraft(task._id, 'userId', e.target.value)}
                          >
                            <option value="">Select user</option>
                            {users.map((userItem) => (
                              <option value={userItem._id} key={userItem._id}>
                                {userItem.name} ({userItem.role})
                              </option>
                            ))}
                          </select>
                          <input
                            placeholder="Reason"
                            value={taskDraft.reason || ''}
                            onChange={(e) => setTaskDraft(task._id, 'reason', e.target.value)}
                          />
                        </div>
                      </td>
                      <td>
                        <div className="row compact">
                          <button onClick={() => assignTask(task)}>Assign</button>
                          <button className="danger" onClick={() => removeTask(task._id)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {forceModal.open ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="eligibility-title">
          <div className="modal-card">
            <h3 id="eligibility-title">User is Ineligible</h3>
            <p>
              Task: <strong>{forceModal.taskTitle}</strong>
            </p>
            <p>The selected user does not satisfy eligibility rules:</p>
            <ul className="modal-reasons">
              {forceModal.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
            <div className="modal-actions">
              <button onClick={() => setForceModal((prev) => ({ ...prev, open: false }))}>Cancel</button>
              <button className="danger" onClick={forceAssignFromModal} disabled={forcingAssign}>
                {forcingAssign ? 'Assigning...' : 'Force Assign'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}

export default AdminDashboardPage

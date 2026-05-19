import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { taskAPI } from '../../services/api';
import { Task } from '../../types';
import { canCreateTask, isEmployee } from '../../lib/workspaceRole';
import UserAvatar from '../../components/common/UserAvatar';
import './TaskListPage.css';

const COLUMNS = [
  { key: 'todo' as const, label: 'Cần làm', color: 'gray' },
  { key: 'in_progress' as const, label: 'Đang xử lý', color: 'blue' },
  { key: 'review' as const, label: 'Chờ đánh giá', color: 'yellow' },
  { key: 'done' as const, label: 'Hoàn thành', color: 'green' },
];

const EMPLOYEE_FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'todo', label: 'Cần làm' },
  { key: 'in_progress', label: 'Đang xử lý' },
  { key: 'review', label: 'Chờ đánh giá' },
  { key: 'done', label: 'Hoàn thành' },
] as const;

function getTagClass(tag: string): string {
  const lower = tag.toLowerCase();
  if (lower.includes('sprint')) return 'tag-sprint';
  if (lower.includes('bug')) return 'tag-bug';
  if (lower.includes('feature') || lower.includes('tính năng')) return 'tag-feature';
  return 'tag-default';
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function isOverdue(dateStr?: string): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

const STATUS_LABELS: Record<string, string> = {
  todo: 'Cần làm',
  in_progress: 'Đang xử lý',
  review: 'Chờ đánh giá',
  done: 'Hoàn thành',
};

export default function TaskListPage() {
  const { currentWorkspace } = useWorkspaceStore();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState<(typeof EMPLOYEE_FILTERS)[number]['key']>('all');

  const roleId = currentWorkspace?.roleId;
  const employeeView = isEmployee(roleId);
  const showCreate = canCreateTask(roleId);

  useEffect(() => {
    if (!currentWorkspace) return;
    setLoading(true);
    taskAPI
      .list(currentWorkspace.id)
      .then((res) => setTasks(res.data.tasks ?? res.data))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, [currentWorkspace]);

  const filtered = useMemo(() => {
    let list = tasks;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }
    if (employeeView && employeeFilter !== 'all') {
      list = list.filter((t) => t.status === employeeFilter);
    }
    return list;
  }, [tasks, search, employeeView, employeeFilter]);

  const grouped = useMemo(() => {
    const map: Record<string, Task[]> = { todo: [], in_progress: [], review: [], done: [] };
    filtered.forEach((t) => {
      if (map[t.status]) map[t.status].push(t);
    });
    return map;
  }, [filtered]);

  const employeeStats = useMemo(() => {
    const open = tasks.filter((t) => t.status !== 'done').length;
    const overdue = tasks.filter(
      (t) => t.status !== 'done' && t.dueDate && isOverdue(t.dueDate)
    ).length;
    const done = tasks.filter((t) => t.status === 'done').length;
    return { open, overdue, done };
  }, [tasks]);

  if (!currentWorkspace) {
    return (
      <div className="task-list-loading">
        Vui lòng chọn một workspace trước.
      </div>
    );
  }

  return (
    <div className={`task-list-page ${employeeView ? 'task-list-page--employee' : ''}`}>
      <div className="task-list-header">
        <div className="task-list-header-left">
          <h1>{employeeView ? 'Công việc của tôi' : 'Tiến độ Công việc'}</h1>
          <span className="sprint-info">
            {employeeView
              ? `${currentWorkspace.name} · Chỉ hiển thị việc được giao cho bạn`
              : `${currentWorkspace.name} · ${tasks.length} công việc`}
          </span>
        </div>
        <div className="task-list-header-right">
          <input
            type="text"
            className="task-search-input"
            placeholder={employeeView ? 'Tìm công việc của tôi...' : 'Tìm kiếm task...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {showCreate && (
            <Link to="/tasks/create" className="btn-create-task">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
              </svg>
              Tạo Task
            </Link>
          )}
        </div>
      </div>

      {employeeView && (
        <div className="task-employee-stats">
          <div className="task-employee-stat">
            <span className="task-employee-stat-num stat-blue">{employeeStats.open}</span>
            <span className="task-employee-stat-label">Đang mở</span>
          </div>
          <div className="task-employee-stat">
            <span className="task-employee-stat-num stat-red">{employeeStats.overdue}</span>
            <span className="task-employee-stat-label">Quá hạn</span>
          </div>
          <div className="task-employee-stat">
            <span className="task-employee-stat-num stat-green">{employeeStats.done}</span>
            <span className="task-employee-stat-label">Hoàn thành</span>
          </div>
        </div>
      )}

      {employeeView && (
        <div className="task-employee-filters">
          {EMPLOYEE_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`task-filter-pill ${employeeFilter === f.key ? 'active' : ''}`}
              onClick={() => setEmployeeFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="task-list-loading">Đang tải công việc...</div>
      ) : employeeView ? (
        <div className="task-my-list">
          {filtered.length === 0 ? (
            <div className="task-my-empty">
              <i className="fas fa-clipboard-list" />
              <p>Chưa có công việc nào được giao cho bạn.</p>
              <span>Quản lý sẽ giao việc qua mục Công việc — bạn chỉ cần theo dõi tại đây.</span>
            </div>
          ) : (
            filtered.map((task) => (
              <div
                className="task-my-row"
                key={task.id}
                onClick={() => navigate(`/tasks/${task.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/tasks/${task.id}`)}
              >
                <div className="task-my-row-main">
                  <span className={`task-my-status task-my-status--${task.status}`}>
                    {STATUS_LABELS[task.status] ?? task.status}
                  </span>
                  <p className="task-my-title">{task.title}</p>
                  {task.tags.length > 0 && (
                    <div className="task-my-tags">
                      {task.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className={`tag ${getTagClass(tag)}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="task-my-row-meta">
                  {task.dueDate && (
                    <span
                      className={`task-my-due ${
                        task.status !== 'done' && isOverdue(task.dueDate) ? 'overdue' : ''
                      }`}
                    >
                      <i className="fas fa-calendar-alt" />
                      {formatDate(task.dueDate)}
                    </span>
                  )}
                  {task.creator && (
                    <span className="task-my-creator" title={`Giao bởi ${task.creator.name}`}>
                      <i className="fas fa-user-tie" />
                      {task.creator.name}
                    </span>
                  )}
                  <i className="fas fa-chevron-right task-my-arrow" />
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="kanban-board">
          {COLUMNS.map((col) => {
            const colTasks = grouped[col.key] || [];
            return (
              <div className="kanban-column" key={col.key}>
                <div className="kanban-column-header">
                  <div className="kanban-column-header-left">
                    <div className={`column-indicator ${col.color}`} />
                    <span>{col.label}</span>
                  </div>
                  <span className="column-count">{colTasks.length}</span>
                </div>
                <div className="kanban-cards">
                  {colTasks.length === 0 ? (
                    <div className="kanban-empty">Không có task</div>
                  ) : (
                    colTasks.map((task) => (
                      <div
                        className="task-card"
                        key={task.id}
                        onClick={() => navigate(`/tasks/${task.id}`)}
                      >
                        {task.tags.length > 0 && (
                          <div className="task-card-tags">
                            {task.tags.map((tag) => (
                              <span key={tag} className={`tag ${getTagClass(tag)}`}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="task-card-title">{task.title}</p>
                        <div className="task-card-meta">
                          <span
                            className={`task-card-due ${
                              task.status !== 'done' && isOverdue(task.dueDate)
                                ? 'overdue'
                                : ''
                            }`}
                          >
                            {task.dueDate && (
                              <>
                                <svg viewBox="0 0 20 20" fill="currentColor">
                                  <path
                                    fillRule="evenodd"
                                    d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                {formatDate(task.dueDate)}
                              </>
                            )}
                          </span>
                          <div className="task-card-avatars">
                            {task.assignee && (
                              <UserAvatar
                                name={task.assignee.name}
                                avatarUrl={task.assignee.avatarUrl}
                                size="sm"
                                className="avatar"
                                title={task.assignee.name}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

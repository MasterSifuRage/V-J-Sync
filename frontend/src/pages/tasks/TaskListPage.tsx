import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { taskAPI } from '../../services/api';
import { Task } from '../../types';
import './TaskListPage.css';

const COLUMNS = [
  { key: 'todo' as const, label: 'Cần làm', color: 'gray' },
  { key: 'in_progress' as const, label: 'Đang xử lý', color: 'blue' },
  { key: 'review' as const, label: 'Chờ đánh giá', color: 'yellow' },
  { key: 'done' as const, label: 'Hoàn thành', color: 'green' },
];

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

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function TaskListPage() {
  const { currentWorkspace } = useWorkspaceStore();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!currentWorkspace) return;
    setLoading(true);
    taskAPI
      .list(currentWorkspace.id)
      .then((res) => setTasks(res.data.tasks ?? res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentWorkspace]);

  const filtered = useMemo(() => {
    if (!search.trim()) return tasks;
    const q = search.toLowerCase();
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  }, [tasks, search]);

  const grouped = useMemo(() => {
    const map: Record<string, Task[]> = { todo: [], in_progress: [], review: [], done: [] };
    filtered.forEach((t) => {
      if (map[t.status]) map[t.status].push(t);
    });
    return map;
  }, [filtered]);

  if (!currentWorkspace) {
    return (
      <div className="task-list-loading">
        Vui lòng chọn một workspace trước.
      </div>
    );
  }

  return (
    <div className="task-list-page">
      <div className="task-list-header">
        <div className="task-list-header-left">
          <h1>Tiến độ Công việc</h1>
          <span className="sprint-info">
            {currentWorkspace.name} &middot; {tasks.length} công việc
          </span>
        </div>
        <div className="task-list-header-right">
          <input
            type="text"
            className="task-search-input"
            placeholder="Tìm kiếm task..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Link to="/tasks/create" className="btn-create-task">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
            </svg>
            Tạo Task
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="task-list-loading">Đang tải công việc...</div>
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
                              <div className="avatar" title={task.assignee.name}>
                                {task.assignee.avatarUrl ? (
                                  <img src={task.assignee.avatarUrl} alt="" />
                                ) : (
                                  getInitials(task.assignee.name)
                                )}
                              </div>
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

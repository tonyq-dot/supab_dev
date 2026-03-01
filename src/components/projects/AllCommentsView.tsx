import { useAllMilestones } from '@/hooks/useAllMilestones'

export default function AllCommentsView() {
  const { milestones, loading } = useAllMilestones()

  if (loading) return <p className="loading">Загрузка...</p>

  const withComments = milestones.filter((m) => m.comment && m.comment.trim().length > 0)

  return (
    <div className="card">
      <h3>Все комментарии по подачам</h3>
      {withComments.length === 0 ? (
        <p className="project-details-empty">Нет комментариев</p>
      ) : (
        <ul className="project-milestones-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {withComments.map((m) => (
            <li key={m.id} className="project-milestone-item">
              <div className="project-milestone-date">
                {m.pitch_date}
                {' — '}
                <strong>{m.projects?.name ?? 'Проект'}</strong>
                {m.projects?.clients?.name && ` (${m.projects.clients.name})`}
              </div>
              {m.comment && <div className="project-milestone-comment">{m.comment}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

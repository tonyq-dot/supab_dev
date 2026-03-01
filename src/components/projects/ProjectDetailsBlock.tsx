import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useProjectDetails, type ProjectWork } from '@/hooks/useProjectDetails'
import { useProjectSellers } from '@/hooks/useProjectSellers'
import { useProjectMilestones } from '@/hooks/useProjectMilestones'
import { getWorkflowStatusLabel } from '@/constants/projectStatus'
import { supabase } from '@/lib/supabase'

type ProjectInfo = {
  id: string
  name: string
  clients?: { name: string } | null
  workflow_status: string | null
  global_deadline: string | null
  pitch_deadline: string | null
}

type Props = {
  projectId: string
  project?: ProjectInfo | null
}

function WorkCard({
  work,
  imageUrl,
}: {
  work: ProjectWork
  imageUrl: string | null
}) {
  const desc = [work.work_type_name, work.quantity > 1 ? `×${work.quantity}` : null, work.date]
    .filter(Boolean)
    .join(' · ')
  return (
    <div className="project-work-card">
      <div className="project-work-card-image">
        {imageUrl ? (
          <Link to={`/gallery?work=${work.id}`}>
            <img src={imageUrl} alt="" loading="lazy" />
          </Link>
        ) : (
          <div className="project-work-card-placeholder">Нет изображения</div>
        )}
      </div>
      <div className="project-work-card-body">
        <div className="project-work-card-meta">{desc}</div>
        {work.title && <div className="project-work-card-title">{work.title}</div>}
      </div>
    </div>
  )
}

export default function ProjectDetailsBlock({ projectId, project }: Props) {
  const { works, participants, loading, getUrl } = useProjectDetails(projectId)
  const { projectSellers } = useProjectSellers(projectId)
  const { milestones, addMilestone } = useProjectMilestones(projectId)
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState<'works' | 'milestones' | 'info'>('works')
  const [newPitchDate, setNewPitchDate] = useState('')
  const [newPitchComment, setNewPitchComment] = useState('')
  const [addingMilestone, setAddingMilestone] = useState(false)

  useEffect(() => {
    const needsUrl = works.filter((w) => !w.image_url && w.storage_path)
    if (needsUrl.length === 0) return
    let cancelled = false
    const load = async () => {
      const entries = await Promise.all(
        needsUrl.map(async (w) => {
          const url = await getUrl(w.storage_path!)
          return [w.id, url] as const
        })
      )
      if (!cancelled) {
        setResolvedUrls((prev) => ({ ...prev, ...Object.fromEntries(entries) }))
      }
    }
    load()
    return () => { cancelled = true }
  }, [works, getUrl])

  if (loading) {
    return (
      <div className="project-details-block">
        <p className="project-details-loading">Загрузка...</p>
      </div>
    )
  }

  const participantNames = participants.map((p) => p.display_name || p.nickname || p.user_id.slice(0, 8))
  const sellerNames = projectSellers.map((ps) => ps.sellers?.name).filter(Boolean) as string[]

  const handleAddMilestone = async () => {
    if (!newPitchDate) return
    setAddingMilestone(true)
    try {
      await addMilestone(newPitchDate, newPitchComment || undefined)
      setNewPitchDate('')
      setNewPitchComment('')
      await supabase.from('projects').update({ pitch_deadline: newPitchDate }).eq('id', projectId)
    } finally {
      setAddingMilestone(false)
    }
  }

  return (
    <div className="project-details-block">
      <h4 className="project-details-title">Дополнительная информация</h4>

      {project && (
        <section className="project-details-section">
          <h5>Проект</h5>
          <div className="project-deadlines">
            {project.clients?.name && (
              <span className="project-deadline-item">
                <span className="project-deadline-label">Клиент:</span>
                {project.clients.name}
              </span>
            )}
            {sellerNames.length > 0 && (
              <span className="project-deadline-item">
                <span className="project-deadline-label">Продавали:</span>
                {sellerNames.join(', ')}
              </span>
            )}
            {project.workflow_status && (
              <span className="project-deadline-item">
                <span className="project-deadline-label">Статус:</span>
                {getWorkflowStatusLabel(project.workflow_status as 'preview' | 'preproduction' | 'assembly' | 'final_stretch' | 'show' | 'stop' | 'awaiting_response')}
              </span>
            )}
            {project.global_deadline && (
              <span className="project-deadline-item">
                <span className="project-deadline-label">Глобальный дедлайн:</span>
                {project.global_deadline}
              </span>
            )}
            {project.pitch_deadline && (
              <span className="project-deadline-item">
                <span className="project-deadline-label">Подача:</span>
                {project.pitch_deadline}
              </span>
            )}
          </div>
        </section>
      )}

      <div className="project-details-tabs">
        <button
          type="button"
          className={activeTab === 'works' ? 'active' : ''}
          onClick={() => setActiveTab('works')}
        >
          Работы
        </button>
        <button
          type="button"
          className={activeTab === 'milestones' ? 'active' : ''}
          onClick={() => setActiveTab('milestones')}
        >
          Вехи и комментарии
        </button>
        <button
          type="button"
          className={activeTab === 'info' ? 'active' : ''}
          onClick={() => setActiveTab('info')}
        >
          Участники
        </button>
      </div>

      {activeTab === 'works' && (
      <section className="project-details-section">
        <h5>Работы</h5>
        {works.length === 0 ? (
          <p className="project-details-empty">Нет работ в проекте</p>
        ) : (
          <div className="project-works-grid">
            {works.map((work) => (
              <WorkCard
                key={work.id}
                work={work}
                imageUrl={work.image_url ?? resolvedUrls[work.id] ?? null}
              />
            ))}
          </div>
        )}
      </section>
      )}

      {activeTab === 'milestones' && (
        <section className="project-details-section">
          <h5>Вехи проекта (подачи)</h5>
          <ul className="project-milestones-list">
            {milestones.map((m) => (
              <li key={m.id} className="project-milestone-item">
                <div className="project-milestone-date">{m.pitch_date}</div>
                {m.comment && <div className="project-milestone-comment">{m.comment}</div>}
              </li>
            ))}
          </ul>
          <div className="project-milestone-add">
            <label>
              Новая подача (дата)
              <input
                type="date"
                value={newPitchDate}
                onChange={(e) => setNewPitchDate(e.target.value)}
              />
            </label>
            <label>
              Комментарий к подаче
              <textarea
                value={newPitchComment}
                onChange={(e) => setNewPitchComment(e.target.value)}
                placeholder="Комментарии клиента, договорённости..."
              />
            </label>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleAddMilestone}
              disabled={!newPitchDate || addingMilestone}
            >
              {addingMilestone ? 'Добавляем...' : 'Добавить веху'}
            </button>
          </div>
        </section>
      )}

      {activeTab === 'info' && (
        <section className="project-details-section">
          <h5>Участники</h5>
          {participantNames.length === 0 ? (
            <p className="project-details-empty">Нет участников</p>
          ) : (
            <ul className="project-participants">
              {participantNames.map((name, i) => (
                <li key={participants[i].user_id}>{name}</li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}

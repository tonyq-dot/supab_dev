import { useMemo } from 'react'
import { Gantt, ViewMode } from 'gantt-task-react'
import 'gantt-task-react/dist/index.css'
import type { Task } from 'gantt-task-react'

type Project = {
  id: string
  name: string
  created_at: string
  global_deadline: string | null
  pitch_deadline: string | null
  clients?: { name: string } | null
}

type Props = {
  projects: Project[]
}

function parseDate(s: string): Date {
  const d = new Date(s)
  return isNaN(d.getTime()) ? new Date() : d
}

function addDays(date: Date, days: number): Date {
  const r = new Date(date)
  r.setDate(r.getDate() + days)
  return r
}

export default function ProjectTimelineView({ projects }: Props) {
  const tasks: Task[] = useMemo(() => {
    const now = new Date()
    return projects.map((p) => {
      const start = parseDate(p.created_at)
      const endRaw = p.global_deadline ?? p.pitch_deadline
      const end = endRaw ? parseDate(endRaw) : addDays(start, 90)
      const displayEnd = end > start ? end : addDays(start, 30)
      const label = p.clients?.name ? `${p.name} (${p.clients.name})` : p.name
      return {
        id: p.id,
        name: label,
        type: 'task' as const,
        start,
        end: displayEnd,
        progress: endRaw ? 50 : 0,
      }
    })
  }, [projects])

  if (tasks.length === 0) {
    return (
      <div className="card">
        <p className="project-details-empty">Нет проектов для отображения на таймлайне</p>
      </div>
    )
  }

  return (
    <div className="card" style={{ overflow: 'auto' }}>
      <h3>Таймлайн проектов</h3>
      <div style={{ minWidth: 600 }}>
        <Gantt
          tasks={tasks}
          viewMode={ViewMode.Month}
          locale="ru-RU"
          listCellWidth="220px"
          columnWidth={65}
          rowHeight={36}
          barFill={70}
          barCornerRadius={4}
          fontSize="13px"
        />
      </div>
    </div>
  )
}

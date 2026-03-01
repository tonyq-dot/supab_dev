import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { usePeriodConfig } from '@/hooks/usePeriodConfig'
import type { Database } from '@/lib/database.types'

type DetailedScore = Database['public']['Views']['detailed_scores']['Row']

export default function Admin() {
  const { config, loading } = usePeriodConfig()
  const [periodName, setPeriodName] = useState('')
  const [normPoints, setNormPoints] = useState(500)
  const [companyProfitCoefQ1, setCompanyProfitCoefQ1] = useState(0.3)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (config) {
      setPeriodName(config.period_name)
      setNormPoints(config.norm_points)
      setCompanyProfitCoefQ1(Number(config.company_profit_coef_q1))
    }
  }, [config])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('period_configs').upsert({
      period_name: periodName,
      norm_points: normPoints,
      company_profit_coef_q1: companyProfitCoefQ1,
    }, { onConflict: 'period_name' })
    setSaving(false)
  }

  const [allLogs, setAllLogs] = useState<DetailedScore[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsPeriod, setLogsPeriod] = useState({ start: '', end: '' })
  const [editingLog, setEditingLog] = useState<DetailedScore | null>(null)
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const [workTypes, setWorkTypes] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    supabase.from('projects').select('id, name').eq('status', 'Active').then(({ data }) => setProjects(data ?? []))
    supabase.from('work_types').select('id, name').then(({ data }) => setWorkTypes(data ?? []))
  }, [])

  const loadAllLogs = () => {
    if (!logsPeriod.start || !logsPeriod.end) return
    setLogsLoading(true)
    supabase
      .from('detailed_scores')
      .select('*')
      .gte('date', logsPeriod.start)
      .lte('date', logsPeriod.end)
      .order('date', { ascending: false })
      .then(({ data }) => {
        setAllLogs((data as DetailedScore[]) ?? [])
      })
      .finally(() => setLogsLoading(false))
  }

  const handleSaveLog = async (id: string, quantity: number, date: string, projectId: string, workTypeId: string) => {
    await supabase.from('work_logs').update({ quantity, date, project_id: projectId, work_type_id: workTypeId }).eq('id', id)
    setEditingLog(null)
    loadAllLogs()
  }

  if (loading) return <p>Загрузка...</p>

  return (
    <div className="page">
      <h1>Настройки</h1>
      <form onSubmit={handleSave} className="form card">
        <h3>Настройки периода</h3>
        <label>
          Название периода
          <input
            value={periodName}
            onChange={(e) => setPeriodName(e.target.value)}
            placeholder="Q1 2026"
          />
        </label>
        <label>
          Норма баллов
          <input
            type="number"
            min={1}
            value={normPoints}
            onChange={(e) => setNormPoints(parseInt(e.target.value, 10) || 500)}
          />
        </label>
        <label>
          Коэффициент прибыли компании (Q1)
          <input
            type="number"
            step="0.01"
            min={0}
            max={1}
            value={companyProfitCoefQ1}
            onChange={(e) => setCompanyProfitCoefQ1(parseFloat(e.target.value) || 0.3)}
          />
        </label>
        <div className="form-actions">
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </form>

      <div className="card">
        <h3>Оклады сотрудников</h3>
        <UserSalariesForm />
      </div>

      <div className="card">
        <h3>Все работы (просмотр)</h3>
        <div className="filters">
          <label>
            С
            <input type="date" value={logsPeriod.start} onChange={(e) => setLogsPeriod((p) => ({ ...p, start: e.target.value }))} />
          </label>
          <label>
            По
            <input type="date" value={logsPeriod.end} onChange={(e) => setLogsPeriod((p) => ({ ...p, end: e.target.value }))} />
          </label>
          <button type="button" onClick={loadAllLogs} disabled={logsLoading} className="btn btn-primary">
            Загрузить
          </button>
        </div>
        {allLogs.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Сотрудник</th>
                  <th>Проект</th>
                  <th>Вид работы</th>
                  <th>Кол-во</th>
                  <th>Баллы</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {allLogs.map((r) => (
                  <tr key={r.id}>
                    <td>{r.date}</td>
                    <td>{r.user_id.slice(0, 8)}...</td>
                    <td>{r.project_name}</td>
                    <td>{r.work_type_name}</td>
                    <td>{r.quantity}</td>
                    <td>{Number(r.score).toFixed(1)}</td>
                    <td>
                      <button type="button" onClick={() => setEditingLog(r)} className="btn btn-sm">Изменить</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingLog && (
        <EditWorkLogModal
          log={editingLog}
          projects={projects}
          workTypes={workTypes}
          onSave={(quantity, date, projectId, workTypeId) =>
            handleSaveLog(editingLog.id, quantity, date, projectId, workTypeId)
          }
          onClose={() => setEditingLog(null)}
        />
      )}
    </div>
  )
}

function UserSalariesForm() {
  const [userId, setUserId] = useState('')
  const [salary, setSalary] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(salary)
    if (!userId || isNaN(amount) || amount <= 0) return
    setSaving(true)
    setMessage(null)
    const { error } = await supabase.from('user_salaries').upsert(
      { user_id: userId, monthly_salary: amount },
      { onConflict: 'user_id' }
    )
    setSaving(false)
    setMessage(error ? error.message : 'Сохранено')
    if (!error) setSalary('')
  }

  return (
    <form onSubmit={handleSubmit} className="form" style={{ maxWidth: '400px' }}>
      <label>
        User ID (из auth.users или отчётов)
        <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="uuid" required />
      </label>
      <label>
        Месячный оклад (₽)
        <input type="number" min={1} step="0.01" value={salary} onChange={(e) => setSalary(e.target.value)} required />
      </label>
      <button type="submit" disabled={saving} className="btn btn-primary">Сохранить</button>
      {message && <p className={message === 'Сохранено' ? 'success' : 'error'}>{message}</p>}
    </form>
  )
}

function EditWorkLogModal({
  log,
  projects,
  workTypes,
  onSave,
  onClose,
}: {
  log: DetailedScore
  projects: { id: string; name: string }[]
  workTypes: { id: string; name: string }[]
  onSave: (quantity: number, date: string, projectId: string, workTypeId: string) => void
  onClose: () => void
}) {
  const [quantity, setQuantity] = useState(log.quantity)
  const [date, setDate] = useState(log.date)
  const [projectId, setProjectId] = useState(log.project_id)
  const [workTypeId, setWorkTypeId] = useState(log.work_type_id)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Редактировать работу</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSave(quantity, date, projectId, workTypeId)
          }}
          className="form"
        >
          <label>
            Дата
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label>
            Проект
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} required>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <label>
            Вид работы
            <select value={workTypeId} onChange={(e) => setWorkTypeId(e.target.value)} required>
              {workTypes.map((wt) => (
                <option key={wt.id} value={wt.id}>{wt.name}</option>
              ))}
            </select>
          </label>
          <label>
            Количество
            <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)} required />
          </label>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Сохранить</button>
            <button type="button" onClick={onClose} className="btn btn-outline">Отмена</button>
          </div>
        </form>
      </div>
    </div>
  )
}
